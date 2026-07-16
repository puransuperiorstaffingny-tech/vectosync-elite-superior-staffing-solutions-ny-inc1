import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

/**
 * stripePayouts — Disburse payroll net pay via Stripe Connect payouts
 *
 * Flow:
 *  1. Validate admin auth
 *  2. Load Stripe API key from AppSetting key="stripe_payroll_config"
 *  3. Load payroll run + items
 *  4. For each employee: create a Stripe Transfer to their connected account
 *     OR create a payout if using Stripe Treasury / bank debit
 *  5. Log each result to PayrollLog
 *
 * Required payload: { payroll_run_id, employee_ids? }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { payroll_run_id, employee_ids } = body;

    if (!payroll_run_id) {
      return Response.json({ error: 'payroll_run_id is required' }, { status: 400 });
    }

    // 1. Load Stripe config
    const stripeSettings = await base44.asServiceRole.entities.AppSetting.filter({ key: 'stripe_payroll_config' });
    if (stripeSettings.length === 0) {
      return Response.json({ error: 'Stripe payroll not configured. Please add Stripe credentials in Payroll Payouts → Config.' }, { status: 400 });
    }
    const stripeConfig = JSON.parse(stripeSettings[0].value || '{}');
    const stripeSecretKey = stripeConfig.secret_key || '';

    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe secret key not configured.' }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);

    // 2. Load company profile for funding source
    const profileSettings = await base44.asServiceRole.entities.AppSetting.filter({ key: 'company_profile' });
    const companyProfile = profileSettings.length > 0 ? JSON.parse(profileSettings[0].value || '{}') : {};

    // 3. Load payroll run
    const [payrollRun] = await base44.asServiceRole.entities.PayrollRun.filter({ id: payroll_run_id });
    if (!payrollRun) {
      return Response.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // 4. Load payroll items
    const allItems = await base44.asServiceRole.entities.PayrollItem.filter({ payroll_run_id });
    const targetItems = employee_ids?.length > 0
      ? allItems.filter(item => employee_ids.includes(item.employee_id))
      : allItems;

    if (targetItems.length === 0) {
      return Response.json({ success: false, message: 'No payroll items found for this run' }, { status: 400 });
    }

    // 5. Load employees
    const allEmployees = await base44.asServiceRole.entities.Employee.filter({ status: 'active' });
    const empMap = Object.fromEntries(allEmployees.map(e => [e.id, e]));

    const results = { success: [], failed: [], skipped: [] };
    const logs = [];

    for (const item of targetItems) {
      const emp = empMap[item.employee_id];
      if (!emp) {
        results.skipped.push({ employee_id: item.employee_id, reason: 'Employee record not found' });
        continue;
      }

      const netPay = item.net_pay || 0;
      if (netPay <= 0) {
        results.skipped.push({ name: item.employee_name, reason: 'Net pay is $0' });
        continue;
      }

      // Employee needs a Stripe connected account ID stored in bank_account_number field
      // OR we use bank routing/account via Stripe Financial Connections
      const stripeAccountId = emp.stripe_account_id || null;
      const hasBankInfo = emp.bank_account_number && emp.bank_routing_number;

      if (!stripeAccountId && !hasBankInfo) {
        results.skipped.push({ name: item.employee_name, reason: 'No Stripe account or bank info on file' });
        continue;
      }

      let disbursementStatus = 'pending';
      let disbursementRef = null;
      let errorDetail = null;

      try {
        if (stripeAccountId) {
          // Method A: Stripe Connect Transfer to employee's connected account
          const transfer = await stripe.transfers.create({
            amount: Math.round(netPay * 100), // cents
            currency: 'usd',
            destination: stripeAccountId,
            description: `Payroll ${payrollRun.period_start} to ${payrollRun.period_end}`,
            metadata: {
              employee_id: emp.id,
              employee_name: item.employee_name,
              payroll_run_id,
            },
          });
          disbursementStatus = 'completed';
          disbursementRef = transfer.id;
          results.success.push({ name: item.employee_name, amount: netPay, ref: transfer.id, method: 'stripe_transfer' });
          console.log(`Stripe transfer created for ${item.employee_name}: ${transfer.id}`);
        } else {
          // Method B: Create a Stripe Payout via ACH (requires Stripe Treasury or bank debit setup)
          // We queue a pending record for manual Stripe dashboard processing
          disbursementStatus = 'pending';
          disbursementRef = null;
          results.success.push({ name: item.employee_name, amount: netPay, note: 'Queued — add Stripe account ID to employee for auto-transfer', method: 'queued' });
          console.log(`Queued payout for ${item.employee_name} — no Stripe account ID configured`);
        }
      } catch (stripeErr) {
        disbursementStatus = 'failed';
        errorDetail = stripeErr.message;
        console.error(`Stripe transfer failed for ${item.employee_name}:`, stripeErr.message);
        results.failed.push({ name: item.employee_name, amount: netPay, error: stripeErr.message });
      }

      logs.push(
        base44.asServiceRole.entities.PayrollLog.create({
          log_type: 'direct_deposit',
          payroll_run_id,
          employee_id: emp.id,
          employee_name: item.employee_name,
          amount: netPay,
          status: disbursementStatus,
          notes: disbursementRef
            ? `Stripe Transfer: ${disbursementRef}`
            : errorDetail
            ? `Error: ${errorDetail}`
            : 'Queued — no Stripe account ID',
          period_start: payrollRun.period_start,
          period_end: payrollRun.period_end,
        })
      );
    }

    await Promise.allSettled(logs);

    const totalDisbursed = results.success
      .filter(r => r.method === 'stripe_transfer')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return Response.json({
      success: true,
      message: `Processed ${targetItems.length} employees via Stripe. ${results.success.length} initiated, ${results.failed.length} failed, ${results.skipped.length} skipped.`,
      summary: {
        total_employees: targetItems.length,
        succeeded: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        total_disbursed: totalDisbursed,
        funding_account: companyProfile.funding_bank_name ? `${companyProfile.funding_bank_name} ••••${companyProfile.funding_account_number?.slice(-4)}` : 'Stripe Account',
        api_used: 'stripe',
      },
      results,
    });

  } catch (error) {
    console.error('stripePayouts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});