import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Get the current user (should be admin)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine the notification trigger
    let subject = '';
    let bodyText = '';
    let shouldNotify = false;

    if (event.type === 'create') {
      // New payroll entry created
      subject = `New Payroll Entry Created - ${data.employee_name}`;
      bodyText = `
A new payroll entry has been created:

Employee: ${data.employee_name}
Pay Type: ${data.pay_type}
Gross Pay: $${data.gross_pay?.toFixed(2) || '0.00'}
Net Pay: $${data.net_pay?.toFixed(2) || '0.00'}
Period: ${data.period_start} to ${data.period_end}

Please review and approve when ready.
      `;
      shouldNotify = true;
    } else if (event.type === 'update' && data.status === 'approved' && old_data?.status !== 'approved') {
      // Status changed to approved
      subject = `Payroll Entry Approved - ${data.employee_name}`;
      bodyText = `
A payroll entry has been approved and is ready for processing:

Employee: ${data.employee_name}
Gross Pay: $${data.gross_pay?.toFixed(2) || '0.00'}
Net Pay: $${data.net_pay?.toFixed(2) || '0.00'}
Period: ${data.period_start} to ${data.period_end}

This entry will be processed according to the payroll schedule.
      `;
      shouldNotify = true;
    }

    if (!shouldNotify) {
      return Response.json({ status: 'skipped', reason: 'No notification trigger matched' });
    }

    // Get the admin/payroll manager email
    // For now, send to current user; in production, you might query for payroll manager role
    const recipientEmail = user.email;

    // Send email notification
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: subject,
      body: bodyText,
      from_name: 'Payroll System'
    });

    return Response.json({ 
      status: 'success',
      message: `Notification sent to ${recipientEmail}`,
      trigger: event.type === 'create' ? 'new_entry' : 'status_approved'
    });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});