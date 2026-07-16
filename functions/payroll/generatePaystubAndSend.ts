import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const fmt = (n: unknown) => {
  if (typeof n === 'number') return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(n);
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
<head><style>
table { width: 100%; border-collapse: collapse; margin: 20px 0; }
td { padding: 10px; border-bottom: 1px solid #ddd; }
.amount { text-align: right; }
.total { font-weight: bold; border-bottom: 2px solid #000; }
</style></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
  <h2>Your Paystub - ${item.period_start}</h2>
  <p><strong>Employee:</strong> ${item.employee_name}</p>
  <p><strong>Period:</strong> ${item.period_start} to ${item.period_end}</p>
  <table>
    <tr><td><strong>Gross Pay</strong></td><td class="amount">$${fmt(item.gross_pay)}</td></tr>
    <tr><td><strong>Federal Tax</strong></td><td class="amount">-$${fmt(item.federal_tax)}</td></tr>
    <tr><td><strong>State Tax</strong></td><td class="amount">-$${fmt(item.state_tax)}</td></tr>
    <tr><td><strong>Total Deductions</strong></td><td class="amount">-$${fmt(item.total_deductions)}</td></tr>
    <tr class="total"><td><strong>Net Pay</strong></td><td class="amount"><strong>$${fmt(item.net_pay)}</strong></td></tr>
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