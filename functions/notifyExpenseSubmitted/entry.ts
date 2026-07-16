import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { expense_id, employee_email, employee_name, amount, description } = await req.json();

    console.log(`Processing expense notification for ${expense_id}`);

    // Fetch the expense to get full details
    const expense = await base44.asServiceRole.entities.ExpenseReport.filter({ id: expense_id });
    if (!expense || expense.length === 0) {
      console.error(`Expense ${expense_id} not found`);
      return Response.json({ error: 'Expense not found' }, { status: 404 });
    }

    const exp = expense[0];

    // Find employee and their manager
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      email: employee_email 
    });

    if (!employees || employees.length === 0) {
      console.error(`Employee with email ${employee_email} not found`);
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employee = employees[0];
    const employeeDept = employee.department;

    // Find department manager email
    const depts = await base44.asServiceRole.entities.Department.filter({ 
      name: employeeDept 
    });

    let managerEmail = null;
    if (depts && depts.length > 0) {
      managerEmail = depts[0].manager_email;
    }

    if (!managerEmail) {
      console.warn(`No manager email found for department ${employeeDept}`);
      return Response.json({ 
        success: true, 
        message: 'Expense logged but no manager notification sent' 
      });
    }

    // Send email to manager
    const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2>New Expense Report Submitted</h2>
  <p><strong>Employee:</strong> ${employee_name}</p>
  <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
  <p><strong>Description:</strong> ${description}</p>
  <p><strong>Category:</strong> ${exp.category}</p>
  ${exp.project ? `<p><strong>Project:</strong> ${exp.project}</p>` : ''}
  <p><strong>Date:</strong> ${exp.date}</p>
  <hr />
  <p style="font-size: 12px; color: #666;">
    Please review this expense report in the system and take appropriate action (approve or reject).
  </p>
</body>
</html>
    `;

    try {
      await base44.integrations.Core.SendEmail({
        to: managerEmail,
        subject: `New Expense Report: ${employee_name} - $${amount.toFixed(2)}`,
        body: emailBody,
      });
      console.log(`Notification sent to manager: ${managerEmail}`);
    } catch (emailErr) {
      console.error("Error sending manager email:", emailErr);
      // Don't fail the whole operation if email fails
    }

    // Also notify the employee that their submission was received
    try {
      const confirmBody = `
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2>Expense Report Received</h2>
  <p>Hi ${employee_name},</p>
  <p>Your expense report has been successfully submitted and is pending manager review.</p>
  <p><strong>Details:</strong></p>
  <ul>
    <li>Amount: $${amount.toFixed(2)}</li>
    <li>Description: ${description}</li>
    <li>Category: ${exp.category}</li>
    <li>Date: ${exp.date}</li>
  </ul>
  <p>Your manager will review and respond shortly.</p>
</body>
</html>
      `;
      
      await base44.integrations.Core.SendEmail({
        to: employee_email,
        subject: `Expense Report Confirmation - $${amount.toFixed(2)}`,
        body: confirmBody,
      });
      console.log(`Confirmation sent to employee: ${employee_email}`);
    } catch (emailErr) {
      console.error("Error sending employee confirmation:", emailErr);
    }

    return Response.json({ 
      success: true, 
      message: `Expense notification sent to manager: ${managerEmail}`,
      expense_id
    });
  } catch (error) {
    console.error('Expense notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});