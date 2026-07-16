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
        subject: `Expense Report Submitted by ${data.employee_name}`,
        body: `
          <p>A new expense report requires approval:</p>
          <ul>
            <li><strong>Employee:</strong> ${data.employee_name}</li>
            <li><strong>Category:</strong> ${data.category}</li>
            <li><strong>Amount:</strong> $${data.amount.toFixed(2)}</li>
            <li><strong>Description:</strong> ${data.description}</li>
          </ul>
          <p>Review and approve in the Expenses module.</p>
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