import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Triggered by Employee entity update automation.
 * Syncs the updated employee name into all related TimeEntry, PayrollItem, and Payout records.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const employeeId = body?.event?.entity_id || body?.data?.id;
    const firstName = body?.data?.first_name;
    const lastName = body?.data?.last_name;

    if (!employeeId || !firstName || !lastName) {
      return Response.json({ error: 'Missing employee data in payload' }, { status: 400 });
    }

    const fullName = `${firstName} ${lastName}`;

    // Sync TimeEntry records
    const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ employee_id: employeeId }, undefined, 500);
    const staleEntries = timeEntries.filter(e => e.employee_name !== fullName);
    if (staleEntries.length > 0) {
      await base44.asServiceRole.entities.TimeEntry.bulkUpdate(
        staleEntries.map(e => ({ id: e.id, employee_name: fullName }))
      );
      console.log(`Updated ${staleEntries.length} TimeEntry records for employee ${employeeId}`);
    }

    // Sync PayrollItem records
    const payrollItems = await base44.asServiceRole.entities.PayrollItem.filter({ employee_id: employeeId }, undefined, 500);
    const staleItems = payrollItems.filter(i => i.employee_name !== fullName);
    if (staleItems.length > 0) {
      await base44.asServiceRole.entities.PayrollItem.bulkUpdate(
        staleItems.map(i => ({ id: i.id, employee_name: fullName }))
      );
      console.log(`Updated ${staleItems.length} PayrollItem records for employee ${employeeId}`);
    }

    // Sync Payout records
    const payouts = await base44.asServiceRole.entities.Payout.filter({ employee_id: employeeId }, undefined, 500);
    const stalePayouts = payouts.filter(p => p.employee_name !== fullName);
    if (stalePayouts.length > 0) {
      await base44.asServiceRole.entities.Payout.bulkUpdate(
        stalePayouts.map(p => ({ id: p.id, employee_name: fullName }))
      );
      console.log(`Updated ${stalePayouts.length} Payout records for employee ${employeeId}`);
    }

    return Response.json({
      success: true,
      employee: fullName,
      updated: {
        timeEntries: staleEntries.length,
        payrollItems: staleItems.length,
        payouts: stalePayouts.length,
      }
    });
  } catch (error) {
    console.error('syncEmployeeNames error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});