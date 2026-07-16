import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.role === 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { payroll_run_id, employee_id, employee_name, action, log_type, amount, details, period_start, period_end } = await req.json();

    if (!payroll_run_id || !employee_id || !action || !log_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const log = await base44.entities.PayrollLog.create({
      payroll_run_id,
      employee_id,
      employee_name: employee_name || "Unknown",
      action,
      log_type,
      amount: amount || 0,
      details: details ? JSON.stringify(details) : null,
      status: "completed",
      period_start,
      period_end
    });

    console.log(`Payroll action logged: ${action} for ${employee_name}`);
    return Response.json({ success: true, log });
  } catch (error) {
    console.error('Error logging payroll action:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});