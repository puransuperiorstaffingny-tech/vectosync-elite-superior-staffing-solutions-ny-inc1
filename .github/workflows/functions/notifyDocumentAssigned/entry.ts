import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is called by an entity automation when an HRDocument is created/updated
    const body = await req.json();
    const { data: doc, event } = body;

    // Only proceed if the document requires a signature and is active
    if (!doc || !doc.requires_signature || !doc.is_active) {
      return Response.json({ skipped: true, reason: "No signature required or inactive" });
    }

    // Get all active employees
    const allEmployees = await base44.asServiceRole.entities.Employee.filter({ status: "active" });

    // Determine which employees to notify
    let targetEmployees = [];
    if (doc.assigned_to_all) {
      targetEmployees = allEmployees;
    } else if (doc.assigned_employee_ids && doc.assigned_employee_ids.length > 0) {
      targetEmployees = allEmployees.filter(e => doc.assigned_employee_ids.includes(e.id));
    }

    if (targetEmployees.length === 0) {
      return Response.json({ skipped: true, reason: "No employees targeted" });
    }

    // Check existing signatures to avoid re-notifying already-signed employees
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
          <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#1e293b">
            <div style="background:linear-gradient(135deg,#0a1f5c,#1a3a8c);padding:28px 24px;border-radius:10px 10px 0 0">
              <h1 style="color:white;margin:0;font-size:20px;font-weight:800">Superior Staffing Solution NY Inc.</h1>
              <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px">Human Resources · Document Signature Request</p>
            </div>
            <div style="padding:28px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">
              <p style="margin-top:0;font-size:15px">Hi ${emp.first_name},</p>
              <p style="line-height:1.6">A document has been assigned to you that <strong>requires your signature</strong>. Please log in to your Employee Portal and sign it at your earliest convenience.</p>
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0">
                <p style="margin:0 0 4px;font-size:13px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:0.05em">Document</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:#0a1f5c">${doc.title}</p>
                ${doc.description ? `<p style="margin:6px 0 0;font-size:13px;color:#64748b">${doc.description}</p>` : ""}
                ${doc.category ? `<span style="display:inline-block;margin-top:8px;background:#e0e7ff;color:#3730a3;font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.05em">${doc.category.replace("_", " ")}</span>` : ""}
              </div>
              <p style="line-height:1.6">To sign the document:</p>
              <ol style="line-height:2;padding-left:20px;color:#334155">
                <li>Log in to your <strong>Employee Portal</strong></li>
                <li>Navigate to the <strong>HR Documents</strong> tab</li>
                <li>Find <em>${doc.title}</em> and click <strong>Sign</strong></li>
              </ol>
              <p style="margin-top:20px;font-size:12px;color:#94a3b8">If you have questions about this document, please contact your HR administrator. This is an automated notification from Superior Staffing Solution NY Inc.</p>
            </div>
          </div>
        `,
      });
      sent++;
    }

    console.log(`Document assignment notification sent to ${sent} employees for doc: ${doc.id} (${doc.title})`);
    return Response.json({ success: true, sent, skipped: toNotify.length === 0 ? "all already signed" : undefined });
  } catch (error) {
    console.error("notifyDocumentAssigned error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});