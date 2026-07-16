import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Expected webhook payload from PayCard provider
    // { transaction_id, employee_id, status, amount, timestamp }
    const { transaction_id, employee_id, status, amount, timestamp } = body;

    if (!transaction_id || !status) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`Processing webhook for transaction ${transaction_id}, status: ${status}`);

    // Find and update the corresponding PayrollLog
    const logs = await base44.asServiceRole.entities.PayrollLog.filter({
      log_type: 'direct_deposit',
      employee_id: employee_id
    });

    let updated = false;
    for (const log of logs) {
      // Match by transaction ID in details or similar criteria
      const details = typeof log.details === 'string' ? JSON.parse(log.details || '{}') : log.details || {};
      
      if (details.transaction_id === transaction_id || log.id === transaction_id) {
        const newStatus = status === 'success' || status === 'completed' ? 'completed' : 'failed';
        
        await base44.asServiceRole.entities.PayrollLog.update(log.id, {
          status: newStatus,
          details: JSON.stringify({
            ...details,
            transaction_id,
            webhook_status: status,
            webhook_timestamp: timestamp,
            updated_at: new Date().toISOString()
          })
        });

        console.log(`Updated PayrollLog ${log.id} to status: ${newStatus}`);
        updated = true;
        break;
      }
    }

    if (!updated && employee_id) {
      // If no matching log found, create a new entry
      await base44.asServiceRole.entities.PayrollLog.create({
        employee_id,
        employee_name: 'Unknown',
        action: 'processed',
        log_type: 'direct_deposit',
        amount,
        status: status === 'success' || status === 'completed' ? 'completed' : 'failed',
        details: JSON.stringify({
          transaction_id,
          webhook_status: status,
          webhook_timestamp: timestamp,
          created_from_webhook: true
        })
      });

      console.log(`Created new PayrollLog entry for transaction ${transaction_id}`);
    }

    return Response.json({ 
      success: true, 
      message: `Webhook processed for transaction ${transaction_id}`,
      updated 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});