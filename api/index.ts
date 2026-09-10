import 'dotenv/config';
import express from 'express';
import { dispatchAutomaticEmails, ADVISOR_EMAIL } from '../server/emailDispatcher';

// Default sandbox key provided for Bachs.io payments
const DEFAULT_BACHS_SANDBOX_KEY =
  'sk_sandbox_757c6cfc_lJCFv9m9v8fS_dgS77H_qCFgHsuRVoCH5kFKn8dAc3E';

const getBachsApiKey = (): string => {
  return process.env.BACHS_API_KEY?.trim() || DEFAULT_BACHS_SANDBOX_KEY;
};

const getBachsBaseUrl = (apiKey: string): string => {
  return apiKey.startsWith('sk_sandbox_')
    ? 'https://sandbox-api.bachs.io/v1'
    : 'https://api.bachs.io/v1';
};

const app = express();
app.use(express.json());

const router = express.Router();

// Health Check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Meridian China Advisory Desk - Vercel Serverless Payments API',
    timestamp: new Date().toISOString(),
  });
});

// Bachs Configuration info (public flags only, never the secret key)
router.get('/payments/bachs/config', (_req, res) => {
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
router.post('/payments/bachs/create-checkout', async (req, res) => {
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
    } = req.body;

    if (!customerEmail || !customerName) {
      return res.status(400).json({
        error: 'Customer name and email are required to create a checkout session.',
      });
    }

    const baseUrl = getBachsBaseUrl(apiKey);
    const reference = `MCA-BCHS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Resolve publicly accessible URL
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
router.get('/payments/bachs/verify-checkout/:checkoutId', async (req, res) => {
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

import { db } from '../src/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Consultation Notification Dispatch (Automatic Server-Side Email Delivery)
router.post('/notifications/consultation-booked', async (req, res) => {
  try {
    const { booking, diagnostic } = req.body || {};

    if (!booking) {
      return res.status(400).json({ error: 'Missing booking payload' });
    }

    // Try to confirm the booking in Firestore
    try {
      if (booking.selectedDateIso && booking.selectedTime) {
        const slotId = `${booking.selectedDateIso}_${booking.selectedTime.replace(/[\s:]/g, '')}`;
        await setDoc(doc(db, 'bookings', slotId), {
           dateIso: booking.selectedDateIso,
           timeSlot: booking.selectedTime,
           fullName: booking.fullName,
           email: booking.email,
           phone: booking.phone || '',
           companyName: booking.companyName || '',
           status: 'confirmed',
           updatedAt: Date.now()
        }, { merge: true });
      }
    } catch (dbErr) {
      console.error('Failed to update Firestore booking:', dbErr);
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

// Mount router on both /api and / to handle Vercel rewrites gracefully
app.use('/api', router);
app.use('/', router);

export default app;
