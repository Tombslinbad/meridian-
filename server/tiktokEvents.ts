import crypto from 'crypto';

// ============================================================================
// TIKTOK EVENTS API CONFIGURATION & TYPES
// ============================================================================

export const TIKTOK_API_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

/**
 * Returns the configured Pixel ID.
 * Defaults to the production pixel ID installed on the site.
 */
export const getTikTokPixelId = (): string => {
  return (
    process.env.TIKTOK_PIXEL_ID ||
    process.env.VITE_TIKTOK_PIXEL_ID ||
    'DAPHHSRC77U28JP3A930'
  ).trim();
};

/**
 * Returns the TikTok Events API access token strictly from the server environment.
 * SECURITY: Never logged, never sent to client, never prefixed with VITE_.
 */
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
  eventName: string; // e.g. 'CompletePayment'
  eventId: string; // Unique deduplication ID (shared with browser pixel)
  timestamp?: number; // Unix timestamp in seconds
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

// In-memory idempotency cache to prevent duplicate TikTok conversions
const processedTikTokEventIds = new Set<string>();

/**
 * Normalizes and computes SHA-256 hash for emails per TikTok specifications:
 * Lowercase, trimmed, hexadecimal digest.
 */
export function hashEmail(email?: string): string | undefined {
  if (!email || typeof email !== 'string') return undefined;
  const cleaned = email.trim().toLowerCase();
  if (!cleaned || !cleaned.includes('@')) return undefined;
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

/**
 * Normalizes and computes SHA-256 hash for phone numbers per TikTok specifications:
 * Strips formatting spaces/dashes, preserves E.164, hexadecimal digest.
 */
export function hashPhone(phone?: string): string | undefined {
  if (!phone || typeof phone !== 'string') return undefined;
  const digits = phone.trim().replace(/[^\d+]/g, '');
  if (!digits || digits.length < 5) return undefined;
  return crypto.createHash('sha256').update(digits).digest('hex');
}

/**
 * Clean reusable server-side TikTok Events API dispatcher.
 * Handles payload normalization, hashing of user data, and graceful error handling.
 */
export async function sendTikTokEvent(
  payload: TikTokEventPayload
): Promise<{ success: boolean; code?: number; message?: string; skipped?: boolean }> {
  const token = getTikTokAccessToken();
  const pixelId = getTikTokPixelId();

  // If token is missing, skip gracefully without crashing or creating errors
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[TikTok Events API] Skipping ${payload.eventName} (TIKTOK_EVENTS_API_ACCESS_TOKEN is not configured)`
      );
    }
    return { success: false, skipped: true, message: 'TIKTOK_EVENTS_API_ACCESS_TOKEN not set' };
  }

  // Idempotency check: never send the same event_id twice
  if (processedTikTokEventIds.has(payload.eventId)) {
    console.log(
      `[TikTok Events API] Event ${payload.eventName} with ID ${payload.eventId} already processed; skipping (idempotent)`
    );
    return { success: true, skipped: true, message: 'Already processed' };
  }

  try {
    const eventTime = payload.timestamp || Math.floor(Date.now() / 1000);

    // Build the user data object with SHA-256 hashes where applicable
    const userObject: Record<string, any> = {};

    const hashedEmail = hashEmail(payload.user?.email);
    if (hashedEmail) {
      userObject.email = hashedEmail;
    }

    const hashedPhone = hashPhone(payload.user?.phone);
    if (hashedPhone) {
      userObject.phone = hashedPhone;
    }

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

    // Build the TikTok v1.3 event payload
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

    // Optional test_event_code support for TikTok Test Events tool
    const testCode = process.env.TIKTOK_TEST_EVENT_CODE?.trim();
    if (testCode) {
      requestBody.test_event_code = testCode;
    }

    const response = await fetch(TIKTOK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': token, // Token is used directly in header, never logged
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
    // Non-blocking: failure to reach TikTok API must NEVER affect customer payment flow
    console.warn(`[TikTok Events API] Network/transport error for ${payload.eventName}:`, err?.message || err);
    return { success: false, message: err?.message || 'Transport error' };
  }
}

/**
 * Triggers the verified CompletePayment server-side conversion event.
 * STRICT ENFORCEMENT: Only invoked AFTER backend has verified payment with Bachs API.
 * Deduplicated with browser pixel via eventId = `mca_${checkoutId}`.
 */
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

  // Check in-memory idempotency first
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
