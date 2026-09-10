import nodemailer from 'nodemailer';

export const ADVISOR_EMAIL = 'igwev2956@gmail.com';

// Dedicated sender addresses on verifieduni.com
export const CLIENT_SENDER_EMAIL = 'meridianadvisory@verifieduni.com';
export const ADVISOR_NOTIFICATION_SENDER_EMAIL = 'notifications@verifieduni.com';

export interface BookingPayload {
  auditReference: string;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  industry: string;
  tripObjective: string;
  travelWindow: string;
  selectedDate: string;
  selectedDateIso: string;
  selectedTime: string;
  amountNgn: number;
  meetUrl: string;
}

export interface DiagnosticPayload {
  hsCodesOrUrls?: string;
  orderSizing?: string;
  currentRoadblocks?: string;
}

export interface DispatchResult {
  success: boolean;
  advisorSent: boolean;
  clientSent: boolean;
  mode: 'resend' | 'smtp' | 'simulated';
  error?: string;
  clientError?: string;
  advisorError?: string;
  clientMessageId?: string;
  advisorMessageId?: string;
  senders?: {
    client: string;
    advisor: string;
  };
  timestamp: string;
}

/**
 * Builds clean, responsive HTML email for the Client
 */
export const buildClientEmailHtml = (booking: BookingPayload, diagnostic?: DiagnosticPayload): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Consultation Confirmation - Meridian China Advisory</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 32px 28px; text-align: left; }
    .header h1 { color: #f8fafc; font-size: 20px; margin: 0 0 6px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { color: #94a3b8; font-size: 13px; margin: 0; }
    .content { padding: 32px 28px; }
    .status-badge { display: inline-block; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .grid { width: 100%; border-collapse: collapse; }
    .grid td { padding: 8px 0; font-size: 13px; vertical-align: top; }
    .label { color: #64748b; font-weight: 500; width: 35%; }
    .val { color: #0f172a; font-weight: 600; }
    .btn { display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 16px 0 8px; text-align: center; }
    .footer { padding: 24px 28px; background: #f1f5f9; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MERIDIAN CHINA ADVISORY</h1>
      <p>Bilateral Trade &amp; Canton Fair Strategic Desk</p>
    </div>
    <div class="content">
      <div class="status-badge">Payment Confirmed &bull; Slot Secured</div>
      <h2 style="font-size: 18px; margin: 0 0 12px; color: #0f172a;">Executive Consultation Confirmed</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
        Dear <strong>${booking.fullName}</strong>, your private 1-on-1 strategic trade consultation has been confirmed. Below are your meeting credentials, access link, and reference details.
      </p>

      <div class="box">
        <table class="grid">
          <tr>
            <td class="label">Reference:</td>
            <td class="val" style="font-family: monospace;">${booking.auditReference}</td>
          </tr>
          <tr>
            <td class="label">Session Date:</td>
            <td class="val">${booking.selectedDate}</td>
          </tr>
          <tr>
            <td class="label">Session Time:</td>
            <td class="val">${booking.selectedTime} (West Africa Time / UTC+1)</td>
          </tr>
          <tr>
            <td class="label">Assigned Desk:</td>
            <td class="val">Director, Bilateral Trade Desk (Senior Trade Envoy)</td>
          </tr>
          <tr>
            <td class="label">Target Focus:</td>
            <td class="val">${booking.industry} &bull; ${booking.tripObjective}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${booking.meetUrl}" class="btn" target="_blank">Join Google Meet Consultation</a>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px; font-family: monospace;">
          ${booking.meetUrl}
        </div>
      </div>

      ${
        diagnostic?.hsCodesOrUrls || diagnostic?.currentRoadblocks
          ? `
      <div class="box" style="background: #f0fdfa; border-color: #ccfbf1;">
        <h4 style="margin: 0 0 8px; font-size: 12px; color: #0f766e; text-transform: uppercase;">Trade Dossier Notes</h4>
        <p style="margin: 0; font-size: 12px; color: #134e4a;">${diagnostic.currentRoadblocks || diagnostic.hsCodesOrUrls}</p>
      </div>`
          : ''
      }

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        <strong>Advisory Preparation Checklist:</strong><br>
        Please have any factory proforma invoices, supplier quotation links (1688 / Alibaba / Made-in-China), or target HS codes accessible during the session.<br>
        Direct WhatsApp Advisor Line: <a href="https://wa.me/2349065839680" style="color: #0d9488; font-weight: bold;">+234 906 583 9680</a>
      </p>
    </div>
    <div class="footer">
      Meridian China Advisory &bull; Bilateral Trade Intelligence Desk<br>
      WhatsApp: +234 906 583 9680 &bull; Support: <a href="mailto:${CLIENT_SENDER_EMAIL}" style="color: #0d9488;">${CLIENT_SENDER_EMAIL}</a>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Builds clean HTML notification for the Advisor Desk
 */
export const buildAdvisorEmailHtml = (booking: BookingPayload, diagnostic?: DiagnosticPayload): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Consultation Booking - Meridian China Advisory</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 24px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; }
    .header { background: #1e293b; padding: 24px; color: #f8fafc; }
    .content { padding: 28px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 16px 0; }
    .btn { display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; font-size: 18px;">[New Booking] ${booking.fullName}</h2>
      <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">Ref: ${booking.auditReference}</p>
    </div>
    <div class="content">
      <p style="margin-top: 0; font-size: 14px;">A new bilateral trade consultation has been booked and confirmed via Bachs.io.</p>

      <div class="box">
        <h4 style="margin: 0 0 10px; font-size: 12px; color: #64748b; text-transform: uppercase;">Client Profile</h4>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Name:</strong> ${booking.fullName}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Email:</strong> ${booking.email}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Phone:</strong> ${booking.phone || 'Not provided'}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Company:</strong> ${booking.companyName || 'Private Trader'}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Industry:</strong> ${booking.industry}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Objective:</strong> ${booking.tripObjective} (${booking.travelWindow})</p>
      </div>

      <div class="box">
        <h4 style="margin: 0 0 10px; font-size: 12px; color: #64748b; text-transform: uppercase;">Appointment Schedule</h4>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Date:</strong> ${booking.selectedDate}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Time:</strong> ${booking.selectedTime} (WAT)</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Fee Paid:</strong> &#8358;${(booking.amountNgn || 50000).toLocaleString()}</p>
      </div>

      ${
        diagnostic?.currentRoadblocks || diagnostic?.hsCodesOrUrls
          ? `
      <div class="box" style="background: #fefce8; border-color: #fef08a;">
        <h4 style="margin: 0 0 6px; font-size: 12px; color: #854d0e; text-transform: uppercase;">Diagnostic Input</h4>
        <p style="margin: 0; font-size: 13px; color: #713f12;">${diagnostic.currentRoadblocks || ''} ${diagnostic.hsCodesOrUrls || ''}</p>
      </div>`
          : ''
      }

      <div style="margin: 20px 0;">
        <a href="${booking.meetUrl}" class="btn" target="_blank">Open Consultation Video Room</a>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Automatically dispatches consultation emails.
 * Uses meridianadvisory@verifieduni.com for the client
 * and notifications@verifieduni.com for the advisor.
 */
export const dispatchAutomaticEmails = async (
  booking: BookingPayload,
  diagnostic?: DiagnosticPayload
): Promise<DispatchResult> => {
  const timestamp = new Date().toISOString();

  // Explicit Senders as requested:
  // Client emails MUST come from meridianadvisory@verifieduni.com
  const clientSenderFormatted =
    process.env.RESEND_CLIENT_FROM_EMAIL?.trim() ||
    `Meridian China Advisory <${CLIENT_SENDER_EMAIL}>`;

  // Advisor alerts MUST come from notifications@verifieduni.com
  const advisorSenderFormatted =
    process.env.RESEND_ADVISOR_FROM_EMAIL?.trim() ||
    `Meridian Advisory Notifications <${ADVISOR_NOTIFICATION_SENDER_EMAIL}>`;

  const clientEmail = (booking.email || '').trim().toLowerCase();
  const advisorEmail = (ADVISOR_EMAIL || '').trim().toLowerCase();

  console.log(`[Email Dispatcher] Initiating dispatch for booking ${booking.auditReference}:`, {
    clientRecipient: clientEmail,
    clientSender: clientSenderFormatted,
    advisorRecipient: advisorEmail,
    advisorSender: advisorSenderFormatted,
  });

  // 1. Primary Engine: Resend REST API
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      let clientSent = false;
      let clientError: string | undefined;
      let clientMessageId: string | undefined;

      let advisorSent = false;
      let advisorError: string | undefined;
      let advisorMessageId: string | undefined;

      // Dispatch to Client using meridianadvisory@verifieduni.com
      if (clientEmail && clientEmail.includes('@')) {
        try {
          const clientRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: clientSenderFormatted,
              to: [clientEmail],
              reply_to: CLIENT_SENDER_EMAIL,
              subject: `[Booking Confirmed] China Trade Consultation — Ref: ${booking.auditReference}`,
              html: buildClientEmailHtml(booking, diagnostic),
            }),
          });

          if (clientRes.ok) {
            const clientData: any = await clientRes.json().catch(() => ({}));
            clientSent = true;
            clientMessageId = clientData?.id;
            console.log(`[Email Dispatch] Client email sent to ${clientEmail} from ${clientSenderFormatted} (id: ${clientMessageId})`);
          } else {
            clientError = await clientRes.text();
            console.error(`[Email Dispatch Error] Resend rejected client email to ${clientEmail}:`, clientError);
          }
        } catch (err: any) {
          clientError = err?.message || 'Network failure sending client email';
          console.error(`[Email Dispatch Error] Client dispatch exception:`, err);
        }
      } else {
        clientError = `Invalid client email address: "${booking.email}"`;
        console.error(`[Email Dispatch Error] ${clientError}`);
      }

      // Dispatch to Advisor using notifications@verifieduni.com
      try {
        const advisorRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: advisorSenderFormatted,
            to: [advisorEmail],
            reply_to: clientEmail || CLIENT_SENDER_EMAIL,
            subject: `[New Consultation Booking] ${booking.fullName} — Ref: ${booking.auditReference}`,
            html: buildAdvisorEmailHtml(booking, diagnostic),
          }),
        });

        if (advisorRes.ok) {
          const advisorData: any = await advisorRes.json().catch(() => ({}));
          advisorSent = true;
          advisorMessageId = advisorData?.id;
          console.log(`[Email Dispatch] Advisor email sent to ${advisorEmail} from ${advisorSenderFormatted} (id: ${advisorMessageId})`);
        } else {
          advisorError = await advisorRes.text();
          console.error(`[Email Dispatch Error] Resend rejected advisor email to ${advisorEmail}:`, advisorError);
        }
      } catch (err: any) {
        advisorError = err?.message || 'Network failure sending advisor alert';
        console.error(`[Email Dispatch Error] Advisor dispatch exception:`, err);
      }

      return {
        success: clientSent && advisorSent,
        clientSent,
        advisorSent,
        clientError,
        advisorError,
        clientMessageId,
        advisorMessageId,
        mode: 'resend',
        senders: {
          client: clientSenderFormatted,
          advisor: advisorSenderFormatted,
        },
        timestamp,
      };
    } catch (err: any) {
      console.warn('[Email Dispatch] Resend provider failed, falling back to SMTP:', err);
    }
  }

  // 2. Secondary Engine: SMTP via Nodemailer
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER)?.trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD)?.trim();

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) === 465 : true,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      let clientSent = false;
      let clientError: string | undefined;
      let advisorSent = false;
      let advisorError: string | undefined;

      try {
        await transporter.sendMail({
          from: `"Meridian China Advisory" <${CLIENT_SENDER_EMAIL}>`,
          to: clientEmail,
          replyTo: CLIENT_SENDER_EMAIL,
          subject: `[Booking Confirmed] China Trade Consultation — Ref: ${booking.auditReference}`,
          html: buildClientEmailHtml(booking, diagnostic),
        });
        clientSent = true;
      } catch (e: any) {
        clientError = e?.message || 'SMTP client send failed';
        console.error('[Email Dispatch Error] SMTP client error:', e);
      }

      try {
        await transporter.sendMail({
          from: `"Meridian Advisory Notifications" <${ADVISOR_NOTIFICATION_SENDER_EMAIL}>`,
          to: advisorEmail,
          replyTo: clientEmail || CLIENT_SENDER_EMAIL,
          subject: `[New Consultation Booking] ${booking.fullName} — Ref: ${booking.auditReference}`,
          html: buildAdvisorEmailHtml(booking, diagnostic),
        });
        advisorSent = true;
      } catch (e: any) {
        advisorError = e?.message || 'SMTP advisor send failed';
        console.error('[Email Dispatch Error] SMTP advisor error:', e);
      }

      return {
        success: clientSent && advisorSent,
        advisorSent,
        clientSent,
        clientError,
        advisorError,
        mode: 'smtp',
        senders: {
          client: `"Meridian China Advisory" <${CLIENT_SENDER_EMAIL}>`,
          advisor: `"Meridian Advisory Notifications" <${ADVISOR_NOTIFICATION_SENDER_EMAIL}>`,
        },
        timestamp,
      };
    } catch (err: any) {
      console.warn('[Email Dispatch] SMTP failed:', err);
    }
  }

  // 3. Fallback when neither RESEND_API_KEY nor SMTP credentials are provided
  console.log(`[Email Dispatch - Simulation Mode] No live email provider configured:`, {
    reference: booking.auditReference,
    clientRecipient: clientEmail,
    advisorRecipient: advisorEmail,
    clientSender: clientSenderFormatted,
    advisorSender: advisorSenderFormatted,
  });

  return {
    success: false,
    advisorSent: false,
    clientSent: false,
    clientError: 'RESEND_API_KEY is not configured in server environment',
    advisorError: 'RESEND_API_KEY is not configured in server environment',
    mode: 'simulated',
    senders: {
      client: clientSenderFormatted,
      advisor: advisorSenderFormatted,
    },
    timestamp,
  };
};
