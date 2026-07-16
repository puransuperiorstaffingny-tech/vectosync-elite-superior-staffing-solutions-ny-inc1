import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Automated billing workflow.
 * Pulls approved timesheet hours for a date range, matches each employee's
 * hours to the customer's pay codes (billing rate / OT billing rate), and
 * generates one draft client invoice per customer.
 *
 * Payload: { period_start: "YYYY-MM-DD", period_end: "YYYY-MM-DD", client_id?: string }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { period_start, period_end, client_id } = await req.json();
    if (!period_start || !period_end) {
      return Response.json({ error: 'Missing period_start or period_end' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Load reference data
    const [clients, payCodes, employees, allEntries] = await Promise.all([
      svc.entities.Client.list(undefined, 1000),
      svc.entities.CustomerPayCode.list(undefined, 2000),
      svc.entities.Employee.list(undefined, 5000),
      svc.entities.TimeEntry.filter({ status: 'approved' }, '-date', 5000),
    ]);

    // Filter time entries by date range
    const entries = allEntries.filter(e => e.date >= period_start && e.date <= period_end);

    const targetClients = client_id ? clients.filter(c => c.id === client_id) : clients;
    const empById = Object.fromEntries(employees.map(e => [e.id, e]));

    const created = [];

    for (const client of targetClients) {
      // Pay codes that belong to this client (match by name or code)
      const clientCodes = payCodes.filter(pc =>
        pc.is_active !== false && (
          pc.customer_name === client.company_name ||
          (client.client_code && pc.customer_code === client.client_code)
        )
      );
      if (clientCodes.length === 0) continue;

      // Group hours by pay code using employee department/position match
      const lineMap = {};
      for (const entry of entries) {
        const emp = empById[entry.employee_id];
        if (!emp) continue;

        // Find a matching pay code for this employee (by position or department), else first code
        const match = clientCodes.find(pc =>
          (pc.position && pc.position === emp.position) ||
          (pc.department && pc.department === emp.department)
        ) || clientCodes[0];

        const hours = entry.total_hours || 0;
        if (hours <= 0) continue;

        const isOT = !!entry.is_overtime;
        const rate = isOT
          ? (match.overtime_billing_rate || match.billing_rate || client.billing_rate || 0)
          : (match.billing_rate || client.billing_rate || 0);

        const key = `${match.pay_code}__${isOT ? 'OT' : 'REG'}`;
        if (!lineMap[key]) {
          lineMap[key] = {
            description: `${match.pay_code_description || match.pay_code}${isOT ? ' (Overtime)' : ''}`,
            quantity: 0,
            rate,
            amount: 0,
          };
        }
        lineMap[key].quantity += hours;
      }

      const line_items = Object.values(lineMap)
        .map(li => ({ ...li, quantity: parseFloat(li.quantity.toFixed(2)), amount: parseFloat((li.quantity * li.rate).toFixed(2)) }))
        .filter(li => li.quantity > 0);

      if (line_items.length === 0) continue;

      const subtotal = parseFloat(line_items.reduce((s, li) => s + li.amount, 0).toFixed(2));

      // Due date from client payment terms
      const termsDays = { due_on_receipt: 0, net_15: 15, net_30: 30, net_45: 45, net_60: 60 }[client.payment_terms || 'net_30'] ?? 30;
      const due = new Date(period_end);
      due.setDate(due.getDate() + termsDays);

      const invoice = await svc.entities.Invoice.create({
        invoice_number: `INV-${client.client_code || client.company_name.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`,
        client_id: client.id,
        client_name: client.company_name,
        client_email: client.email || '',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: due.toISOString().slice(0, 10),
        status: 'draft',
        line_items,
        subtotal,
        tax_rate: 0,
        tax_amount: 0,
        total: subtotal,
        amount_paid: 0,
        notes: `Auto-generated from timesheets for period ${period_start} to ${period_end}.`,
      });

      created.push({ client: client.company_name, invoice_id: invoice.id, total: subtotal, lines: line_items.length });
    }

    return Response.json({ success: true, generated: created.length, invoices: created });
  } catch (error) {
    console.error('generateClientInvoices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});