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
        subject: `Time Entry Submitted by ${data?.employee_name || 'Employee'}`,
        body: `
          <p>A new time entry has been submitted for approval:</p>
          <ul>
            <li><strong>Employee:</strong> ${data?.employee_name}</li>
            <li><strong>Date:</strong> ${data?.date}</li>
            <li><strong>Hours:</strong> ${data?.total_hours}</li>
          </ul>
          <p>Please review and approve in the Time Tracking module.</p>
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