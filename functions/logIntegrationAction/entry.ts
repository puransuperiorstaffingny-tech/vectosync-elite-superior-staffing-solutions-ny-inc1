import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, integration_name, category, scope = 'profile', details = '' } = body;

    if (!action || !integration_name) {
      return Response.json({ error: 'Missing action or integration_name' }, { status: 400 });
    }

    const log = await base44.asServiceRole.entities.IntegrationLog.create({
      action,
      integration_name,
      category: category || '',
      scope,
      details,
      admin_email: user.email,
      admin_name: user.full_name || user.email,
    });

    return Response.json({ success: true, log });
  } catch (error) {
    console.error('logIntegrationAction error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});