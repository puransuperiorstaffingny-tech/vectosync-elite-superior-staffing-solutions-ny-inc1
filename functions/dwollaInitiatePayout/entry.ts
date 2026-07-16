// Admin: initiate an ACH transfer from the company funding source to an employee bank account.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function dwollaBase() {
  const env = (Deno.env.get("DWOLLA_ENVIRONMENT") || "sandbox").toLowerCase();
  return env === "production" ? "https://api.dwolla.com" : "https://api-sandbox.dwolla.com";
}

async function getToken() {
  const key = Deno.env.get("DWOLLA_API_KEY");
  const secret = Deno.env.get("DWOLLA_API_SECRET");
  if (!key || !secret) throw new Error("Dwolla credentials not configured.");
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
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const { payout_id } = await req.json();
    if (!payout_id) return Response.json({ error: "payout_id is required" }, { status: 400 });

    const payout = await base44.asServiceRole.entities.Payout.get(payout_id);
    if (!payout) return Response.json({ error: "Payout not found" }, { status: 404 });
    if (payout.status === "paid" || payout.status === "processing") {
      return Response.json({ error: `Payout already ${payout.status}` }, { status: 409 });
    }

    const source = Deno.env.get("DWOLLA_MASTER_FUNDING_SOURCE");
    if (!source) return Response.json({ error: "Company funding source not configured (DWOLLA_MASTER_FUNDING_SOURCE)." }, { status: 400 });

    // Resolve the employee's bank account token (destination)
    let destination = payout.bank_account_token;
    if (!destination && payout.bank_account_id) {
      const ba = await base44.asServiceRole.entities.BankAccount.get(payout.bank_account_id);
      destination = ba?.account_token;
    }
    if (!destination) {
      const accts = await base44.asServiceRole.entities.BankAccount.filter({ employee_id: payout.employee_id }, "-created_date", 1);
      destination = accts[0]?.account_token;
    }
    if (!destination) return Response.json({ error: "Employee has no bank account on file" }, { status: 400 });

    const token = await getToken();
    const transferRes = await dwolla(token, "/transfers", "POST", {
      _links: {
        source: { href: source },
        destination: { href: destination },
      },
      amount: { currency: "USD", value: Number(payout.amount).toFixed(2) },
      metadata: { payout_id: payout.id, payroll_run_id: payout.payroll_run_id || "" },
    });

    if (!transferRes.ok && transferRes.status !== 201) {
      console.error("Dwolla transfer failed:", JSON.stringify(transferRes.data));
      await base44.asServiceRole.entities.Payout.update(payout.id, {
        status: "failed",
        failure_reason: JSON.stringify(transferRes.data).slice(0, 500),
      });
      return Response.json({ error: "Transfer failed", detail: transferRes.data }, { status: 502 });
    }

    const transferUrl = transferRes.location;
    const transferId = transferUrl ? transferUrl.split("/").pop() : null;
    await base44.asServiceRole.entities.Payout.update(payout.id, {
      status: "processing",
      provider_transfer_id: transferId,
      failure_reason: "",
    });

    return Response.json({ success: true, provider_transfer_id: transferId, status: "processing" });
  } catch (error) {
    console.error("dwollaInitiatePayout error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});