import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { payroll_run_id } = payload;

    if (!payroll_run_id) {
      return Response.json({ error: 'Missing payroll_run_id' }, { status: 400 });
    }

    // Load payroll run
    const [payrollRun] = await base44.asServiceRole.entities.PayrollRun.filter({
      id: payroll_run_id,
    });
    if (!payrollRun) {
      return Response.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // Load payroll items
    const payrollItems = await base44.asServiceRole.entities.PayrollItem.filter({
      payroll_run_id,
    });
    if (!payrollItems || payrollItems.length === 0) {
      return Response.json({ error: 'No payroll items found' }, { status: 400 });
    }

    // Load company profile for logo
    const profileSettings = await base44.asServiceRole.entities.AppSetting.filter({
      key: 'company_profile',
    });
    const companyProfile = profileSettings.length > 0
      ? JSON.parse(profileSettings[0].value || '{}')
      : {};
    const logoUrl = companyProfile.logo_url || '';

    // Build employee map
    const employees = await base44.asServiceRole.entities.Employee.list();
    const employeeMap: Record<string, Record<string, string | number>> = {};
    employees.forEach((emp: Record<string, string>) => {
      employeeMap[emp.id] = emp;
    });

    const sendResults: unknown[] = [];

    for (const item of payrollItems) {
      try {
        const employee = employeeMap[item.employee_id];
        if (!employee || !employee.email) {
          console.warn(`No email found for employee ${item.employee_id}`);
          sendResults.push({
            employee_id: item.employee_id,
            status: 'skipped',
            reason: 'No email on file',
          });
          continue;
        }

        // Load time entries for this employee and pay period
        const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({
          employee_id: item.employee_id,
        });
        const periodEntries = timeEntries.filter((e: Record<string, string>) =>
          e.date >= payrollRun.period_start &&
          e.date <= payrollRun.period_end
        );

        // Send paystub email
        await base44.asServiceRole.functions.invoke('dwollaAddFundingSource', {
          to: employee.email,
          subject: `Your Pay Stub — ${payrollRun.period_start} to ${payrollRun.period_end}`,
          html: generatePaystubHTML(item, employee, payrollRun, logoUrl),
        });

        // Send timecard email
        await base44.asServiceRole.functions.invoke('dwollaAddFundingSource', {
          to: employee.email,
          subject: `Your Timecard — ${payrollRun.period_start} to ${payrollRun.period_end}`,
          html: generateTimecardHTML(item, employee, payrollRun, periodEntries, logoUrl),
        });

        // Log the action
        await base44.asServiceRole.entities.PayrollLog.create({
          payroll_run_id,
          employee_id: item.employee_id,
          employee_name: item.employee_name,
          action: 'processed',
          log_type: 'check',
          amount: item.net_pay,
          details: JSON.stringify({
            gross_pay: item.gross_pay,
            deductions: item.total_deductions,
            net_pay: item.net_pay,
            regular_hours: item.regular_hours,
            overtime_hours: item.overtime_hours,
            timecard_entries: periodEntries.length,
          }),
          status: 'completed',
          period_start: payrollRun.period_start,
          period_end: payrollRun.period_end,
        });

        sendResults.push({
          employee_id: item.employee_id,
          email: employee.email,
          status: 'sent',
          paystub: true,
          timecard: true,
        });

        console.log(`Paystub + Timecard sent to ${employee.email}`);

      } catch (err) {
        console.error(`Error processing for ${item.employee_id}:`, err);
        sendResults.push({
          employee_id: item.employee_id,
          status: 'failed',
          error: (err as Error).message,
        });
      }
    }

    return Response.json({
      success: true,
      total_processed: payrollItems.length,
      results: sendResults,
      message: 'Paystubs and timecards generated and sent successfully',
    });

  } catch (error) {
    console.error('Error in generatePaystubAndSend:', error);
    return Response.json(
      { error: (error as Error).message, details: (error as Error).stack },
      { status: 500 }
    );
  }
});

// ── Shared Helpers ──────────────────────────────────────────────
const fmt = (n: unknown) =>
  `$${(Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return d; }
};

const fmtShortDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  } catch { return d; }
};

const fmtDay = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short' });
  } catch { return ''; }
};

// Logo block — uses real logo if available, falls back to Gold S
function logoBlock(logoUrl: string, size = 60): string {
  if (logoUrl) {
    return `
      <img
        src="${logoUrl}"
        alt="Superior Staffing Solutions"
        width="${size}"
        height="${size}"
        style="display:block;width:${size}px;height:${size}px;
               object-fit:contain;border-radius:10px;"
      />`;
  }
  const fontSize = Math.round(size * 0.5);
  return `
    <div style="width:${size}px;height:${size}px;
                background:linear-gradient(135deg,#c9a84c,#f0d080,#c9a84c);
                border-radius:${Math.round(size * 0.2)}px;
                text-align:center;vertical-align:middle;
                line-height:${size}px;">
      <span style="font-size:${fontSize}px;font-weight:900;
                   color:#0a1f3c;font-family:Georgia,serif;
                   line-height:${size}px;">S</span>
    </div>`;
}

// ── PAYSTUB HTML ────────────────────────────────────────────────
function generatePaystubHTML(
  item: Record<string, string | number>,
  employee: Record<string, string | number>,
  payrollRun: Record<string, string>,
  logoUrl: string = ''
) {
  const cardHint = employee.paycard_id
    ? `••••${String(employee.paycard_id).slice(-4)}`
    : null;

  const hasOT = Number(item.overtime_hours) > 0;

  const deductions = [
    { label: 'Federal Income Tax', val: item.federal_tax },
    { label: 'State Income Tax', val: item.state_tax },
    { label: 'Local Tax', val: item.local_tax },
    { label: '401(k) Contribution', val: item.deduction_401k },
    { label: 'Health Insurance', val: item.deduction_health },
    { label: 'Other Deductions', val: item.deduction_other },
  ].filter(d => Number(d.val) > 0);

  const earningRow = (label: string, sub: string, value: string, color = '#1a1a2e') => `
    <tr>
      <td style="padding:7px 0;font-size:13px;color:#555;
                 border-bottom:1px solid #f0f0f0;">
        ${label}<br/>
        <span style="font-size:11px;color:#aaa;">${sub}</span>
      </td>
      <td style="padding:7px 0;font-size:13px;color:${color};
                 text-align:right;font-weight:500;
                 border-bottom:1px solid #f0f0f0;">
        ${value}
      </td>
    </tr>`;

  const deductionRow = (label: string, value: string) => `
    <tr>
      <td style="padding:7px 0;font-size:13px;color:#555;
                 border-bottom:1px solid #f0f0f0;">${label}</td>
      <td style="padding:7px 0;font-size:13px;color:#e53e3e;
                 text-align:right;font-weight:500;
                 border-bottom:1px solid #f0f0f0;">-${value}</td>
    </tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Pay Stub — Superior Staffing Solutions</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;
             font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#eef2f7;padding:32px 16px;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0"
  style="background:#ffffff;border-radius:16px;overflow:hidden;
         box-shadow:0 4px 24px rgba(0,0,0,0.10);">

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(135deg,#0a1f3c 0%,
               #0e3460 50%,#0b7a8a 100%);padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px;vertical-align:middle;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:16px;">
                  ${logoBlock(logoUrl, 60)}
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:10px;font-weight:700;
                     color:rgba(255,255,255,0.5);letter-spacing:2px;
                     text-transform:uppercase;">Official Document</p>
                  <h1 style="margin:4px 0 0;font-size:21px;font-weight:800;
                             color:#ffffff;letter-spacing:-0.3px;">
                    Superior Staffing Solutions
                  </h1>
                  <p style="margin:3px 0 0;font-size:12px;
                             color:rgba(255,255,255,0.55);">
                    New York, NY &nbsp;·&nbsp; OFFICE@SSS-NY.COM
                  </p>
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:24px 32px;text-align:right;vertical-align:top;">
            <table cellpadding="0" cellspacing="0" style="margin-left:auto;">
              <tr>
                <td style="background:rgba(255,255,255,0.12);
                            border:1px solid rgba(255,255,255,0.25);
                            border-radius:8px;padding:10px 18px;
                            text-align:center;">
                  <p style="margin:0;font-size:10px;font-weight:700;
                     color:rgba(255,255,255,0.6);letter-spacing:2px;
                     text-transform:uppercase;">Pay Stub</p>
                  <p style="margin:4px 0 0;font-size:13px;font-weight:700;
                             color:#ffffff;">${fmtDate(payrollRun.period_start)}</p>
                  <p style="margin:2px 0 0;font-size:12px;
                             color:rgba(255,255,255,0.6);">
                    to ${fmtDate(payrollRun.period_end)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- EMPLOYEE INFO -->
  <tr>
    <td style="background:#f8fafc;border-bottom:2px solid #e2e8f0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:20px 32px;" width="50%">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:44px;height:44px;border-radius:50%;
                                  background:linear-gradient(135deg,#0e3460,#0b7a8a);
                                  text-align:center;vertical-align:middle;">
                        <span style="color:#ffffff;font-size:16px;
                                     font-weight:800;line-height:44px;">
                          ${String(employee.first_name||'?')[0]}${String(employee.last_name||'?')[0]}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <p style="margin:0;font-size:15px;font-weight:700;
                             color:#0e2a47;">
                    ${employee.first_name} ${employee.last_name}
                  </p>
                  <p style="margin:2px 0 0;font-size:12px;color:#888;">
                    ${employee.position || 'Employee'}
                    ${employee.department ? ` &nbsp;·&nbsp; ${employee.department}` : ''}
                  </p>
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:20px 32px;border-left:1px solid #e2e8f0;"
              width="50%">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size:11px;color:#999;padding:3px 0;">Employee ID</td>
                <td style="font-size:12px;color:#333;font-weight:600;
                           text-align:right;padding:3px 0;">
                  ${employee.employee_id_number || '—'}
                </td>
              </tr>
              <tr>
                <td style="font-size:11px;color:#999;padding:3px 0;">Pay Type</td>
                <td style="font-size:12px;color:#333;font-weight:600;
                           text-align:right;padding:3px 0;
                           text-transform:capitalize;">
                  ${employee.pay_type || '—'}
                </td>
              </tr>
              <tr>
                <td style="font-size:11px;color:#999;padding:3px 0;">Pay Rate</td>
                <td style="font-size:12px;color:#333;font-weight:600;
                           text-align:right;padding:3px 0;">
                  ${fmt(item.hourly_rate)}/hr
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- EARNINGS + DEDUCTIONS -->
  <tr>
    <td style="padding:28px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr valign="top">

          <!-- Earnings -->
          <td width="48%" style="padding-right:16px;">
            <p style="margin:0 0 12px;font-size:10px;font-weight:700;
               color:#0e2a47;text-transform:uppercase;letter-spacing:2px;
               border-bottom:2px solid #0e9aa7;padding-bottom:6px;">
              Earnings
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${earningRow(
                'Regular Pay',
                `${Number(item.regular_hours).toFixed(1)} hrs × ${fmt(item.hourly_rate)}/hr`,
                fmt(item.regular_pay)
              )}
              ${hasOT ? earningRow(
                'Overtime Pay',
                `${Number(item.overtime_hours).toFixed(1)} hrs OT`,
                fmt(item.overtime_pay),
                '#d97706'
              ) : ''}
              <tr><td colspan="2" style="padding:8px 0 0;"></td></tr>
              <tr>
                <td style="padding:10px 0 4px;font-size:14px;
                           font-weight:700;color:#0e2a47;">Gross Pay</td>
                <td style="padding:10px 0 4px;font-size:15px;
                           font-weight:800;color:#0e2a47;text-align:right;">
                  ${fmt(item.gross_pay)}
                </td>
              </tr>
            </table>
          </td>

          <!-- Divider -->
          <td width="4%" style="border-left:1px dashed #e2e8f0;"></td>

          <!-- Deductions -->
          <td width="48%" style="padding-left:16px;">
            <p style="margin:0 0 12px;font-size:10px;font-weight:700;
               color:#c53030;text-transform:uppercase;letter-spacing:2px;
               border-bottom:2px solid #e53e3e;padding-bottom:6px;">
              Deductions
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${deductions.length > 0
                ? deductions.map(d => deductionRow(d.label, fmt(d.val))).join('')
                : `<tr><td colspan="2" style="padding:7px 0;font-size:13px;
                    color:#aaa;">No deductions this period</td></tr>`
              }
              <tr><td colspan="2" style="padding:8px 0 0;"></td></tr>
              <tr>
                <td style="padding:10px 0 4px;font-size:14px;
                           font-weight:700;color:#c53030;">
                  Total Deductions
                </td>
                <td style="padding:10px 0 4px;font-size:15px;
                           font-weight:800;color:#c53030;text-align:right;">
                  -${fmt(item.total_deductions)}
                </td>
              </tr>
            </table>
          </td>

        </tr>
      </table>
    </td>
  </tr>

  <!-- NET PAY BANNER -->
  <tr>
    <td style="padding:24px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:linear-gradient(135deg,#0a1f3c 0%,#0b7a8a 100%);
               border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:22px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.5);letter-spacing:2px;
                     text-transform:uppercase;">Net Pay — Take Home</p>
                  <p style="margin:6px 0 0;font-size:36px;font-weight:800;
                             color:#ffffff;letter-spacing:-1px;">
                    ${fmt(item.net_pay)}
                  </p>
                  ${cardHint ? `
                  <p style="margin:6px 0 0;font-size:12px;
                             color:rgba(255,255,255,0.6);">
                    💳 Loaded to RapidPay card
                    <strong style="color:rgba(255,255,255,0.9);">
                      ${cardHint}
                    </strong>
                    &nbsp;·&nbsp; Available within minutes
                  </p>` : ''}
                </td>
                <td style="text-align:right;vertical-align:middle;
                           padding-left:24px;
                           border-left:1px solid rgba(255,255,255,0.15);">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:12px;">
                        <p style="margin:0;font-size:11px;
                           color:rgba(255,255,255,0.5);">Gross Pay</p>
                        <p style="margin:2px 0 0;font-size:15px;
                                   font-weight:700;color:#ffffff;">
                          ${fmt(item.gross_pay)}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:12px;">
                        <p style="margin:0;font-size:11px;
                           color:rgba(255,255,255,0.5);">Deductions</p>
                        <p style="margin:2px 0 0;font-size:15px;
                                   font-weight:700;color:#fc8181;">
                          -${fmt(item.total_deductions)}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <p style="margin:0;font-size:11px;
                           color:rgba(255,255,255,0.5);">Total Hours</p>
                        <p style="margin:2px 0 0;font-size:15px;
                                   font-weight:700;color:#ffffff;">
                          ${(Number(item.regular_hours) + Number(item.overtime_hours || 0)).toFixed(1)} hrs
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- HOURS SUMMARY BAR -->
  <tr>
    <td style="padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#f8fafc;border:1px solid #e2e8f0;
               border-radius:10px;">
        <tr>
          <td style="padding:16px 20px;text-align:center;" width="33%">
            <p style="margin:0;font-size:11px;color:#999;
               text-transform:uppercase;letter-spacing:1px;">Regular Hours</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;
                       color:#0e2a47;">
              ${Number(item.regular_hours).toFixed(1)}
            </p>
          </td>
          <td width="1%" style="border-left:1px solid #e2e8f0;"></td>
          <td style="padding:16px 20px;text-align:center;" width="33%">
            <p style="margin:0;font-size:11px;color:#999;
               text-transform:uppercase;letter-spacing:1px;">Overtime Hours</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;
                       color:${hasOT ? '#d97706' : '#ccc'};">
              ${Number(item.overtime_hours || 0).toFixed(1)}
            </p>
          </td>
          <td width="1%" style="border-left:1px solid #e2e8f0;"></td>
          <td style="padding:16px 20px;text-align:center;" width="33%">
            <p style="margin:0;font-size:11px;color:#999;
               text-transform:uppercase;letter-spacing:1px;">Total Hours</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;
                       color:#0e9aa7;">
              ${(Number(item.regular_hours) + Number(item.overtime_hours || 0)).toFixed(1)}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#0a1f3c;padding:18px 32px;
               border-radius:0 0 16px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;vertical-align:middle;">
                  ${logoBlock(logoUrl, 28)}
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:11px;
                             color:rgba(255,255,255,0.4);">
                    Superior Staffing Solutions NY Inc
                    &nbsp;·&nbsp; New York, NY
                  </p>
                  <p style="margin:3px 0 0;font-size:11px;
                             color:rgba(255,255,255,0.3);">
                    Official pay stub — keep for your records.
                  </p>
                </td>
              </tr>
            </table>
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <p style="margin:0;font-size:11px;
                      color:rgba(255,255,255,0.4);">
              Questions?
              <a href="mailto:OFFICE@SSS-NY.COM"
                style="color:#0e9aa7;text-decoration:none;">
                OFFICE@SSS-NY.COM
              </a>
            </p>
            <p style="margin:3px 0 0;font-size:11px;
                      color:rgba(255,255,255,0.3);">
              Generated ${new Date().toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })} · Confidential
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── TIMECARD HTML ───────────────────────────────────────────────
function generateTimecardHTML(
  item: Record<string, string | number>,
  employee: Record<string, string | number>,
  payrollRun: Record<string, string>,
  timeEntries: Record<string, string | number>[],
  logoUrl: string = ''
) {
  const hasOT = Number(item.overtime_hours) > 0;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'background:#d1fae5;color:#065f46;',
      pending: 'background:#fef3c7;color:#92400e;',
      rejected: 'background:#fee2e2;color:#991b1b;',
    };
    const s = styles[status?.toLowerCase()] || 'background:#f3f4f6;color:#6b7280;';
    const label = status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : 'Day Off';
    return `<span style="${s}font-size:11px;font-weight:700;
                          padding:3px 10px;border-radius:20px;">
              ${label}
            </span>`;
  };

  const entryRows = timeEntries.length > 0
    ? timeEntries.map((e, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
        <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;
                   font-weight:600;border-bottom:1px solid #f0f0f0;">
          ${fmtShortDate(String(e.date))}
        </td>
        <td style="padding:10px 14px;font-size:13px;color:#555;
                   border-bottom:1px solid #f0f0f0;">
          ${fmtDay(String(e.date))}
        </td>
        <td style="padding:10px 14px;font-size:13px;color:#555;
                   text-align:center;border-bottom:1px solid #f0f0f0;">
          ${e.clock_in ? String(e.clock_in).slice(0, 5) : '—'}
        </td>
        <td style="padding:10px 14px;font-size:13px;color:#555;
                   text-align:center;border-bottom:1px solid #f0f0f0;">
          ${e.clock_out ? String(e.clock_out).slice(0, 5) : '—'}
        </td>
        <td style="padding:10px 14px;font-size:13px;color:#555;
                   text-align:center;border-bottom:1px solid #f0f0f0;">
          ${e.break_minutes ? `${e.break_minutes} min` : '—'}
        </td>
        <td style="padding:10px 14px;font-size:13px;color:#0e2a47;
                   font-weight:600;text-align:right;
                   border-bottom:1px solid #f0f0f0;">
          ${Number(e.regular_hours || 0).toFixed(1)}
        </td>
        <td style="padding:10px 14px;font-size:13px;
                   color:${Number(e.overtime_hours) > 0 ? '#d97706' : '#ccc'};
                   font-weight:${Number(e.overtime_hours) > 0 ? '700' : '400'};
                   text-align:right;border-bottom:1px solid #f0f0f0;">
          ${Number(e.overtime_hours || 0).toFixed(1)}
        </td>
        <td style="padding:10px 14px;font-size:13px;color:#0e9aa7;
                   font-weight:700;text-align:right;
                   border-bottom:1px solid #f0f0f0;">
          ${(Number(e.regular_hours || 0) + Number(e.overtime_hours || 0)).toFixed(1)}
        </td>
        <td style="padding:10px 14px;text-align:center;
                   border-bottom:1px solid #f0f0f0;">
          ${statusBadge(String(e.status || ''))}
        </td>
      </tr>`)
    .join('')
    : `<tr>
        <td colspan="9" style="padding:20px;text-align:center;
                                font-size:13px;color:#aaa;">
          No time entries found for this period
        </td>
       </tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Timecard — Superior Staffing Solutions</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;
             font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#eef2f7;padding:32px 16px;">
<tr><td align="center">
<table width="720" cellpadding="0" cellspacing="0"
  style="background:#ffffff;border-radius:16px;overflow:hidden;
         box-shadow:0 4px 24px rgba(0,0,0,0.10);">

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(135deg,#0a1f3c 0%,
               #0e3460 50%,#0b7a8a 100%);padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px;vertical-align:middle;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:16px;">
                  ${logoBlock(logoUrl, 60)}
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:10px;font-weight:700;
                     color:rgba(255,255,255,0.5);letter-spacing:2px;
                     text-transform:uppercase;">Official Document</p>
                  <h1 style="margin:4px 0 0;font-size:21px;font-weight:800;
                             color:#ffffff;letter-spacing:-0.3px;">
                    Superior Staffing Solutions
                  </h1>
                  <p style="margin:3px 0 0;font-size:12px;
                             color:rgba(255,255,255,0.55);">
                    New York, NY &nbsp;·&nbsp; OFFICE@SSS-NY.COM
                  </p>
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:24px 32px;text-align:right;vertical-align:top;">
            <table cellpadding="0" cellspacing="0" style="margin-left:auto;">
              <tr>
                <td style="background:rgba(255,255,255,0.12);
                            border:1px solid rgba(255,255,255,0.25);
                            border-radius:8px;padding:10px 18px;
                            text-align:center;">
                  <p style="margin:0;font-size:10px;font-weight:700;
                     color:rgba(255,255,255,0.6);letter-spacing:2px;
                     text-transform:uppercase;">Timecard</p>
                  <p style="margin:4px 0 0;font-size:13px;font-weight:700;
                             color:#ffffff;">${fmtDate(payrollRun.period_start)}</p>
                  <p style="margin:2px 0 0;font-size:12px;
                             color:rgba(255,255,255,0.6);">
                    to ${fmtDate(payrollRun.period_end)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- EMPLOYEE INFO -->
  <tr>
    <td style="background:#f8fafc;border-bottom:2px solid #e2e8f0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:20px 32px;" width="35%">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:44px;height:44px;border-radius:50%;
                                  background:linear-gradient(135deg,#0e3460,#0b7a8a);
                                  text-align:center;vertical-align:middle;">
                        <span style="color:#ffffff;font-size:16px;
                                     font-weight:800;line-height:44px;">
                          ${String(employee.first_name||'?')[0]}${String(employee.last_name||'?')[0]}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <p style="margin:0;font-size:15px;font-weight:700;
                             color:#0e2a47;">
                    ${employee.first_name} ${employee.last_name}
                  </p>
                  <p style="margin:2px 0 0;font-size:12px;color:#888;">
                    ${employee.position || 'Employee'}
                    ${employee.department ? ` &nbsp;·&nbsp; ${employee.department}` : ''}
                  </p>
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:20px 24px;border-left:1px solid #e2e8f0;" width="32%">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size:11px;color:#999;padding:3px 0;">Employee ID</td>
                <td style="font-size:12px;color:#333;font-weight:600;
                           text-align:right;padding:3px 0;">
                  ${employee.employee_id_number || '—'}
                </td>
              </tr>
              <tr>
                <td style="font-size:11px;color:#999;padding:3px 0;">Department</td>
                <td style="font-size:12px;color:#333;font-weight:600;
                           text-align:right;padding:3px 0;">
                  ${employee.department || '—'}
                </td>
              </tr>
              <tr>
                <td style="font-size:11px;color:#999;padding:3px 0;">Pay Rate</td>
                <td style="font-size:12px;color:#333;font-weight:600;
                           text-align:right;padding:3px 0;">
                  ${fmt(item.hourly_rate)}/hr
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:20px 24px;border-left:1px solid #e2e8f0;" width="33%">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size:11px;color:#999;padding:3px 0;">Regular Hours</td>
                <td style="font-size:12px;color:#0e2a47;font-weight:700;
                           text-align:right;padding:3px 0;">
                  ${Number(item.regular_hours).toFixed(1)}
                </td>
              </tr>
              <tr>
                <td style="font-size:11px;color:#999;padding:3px 0;">Overtime Hours</td>
                <td style="font-size:12px;color:#d97706;font-weight:700;
                           text-align:right;padding:3px 0;">
                  ${Number(item.overtime_hours || 0).toFixed(1)}
                </td>
              </tr>
              <tr>
                <td style="font-size:11px;color:#999;padding:3px 0;">Total Hours</td>
                <td style="font-size:14px;color:#0e9aa7;font-weight:800;
                           text-align:right;padding:3px 0;">
                  ${(Number(item.regular_hours) + Number(item.overtime_hours || 0)).toFixed(1)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- DAILY TIME ENTRIES -->
  <tr>
    <td style="padding:28px 32px 0;">
      <p style="margin:0 0 14px;font-size:10px;font-weight:700;
         color:#0e2a47;text-transform:uppercase;letter-spacing:2px;
         border-bottom:2px solid #0e9aa7;padding-bottom:6px;">
        Daily Time Entries
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr style="background:#0e2a47;">
          <td style="padding:11px 14px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.8);text-transform:uppercase;
                     letter-spacing:1px;">Date</td>
          <td style="padding:11px 14px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.8);text-transform:uppercase;
                     letter-spacing:1px;">Day</td>
          <td style="padding:11px 14px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.8);text-transform:uppercase;
                     letter-spacing:1px;text-align:center;">In</td>
          <td style="padding:11px 14px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.8);text-transform:uppercase;
                     letter-spacing:1px;text-align:center;">Out</td>
          <td style="padding:11px 14px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.8);text-transform:uppercase;
                     letter-spacing:1px;text-align:center;">Break</td>
          <td style="padding:11px 14px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.8);text-transform:uppercase;
                     letter-spacing:1px;text-align:right;">Reg</td>
          <td style="padding:11px 14px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.8);text-transform:uppercase;
                     letter-spacing:1px;text-align:right;">OT</td>
          <td style="padding:11px 14px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.8);text-transform:uppercase;
                     letter-spacing:1px;text-align:right;">Total</td>
          <td style="padding:11px 14px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.8);text-transform:uppercase;
                     letter-spacing:1px;text-align:center;">Status</td>
        </tr>
        ${entryRows}
        <!-- TOTALS ROW -->
        <tr style="background:#0e2a47;">
          <td colspan="5" style="padding:12px 14px;font-size:12px;
                                  font-weight:700;
                                  color:rgba(255,255,255,0.7);
                                  text-transform:uppercase;letter-spacing:1px;">
            Weekly Totals
          </td>
          <td style="padding:12px 14px;font-size:14px;font-weight:800;
                     color:#ffffff;text-align:right;">
            ${Number(item.regular_hours).toFixed(1)}
          </td>
          <td style="padding:12px 14px;font-size:14px;font-weight:800;
                     color:#f0d080;text-align:right;">
            ${Number(item.overtime_hours || 0).toFixed(1)}
          </td>
          <td style="padding:12px 14px;font-size:15px;font-weight:800;
                     color:#0e9aa7;text-align:right;">
            ${(Number(item.regular_hours) + Number(item.overtime_hours || 0)).toFixed(1)}
          </td>
          <td style="padding:12px 14px;text-align:center;">
            <span style="background:rgba(255,255,255,0.15);color:#ffffff;
                         font-size:11px;font-weight:700;
                         padding:3px 10px;border-radius:20px;">
              ${timeEntries.length} entries
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- EARNINGS BANNER -->
  <tr>
    <td style="padding:24px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:linear-gradient(135deg,#0a1f3c 0%,#0b7a8a 100%);
               border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:22px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:20px;
                           border-right:1px solid rgba(255,255,255,0.15);"
                    width="12%">
                  ${logoBlock(logoUrl, 44)}
                </td>
                <td style="padding-left:20px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;
                     color:rgba(255,255,255,0.5);letter-spacing:2px;
                     text-transform:uppercase;">Earnings Summary</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:32px;">
                        <p style="margin:0;font-size:11px;
                           color:rgba(255,255,255,0.5);">
                          Regular (${Number(item.regular_hours).toFixed(1)} hrs × ${fmt(item.hourly_rate)})
                        </p>
                        <p style="margin:3px 0 0;font-size:16px;
                                   font-weight:700;color:#ffffff;">
                          ${fmt(item.regular_pay)}
                        </p>
                      </td>
                      ${hasOT ? `
                      <td style="padding-right:32px;">
                        <p style="margin:0;font-size:11px;
                           color:rgba(255,255,255,0.5);">
                          Overtime (${Number(item.overtime_hours).toFixed(1)} hrs OT)
                        </p>
                        <p style="margin:3px 0 0;font-size:16px;
                                   font-weight:700;color:#f0d080;">
                          ${fmt(item.overtime_pay)}
                        </p>
                      </td>` : ''}
                      <td>
                        <p style="margin:0;font-size:11px;
                           color:rgba(255,255,255,0.5);">Gross Pay</p>
                        <p style="margin:3px 0 0;font-size:22px;
                                   font-weight:800;color:#0e9aa7;">
                          ${fmt(item.gross_pay)}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- SIGNATURE SECTION -->
  <tr>
    <td style="padding:0 32px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid #e2e8f0;border-radius:10px;">
        <tr>
          <td style="padding:20px 24px;" width="50%">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;
               color:#999;text-transform:uppercase;letter-spacing:1px;">
              Employee Acknowledgment
            </p>
            <div style="border-bottom:1px solid #e2e8f0;
                        height:36px;margin:12px 0 8px;"></div>
            <p style="margin:0;font-size:11px;color:#aaa;">
              ${employee.first_name} ${employee.last_name}
              &nbsp;·&nbsp; Date: ___________
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#aaa;">
              I certify that these hours are accurate.
            </p>
          </td>
          <td width="1%" style="border-left:1px solid #e2e8f0;"></td>
          <td style="padding:20px 24px;" width="50%">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;
               color:#999;text-transform:uppercase;letter-spacing:1px;">
              Supervisor Approval
            </p>
            <div style="border-bottom:1px solid #e2e8f0;
                        height:36px;margin:12px 0 8px;"></div>
            <p style="margin:0;font-size:11px;color:#aaa;">
              Supervisor &nbsp;·&nbsp; Date: ___________
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#aaa;">
              Approved for payroll processing.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#0a1f3c;padding:18px 32px;
               border-radius:0 0 16px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;vertical-align:middle;">
                  ${logoBlock(logoUrl, 28)}
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:11px;
                             color:rgba(255,255,255,0.4);">
                    Superior Staffing Solutions NY Inc
                    &nbsp;·&nbsp; New York, NY
                  </p>
                  <p style="margin:3px 0 0;font-size:11px;
                             color:rgba(255,255,255,0.3);">
                    Official timecard — keep for your records.
                  </p>
                </td>
              </tr>
            </table>
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <p style="margin:0;font-size:11px;
                      color:rgba(255,255,255,0.4);">
              Questions?
              <a href="mailto:OFFICE@SSS-NY.COM"
                style="color:#0e9aa7;text-decoration:none;">
                OFFICE@SSS-NY.COM
              </a>
            </p>
            <p style="margin:3px 0 0;font-size:11px;
                      color:rgba(255,255,255,0.3);">
              Generated ${new Date().toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })} · Confidential
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}