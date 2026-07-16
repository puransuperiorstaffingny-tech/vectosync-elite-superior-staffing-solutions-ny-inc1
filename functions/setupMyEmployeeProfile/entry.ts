import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Self-provisions an Employee record for the currently logged-in user.
// Needed because Employee.create RLS is admin-only, but a user with no linked
// profile must be able to create their own basic record to start recording time.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = (user.email || '').trim().toLowerCase();
    if (!email) return Response.json({ error: 'No email on account' }, { status: 400 });

    // If a profile already exists for this email, return it (idempotent).
    const existing = await base44.asServiceRole.entities.Employee.filter({ email });
    if (existing.length > 0) {
      return Response.json({ employee: existing[0], created: false });
    }

    const parts = (user.full_name || '').trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || 'New';
    const last = parts.slice(1).join(' ') || 'Employee';

    const employee = await base44.asServiceRole.entities.Employee.create({
      first_name: first,
      last_name: last,
      email,
      pay_type: 'hourly',
      status: 'active',
    });

    return Response.json({ employee, created: true });
  } catch (error) {
    console.error('setupMyEmployeeProfile failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});