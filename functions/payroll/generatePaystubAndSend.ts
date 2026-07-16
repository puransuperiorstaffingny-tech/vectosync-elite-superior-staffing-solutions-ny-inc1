import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const fmt = (n: unknown) => {
  if (typeof n === 'number') return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(n);
};

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { payroll_item_id, employee_email } = await req.json();
    if (!payroll_item_id || !employee_email) {
      return Response.json({ error: 'Missing payroll_item_id or employee_email' }, { status: 400 });
    }

    const item = await base44.asServiceRole.entities.PayrollItem.get(payroll_item_id);
    if (!item) return Response.json({ error: 'Payroll item not found' }, { status: 404 });

    const html = `
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2>Your Paystub - ${item.period_start}</h2>
  <p><strong>Employee:</strong> ${item.employee_name}</p>
  <table style="width: 100%; border-collapse: collapse;">
    <tr style="border-bottom: 1px solid #ddd;">
      <td><strong>Gross Pay:</strong></td>
      <td align="right">$${fmt(item.gross_pay)}</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td><strong>Total Deductions:</strong></td>
      <td align="right">$${fmt(item.total_deductions)}</td>
    </tr>
    <tr style="border-bottom: 2px solid #000; font-weight: bold;">
      <td><strong>Net Pay:</strong></td>
      <td align="right">$${fmt(item.net_pay)}</td>
    </tr>
  </table>
</body>
</html>
    `;

    await base44.integrations.Core.SendEmail({
      to: employee_email,
      subject: `Your Paystub - ${item.period_start}`,
      body: html,
    });

    console.log(`Paystub sent to ${employee_email}`);

    return Response.json({ success: true, message: 'Paystub sent' });
  } catch (error) {
    console.error('generatePaystubAndSend error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});