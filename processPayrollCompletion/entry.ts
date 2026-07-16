import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let payroll_run_id = 'unknown';

  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    payroll_run_id = payload.payroll_run_id;

    if (!payroll_run_id) {
      return Response.json({ error: 'Missing payroll_run_id' }, { status: 400 });
    }

    console.log(`Processing payroll completion for run: ${payroll_run_id}`);

    // 1. Load payroll run
    const [payrollRun] = await base44.asServiceRole.entities.PayrollRun.filter({
      id: payroll_run_id,
    });
    if (!payrollRun) {
      return Response.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // 2. Update payroll run status to completed
    await base44.asServiceRole.entities.PayrollRun.update(payroll_run_id, {
      status: 'completed',
    });

    // 3. Generate and send paystubs
    const generateResponse = await base44.asServiceRole.functions.invoke(
      'generatePaystubAndSend',
      { payroll_run_id }
    );
    console.log('Paystub generation result:', generateResponse);

    // 4. Process fund transfers to RapidPay cards
    const payoutResponse = await base44.asServiceRole.functions.invoke(
      'processPayout',
      { payroll_run_id }
    );
    console.log('Payout result:', payoutResponse);

    // 5. Load payroll items + employees
    const payrollItems = await base44.asServiceRole.entities.PayrollItem.filter({
      payroll_run_id,
    });
    const allEmployees = await base44.asServiceRole.entities.Employee.list();
    const empMap = Object.fromEntries(
      allEmployees.map((e: Record<string, string>) => [e.id, e])
    );

    const emailResults: { employee: string; sent: boolean; error?: string }[] = [];
    let totalDisbursed = 0;
    let successCount = 0;

    // 6. Send email + in-app notification to each employee
    for (const item of payrollItems) {
      const emp = empMap[item.employee_id];
      if (!emp) continue;

      const netPay = parseFloat(item.net_pay) || 0;
      totalDisbursed += netPay;
      successCount++;

      // Email to employee
      if (emp.email) {
        try {
          await base44.asServiceRole.functions.invoke('dwollaAddFundingSource', {
            to: emp.email,
            subject: `Your pay for ${payrollRun.period_start} – ${payrollRun.period_end} is on its way 💳`,
            html: buildPayEmail(emp, item, payrollRun),
          });
          emailResults.push({ employee: emp.email, sent: true });
        } catch (emailErr) {
          console.warn(`Email failed for ${emp.email}:`, (emailErr as Error).message);
          emailResults.push({
            employee: emp.email,
            sent: false,
            error: (emailErr as Error).message,
          });
        }
      }

      // In-app notification to employee
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: emp.email,
          title: '💳 Your pay is on its way!',
          message: `Your net pay of $${netPay.toFixed(2)} for ${payrollRun.period_start} to ${payrollRun.period_end} has been loaded to your RapidPay card.`,
          type: 'payroll',
          is_read: false,
          related_entity: 'PayrollRun',
          related_id: payroll_run_id,
        });
      } catch (notifErr) {
        console.warn(
          `In-app notification failed for ${emp.email}:`,
          (notifErr as Error).message
        );
      }
    }

    const fmt = (n: number) =>
      `$${n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    // 7. Send office summary email to OFFICE@SSS-NY.COM
    try {
      await base44.asServiceRole.functions.invoke('dwollaAddFundingSource', {
        to: 'OFFICE@SSS-NY.COM',
        subject: `✅ Payroll Completed — ${payrollRun.period_start} to ${payrollRun.period_end}`,
        html: buildOfficeAlert(payrollRun, successCount, totalDisbursed, fmt),
      });
      console.log('Office alert email sent to OFFICE@SSS-NY.COM');
    } catch (officeErr) {
      console.warn('Office alert email failed:', (officeErr as Error).message);
    }

    // 8. Send SMS to office via email-to-SMS gateway
    // Set OFFICE_SMS_GATEWAY secret in Base44 → Settings → Secrets
    // T-Mobile: 7182629606@tmomail.net
    // AT&T:     7182629606@txt.att.net
    // Verizon:  7182629606@vtext.com
    // Sprint:   7182629606@messaging.sprintpcs.com
    // Metro:    7182629606@mymetropcs.com
    const SMS_GATEWAY =
      Deno.env.get('OFFICE_SMS_GATEWAY') || '7182629606@tmomail.net';
    try {
      await base44.asServiceRole.functions.invoke('dwollaAddFundingSource', {
        to: SMS_GATEWAY,
        subject: '',
        html: `SSS Payroll Alert: ${successCount} employees paid. Total: ${fmt(totalDisbursed)}. Period: ${payrollRun.period_start} to ${payrollRun.period_end}. Questions: OFFICE@SSS-NY.COM`,
      });
      console.log(`SMS alert sent to ${SMS_GATEWAY}`);
    } catch (smsErr) {
      console.warn('SMS gateway alert failed:', (smsErr as Error).message);
    }

    // 9. Log completion
    await base44.asServiceRole.entities.PayrollLog.create({
      payroll_run_id,
      employee_id: 'system',
      employee_name: 'System Process',
      action: 'processed',
      log_type: 'payroll_item',
      amount: 0,
      details: JSON.stringify({
        action: 'payroll_completion',
        paystubs_sent: generateResponse?.data?.results?.length || 0,
        payouts_processed: payoutResponse?.data?.summary?.succeeded || 0,
        emails_sent: emailResults.filter(e => e.sent).length,
        total_disbursed: totalDisbursed,
        timestamp: new Date().toISOString(),
      }),
      status: 'completed',
    });

    return Response.json({
      success: true,
      message: 'Payroll completion processed successfully',
      paystubs_sent: generateResponse?.data?.results?.length || 0,
      payouts_processed: payoutResponse?.data?.summary?.succeeded || 0,
      emails_sent: emailResults.filter(e => e.sent).length,
      total_disbursed: totalDisbursed,
      email_results: emailResults,
    });

  } catch (error) {
    console.error('Error in processPayrollCompletion:', error);
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.PayrollLog.create({
        payroll_run_id,
        employee_id: 'system',
        employee_name: 'System Process',
        action: 'processed',
        log_type: 'payroll_item',
        amount: 0,
        details: JSON.stringify({
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        }),
        status: 'failed',
      });
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }
    return Response.json(
      { error: (error as Error).message, details: (error as Error).stack },
      { status: 500 }
    );
  }
});

// ── Employee pay email ──────────────────────────────────────────
function buildPayEmail(
  emp: Record<string, string>,
  item: Record<string, string | number>,
  run: Record<string, string>
) {
  const fmt = (n: unknown) =>
    `$${(Number(n) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const cardHint = emp.paycard_id
    ? `••••${String(emp.paycard_id).slice(-4)}`
    : 'your card';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f7fb;
             font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f4f7fb;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;
               box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0e2a47 0%,
                     #1a5276 60%,#0e9aa7 100%);padding:32px 36px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
              Superior Staffing Solutions
            </h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">
              Payroll Notification
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1a1a2e;">
              Hi <strong>${emp.first_name}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#555;">
              Your pay for the period <strong>${run.period_start}</strong> to
              <strong>${run.period_end}</strong> has been processed and loaded
              to your RapidPay card.
            </p>

            <!-- Pay Summary -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;
                     border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 14px;font-size:13px;font-weight:700;
                     color:#0e2a47;text-transform:uppercase;letter-spacing:1px;">
                    Pay Summary
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#555;">
                        Regular Hours
                      </td>
                      <td style="padding:6px 0;font-size:14px;color:#1a1a2e;
                                 text-align:right;font-weight:500;">
                        ${(Number(item.regular_hours) || 0).toFixed(1)} hrs
                      </td>
                    </tr>
                    ${Number(item.overtime_hours) > 0 ? `
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#555;">
                        Overtime Hours
                      </td>
                      <td style="padding:6px 0;font-size:14px;color:#1a1a2e;
                                 text-align:right;font-weight:500;">
                        ${(Number(item.overtime_hours) || 0).toFixed(1)} hrs
                      </td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#555;">
                        Gross Pay
                      </td>
                      <td style="padding:6px 0;font-size:14px;color:#1a1a2e;
                                 text-align:right;font-weight:500;">
                        ${fmt(item.gross_pay)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#e53e3e;">
                        Deductions
                      </td>
                      <td style="padding:6px 0;font-size:14px;color:#e53e3e;
                                 text-align:right;font-weight:500;">
                        -${fmt(item.total_deductions)}
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2"
                        style="padding:4px 0;border-top:1px solid #e2e8f0;">
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:16px;
                                 font-weight:700;color:#0e2a47;">
                        Net Pay
                      </td>
                      <td style="padding:8px 0;font-size:18px;
                                 font-weight:800;color:#0e9aa7;text-align:right;">
                        ${fmt(item.net_pay)}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Card Info -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:linear-gradient(135deg,#1a1a2e,#16213e);
                     border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:18px 24px;">
                  <p style="margin:0 0 4px;font-size:11px;
                     color:rgba(255,255,255,0.5);
                     text-transform:uppercase;letter-spacing:1px;">
                    RapidPay Card
                  </p>
                  <p style="margin:0;font-size:18px;font-weight:700;
                             color:#ffffff;letter-spacing:3px;">
                    ${cardHint}
                  </p>
                  <p style="margin:6px 0 0;font-size:12px;
                             color:rgba(255,255,255,0.6);">
                    Funds available within minutes
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#888;">
              Questions about your pay? Contact us at
              <a href="mailto:OFFICE@SSS-NY.COM" style="color:#0e9aa7;">
                OFFICE@SSS-NY.COM
              </a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 36px;
                     border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
              Superior Staffing Solutions NY Inc &nbsp;·&nbsp; New York, NY<br/>
              Questions?
              <a href="mailto:OFFICE@SSS-NY.COM" style="color:#aaa;">
                OFFICE@SSS-NY.COM
              </a><br/>
              This is an automated payroll notification.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Office alert email ──────────────────────────────────────────
function buildOfficeAlert(
  run: Record<string, string>,
  count: number,
  total: number,
  fmt: (n: number) => string
) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f7fb;
             font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f4f7fb;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;
               box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0e2a47 0%,
                     #1a5276 60%,#0e9aa7 100%);padding:28px 36px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
              ✅ Payroll Completed
            </h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">
              Superior Staffing Solutions — Admin Alert
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;">
              Payroll has been successfully processed and funded.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;
                     border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#555;">
                        Pay Period
                      </td>
                      <td style="padding:8px 0;font-size:14px;color:#1a1a2e;
                                 text-align:right;font-weight:600;">
                        ${run.period_start} to ${run.period_end}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#555;">
                        Employees Paid
                      </td>
                      <td style="padding:8px 0;font-size:14px;color:#1a1a2e;
                                 text-align:right;font-weight:600;">
                        ${count}
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2"
                        style="padding:4px 0;border-top:1px solid #e2e8f0;">
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:16px;
                                 font-weight:700;color:#0e2a47;">
                        Total Disbursed
                      </td>
                      <td style="padding:8px 0;font-size:20px;
                                 font-weight:800;color:#0e9aa7;text-align:right;">
                        ${fmt(total)}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#888;">
              All employees have been notified via email and in-app notification.
              Funds have been loaded to their RapidPay cards.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 36px;
                     border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
              Superior Staffing Solutions NY Inc &nbsp;·&nbsp; New York, NY<br/>
              <a href="mailto:OFFICE@SSS-NY.COM" style="color:#aaa;">
                OFFICE@SSS-NY.COM
              </a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}