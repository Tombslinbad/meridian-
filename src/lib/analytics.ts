declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    ttq?: {
      load?: (id: string, options?: any) => void;
      page?: () => void;
      track?: (event: string, options?: any, extra?: any) => void;
    };
  }
}

/**
 * Initializes analytics scripts (GA4, Meta Pixel, and TikTok Pixel).
 * If environment variables are missing, tracking is gracefully omitted without errors.
 */
export function initAnalytics() {
  const env = (import.meta as any).env || {};
  const gaId = env.VITE_GA_MEASUREMENT_ID;
  const metaId = env.VITE_META_PIXEL_ID;
  const tiktokId = env.VITE_TIKTOK_PIXEL_ID;

  // Initialize GA4
  if (gaId && !document.getElementById('ga4-script')) {
    const script1 = document.createElement('script');
    script1.id = 'ga4-script';
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(script2);
  }

  // Initialize Meta Pixel
  if (metaId && !document.getElementById('meta-pixel-script')) {
    const script = document.createElement('script');
    script.id = 'meta-pixel-script';
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=true;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${metaId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);
  }

  // Initialize TikTok Pixel dynamically if not already installed in <head>
  if (!window.ttq && tiktokId && !document.getElementById('tiktok-pixel-script')) {
    const script = document.createElement('script');
    script.id = 'tiktok-pixel-script';
    script.innerHTML = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndBuffer=function(s,e){ttq[s]=function(){ttq.push([s].concat(Array.prototype.slice.call(arguments)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndBuffer(ttq.methods[i],ttq.inputs[i]);ttq.load=function(e,n){var i=e;var t=d.createElement("script");t.type="text/javascript";t.async=!0;t.src="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+e;var n=d.stringify||n;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)};
        ttq.load('${tiktokId}');
        ttq.page();
      }(window, document, 'ttq');
    `;
    document.head.appendChild(script);
  }
}

/**
 * Universal safe caller for TikTok Pixel events.
 * Gracefully no-ops if ttq is not loaded or VITE_TIKTOK_PIXEL_ID is not configured.
 * Supports passing event_id for client-server deduplication with TikTok Events API.
 */
export function trackTikTokEvent(
  event: string,
  params?: Record<string, any>,
  options?: { event_id?: string }
) {
  try {
    if (typeof window !== 'undefined' && window.ttq && typeof window.ttq.track === 'function') {
      if (options && options.event_id) {
        window.ttq.track(event, params, options);
      } else {
        window.ttq.track(event, params);
      }
      if ((import.meta as any).env?.DEV) {
        console.log(`[TikTok Pixel] ${event}`, params, options);
      }
    }
  } catch (err) {
    console.warn(`[TikTok Pixel] Error tracking ${event}:`, err);
  }
}

/**
 * Retrieves the TikTok Click ID (ttclid) from URL parameters or session storage.
 */
export function getTikTokClickId(): string | undefined {
  try {
    if (typeof window === 'undefined') return undefined;
    const urlParams = new URLSearchParams(window.location.search);
    const ttclid = urlParams.get('ttclid');
    if (ttclid) {
      sessionStorage.setItem('mca_ttclid', ttclid);
      return ttclid;
    }
    return sessionStorage.getItem('mca_ttclid') || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Retrieves the first-party TikTok Cookie (_ttp) set by the TikTok Pixel.
 */
export function getTikTokCookie(): string | undefined {
  try {
    if (typeof document === 'undefined') return undefined;
    const match = document.cookie.match(/(?:^|;\s*)_ttp=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Track page view across all active analytics providers.
 */
export function trackPageView(url = window.location.pathname) {
  try {
    if (window.gtag) {
      window.gtag('event', 'page_view', { page_path: url });
    }
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
    if (window.ttq && typeof window.ttq.page === 'function') {
      window.ttq.page();
    }
  } catch (err) {
    console.warn('Analytics page_view error:', err);
  }
}

/**
 * Track when user views the consultation / core offer section.
 */
export function trackViewContent(contentName = 'China Business Consultation') {
  try {
    if (window.gtag) {
      window.gtag('event', 'view_item', {
        items: [{ item_name: contentName, price: 50000, currency: 'NGN' }],
      });
    }
    if (window.fbq) {
      window.fbq('track', 'ViewContent', { content_name: contentName, value: 50000, currency: 'NGN' });
    }
    trackTikTokEvent('ViewContent', {
      content_id: 'china-consultation-60min',
      content_type: 'product',
      content_name: contentName,
      value: 50000,
      currency: 'NGN',
    });
  } catch (err) {
    console.warn('Analytics view_content error:', err);
  }
}

/**
 * Track user initiation of checkout / booking flow.
 */
export function trackInitiateCheckout(amount = 50000) {
  try {
    if (window.gtag) {
      window.gtag('event', 'begin_checkout', { value: amount, currency: 'NGN' });
    }
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', { value: amount, currency: 'NGN' });
    }
    trackTikTokEvent('InitiateCheckout', {
      content_id: 'china-consultation-60min',
      content_type: 'product',
      content_name: 'China Business Consultation (60-Min)',
      value: amount,
      currency: 'NGN',
    });
  } catch (err) {
    console.warn('Analytics initiate_checkout error:', err);
  }
}

/**
 * Track user initiating or clicking WhatsApp contact after completing qualification.
 * This is the primary business conversion event for the WhatsApp funnel.
 */
export function trackContact(channel = 'WhatsApp', context = 'Pre-Payment Qualification') {
  try {
    if (window.gtag) {
      window.gtag('event', 'contact', { channel, context, value: 50000, currency: 'NGN' });
    }
    if (window.fbq) {
      window.fbq('track', 'Contact', {
        content_name: 'China Business Consultation',
        channel,
        context,
        value: 50000,
        currency: 'NGN',
      });
    }
    trackTikTokEvent('Contact', {
      content_id: 'china-consultation-60min',
      content_type: 'product',
      content_name: 'China Business Consultation Inquiry',
      channel,
      context,
      value: 50000,
      currency: 'NGN',
    });
  } catch (err) {
    console.warn('Analytics contact error:', err);
  }
}

/**
 * Track opening of the WhatsApp qualification flow.
 */
export function trackQualificationStarted() {
  try {
    trackTikTokEvent('ClickButton', { button_name: "Have Questions? Check If We're a Fit" });
    trackTikTokEvent('QualificationStarted', { form_name: 'WhatsApp Pre-Payment Fit' });
    if (window.gtag) {
      window.gtag('event', 'qualification_started', { form_name: 'WhatsApp Pre-Payment Fit' });
    }
  } catch (err) {
    console.warn('Analytics qualification_started error:', err);
  }
}

/**
 * Track completion of all 4 qualification questions.
 */
export function trackQualificationCompleted(answersSummary?: Record<string, string>) {
  try {
    trackTikTokEvent('QualificationCompleted', {
      form_name: 'WhatsApp Pre-Payment Fit',
      ...answersSummary,
    });
    if (window.gtag) {
      window.gtag('event', 'qualification_completed', answersSummary);
    }
  } catch (err) {
    console.warn('Analytics qualification_completed error:', err);
  }
}

/**
 * Track verified successful payment.
 * STRICT REQUIREMENT: Only fired after backend genuinely verifies payment status with Bachs API.
 * Deduplicated via transaction identifier in localStorage so it never fires twice.
 */
export function trackCompletePayment(
  checkoutId: string,
  value = 50000,
  currency = 'NGN',
  customEventId?: string
) {
  if (!checkoutId) return;

  // Stable unique event ID for browser-server deduplication with TikTok Events API
  const eventId = customEventId || (checkoutId.startsWith('mca_') ? checkoutId : `mca_${checkoutId}`);

  try {
    const storageKey = `mca_payment_verified_${checkoutId}`;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (localStorage.getItem(storageKey)) {
        return; // Already sent for this specific transaction
      }
      localStorage.setItem(storageKey, 'true');
    }

    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: checkoutId,
        value: value,
        currency: currency,
        items: [{ item_name: 'China Business Consultation (60-Min)', price: value, quantity: 1 }],
      });
    }
    if (window.fbq) {
      window.fbq(
        'track',
        'Purchase',
        {
          value: value,
          currency: currency,
          content_name: 'China Business Consultation',
        },
        { eventID: eventId }
      );
    }
    trackTikTokEvent(
      'CompletePayment',
      {
        content_id: 'china-consultation-60min',
        content_type: 'product',
        content_name: 'China Business Consultation (60-Min)',
        value: value,
        currency: currency,
      },
      { event_id: eventId }
    );
  } catch (err) {
    console.warn('Analytics CompletePayment error:', err);
  }
}

/**
 * Backward compatibility alias for trackCompletePayment
 */
export function trackPurchase(checkoutId: string, value = 50000, currency = 'NGN') {
  trackCompletePayment(checkoutId, value, currency);
}

export function trackCtaClick(buttonName: string) {
  try {
    if (window.gtag) {
      window.gtag('event', 'consultation_cta_click', { button_name: buttonName });
    }
    if (window.fbq) {
      window.fbq('trackCustom', 'ConsultationCtaClick', { button_name: buttonName });
    }
    trackTikTokEvent('ClickButton', { button_name: buttonName });
  } catch (err) {
    console.warn('Analytics cta_click error:', err);
  }
}

export function trackBookingStarted(date: string, time: string) {
  try {
    if (window.gtag) {
      window.gtag('event', 'booking_started', { date, time });
    }
  } catch (err) {
    console.warn('Analytics booking_started error:', err);
  }
}

export function trackBookingCompleted(bookingRef: string) {
  try {
    if (window.gtag) {
      window.gtag('event', 'booking_completed', { booking_reference: bookingRef });
    }
  } catch (err) {
    console.warn('Analytics booking_completed error:', err);
  }
}
