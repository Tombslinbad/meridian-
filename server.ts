import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Default sandbox key provided for Bachs.io payments
import { dispatchAutomaticEmails, ADVISOR_EMAIL } from './server/emailDispatcher';
import {
  getAvailabilityForDate,
  getMonthAvailability,
  reserveSlot,
  confirmBookingInLedger,
  getAdvisorSettings,
  updateAdvisorSettings,
  testIcalUrl,
} from './server/calendarAvailability';

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Meridian China Advisory Desk - Payments API',
      timestamp: new Date().toISOString(),
    });
  });

  // Bachs Configuration info (public flags only, never the secret key)
  app.get('/api/payments/bachs/config', (_req, res) => {
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
  app.post('/api/payments/bachs/create-checkout', async (req, res) => {
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

      // Slot Conflict / Double-Booking Prevention Check:
      // Verify that this slot is not already booked by another client or busy on the advisor's personal Google Calendar
      const dateIsoForCheck = req.body.selectedDateIso || selectedDate;
      if (dateIsoForCheck && selectedTime) {
        // Normalize date to YYYY-MM-DD if in format like "Mon, Oct 12, 2026"
        let normalizedDateIso = dateIsoForCheck;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateIso)) {
          const m = dateIsoForCheck.match(/Oct\s+(\d{1,2})/i);
          if (m) {
            const d = parseInt(m[1], 10);
            normalizedDateIso = `2026-10-${d < 10 ? '0' + d : d}`;
          }
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateIso)) {
          const reservation = await reserveSlot(normalizedDateIso, selectedTime, {
            fullName: customerName,
            email: customerEmail,
            phone: phoneNumber,
            companyName,
          });

          if (!reservation.success) {
            return res.status(409).json({
              error:
                reservation.error ||
                'This consultation time slot is no longer available. Please select another slot.',
              code: 'SLOT_UNAVAILABLE',
            });
          }
        }
      }

      const baseUrl = getBachsBaseUrl(apiKey);
      const reference = `MCA-BCHS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Resolve a publicly accessible URL (Bachs requires non-localhost URLs)
      const publicBaseUrl = (() => {
        if (process.env.APP_URL && !process.env.APP_URL.includes('localhost') && process.env.APP_URL.startsWith('http')) {
          return process.env.APP_URL.replace(/\/$/, '');
        }
        const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
        if (typeof hostHeader === 'string' && !hostHeader.includes('localhost') && !hostHeader.includes('127.0.0.1')) {
          const proto = req.headers['x-forwarded-proto'] || 'https';
          return `${proto}://${hostHeader}`;
        }
        // Cloud Run / Dev container fallback
        return 'https://ais-dev-ihckmxwbabff4oqxx4s4uy-235027986297.europe-west1.run.app';
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
  app.get('/api/payments/bachs/verify-checkout/:checkoutId', async (req, res) => {
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

  // Consultation Notification Dispatch (Automatic Server-Side Email Delivery)
  app.post('/api/notifications/consultation-booked', async (req, res) => {
    try {
      const { booking, diagnostic } = req.body || {};

      if (!booking) {
        return res.status(400).json({ error: 'Missing booking payload' });
      }

      const dispatchResult = await dispatchAutomaticEmails(booking, diagnostic);

      // Record permanently in the Calendar Availability Ledger to lock the slot against double-booking
      try {
        const dateIso = booking.selectedDateIso || booking.selectedDate;
        let normalizedDateIso = dateIso;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateIso)) {
          const m = String(dateIso).match(/Oct\s+(\d{1,2})/i);
          if (m) {
            const d = parseInt(m[1], 10);
            normalizedDateIso = `2026-10-${d < 10 ? '0' + d : d}`;
          }
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateIso) && booking.selectedTime) {
          confirmBookingInLedger({
            auditReference: booking.auditReference,
            dateIso: normalizedDateIso,
            timeSlot: booking.selectedTime,
            fullName: booking.fullName,
            email: booking.email,
            phone: booking.phone,
            companyName: booking.companyName,
            meetUrl: booking.meetUrl,
          });
        }
      } catch (ledgerErr) {
        console.error('Error updating calendar ledger for booking:', ledgerErr);
      }

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
      console.error('Server error dispatching automated emails:', err);
      return res.status(500).json({ error: err?.message || 'Failed to dispatch automatic notification' });
    }
  });

  // ==========================================
  // Calendar Availability & Personal Calendar Sync API
  // ==========================================

  // 1. Get Live Availability for a specific date (YYYY-MM-DD)
  app.get('/api/calendar/availability', async (req, res) => {
    try {
      const { date, refresh } = req.query;
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Query parameter "date" (YYYY-MM-DD) is required.' });
      }

      const forceRefresh = refresh === 'true' || refresh === '1';
      const availability = await getAvailabilityForDate(date, forceRefresh);
      return res.json(availability);
    } catch (err: any) {
      console.error('Error fetching calendar availability:', err);
      return res.status(500).json({ error: err?.message || 'Failed to fetch calendar availability' });
    }
  });

  // 2. Get Month Availability Overview (e.g. October 2026)
  app.get('/api/calendar/month-overview', async (req, res) => {
    try {
      const year = parseInt(req.query.year as string, 10) || 2026;
      const month = parseInt(req.query.month as string, 10) || 10;
      const overview = await getMonthAvailability(year, month);
      return res.json({ year, month, overview });
    } catch (err: any) {
      console.error('Error fetching month overview:', err);
      return res.status(500).json({ error: err?.message || 'Failed to fetch month overview' });
    }
  });

  // 3. Atomically Reserve a Slot / Place Hold
  app.post('/api/calendar/reserve-slot', async (req, res) => {
    try {
      const { dateIso, timeSlot, fullName, email, phone, companyName } = req.body;
      if (!dateIso || !timeSlot || !fullName || !email) {
        return res.status(400).json({ error: 'dateIso, timeSlot, fullName, and email are required.' });
      }

      const result = await reserveSlot(dateIso, timeSlot, {
        fullName,
        email,
        phone,
        companyName,
      });

      if (!result.success) {
        return res.status(409).json({ error: result.error, code: 'SLOT_UNAVAILABLE' });
      }

      return res.json(result);
    } catch (err: any) {
      console.error('Error reserving slot:', err);
      return res.status(500).json({ error: err?.message || 'Failed to reserve slot' });
    }
  });

  // 4. Get Advisor Calendar & Availability Configuration
  app.get('/api/calendar/advisor-settings', (_req, res) => {
    try {
      const settings = getAdvisorSettings();
      return res.json(settings);
    } catch (err: any) {
      console.error('Error getting advisor settings:', err);
      return res.status(500).json({ error: err?.message || 'Failed to get advisor settings' });
    }
  });

  // 5. Update Advisor Calendar Settings (Google Calendar iCal URL, Working Hours, Blackouts)
  app.post('/api/calendar/advisor-settings', async (req, res) => {
    try {
      const result = await updateAdvisorSettings(req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('Error updating advisor settings:', err);
      return res.status(500).json({ error: err?.message || 'Failed to update advisor settings' });
    }
  });

  // 6. Test Google Calendar iCal Connection
  app.post('/api/calendar/test-sync', async (req, res) => {
    try {
      const { icalUrl } = req.body;
      if (!icalUrl || typeof icalUrl !== 'string') {
        return res.status(400).json({ error: 'icalUrl is required' });
      }

      const result = await testIcalUrl(icalUrl);
      return res.json(result);
    } catch (err: any) {
      console.error('Error testing iCal URL:', err);
      return res.status(500).json({ error: err?.message || 'Failed to test iCal link' });
    }
  });

  // Vite Middleware / Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian Server running on port ${PORT} (Bachs.io Gateway Active)`);
  });
}

startServer();
