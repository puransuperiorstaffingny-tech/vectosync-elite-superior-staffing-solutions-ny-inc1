import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { to, subject, html, text } = payload;

    if (!to || !subject) {
      return Response.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    if (!html && !text) {
      return Response.json(
        { error: 'Missing required field: html or text' },
        { status: 400 }
      );
    }

    await base44.integrations.Core.SendEmail({
      from_name: 'Superior Staffing Solutions',
      to,
      subject,
      body: html || `<p>${text}</p>`,
    });

    console.log(`Email sent to ${to}: ${subject}`);

    return Response.json({
      success: true,
      message: `Email sent to ${to}`,
    });

  } catch (error) {
    console.error('sendBrandedEmail error:', (error as Error).message);
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
});