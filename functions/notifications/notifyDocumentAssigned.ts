import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { data: doc, event } = body;

    if (!doc || !doc.requires_signature || !doc.is_active) {
      return Response.json({ skipped: true, reason: "No signature required or inactive" });
    }

    const allEmployees = await base44.asServiceRole.entities.Employee.filter({ status: "active" });

    let targetEmployees = [];
    if (doc.assigned_to_all) {
      targetEmployees = allEmployees;
    } else if (doc.assigned_employee_ids && doc.assigned_employee_ids.length > 0) {
      targetEmployees = allEmployees.filter(e => doc.assigned_employee_ids.includes(e.id));
    }

    if (targetEmployees.length === 0) {
      return Response.json({ skipped: true, reason: "No employees targeted" });
    }

    const existingSigs = await base44.asServiceRole.entities.DocumentSignature.filter({ document_id: doc.id });
    const signedEmpIds = new Set(existingSigs.map(s => s.employee_id));

    const toNotify = targetEmployees.filter(e => !signedEmpIds.has(e.id) && e.email);

    let sent = 0;
    for (const emp of toNotify) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: "Superior Staffing Solution NY Inc. — HR",
        to: emp.email,
        subject: `Action Required: Please Sign "${doc.title}"`,
        body: `
          <div style="font-family:Arial,sans-serif;max-width:580px;">
            <h2>Document Signature Request</h2>
            <p>Hi ${emp.first_name || 'Employee'},</p>
            <p>A document has been assigned to you that requires your signature.</p>
            <p><strong>Document:</strong> ${doc.title}</p>
            ${doc.description ? `<p><strong>Description:</strong> ${doc.description}</p>` : ''}
            <p>To sign the document:</p>
            <ol>
              <li>Log in to your Employee Portal</li>
              <li>Navigate to HR Documents</li>
              <li>Find "${doc.title}" and click Sign</li>
            </ol>
            <p style="font-size:12px;color:#999;">If you have questions, please contact your HR administrator.</p>
          </div>
        `,
      });
      sent++;
    }

    console.log(`Document assignment notification sent to ${sent} employees`);
    return Response.json({ success: true, sent, skipped: toNotify.length === 0 });
  } catch (error) {
    console.error("notifyDocumentAssigned error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});