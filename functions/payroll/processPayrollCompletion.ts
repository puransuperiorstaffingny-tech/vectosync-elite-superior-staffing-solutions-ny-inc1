import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { payroll_run_id } = await req.json();
    if (!payroll_run_id) return Response.json({ error: 'payroll_run_id is required' }, { status: 400 });

    const run = await base44.asServiceRole.entities.PayrollRun.get(payroll_run_id);
    if (!run) return Response.json({ error: 'Payroll run not found' }, { status: 404 });

    await base44.asServiceRole.entities.PayrollRun.update(run.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    console.log(`Payroll run ${payroll_run_id} marked as completed`);

    return Response.json({ success: true, payroll_run_id, status: 'completed' });
  } catch (error) {
    console.error('processPayrollCompletion error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});