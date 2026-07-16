import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event?.type !== 'create') return Response.json({ success: true, skipped: 'Not a create event' });

    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    
    const emailPromises = adminUsers.map(admin =>
      base44.integrations.Core.SendEmail({
        to: admin.email,
        subject: `Payroll Entry Created by ${data?.employee_name || 'System'}`,
        body: `
          <p>A new payroll entry has been recorded:</p>
          <ul>
            <li><strong>Employee:</strong> ${data?.employee_name}</li>
            <li><strong>Period:</strong> ${data?.period_start} to ${data?.period_end}</li>
            <li><strong>Gross Pay:</strong> $${(data?.gross_pay || 0).toFixed(2)}</li>
            <li><strong>Net Pay:</strong> $${(data?.net_pay || 0).toFixed(2)}</li>
          </ul>
          <p>Review in the Payroll module.</p>
        `
      }).catch(e => console.error('Email send failed:', e))
    );

    await Promise.all(emailPromises);
    return Response.json({ success: true, notified: adminUsers.length });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});