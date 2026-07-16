// Dwolla webhook receiver. Verifies the X-Request-Signature (HMAC-SHA256 of raw body
// with DWOLLA_WEBHOOK_SECRET), then syncs the matching Payout's status from the transfer event.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function dwollaBase() {
  const env = (Deno.env.get("DWOLLA_ENVIRONMENT") || "sandbox").toLowerCase();
  return env === "production" ? "https://api.dwolla.com" : "https://api-sandbox.dwolla.com";
}

async function getToken() {
  const key = Deno.env.get("DWOLLA_API_KEY");
  const secret = Deno.env.get("DWOLLA_API_SECRET");
  const res = await fetch(`${dwollaBase()}/token`, {
    method: "POST",
    headers: { "Authorization": `Basic ${btoa(`${key}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Dwolla auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Event topic -> our Payout status
function statusForTopic(topic) {
  const t = (topic || "").toLowerCase();
  if (t.includes("transfer_completed")) return "paid";
  if (t.includes("transfer_failed") || t.includes("transfer_cancelled") || t.includes("transfer_returned")) return "failed";
  if (t.includes("transfer_created") || t.includes("transfer_pending")) return "processing";
  return null;
}

async function hmacHex(secret, body) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();

    // Verify signature
    const secret = Deno.env.get("DWOLLA_WEBHOOK_SECRET");
    const signature = req.headers.get("X-Request-Signature-SHA-256") || req.headers.get("X-Request-Signature");
    if (secret) {
      const expected = await hmacHex(secret, rawBody);
      if (!signature || signature.toLowerCase() !== expected.toLowerCase()) {
        console.error("Webhook signature mismatch");
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody || "{}");
    const newStatus = statusForTopic(event.topic);
    const resourceUrl = event?._links?.resource?.href || "";
    const transferId = resourceUrl ? resourceUrl.split("/").pop() : null;

    if (!newStatus || !transferId) {
      // Not a transfer event we track — acknowledge so Dwolla doesn't retry
      return Response.json({ ok: true, ignored: true });
    }

    const base44 = createClientFromRequest(req);
    const payouts = await base44.asServiceRole.entities.Payout.filter({ provider_transfer_id: transferId });
    const payout = payouts[0];
    if (!payout) {
      console.warn("No payout matched transfer", transferId);
      return Response.json({ ok: true, matched: false });
    }

    const update = { status: newStatus };
    if (newStatus === "failed") {
      // Try to pull a failure reason from Dwolla
      try {
        const token = await getToken();
        const r = await fetch(`${dwollaBase()}/transfers/${transferId}/failure`, {
          headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.dwolla.v1.hal+json" },
        });
        if (r.ok) { const f = await r.json(); update.failure_reason = `${f.code || ""} ${f.description || ""}`.trim(); }
      } catch (_) { /* best effort */ }
    }
    await base44.asServiceRole.entities.Payout.update(payout.id, update);

    return Response.json({ ok: true, payout_id: payout.id, status: newStatus });
  } catch (error) {
    console.error("dwollaWebhook error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});