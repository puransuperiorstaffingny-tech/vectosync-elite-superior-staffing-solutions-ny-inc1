// Admin: poll Dwolla for a transfer's current status and sync the Payout record.
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

// Map Dwolla transfer status -> our Payout status
function mapStatus(dwollaStatus) {
  switch ((dwollaStatus || "").toLowerCase()) {
    case "processed": return "paid";
    case "pending": return "processing";
    case "cancelled":
    case "failed": return "failed";
    default: return "processing";
  }
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
    if (!payout.provider_transfer_id) return Response.json({ error: "Payout has no transfer to check" }, { status: 400 });

    const token = await getToken();
    const res = await fetch(`${dwollaBase()}/transfers/${payout.provider_transfer_id}`, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.dwolla.v1.hal+json" },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Dwolla status check failed:", JSON.stringify(data));
      return Response.json({ error: "Status check failed", detail: data }, { status: 502 });
    }

    const newStatus = mapStatus(data.status);
    if (newStatus !== payout.status) {
      await base44.asServiceRole.entities.Payout.update(payout.id, { status: newStatus });
    }

    return Response.json({ success: true, dwolla_status: data.status, status: newStatus });
  } catch (error) {
    console.error("dwollaCheckTransferStatus error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});