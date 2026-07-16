import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { syncType = 'all' } = await req.json();

    console.log(`Starting data sync: ${syncType}`);

    // Fetch all entities
    const [employees, locations, departments, timeEntries, payrollItems, expenseReports, employeeRequests] = await Promise.all([
      base44.asServiceRole.entities.Employee.list('-created_date', 500),
      base44.asServiceRole.entities.Location.list(),
      base44.asServiceRole.entities.Department.list(),
      base44.asServiceRole.entities.TimeEntry.list('-date', 500),
      base44.asServiceRole.entities.PayrollItem.list('-created_date', 500),
      base44.asServiceRole.entities.ExpenseReport.list('-created_date', 500),
      base44.asServiceRole.entities.EmployeeRequest.list('-created_date', 500),
    ]);

    let synced = 0;

    // Sync employees with locations and departments
    if (syncType === 'all' || syncType === 'employees') {
      for (const emp of employees) {
        const locMatch = locations.find(l => l.name === emp.location);
        const deptMatch = departments.find(d => d.name === emp.department);

        const updates = {};
        if (locMatch && emp.location !== locMatch.name) updates.location = locMatch.name;
        if (deptMatch && emp.department !== deptMatch.name) updates.department = deptMatch.name;

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Employee.update(emp.id, updates);
          synced++;
        }
      }
      console.log(`Synced ${synced} employees`);
    }

    // Sync time entries with employee names and locations
    if (syncType === 'all' || syncType === 'timeentries') {
      synced = 0;
      for (const entry of timeEntries) {
        const emp = employees.find(e => e.id === entry.employee_id);
        if (emp && emp.location && emp.location !== entry.location_name) {
          await base44.asServiceRole.entities.TimeEntry.update(entry.id, { location_name: emp.location });
          synced++;
        }
      }
      console.log(`Synced ${synced} time entries`);
    }

    // Sync payroll items with updated employee information
    if (syncType === 'all' || syncType === 'payroll') {
      synced = 0;
      for (const item of payrollItems) {
        const emp = employees.find(e => e.id === item.employee_id);
        if (emp && emp.first_name) {
          const fullName = `${emp.first_name} ${emp.last_name}`;
          if (fullName !== item.employee_name) {
            await base44.asServiceRole.entities.PayrollItem.update(item.id, { employee_name: fullName });
            synced++;
          }
        }
      }
      console.log(`Synced ${synced} payroll items`);
    }

    // Sync expense reports with location info
    if (syncType === 'all' || syncType === 'expenses') {
      synced = 0;
      for (const exp of expenseReports) {
        const emp = employees.find(e => e.id === exp.employee_id);
        if (emp && emp.location) {
          await base44.asServiceRole.entities.ExpenseReport.update(exp.id, { 
            employee_email: emp.email,
          });
          synced++;
        }
      }
      console.log(`Synced ${synced} expense reports`);
    }

    // Sync employee requests
    if (syncType === 'all' || syncType === 'requests') {
      synced = 0;
      for (const req of employeeRequests) {
        const emp = employees.find(e => e.id === req.employee_id);
        if (emp && emp.email !== req.employee_email) {
          await base44.asServiceRole.entities.EmployeeRequest.update(req.id, { 
            employee_email: emp.email,
          });
          synced++;
        }
      }
      console.log(`Synced ${synced} employee requests`);
    }

    return Response.json({ 
      success: true, 
      message: `Data sync completed successfully for ${syncType}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});