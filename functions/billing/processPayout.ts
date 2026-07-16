import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { payout_id } = await req.json();
    if (!payout_id) return Response.json({ error: 'payout_id is required' }, { status: 400 });

    const payout = await base44.asServiceRole.entities.Payout.get(payout_id);
    if (!payout) return Response.json({ error: 'Payout not found' }, { status: 404 });

    await base44.asServiceRole.entities.Payout.update(payout.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    console.log(`Payout ${payout_id} marked as completed`);

    return Response.json({ success: true, payout_id, status: 'completed' });
  } catch (error) {
    console.error('processPayout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});