import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { BookingDetails, DiagnosticData } from '../types';

// Initialize Firebase App safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with requested Workspace scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/gmail.send',
];

export const ADVISOR_EMAIL = 'igwev2956@gmail.com';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/meetings.space.created');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// In-memory cache for OAuth access token (per security guideline)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      // If popup returned user but no credential.accessToken directly, we still have user object
      cachedAccessToken = null;
      return { user: result.user, accessToken: '' };
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Creates a Google Meet space using Google Meet API (v2)
 */
export const createGoogleMeetSpace = async (token?: string | null): Promise<string> => {
  const authToken = token || cachedAccessToken;
  if (!authToken) {
    return 'https://meet.google.com/mca-tianhe-bilateral';
  }

  try {
    const res = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.meetingUri) {
        return data.meetingUri;
      }
    }
  } catch (err) {
    console.warn('Could not create Google Meet space via API, using dedicated secure room link:', err);
  }

  return 'https://meet.google.com/mca-tianhe-bilateral';
};

/**
 * Adds an event to the user's primary Google Calendar via Calendar API
 */
export const insertCalendarEventViaApi = async (
  booking: BookingDetails,
  token: string
): Promise<{ success: boolean; eventLink?: string; error?: string }> => {
  try {
    // Parse date and time into RFC3339 timestamps
    // Default time is in WAT (UTC+1)
    const dateStr = booking.selectedDateIso || '2025-04-09';
    let hour = 11;
    let minute = 30;

    if (booking.selectedTime.includes('10:00')) {
      hour = 10;
      minute = 0;
    } else if (booking.selectedTime.includes('11:30')) {
      hour = 11;
      minute = 30;
    } else if (booking.selectedTime.includes('02:00') || booking.selectedTime.includes('2:00')) {
      hour = 14;
      minute = 0;
    } else if (booking.selectedTime.includes('04:00') || booking.selectedTime.includes('4:00')) {
      hour = 16;
      minute = 0;
    } else if (booking.selectedTime.includes('06:00') || booking.selectedTime.includes('6:00')) {
      hour = 18;
      minute = 0;
    } else if (booking.selectedTime.includes('08:00') || booking.selectedTime.includes('8:00')) {
      hour = 20;
      minute = 0;
    }

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const startIso = `${dateStr}T${pad(hour)}:${pad(minute)}:00+01:00`;
    const endHour = hour + 1;
    const endIso = `${dateStr}T${pad(endHour)}:${pad(minute)}:00+01:00`;

    const body = {
      summary: 'Meridian China Advisory: 1-on-1 Bilateral Trade Consultation',
      description: `Executive 1-on-1 Strategic China Business & Canton Fair Advisory Session with Director, Bilateral Trade Desk.\n\n` +
        `Ref ID: ${booking.auditReference}\n` +
        `Client: ${booking.fullName} (${booking.companyName || 'Industrial Ventures'})\n` +
        `Sector: ${booking.industry}\n` +
        `Google Meet Link: ${booking.meetUrl}\n` +
        `Direct Desk WhatsApp: +234 800 MERIDIAN\n\n` +
        `Meridian China Advisory Ltd — Sovereign-Grade Bilateral Trade Architecture`,
      start: {
        dateTime: startIso,
        timeZone: 'Africa/Lagos',
      },
      end: {
        dateTime: endIso,
        timeZone: 'Africa/Lagos',
      },
      location: booking.meetUrl,
      attendees: [
        {
          email: ADVISOR_EMAIL,
          displayName: 'Meridian Advisory Desk',
          organizer: true,
          responseStatus: 'accepted',
        },
        ...(booking.email
          ? [
              {
                email: booking.email,
                displayName: booking.fullName || 'Consultation Client',
              },
            ]
          : []),
      ],
      conferenceData: {
        createRequest: {
          requestId: `mca-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (res.ok) {
      const data = await res.json();
      return { success: true, eventLink: data.htmlLink };
    } else {
      const errData = await res.json();
      return { success: false, error: errData?.error?.message || 'Calendar insertion failed' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
};

/**
 * Generates direct Google Calendar Web URL for 1-click fallback
 */
export const generateGoogleCalendarUrl = (booking: BookingDetails): string => {
  const eventTitle = encodeURIComponent('Meridian China Advisory: 1-on-1 Bilateral Trade Consultation');
  const details = encodeURIComponent(
    `Session with Director, Bilateral Trade Desk.\n` +
    `Ref: ${booking.auditReference}\n` +
    `Client: ${booking.fullName} (${booking.companyName})\n` +
    `Teleconference Feed: ${booking.meetUrl}\n` +
    `Direct Concierge WhatsApp: +234 800 MERIDIAN`
  );
  const location = encodeURIComponent(`Google Meet: ${booking.meetUrl}`);

  // Format dates: 20250409T103000Z to 20250409T113000Z (WAT is UTC+1)
  const dateStr = booking.selectedDateIso.replace(/-/g, '') || '20250409';
  let startHourUtc = 10;
  let minute = 30;

  if (booking.selectedTime.includes('10:00')) {
    startHourUtc = 9;
    minute = 0;
  } else if (booking.selectedTime.includes('11:30')) {
    startHourUtc = 10;
    minute = 30;
  } else if (booking.selectedTime.includes('02:00') || booking.selectedTime.includes('2:00')) {
    startHourUtc = 13;
    minute = 0;
  } else if (booking.selectedTime.includes('04:00') || booking.selectedTime.includes('4:00')) {
    startHourUtc = 15;
    minute = 0;
  } else if (booking.selectedTime.includes('06:00') || booking.selectedTime.includes('6:00')) {
    startHourUtc = 17;
    minute = 0;
  } else if (booking.selectedTime.includes('08:00') || booking.selectedTime.includes('8:00')) {
    startHourUtc = 19;
    minute = 0;
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const startStr = `${dateStr}T${pad(startHourUtc)}${pad(minute)}00Z`;
  const endStr = `${dateStr}T${pad(startHourUtc + 1)}${pad(minute)}00Z`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
};

/**
 * Downloads standard .ics calendar invite for Apple / Outlook
 */
export const downloadIcsFile = (booking: BookingDetails) => {
  const dateStr = booking.selectedDateIso.replace(/-/g, '') || '20250409';
  let startHourUtc = 10;
  let minute = 30;

  if (booking.selectedTime.includes('10:00')) {
    startHourUtc = 9;
    minute = 0;
  } else if (booking.selectedTime.includes('11:30')) {
    startHourUtc = 10;
    minute = 30;
  } else if (booking.selectedTime.includes('02:00') || booking.selectedTime.includes('2:00')) {
    startHourUtc = 13;
    minute = 0;
  } else if (booking.selectedTime.includes('04:00') || booking.selectedTime.includes('4:00')) {
    startHourUtc = 15;
    minute = 0;
  } else if (booking.selectedTime.includes('06:00') || booking.selectedTime.includes('6:00')) {
    startHourUtc = 17;
    minute = 0;
  } else if (booking.selectedTime.includes('08:00') || booking.selectedTime.includes('8:00')) {
    startHourUtc = 19;
    minute = 0;
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const startStr = `${dateStr}T${pad(startHourUtc)}${pad(minute)}00Z`;
  const endStr = `${dateStr}T${pad(startHourUtc + 1)}${pad(minute)}00Z`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meridian China Advisory Ltd//Trade Desk 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:MCA-${Date.now()}@meridianchina.ng`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    'SUMMARY:Meridian China Advisory: 1-on-1 Bilateral Trade Consultation',
    `DESCRIPTION:Strategic China Business & Canton Fair Advisory Session with Director\\, Bilateral Trade Desk.\\nRef: ${booking.auditReference}\\nMeet: ${booking.meetUrl}`,
    `LOCATION:${booking.meetUrl}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Meridian-Consultation-${booking.auditReference}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Creates RFC 2822 base64url encoded MIME message for Gmail API
 */
export const createMimeMessage = ({
  to,
  from,
  subject,
  htmlBody,
  textBody,
}: {
  to: string;
  from?: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}): string => {
  const boundary = `====boundary_${Date.now()}_${Math.random().toString(36).substring(2)}====`;
  const utf8Subject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const headers = [
    `To: ${to}`,
    from ? `From: ${from}` : '',
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
    .filter(Boolean)
    .join('\r\n');

  const parts = [
    headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return btoa(unescape(encodeURIComponent(parts)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Sends a single email via Gmail API
 */
export const sendEmailViaGmailApi = async ({
  to,
  subject,
  htmlBody,
  textBody,
  token,
}: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  token: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const raw = createMimeMessage({ to, subject, htmlBody, textBody });
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, messageId: data.id };
    } else {
      const err = await res.json().catch(() => null);
      return { success: false, error: err?.error?.message || 'Failed to dispatch via Gmail API' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error dispatching email' };
  }
};

/**
 * Dispatches consultation notification emails to BOTH:
 * 1. The advisor (igwev2956@gmail.com) with full client dossier
 * 2. The client (booking.email) with appointment details & Google Meet link
 */
export const dispatchConsultationEmailsViaApi = async ({
  booking,
  token,
  diagnostic,
}: {
  booking: BookingDetails;
  token: string;
  diagnostic?: DiagnosticData;
}): Promise<{
  advisorResult: { success: boolean; error?: string };
  clientResult: { success: boolean; error?: string };
}> => {
  // 1. Email to Advisor (igwev2956@gmail.com)
  const advisorSubject = `[New Consultation Booking] ${booking.fullName} — ${booking.companyName || 'Bilateral Trade Desk'}`;
  const advisorText = `NEW CONSULTATION BOOKED\n\n` +
    `Ref Code: ${booking.auditReference}\n` +
    `Client Name: ${booking.fullName}\n` +
    `Client Email: ${booking.email}\n` +
    `Client Phone: ${booking.phone}\n` +
    `Company: ${booking.companyName || 'Not specified'}\n` +
    `Industry Sector: ${booking.industry}\n` +
    `Trip Objective: ${booking.tripObjective}\n` +
    `Travel Window: ${booking.travelWindow}\n\n` +
    `SCHEDULED SESSION:\n` +
    `Date: ${booking.selectedDate}\n` +
    `WAT Time: ${booking.selectedTime} (Lagos)\n` +
    `Google Meet URL: ${booking.meetUrl}\n\n` +
    `PAYMENT & ESCROW:\n` +
    `Amount: ₦50,000.00 NGN (Bachs Escrow Reference: ${booking.auditReference})\n` +
    (diagnostic?.hsCodesOrUrls ? `Diagnostic Dossier / HS Codes: ${diagnostic.hsCodesOrUrls}\n` : '') +
    (diagnostic?.currentRoadblocks ? `Roadblocks: ${diagnostic.currentRoadblocks}\n` : '');

  const advisorHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fc; margin: 0; padding: 24px; color: #1e293b; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: left; border-bottom: 3px solid #0d9488; }
          .badge { display: inline-block; background: #0d9488; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px; }
          .content { padding: 24px; }
          .section-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .table td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f8fafc; }
          .table td.label { color: #64748b; width: 38%; font-weight: 500; }
          .table td.value { color: #0f172a; font-weight: 600; }
          .meet-box { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 16px; margin-top: 16px; text-align: center; }
          .btn { display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; margin-top: 12px; }
          .footer { background: #f8fafc; padding: 16px 24px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">New Executive Booking</span>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">China Advisory Consultation</h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Client Ref: ${booking.auditReference}</p>
          </div>
          <div class="content">
            <div class="section-title">Client Dossier</div>
            <table class="table">
              <tr><td class="label">Full Name</td><td class="value">${booking.fullName}</td></tr>
              <tr><td class="label">Email Address</td><td class="value"><a href="mailto:${booking.email}">${booking.email}</a></td></tr>
              <tr><td class="label">Phone / WhatsApp</td><td class="value"><a href="tel:${booking.phone}">${booking.phone}</a></td></tr>
              <tr><td class="label">Company Entity</td><td class="value">${booking.companyName || 'Individual Trader'}</td></tr>
              <tr><td class="label">Industry Sector</td><td class="value">${booking.industry}</td></tr>
              <tr><td class="label">Objective / Scope</td><td class="value">${booking.tripObjective} (${booking.travelWindow})</td></tr>
            </table>

            <div class="section-title">Consultation Time & Meeting Room</div>
            <table class="table">
              <tr><td class="label">Scheduled Date</td><td class="value">${booking.selectedDate}</td></tr>
              <tr><td class="label">WAT Time (Lagos)</td><td class="value">${booking.selectedTime}</td></tr>
              <tr><td class="label">Advisory Fee</td><td class="value" style="color: #0d9488;">₦50,000.00 NGN (Bachs Escrow Confirmed)</td></tr>
            </table>

            <div class="meet-box">
              <span style="font-size: 12px; font-weight: 700; color: #0d9488; text-transform: uppercase;">Google Meet Video Conference</span>
              <p style="margin: 6px 0; font-size: 13px; font-family: monospace; color: #334155;">${booking.meetUrl}</p>
              <a href="${booking.meetUrl}" target="_blank" class="btn">Launch Google Meet Room</a>
            </div>

            ${
              diagnostic?.hsCodesOrUrls
                ? `
              <div class="section-title">Pre-Session Intake Specs</div>
              <p style="font-size: 13px; color: #334155; line-height: 1.5; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <strong>Target HS Codes / Links:</strong><br>${diagnostic.hsCodesOrUrls}<br><br>
                ${diagnostic.currentRoadblocks ? `<strong>Roadblocks:</strong><br>${diagnostic.currentRoadblocks}` : ''}
              </p>
            `
                : ''
            }
          </div>
          <div class="footer">
            Meridian China Advisory Ltd • Guangzhou &amp; Lagos Bilateral Trade Infrastructure
          </div>
        </div>
      </body>
    </html>
  `;

  // 2. Email to Client (booking.email)
  const clientSubject = `Confirmed: Meridian China Advisory 1-on-1 Consultation on ${booking.selectedDate}`;
  const clientText = `DEAR ${booking.fullName.toUpperCase()},\n\n` +
    `Your executive 1-on-1 strategic China business consultation is confirmed.\n\n` +
    `Appointment Details:\n` +
    `Date: ${booking.selectedDate}\n` +
    `Time: ${booking.selectedTime} (West Africa Time - Lagos)\n` +
    `Google Meet Link: ${booking.meetUrl}\n` +
    `Audit Reference: ${booking.auditReference}\n` +
    `Advisory Fee Cleared: ₦50,000.00 NGN\n\n` +
    `Advisor Contact: Director, Bilateral Trade Desk (${ADVISOR_EMAIL})\n` +
    `WhatsApp Concierge: +234 800 MERIDIAN\n\n` +
    `Meridian China Advisory Ltd`;

  const clientHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fc; margin: 0; padding: 24px; color: #1e293b; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: left; border-bottom: 3px solid #0d9488; }
          .badge { display: inline-block; background: #0d9488; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px; }
          .content { padding: 24px; }
          .section-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .table td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f8fafc; }
          .table td.label { color: #64748b; width: 38%; font-weight: 500; }
          .table td.value { color: #0f172a; font-weight: 600; }
          .meet-box { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 18px; margin-top: 18px; text-align: center; }
          .btn { display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; margin-top: 12px; }
          .footer { background: #f8fafc; padding: 16px 24px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">Consultation Confirmed</span>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Meridian China Advisory</h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">1-on-1 Strategic Bilateral Trade Desk Session</p>
          </div>
          <div class="content">
            <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
              Dear <strong>${booking.fullName}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              Your 1-on-1 bilateral trade consultation for <strong>${booking.companyName || 'your industrial venture'}</strong> has been scheduled and confirmed. Below are your session credentials:
            </p>

            <div class="section-title">Session Credentials</div>
            <table class="table">
              <tr><td class="label">Date</td><td class="value">${booking.selectedDate}</td></tr>
              <tr><td class="label">Time (WAT - Lagos)</td><td class="value">${booking.selectedTime}</td></tr>
              <tr><td class="label">Sector / Scope</td><td class="value">${booking.industry}</td></tr>
              <tr><td class="label">Audit Reference</td><td class="value">${booking.auditReference}</td></tr>
              <tr><td class="label">Principal Advisor</td><td class="value">Director, Bilateral Trade Desk</td></tr>
              <tr><td class="label">Advisor Email</td><td class="value">${ADVISOR_EMAIL}</td></tr>
            </table>

            <div class="meet-box">
              <span style="font-size: 12px; font-weight: 700; color: #0d9488; text-transform: uppercase;">Your Private Google Meet Link</span>
              <p style="margin: 6px 0; font-size: 13px; font-family: monospace; color: #334155;">${booking.meetUrl}</p>
              <a href="${booking.meetUrl}" target="_blank" class="btn">Join Scheduled Consultation</a>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin-top: 20px;">
              Please test your microphone and camera ahead of time. If you need to make adjustments or message the concierge team, reach out via WhatsApp at <strong>+234 800 MERIDIAN</strong>.
            </p>
          </div>
          <div class="footer">
            Meridian China Advisory Ltd • Sovereign Bilateral Trade Facilitation Desk
          </div>
        </div>
      </body>
    </html>
  `;

  // Dispatch email to Advisor
  const advisorResult = await sendEmailViaGmailApi({
    to: ADVISOR_EMAIL,
    subject: advisorSubject,
    htmlBody: advisorHtml,
    textBody: advisorText,
    token,
  });

  // Dispatch email to Client
  let clientResult: { success: boolean; messageId?: string; error?: string } = {
    success: false,
    error: 'No client email provided',
  };
  if (booking.email) {
    clientResult = await sendEmailViaGmailApi({
      to: booking.email,
      subject: clientSubject,
      htmlBody: clientHtml,
      textBody: clientText,
      token,
    });
  }

  return { advisorResult, clientResult };
};
