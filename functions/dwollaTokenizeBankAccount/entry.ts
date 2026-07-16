// Tokenize an employee bank account: send raw account/routing to Dwolla,
// store ONLY the returned funding source token in the BankAccount entity.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function dwollaBase() {
  const env = (Deno.env.get("DWOLLA_ENVIRONMENT") || "sandbox").toLowerCase();
  return env === "production" ? "https://api.dwolla.com" : "https://api-sandbox.dwolla.com";
}

async function getToken() {
  const key = Deno.env.get("DWOLLA_API_KEY");
  const secret = Deno.env.get("DWOLLA_API_SECRET");
  if (!key || !secret) throw new Error("Dwolla credentials not configured. Add DWOLLA_API_KEY and DWOLLA_API_SECRET.");
  const res = await fetch(`${dwollaBase()}/token`, {
    method: "POST",
    headers: { "Authorization": `Basic ${btoa(`${key}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Dwolla auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function dwolla(token, path, method, body) {
  const res = await fetch(path.startsWith("http") ? path : `${dwollaBase()}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.dwolla.v1.hal+json",
      "Content-Type": "application/vnd.dwolla.v1.hal+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const location = res.headers.get("Location");
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return { ok: res.ok, status: res.status, location, data };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { account_number, routing_number, account_type, account_nickname } = await req.json();
    if (!account_number || !routing_number) {
      return Response.json({ error: "Account and routing number are required" }, { status: 400 });
    }

    // Find this user's Employee record
    const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
    const employee = employees[0];
    if (!employee) return Response.json({ error: "No employee record found for your account" }, { status: 404 });

    const token = await getToken();

    // 1. Ensure a Dwolla Customer exists for this employee (receive-only is fine for payouts)
    let customerUrl = employee.dwolla_customer_url;
    if (!customerUrl) {
      const custRes = await dwolla(token, "/customers", "POST", {
        firstName: employee.first_name || (user.full_name || "Employee").split(" ")[0],
        lastName: employee.last_name || (user.full_name || "Employee").split(" ").slice(1).join(" ") || "User",
        email: employee.email,
        type: "receive-only",
      });
      if (!custRes.ok && custRes.status !== 201) {
        console.error("Dwolla customer create failed:", JSON.stringify(custRes.data));
        return Response.json({ error: "Failed to create payment profile", detail: custRes.data }, { status: 502 });
      }
      customerUrl = custRes.location;
      await base44.asServiceRole.entities.Employee.update(employee.id, { dwolla_customer_url: customerUrl });
    }

    // 2. Create funding source (tokenize) — raw numbers go to Dwolla, never stored here
    const fsRes = await dwolla(token, `${customerUrl}/funding-sources`, "POST", {
      routingNumber: routing_number,
      accountNumber: account_number,
      bankAccountType: account_type === "savings" ? "savings" : "checking",
      name: account_nickname || `${employee.first_name || "Employee"} ${account_type || "checking"}`,
    });
    if (!fsRes.ok && fsRes.status !== 201) {
      console.error("Dwolla funding source failed:", JSON.stringify(fsRes.data));
      return Response.json({ error: "Failed to add bank account", detail: fsRes.data }, { status: 502 });
    }
    const fundingSourceUrl = fsRes.location;

    // 3. Store ONLY the token (funding source URL) + display metadata
    const last4 = String(account_number).slice(-4);
    const bankAccount = await base44.asServiceRole.entities.BankAccount.create({
      employee_id: employee.id,
      employee_email: employee.email,
      account_token: fundingSourceUrl,
      account_nickname: account_nickname || "",
      account_type: account_type === "savings" ? "savings" : "checking",
      last4,
      is_verified: false,
    });

    return Response.json({ success: true, bank_account_id: bankAccount.id, last4 });
  } catch (error) {
    console.error("dwollaTokenizeBankAccount error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});