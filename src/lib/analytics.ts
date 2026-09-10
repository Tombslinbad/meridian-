declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    ttq?: {
      load?: (id: string, options?: any) => void;
      page?: () => void;
      track?: (event: string, options?: any) => void;
    };
  }
}

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

  // Initialize TikTok Pixel
  if (tiktokId && !document.getElementById('tiktok-pixel-script')) {
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

export function trackViewContent(contentName = 'China Business Consultation') {
  try {
    if (window.gtag) {
      window.gtag('event', 'view_item', {
        items: [{ item_name: contentName, price: 50000, currency: 'NGN' }]
      });
    }
    if (window.fbq) {
      window.fbq('track', 'ViewContent', { content_name: contentName, value: 50000, currency: 'NGN' });
    }
    if (window.ttq && typeof window.ttq.track === 'function') {
      window.ttq.track('ViewContent', { content_name: contentName, value: 50000, currency: 'NGN' });
    }
  } catch (err) {
    console.warn('Analytics view_content error:', err);
  }
}

export function trackCtaClick(buttonName: string) {
  try {
    if (window.gtag) {
      window.gtag('event', 'consultation_cta_click', { button_name: buttonName });
    }
    if (window.fbq) {
      window.fbq('trackCustom', 'ConsultationCtaClick', { button_name: buttonName });
    }
    if (window.ttq && typeof window.ttq.track === 'function') {
      window.ttq.track('ClickButton', { button_name: buttonName });
    }
  } catch (err) {
    console.warn('Analytics cta_click error:', err);
  }
}

export function trackInitiateCheckout(amount = 50000) {
  try {
    if (window.gtag) {
      window.gtag('event', 'begin_checkout', { value: amount, currency: 'NGN' });
    }
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', { value: amount, currency: 'NGN' });
    }
    if (window.ttq && typeof window.ttq.track === 'function') {
      window.ttq.track('InitiateCheckout', { value: amount, currency: 'NGN' });
    }
  } catch (err) {
    console.warn('Analytics initiate_checkout error:', err);
  }
}

export function trackPurchase(checkoutId: string, value = 50000, currency = 'NGN') {
  try {
    const storageKey = `mca_purchase_sent_${checkoutId}`;
    if (localStorage.getItem(storageKey)) {
      return;
    }
    localStorage.setItem(storageKey, 'true');

    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: checkoutId,
        value: value,
        currency: currency,
        items: [{ item_name: 'China Business Consultation (60-Min)', price: value, quantity: 1 }]
      });
    }
    if (window.fbq) {
      window.fbq('track', 'Purchase', { value: value, currency: currency, content_name: 'China Business Consultation' });
    }
    if (window.ttq && typeof window.ttq.track === 'function') {
      window.ttq.track('CompletePayment', { value: value, currency: currency, content_name: 'China Business Consultation' });
    }
  } catch (err) {
    console.warn('Analytics purchase error:', err);
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
