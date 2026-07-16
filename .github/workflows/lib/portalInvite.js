import { base44 } from "@/api/base44Client";

const INVITE_SUBJECT = "Superior Staffing Solution NY Inc. — You're Invited to Enroll in Our Employee Portal";
const INVITE_FROM_NAME = "Superior Staffing Solution NY Inc.";

export function buildInviteEmailHtml(firstName) {
  return `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#1e293b">
    <div style="background:#1e3a8a;padding:32px 28px;border-radius:10px 10px 0 0;text-align:center">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);border-radius:8px;padding:8px 16px;margin-bottom:12px">
        <span style="color:#fbbf24;font-size:22px;font-weight:900;letter-spacing:1px">SS</span>
        <span style="color:white;font-size:13px;font-weight:700;margin-left:8px;vertical-align:middle">Superior Staffing Solution NY Inc.</span>
      </div>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:800">You're Invited to Enroll!</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;letter-spacing:0.05em;text-transform:uppercase">From Superior Staffing Solution NY Inc.</p>
    </div>
    <div style="padding:28px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">
      <p style="font-size:16px;margin-top:0">Hi ${firstName},</p>
      <p style="line-height:1.6"><strong>Superior Staffing Solution NY Inc.</strong> has added you as a team member and is inviting you to enroll in our Employee Portal.</p>
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin:16px 0">
        <p style="margin:0;font-size:14px;color:#92400e;font-weight:600">📩 Next Step — Check Your Inbox</p>
        <p style="margin:6px 0 0;font-size:13px;color:#92400e;line-height:1.6">You will receive a <strong>separate enrollment email</strong> with a sign-up link. Please click that link to create your account and access the portal.</p>
      </div>
      <p style="line-height:1.6">Once enrolled, your portal gives you access to:</p>
      <ul style="line-height:2;padding-left:20px">
        <li>📋 <strong>Your Timecards</strong> — view your daily logged hours</li>
        <li>💵 <strong>Paystubs</strong> — access and download your pay statements</li>
        <li>📬 <strong>Submit Requests</strong> — time-off, shift changes, and expenses</li>
        <li>💬 <strong>Chat Tool</strong> — message your manager or HR for any queries</li>
        <li>📍 <strong>Clock In / Out</strong> — clock in and out from our geo-fenced locations</li>
      </ul>
      <div style="margin:20px 0;text-align:center">
        <a href="${window.location.origin}" style="display:inline-block;background:#1e3a8a;color:white;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.02em">🔐 Access Your Employee Portal</a>
      </div>
      <p style="line-height:1.6;margin-top:16px">If you have any questions, feel free to reach out to your supervisor or HR.</p>
      <p style="margin-top:24px;font-size:13px;color:#64748b">This invitation was sent by <strong>Superior Staffing Solution NY Inc.</strong> If you believe this was sent in error, please disregard this email.</p>
    </div>
  </div>`;
}

export async function sendPortalInvite(email, firstName, role = "user") {
  await base44.users.inviteUser(email, role);
  await base44.integrations.Core.SendEmail({
    from_name: INVITE_FROM_NAME,
    to: email,
    subject: INVITE_SUBJECT,
    body: buildInviteEmailHtml(firstName),
  });
}