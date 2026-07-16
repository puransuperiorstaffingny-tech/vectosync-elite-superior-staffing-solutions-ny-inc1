import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { action, log_type, employee_id, employee_name, amount, details } = body;

    if (!action || !log_type) {
      return Response.json({ error: 'Missing action or log_type' }, { status: 400 });
    }

    const log = await base44.asServiceRole.entities.PayrollLog.create({
      action,
      log_type,
      employee_id: employee_id || null,
      employee_name: employee_name || 'System',
      amount: amount || 0,
      details: JSON.stringify(details || {}),
      admin_email: user.email,
      admin_name: user.full_name || user.email,
      created_at: new Date().toISOString(),
    });

    return Response.json({ success: true, log });
  } catch (error) {
    console.error('logPayrollAction error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});