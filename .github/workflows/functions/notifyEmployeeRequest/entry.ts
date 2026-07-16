import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create') return Response.json({ success: true });

    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    
    const emailPromises = adminUsers.map(admin =>
      base44.integrations.Core.SendEmail({
        to: admin.email,
        subject: `Employee Request Pending Approval from ${data.employee_name}`,
        body: `
          <p>A new employee request requires action:</p>
          <ul>
            <li><strong>Employee:</strong> ${data.employee_name}</li>
            <li><strong>Request Type:</strong> ${data.request_type.replace('_', ' ')}</li>
            <li><strong>Period:</strong> ${data.start_date} to ${data.end_date || 'N/A'}</li>
            ${data.details ? `<li><strong>Details:</strong> ${data.details}</li>` : ''}
          </ul>
          <p>Review and respond in the Employee Requests module.</p>
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