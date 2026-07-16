import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by automation when an ExpenseReport is approved.
// Creates a PayrollItem adjustment and marks the expense as applied.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support direct call with expense data OR automation event payload
    const expenseData = body.data || body.expense;
    const expenseId = body.event?.entity_id || body.expense_id;

    if (!expenseData && !expenseId) {
      return Response.json({ error: "No expense data provided" }, { status: 400 });
    }

    let expense = expenseData;
    if (!expense) {
      const results = await base44.asServiceRole.entities.ExpenseReport.filter({ id: expenseId });
      expense = results[0];
    }

    if (!expense) return Response.json({ error: "Expense not found" }, { status: 404 });
    if (expense.status !== "approved") return Response.json({ skipped: true, reason: "Not approved" });
    if (expense.payroll_applied) return Response.json({ skipped: true, reason: "Already applied" });

    const treatment = expense.accounting_treatment || "reimburse";
    if (treatment === "no_action") {
      return Response.json({ skipped: true, reason: "No action treatment" });
    }

    // Find the most recent open payroll run for this employee, or create a standalone adjustment
    const runs = await base44.asServiceRole.entities.PayrollRun.filter({ status: "draft" }, "-period_start", 1);
    
    const today = new Date().toISOString().slice(0, 10);
    let payrollRunId;

    if (runs.length > 0) {
      payrollRunId = runs[0].id;
    } else {
      // Create a standalone adjustment run if none exists
      const run = await base44.asServiceRole.entities.PayrollRun.create({
        period_start: today,
        period_end: today,
        run_date: today,
        status: "draft",
        notes: "Auto-created for expense adjustments",
        pay_frequency: "biweekly",
      });
      payrollRunId = run.id;
    }

    const amount = Number(expense.amount) || 0;
    const isDeduction = treatment === "deduct_from_pay";
    const adjustmentAmount = isDeduction ? -amount : amount;

    // Create the payroll item adjustment
    await base44.asServiceRole.entities.PayrollItem.create({
      payroll_run_id: payrollRunId,
      employee_id: expense.employee_id,
      employee_name: expense.employee_name,
      pay_type: "hourly",
      regular_hours: 0,
      overtime_hours: 0,
      hourly_rate: 0,
      regular_pay: 0,
      overtime_pay: 0,
      gross_pay: adjustmentAmount,
      federal_tax: 0,
      state_tax: 0,
      local_tax: 0,
      deduction_401k: 0,
      deduction_health: 0,
      deduction_other: isDeduction ? amount : 0,
      total_deductions: isDeduction ? amount : 0,
      net_pay: adjustmentAmount,
      period_start: today,
      period_end: today,
    });

    // Mark the expense as applied to payroll
    await base44.asServiceRole.entities.ExpenseReport.update(expense.id, {
      payroll_applied: true,
      payroll_applied_at: new Date().toISOString(),
    });

    console.log(`Expense ${expense.id} (${treatment}) applied to payroll run ${payrollRunId} for ${expense.employee_name}: $${adjustmentAmount}`);

    return Response.json({ success: true, treatment, adjustmentAmount, payrollRunId });
  } catch (error) {
    console.error("applyExpenseToPayroll error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});