import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * processPayout — Disburse net pay via RapidPay fund-transfer API.
 *
 * Flow:
 *  1. Login to pie.rapidadmin.com (pre-login token → Bearer token)
 *  2. Load the payroll run + its PayrollItems
 *  3. For each item, look up employee.paycard_id as the destination card
 *  4. POST fund-transfer from RAPIDPAY_MASTER_CARD_ID → employee card
 *  5. Log each result to PayrollLog
 *
 * Required env secrets:
 *   RAPID_USER_ID, RAPID_PASSWORD, RAPIDPAY_MASTER_CARD_ID
 * Optional:
 *   RAPID_SITE_ID (defaults to "4")
 */

const BASE_URL = 'https://pie.rapidadmin.com';
const ORIGINATOR = 'RapidAdminPortal';
const CLIENT_TYPE = '2';
const UTILITY_KEY = 1;

function baseHeaders({ includeSiteId = true } = {}) {
  const siteId = Deno.env.get('RAPID_SITE_ID') || '4';
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'RequestID': crypto.randomUUID(),
    'Originator': ORIGINATOR,
    'clienttype': CLIENT_TYPE,
    'Content-Type': 'application/json',
  };
  if (includeSiteId) headers['SiteId'] = String(siteId);
  return headers;
}

async function login(): Promise<string> {
  const preRes = await fetch(`${BASE_URL}/api/useragents/requesttokens`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      resourceUrl: 'authenticationgateway/v1/profile/tokens/login',
      utilityKey: UTILITY_KEY,
    }),
  });
  const preText = await preRes.text();
  if (!preRes.ok) throw new Error(`Pre-login token failed (${preRes.status}): ${preText}`);

  let preToken = '';
  try {
    const preData = JSON.parse(preText);
    preToken = preData.requesttoken || preData.requestToken || '';
  } catch { /* ignore */ }

  if (!preToken) throw new Error(`Pre-login response did not contain a token: ${preText}`);

  // Raw pre-login token in Authorization — no "Bearer " prefix
  const headers = baseHeaders({ includeSiteId: false });
  headers['Authorization'] = preToken;

  const res = await fetch(`${BASE_URL}/api/user-management/user/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userId: Deno.env.get('RAPID_USER_ID') || '',
      password: Deno.env.get('RAPID_PASSWORD') || '',
      rememberDevice: true,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${text}`);

  const data = JSON.parse(text);
  const bearer = data.accesstoken || data.accessToken;
  if (!bearer) throw new Error(`Login did not return an access token: ${text}`);
  return bearer;
}

async function fundTransfer(
  bearer: string,
  fromCardId: string,
  toCardId: string,
  amount: number
) {
  const headers = baseHeaders();
  headers['Authorization'] = `Bearer ${bearer}`;

  const res = await fetch(
    `${BASE_URL}/api/account-management/program/account/fund-transfer`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fromCardId,
        toCardId,
        fundingToCard: true,
        fundAmount: amount,
        fromMemo: 'Payroll',
        toMemo: 'Payroll',
      }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Fund transfer failed for card ${toCardId} (${res.status}): ${text}`);
  }
  const data = JSON.parse(text);
  if (data.responseCode !== 0) {
    throw new Error(
      `Transfer error (responseCode ${data.responseCode}): ` +
      `${data.responseDescription || data.exceptionMessage || JSON.stringify(data)}`
    );
  }
  return data;
}

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

    // Master (funding) card must be configured as an env secret
    const masterCardId = Deno.env.get('RAPIDPAY_MASTER_CARD_ID');
    if (!masterCardId) {
      return Response.json(
        { error: 'RAPIDPAY_MASTER_CARD_ID env secret is not set' },
        { status: 500 }
      );
    }

    // Load payroll run
    const [payrollRun] = await base44.asServiceRole.entities.PayrollRun.filter({
      id: payroll_run_id,
    });
    if (!payrollRun) {
      return Response.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // Load payroll items
    const allItems = await base44.asServiceRole.entities.PayrollItem.filter({
      payroll_run_id,
    });
    const targetItems =
      employee_ids?.length > 0
        ? allItems.filter((item: Record<string, string>) =>
            employee_ids.includes(item.employee_id)
          )
        : allItems;

    if (targetItems.length === 0) {
      return Response.json(
        { success: false, message: 'No payroll items found for this run' },
        { status: 400 }
      );
    }

    // Build employee map — keyed by employee id
    const allEmployees = await base44.asServiceRole.entities.Employee.list();
    const empMap: Record<string, Record<string, string>> = {};
    allEmployees.forEach((e: Record<string, string>) => { empMap[e.id] = e; });

    const bearer = await login();

    const results: unknown[] = [];
    const errors: unknown[] = [];
    const skipped: unknown[] = [];
    const logPromises: Promise<unknown>[] = [];

    for (const item of targetItems) {
      const emp = empMap[item.employee_id];

      if (!emp) {
        skipped.push({ employee_id: item.employee_id, reason: 'Employee record not found' });
        continue;
      }

      const netPay = parseFloat(item.net_pay) || 0;
      if (netPay <= 0) {
        skipped.push({ name: item.employee_name, reason: 'Net pay is $0' });
        continue;
      }

      // paycard_id is the RapidPay destination card — same field used everywhere in this app
      const toCardId = emp.paycard_id;
      if (!toCardId) {
        skipped.push({
          name: item.employee_name,
          reason: 'No paycard_id on employee record — enroll via Rapid Pay Export first',
        });
        continue;
      }

      let status = 'pending';
      let ref: string | null = null;
      let errorDetail: string | null = null;

      try {
        const result = await fundTransfer(bearer, masterCardId, toCardId, netPay);
        status = 'completed';
        ref = result.data?.transactionId || result.data?.referenceId || null;
        results.push({ name: item.employee_name, card: toCardId, amount: netPay, ref });
      } catch (err) {
        status = 'failed';
        errorDetail = (err as Error).message;
        errors.push({ name: item.employee_name, card: toCardId, amount: netPay, error: errorDetail });
      }

      logPromises.push(
        base44.asServiceRole.entities.PayrollLog.create({
          log_type: 'direct_deposit',
          payroll_run_id,
          employee_id: emp.id,
          employee_name: item.employee_name,
          amount: netPay,
          status,
          notes: ref ? `Ref: ${ref}` : errorDetail ? `Error: ${errorDetail}` : 'Pending',
          period_start: payrollRun.period_start,
          period_end: payrollRun.period_end,
        })
      );
    }

    await Promise.allSettled(logPromises);

    const totalDisbursed = (results as Record<string, number>[]).reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    );

    return Response.json({
      success: true,
      message: `Processed ${targetItems.length} employees. ${results.length} succeeded, ${errors.length} failed, ${skipped.length} skipped.`,
      summary: {
        total_employees: targetItems.length,
        succeeded: results.length,
        failed: errors.length,
        skipped: skipped.length,
        total_disbursed: totalDisbursed,
      },
      results,
      errors,
      skipped,
    });
  } catch (error) {
    console.error('processPayout error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});