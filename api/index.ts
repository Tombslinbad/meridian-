import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ============================================================================
// TIKTOK EVENTS API (SERVER-SIDE DISPATCHER - SELF-CONTAINED)
// ============================================================================
export const TIKTOK_API_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

export const getTikTokPixelId = (): string => {
  return (
    process.env.TIKTOK_PIXEL_ID ||
    process.env.VITE_TIKTOK_PIXEL_ID ||
    'DAPHHSRC77U28JP3A930'
  ).trim();
};

export const getTikTokAccessToken = (): string => {
  return (process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN || '').trim();
};

export interface TikTokUserData {
  email?: string;
  phone?: string;
  ttclid?: string;
  ttp?: string;
  ip?: string;
  userAgent?: string;
  externalId?: string;
}

export interface TikTokEventPayload {
  eventName: string;
  eventId: string;
  timestamp?: number;
  properties?: {
    value?: number;
    currency?: string;
    content_type?: string;
    content_id?: string;
    content_name?: string;
    [key: string]: any;
  };
  user?: TikTokUserData;
  pageUrl?: string;
}

const processedTikTokEventIds = new Set<string>();

export function hashEmail(email?: string): string | undefined {
  if (!email || typeof email !== 'string') return undefined;
  const cleaned = email.trim().toLowerCase();
  if (!cleaned || !cleaned.includes('@')) return undefined;
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

export function hashPhone(phone?: string): string | undefined {
  if (!phone || typeof phone !== 'string') return undefined;
  const digits = phone.trim().replace(/[^\d+]/g, '');
  if (!digits || digits.length < 5) return undefined;
  return crypto.createHash('sha256').update(digits).digest('hex');
}

export async function sendTikTokEvent(
  payload: TikTokEventPayload
): Promise<{ success: boolean; code?: number; message?: string; skipped?: boolean }> {
  const token = getTikTokAccessToken();
  const pixelId = getTikTokPixelId();

  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[TikTok Events API] Skipping ${payload.eventName} (TIKTOK_EVENTS_API_ACCESS_TOKEN is not configured)`
      );
    }
    return { success: false, skipped: true, message: 'TIKTOK_EVENTS_API_ACCESS_TOKEN not set' };
  }

  if (processedTikTokEventIds.has(payload.eventId)) {
    console.log(
      `[TikTok Events API] Event ${payload.eventName} with ID ${payload.eventId} already processed; skipping (idempotent)`
    );
    return { success: true, skipped: true, message: 'Already processed' };
  }

  try {
    const eventTime = payload.timestamp || Math.floor(Date.now() / 1000);
    const userObject: Record<string, any> = {};

    const hashedEmail = hashEmail(payload.user?.email);
    if (hashedEmail) userObject.email = hashedEmail;

    const hashedPhone = hashPhone(payload.user?.phone);
    if (hashedPhone) userObject.phone = hashedPhone;

    if (payload.user?.ttclid && payload.user.ttclid.trim()) {
      userObject.ttclid = payload.user.ttclid.trim();
    }
    if (payload.user?.ttp && payload.user.ttp.trim()) {
      userObject.ttp = payload.user.ttp.trim();
    }
    if (payload.user?.ip && payload.user.ip.trim()) {
      userObject.ip = payload.user.ip.trim();
    }
    if (payload.user?.userAgent && payload.user.userAgent.trim()) {
      userObject.user_agent = payload.user.userAgent.trim();
    }
    if (payload.user?.externalId) {
      userObject.external_id = crypto
        .createHash('sha256')
        .update(payload.user.externalId.trim())
        .digest('hex');
    }

    const eventData: Record<string, any> = {
      event: payload.eventName,
      event_time: eventTime,
      event_id: payload.eventId,
      user: userObject,
      properties: {
        value: payload.properties?.value ?? 50000,
        currency: payload.properties?.currency ?? 'NGN',
        content_type: payload.properties?.content_type ?? 'product',
        content_id: payload.properties?.content_id ?? 'china-consultation-60min',
        content_name:
          payload.properties?.content_name ?? 'China Business Consultation (60-Min)',
        ...payload.properties,
      },
    };

    if (payload.pageUrl) {
      eventData.page = { url: payload.pageUrl };
    }

    const requestBody: Record<string, any> = {
      event_source: 'web',
      event_source_id: pixelId,
      data: [eventData],
    };

    const testCode = process.env.TIKTOK_TEST_EVENT_CODE?.trim();
    if (testCode) {
      requestBody.test_event_code = testCode;
    }

    const response = await fetch(TIKTOK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': token,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = (await response.json()) as any;

    if (response.ok && responseData?.code === 0) {
      processedTikTokEventIds.add(payload.eventId);
      console.log(
        `[TikTok Events API] Successfully sent ${payload.eventName} for event_id=${payload.eventId}`
      );
      return { success: true, code: responseData.code, message: responseData.message };
    } else {
      console.warn(
        `[TikTok Events API] Failed to send ${payload.eventName}:`,
        responseData?.message || response.statusText,
        `Code: ${responseData?.code}`
      );
      return {
        success: false,
        code: responseData?.code || response.status,
        message: responseData?.message || response.statusText,
      };
    }
  } catch (err: any) {
    console.warn(`[TikTok Events API] Network/transport error for ${payload.eventName}:`, err?.message || err);
    return { success: false, message: err?.message || 'Transport error' };
  }
}

export async function sendTikTokCompletePayment(params: {
  checkoutId: string;
  reference?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string;
  customerPhone?: string;
  ttclid?: string;
  ttp?: string;
  ip?: string;
  userAgent?: string;
  pageUrl?: string;
}): Promise<void> {
  const { checkoutId } = params;
  if (!checkoutId) return;

  const eventId = checkoutId.startsWith('mca_') ? checkoutId : `mca_${checkoutId}`;

  if (processedTikTokEventIds.has(eventId)) {
    return;
  }

  await sendTikTokEvent({
    eventName: 'CompletePayment',
    eventId: eventId,
    timestamp: Math.floor(Date.now() / 1000),
    properties: {
      value: params.amount ?? 50000,
      currency: params.currency ?? 'NGN',
      content_type: 'product',
      content_id: 'china-consultation-60min',
      content_name: 'China Business Consultation (60-Min)',
      reference: params.reference || checkoutId,
    },
    user: {
      email: params.customerEmail,
      phone: params.customerPhone,
      ttclid: params.ttclid,
      ttp: params.ttp,
      ip: params.ip,
      userAgent: params.userAgent,
      externalId: params.reference || checkoutId,
    },
    pageUrl: params.pageUrl || 'https://meridianchina.com/booking',
  });
}

// ============================================================================
// TIKTOK ATTRIBUTION CACHE FOR SERVER-SIDE EVENTS API
// ============================================================================
interface CheckoutAttribution {
  checkoutId: string;
  reference: string;
  customerEmail?: string;
  customerPhone?: string;
  ttclid?: string;
  ttp?: string;
  ip?: string;
  userAgent?: string;
  pageUrl?: string;
  amount?: number;
  currency?: string;
}

const checkoutAttributions = new Map<string, CheckoutAttribution>();

// ============================================================================
// CONSTANTS & ENVIRONMENT ACCESS
// ============================================================================
export const ADVISOR_EMAIL = 'igwev2956@gmail.com';
export const CLIENT_SENDER_EMAIL = 'meridianadvisory@verifieduni.com';
export const ADVISOR_NOTIFICATION_SENDER_EMAIL = 'notifications@verifieduni.com';

const getBachsApiKey = (): string => {
  return process.env.BACHS_API_KEY?.trim() || '';
};

const getBachsBaseUrl = (apiKey: string): string => {
  return apiKey.startsWith('sk_sandbox_')
    ? 'https://sandbox-api.bachs.io/v1'
    : 'https://api.bachs.io/v1';
};

// ============================================================================
// EMAIL DISPATCHER INTERFACES & HELPERS
// ============================================================================
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

const buildClientEmailHtml = (booking: BookingPayload, diagnostic?: DiagnosticPayload): string => {
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

const buildAdvisorEmailHtml = (booking: BookingPayload, diagnostic?: DiagnosticPayload): string => {
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

export const dispatchAutomaticEmails = async (
  booking: BookingPayload,
  diagnostic?: DiagnosticPayload
): Promise<DispatchResult> => {
  const timestamp = new Date().toISOString();

  const clientSenderFormatted =
    process.env.RESEND_CLIENT_FROM_EMAIL?.trim() ||
    `Meridian China Advisory <${CLIENT_SENDER_EMAIL}>`;

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
          } else {
            clientError = await clientRes.text();
            console.error('[Email Dispatch Error] Resend client email error:', clientError);
          }
        } catch (err: any) {
          clientError = err?.message || 'Network failure sending client email';
          console.error('[Email Dispatch Error] Client dispatch exception:', err);
        }
      } else {
        clientError = `Invalid client email address: "${booking.email}"`;
      }

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
        } else {
          advisorError = await advisorRes.text();
          console.error('[Email Dispatch Error] Resend advisor alert error:', advisorError);
        }
      } catch (err: any) {
        advisorError = err?.message || 'Network failure sending advisor alert';
        console.error('[Email Dispatch Error] Advisor dispatch exception:', err);
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

  // 2. Secondary Engine: SMTP via dynamic nodemailer import (lazy-loaded so it never blocks startup)
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER)?.trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD)?.trim();

  if (smtpUser && smtpPass) {
    try {
      const nodemailer = (await import('nodemailer')).default;
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

  // 3. Fallback simulation mode
  return {
    success: false,
    advisorSent: false,
    clientSent: false,
    clientError: 'Neither RESEND_API_KEY nor SMTP credentials configured on server',
    advisorError: 'Neither RESEND_API_KEY nor SMTP credentials configured on server',
    mode: 'simulated',
    senders: {
      client: clientSenderFormatted,
      advisor: advisorSenderFormatted,
    },
    timestamp,
  };
};

// ============================================================================
// EXPRESS APP CREATION & CONFIGURATION
// ============================================================================
const app = express();

app.use(express.json());

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  next();
});

app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(200);
});

// Normalize request URL across local development and Vercel Serverless Function rewrites
app.use((req: Request, _res: Response, next: NextFunction) => {
  const queryRoute = req.query.__route as string;
  if (queryRoute) {
    req.url = queryRoute.startsWith('/') ? queryRoute : `/${queryRoute}`;
  } else {
    const forwardedUri = (req.headers['x-forwarded-uri'] || req.headers['x-invoke-path']) as string;
    if (forwardedUri && forwardedUri !== '/api' && forwardedUri !== '/api/' && forwardedUri !== '/') {
      req.url = forwardedUri;
    }
  }
  next();
});

// ============================================================================
// API ROUTES
// ============================================================================
const router = express.Router();

// Root check
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Meridian China Advisory Desk - Payments & Notifications Gateway',
    timestamp: new Date().toISOString(),
  });
});

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Meridian China Advisory Desk - Payments & Notifications Gateway',
    timestamp: new Date().toISOString(),
  });
});

// Bachs Configuration
router.get('/payments/bachs/config', (_req: Request, res: Response) => {
  const key = getBachsApiKey();
  const isSandbox = key.startsWith('sk_sandbox_');
  res.json({
    configured: Boolean(key),
    isSandbox,
    gateway: 'Bachs.io Global Payments Infrastructure',
    supportedMethods: [
      { id: 'card', name: 'Debit & Credit Cards', desc: 'Mastercard, Visa, Verve' },
      { id: 'bank_transfer', name: 'Direct Bank Transfer', desc: 'Instant Virtual NGN Account' },
      { id: 'mobile_money', name: 'Mobile Money', desc: 'MTN MoMo, M-Pesa, Airtel' },
      { id: 'crypto', name: 'USDT / USDC', desc: 'TRC20 & ERC20 Stablecoins' },
    ],
    defaultFeeNgn: 50000,
  });
});

// Create Bachs Checkout Session
router.post('/payments/bachs/create-checkout', async (req: Request, res: Response) => {
  try {
    const apiKey = getBachsApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: 'Bachs API key is not configured on the server.',
      });
    }

    const {
      customerName,
      customerEmail,
      phoneNumber,
      companyName,
      industry,
      tripObjective,
      travelWindow,
      selectedDate,
      selectedTime,
      amount = 50000,
      currency = 'NGN',
      successUrl,
      cancelUrl,
    } = req.body || {};

    if (!customerEmail || !customerName) {
      return res.status(400).json({
        error: 'Customer name and email are required to create a checkout session.',
      });
    }

    const baseUrl = getBachsBaseUrl(apiKey);
    const reference = `MCA-BCHS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const publicBaseUrl = (() => {
      if (process.env.APP_URL && !process.env.APP_URL.includes('localhost') && process.env.APP_URL.startsWith('http')) {
        return process.env.APP_URL.replace(/\/$/, '');
      }
      const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
      if (typeof hostHeader === 'string' && !hostHeader.includes('localhost') && !hostHeader.includes('127.0.0.1')) {
        const proto = req.headers['x-forwarded-proto'] || 'https';
        return `${proto}://${hostHeader}`;
      }
      return 'https://meridianchina.vercel.app';
    })();

    const resolvedSuccessUrl =
      successUrl && !successUrl.includes('localhost')
        ? successUrl
        : `${publicBaseUrl}/?payment_status=success&session_id={CHECKOUT_SESSION_ID}&ref=${reference}`;

    const resolvedCancelUrl =
      cancelUrl && !cancelUrl.includes('localhost')
        ? cancelUrl
        : `${publicBaseUrl}/?payment_status=cancelled`;

    const payload = {
      customer: {
        name: String(customerName).trim(),
        email: String(customerEmail).trim().toLowerCase(),
        ...(phoneNumber ? { phone_number: String(phoneNumber).trim() } : {}),
      },
      pricing: {
        pricing_type: 'fixed',
        amount: String(amount),
        currency: String(currency).toUpperCase(),
      },
      billing_currency: String(currency).toUpperCase(),
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
      reference,
      metadata: {
        service: 'China Business Consultation (60-Min)',
        company: companyName || 'Private Client',
        industry: industry || 'Commodity Trade',
        tripObjective: tripObjective || 'canton',
        travelWindow: travelWindow || 'Autumn 2026',
        appointmentDate: selectedDate || '',
        appointmentTime: selectedTime || '',
        advisoryFeeNgn: String(amount),
      },
    };

    const bachsResponse = await fetch(`${baseUrl}/checkout-sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await bachsResponse.json()) as any;

    if (!bachsResponse.ok) {
      console.error('Bachs API checkout error:', data);
      return res.status(bachsResponse.status).json({
        error: data?.detail || data?.message || 'Failed to initialize Bachs checkout session.',
        errorCode: data?.error_code,
        details: data?.errors,
      });
    }

    // Cache attribution information for server-side TikTok Events API reporting
    if (data.checkout_id) {
      checkoutAttributions.set(data.checkout_id, {
        checkoutId: data.checkout_id,
        reference: data.reference || reference,
        customerEmail: String(customerEmail).trim().toLowerCase(),
        customerPhone: phoneNumber ? String(phoneNumber).trim() : undefined,
        ttclid:
          req.body?.tiktokAttribution?.ttclid ||
          (req.query?.ttclid as string) ||
          (req.headers['x-ttclid'] as string),
        ttp:
          req.body?.tiktokAttribution?.ttp ||
          (req.query?.ttp as string) ||
          (req.headers['x-ttp'] as string),
        ip:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
          req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        pageUrl: req.body?.tiktokAttribution?.pageUrl,
        amount: Number(amount) || 50000,
        currency: String(currency || 'NGN').toUpperCase(),
      });
    }

    return res.status(201).json({
      success: true,
      checkoutId: data.checkout_id,
      checkoutUrl: data.checkout_url,
      reference: data.reference || reference,
      amount: data.amount,
      currency: data.currency,
      expiresAt: data.expires_at,
      isSandbox: apiKey.startsWith('sk_sandbox_'),
    });
  } catch (err: any) {
    console.error('Server error creating Bachs checkout:', err);
    return res.status(500).json({
      error: err?.message || 'An internal error occurred while communicating with Bachs gateway.',
    });
  }
});

// Verify Bachs Checkout Session
router.get('/payments/bachs/verify-checkout/:checkoutId', async (req: Request, res: Response) => {
  try {
    const apiKey = getBachsApiKey();
    const { checkoutId } = req.params;

    if (!checkoutId) {
      return res.status(400).json({ error: 'checkoutId is required' });
    }

    const baseUrl = getBachsBaseUrl(apiKey);
    const bachsResponse = await fetch(
      `${baseUrl}/checkout-sessions/${encodeURIComponent(checkoutId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    );

    const data = (await bachsResponse.json()) as any;

    if (!bachsResponse.ok) {
      return res.status(bachsResponse.status).json({
        error: data?.detail || 'Unable to retrieve checkout session from Bachs.',
      });
    }

    const isSucceeded =
      data.payment_status === 'succeeded' ||
      data.status === 'complete' ||
      data.charge?.status === 'successful' ||
      data.charge?.status === 'completed';

    // Dispatch server-side TikTok CompletePayment ONLY when genuinely verified by Bachs
    if (isSucceeded) {
      const attr = checkoutAttributions.get(checkoutId);
      sendTikTokCompletePayment({
        checkoutId,
        reference: data.reference || attr?.reference,
        amount: data.amount ? Number(data.amount) : 50000,
        currency: data.currency || 'NGN',
        customerEmail: data.customer?.email || attr?.customerEmail,
        customerPhone: data.customer?.phone_number || attr?.customerPhone,
        ttclid:
          attr?.ttclid ||
          (req.headers['x-ttclid'] as string) ||
          (req.query?.ttclid as string),
        ttp:
          attr?.ttp ||
          (req.headers['x-ttp'] as string) ||
          (req.query?.ttp as string),
        ip:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
          req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        pageUrl: attr?.pageUrl,
      }).catch((e) => {
        console.warn('[TikTok Events API] Non-fatal dispatch error:', e?.message || e);
      });
    }

    return res.json({
      checkoutId: data.checkout_id,
      status: data.status,
      paymentStatus: data.payment_status,
      isSucceeded,
      amount: data.amount,
      currency: data.currency,
      reference: data.reference,
      customer: data.customer,
      metadata: data.metadata,
      charge: data.charge,
      createdAt: data.created_at,
      completedAt: data.completed_at,
    });
  } catch (err: any) {
    console.error('Server error verifying Bachs checkout:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to verify checkout session with Bachs gateway.',
    });
  }
});

// Idempotency cache to prevent duplicate processing or duplicate emails
const processedBachsEvents = new Set<string>();

// Bachs Webhook Endpoint
router.post('/payments/bachs/webhook', async (req: Request, res: Response) => {
  try {
    const apiKey = getBachsApiKey();
    if (!apiKey) {
      return res.status(503).json({ error: 'Bachs API key not configured' });
    }

    const payload = req.body || {};
    const checkoutId =
      payload?.data?.checkout_id ||
      payload?.checkout_id ||
      payload?.data?.id ||
      payload?.id;

    if (!checkoutId) {
      return res.status(400).json({ error: 'Missing checkoutId in webhook payload' });
    }

    // Idempotency check
    const eventKey = `${checkoutId}_${payload.event || 'completed'}`;
    if (processedBachsEvents.has(eventKey)) {
      return res.json({ received: true, status: 'already_processed' });
    }

    // Authenticate and verify with Bachs source-of-truth API directly
    const baseUrl = getBachsBaseUrl(apiKey);
    const bachsRes = await fetch(`${baseUrl}/checkout-sessions/${encodeURIComponent(checkoutId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!bachsRes.ok) {
      console.warn(`[Webhook] Could not verify checkout ${checkoutId} with Bachs API`);
      return res.status(400).json({ error: 'Verification failed with Bachs API' });
    }

    const sessionData = (await bachsRes.json()) as any;
    const isSucceeded =
      sessionData.payment_status === 'succeeded' ||
      sessionData.status === 'complete' ||
      sessionData.charge?.status === 'successful' ||
      sessionData.charge?.status === 'completed';

    if (isSucceeded) {
      processedBachsEvents.add(eventKey);
      console.log(`[Webhook] Verified successful payment for checkout ${checkoutId}`);

      // Dispatch server-side TikTok CompletePayment asynchronously & idempotently
      const attr = checkoutAttributions.get(checkoutId);
      sendTikTokCompletePayment({
        checkoutId,
        reference:
          sessionData.reference ||
          sessionData.metadata?.booking_reference ||
          attr?.reference,
        amount: sessionData.amount ? Number(sessionData.amount) : 50000,
        currency: sessionData.currency || 'NGN',
        customerEmail: sessionData.customer?.email || attr?.customerEmail,
        customerPhone: sessionData.customer?.phone_number || attr?.customerPhone,
        ttclid: attr?.ttclid,
        ttp: attr?.ttp,
        ip:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
          req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        pageUrl: attr?.pageUrl,
      }).catch((e) => {
        console.warn('[TikTok Events API] Non-fatal dispatch error from webhook:', e?.message || e);
      });

      // If session metadata contains booking data, dispatch notifications if not yet sent
      if (sessionData.metadata && sessionData.metadata.booking_reference) {
        const meta = sessionData.metadata;
        const bookingPayload: BookingPayload = {
          auditReference: meta.booking_reference,
          fullName: sessionData.customer?.name || meta.customer_name || 'Valued Client',
          email: sessionData.customer?.email || meta.customer_email || '',
          phone: sessionData.customer?.phone_number || meta.phone_number || '',
          companyName: meta.company_name || 'Trading Entity',
          industry: meta.industry || 'General Trade',
          tripObjective: meta.trip_objective || 'Strategy Advisory',
          travelWindow: meta.travel_window || 'Flexible',
          selectedDate: meta.selected_date || 'Confirmed Slot',
          selectedDateIso: meta.selected_date_iso || new Date().toISOString().split('T')[0],
          selectedTime: meta.selected_time || 'Agreed Slot',
          amountNgn: sessionData.amount || 50000,
          meetUrl: meta.meet_url || 'https://meet.google.com',
        };

        if (bookingPayload.email) {
          await dispatchAutomaticEmails(bookingPayload);
        }
      }
    }

    return res.json({ received: true, verified: isSucceeded });
  } catch (err: any) {
    console.error('[Webhook Error]:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});

// TikTok Tracking Status & Diagnostic endpoint (read-only, zero secrets exposed)
router.get('/analytics/tiktok/status', (_req: Request, res: Response) => {
  const isConfigured = Boolean(process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN?.trim());
  return res.json({
    status: 'ok',
    eventsApiConfigured: isConfigured,
    pixelId:
      process.env.TIKTOK_PIXEL_ID ||
      process.env.VITE_TIKTOK_PIXEL_ID ||
      'DAPHHSRC77U28JP3A930',
    mode: process.env.NODE_ENV || 'development',
  });
});

// Automated Notification Route
router.post('/notifications/consultation-booked', async (req: Request, res: Response) => {
  try {
    const { booking, diagnostic } = req.body || {};

    if (!booking) {
      return res.status(400).json({ error: 'Missing booking payload' });
    }

    const dispatchResult = await dispatchAutomaticEmails(booking, diagnostic);

    return res.json({
      success: dispatchResult.success,
      advisorEmailSent: dispatchResult.advisorSent,
      clientEmailSent: dispatchResult.clientSent,
      clientError: dispatchResult.clientError || null,
      advisorError: dispatchResult.advisorError || null,
      clientMessageId: dispatchResult.clientMessageId || null,
      advisorMessageId: dispatchResult.advisorMessageId || null,
      senders: dispatchResult.senders,
      mode: dispatchResult.mode,
      dispatchedAt: dispatchResult.timestamp,
      recipients: {
        advisor: ADVISOR_EMAIL,
        client: booking.email,
      },
      calendar: {
        summary: 'Meridian China Advisory: 1-on-1 Bilateral Trade Consultation',
        meetUrl: booking.meetUrl,
        attendees: [ADVISOR_EMAIL, booking.email].filter(Boolean),
      },
    });
  } catch (err: any) {
    console.error('Server error dispatching automated emails in serverless API:', err);
    return res.status(500).json({ error: err?.message || 'Failed to dispatch automatic notification' });
  }
});

// Mount router on both /api and / so all paths resolve consistently
app.use('/api', router);
app.use('/', router);

// Catch-all 404 for unhandled API endpoints
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Gateway Error]:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: err?.message || 'Internal Server Error in API Gateway',
    });
  }
});

export default app;
