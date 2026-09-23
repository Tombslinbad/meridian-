import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, getDefaultMeetUrl } from './services/googleWorkspace';
import { AppTab, BookingDetails, DiagnosticData } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { TradeIntelligenceView } from './views/TradeIntelligenceView';
import { BookingCheckoutView } from './views/BookingCheckoutView';
import { ConfirmationView } from './views/ConfirmationView';
import { CantonFairView } from './views/CantonFairView';
import { VerificationView } from './views/VerificationView';
import { PaymentCelebrationModal } from './components/PaymentCelebrationModal';
import {
  initAnalytics,
  trackPageView,
  trackViewContent,
  trackCompletePayment,
  trackInitiateCheckout
} from './lib/analytics';

const DRAFT_STORAGE_KEY = 'mca_consultation_draft_v1';

const getInitialBookingDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  const iso = d.toISOString().split('T')[0];
  const formatted = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return { iso, formatted };
};

const getSavedDraft = (): Partial<BookingDetails> => {
  try {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch (err) {
    console.warn('Could not read draft from sessionStorage:', err);
  }
  return {};
};

export function App() {
  const initialDate = getInitialBookingDate();
  const savedDraft = getSavedDraft();

  const [currentTab, setCurrentTab] = useState<AppTab>('advisory');
  const [user, setUser] = useState<User | null>(null);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);

  // Initial Booking State with sessionStorage persistence and ₦50,000 exact fee
  const [booking, setBooking] = useState<BookingDetails>({
    fullName: savedDraft.fullName || '',
    email: savedDraft.email || '',
    phone: savedDraft.phone || '',
    companyName: savedDraft.companyName || '',
    industry: savedDraft.industry || 'Auto Parts & Heavy Machinery (Guangzhou / Yiwu)',
    tripObjective: savedDraft.tripObjective || 'canton',
    travelWindow: savedDraft.travelWindow || 'October - November 2026 (140th Canton Fair, Guangzhou)',
    selectedDate: savedDraft.selectedDate || initialDate.formatted,
    selectedDateIso: savedDraft.selectedDateIso || initialDate.iso,
    selectedTime: savedDraft.selectedTime || '11:30 AM',
    paymentChannel: 'card',
    auditReference: `MCA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    meetUrl: getDefaultMeetUrl(),
    amountNgn: 50000,
  });

  // Initialize analytics and track page views
  useEffect(() => {
    initAnalytics();
    trackPageView();
  }, []);

  useEffect(() => {
    trackPageView(currentTab);
    if (currentTab === 'advisory') {
      trackViewContent('China Business Consultation');
    } else if (currentTab === 'booking') {
      trackInitiateCheckout(50000);
    }
  }, [currentTab]);

  useEffect(() => {
    if (booking.paymentStatus === 'succeeded' && booking.bachsCheckoutId) {
      trackCompletePayment(booking.bachsCheckoutId, 50000, 'NGN');
    }
  }, [booking.paymentStatus, booking.bachsCheckoutId]);

  // Diagnostic state
  const [diagnostic, setDiagnostic] = useState<DiagnosticData>({
    hsCodesOrUrls: '',
    orderSizing: 'fcl',
    currentRoadblocks: '',
    submitted: false,
  });

  // Check for Bachs payment redirect parameters on load - strictly verified with backend Bachs API
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      const sessionId = urlParams.get('session_id') || urlParams.get('checkout_id');

      if (sessionId) {
        // Backend verification against Bachs API
        fetch(`/api/payments/bachs/verify-checkout/${encodeURIComponent(sessionId)}`)
          .then((res) => {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) return res.json();
            return null;
          })
          .then((data) => {
            if (data && data.isSucceeded) {
              setBooking((prev) => ({
                ...prev,
                auditReference: data.reference || ref || prev.auditReference,
                bachsCheckoutId: sessionId,
                paymentStatus: 'succeeded',
              }));
              trackCompletePayment(sessionId, 50000, 'NGN');
              setShowPaymentSuccessModal(true);
              setCurrentTab('confirmed');
            }
          })
          .catch((e) => {
            console.warn('Backend payment verification error on redirect:', e);
          });
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }, []);

  // Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleUpdateBooking = (updates: Partial<BookingDetails>) => {
    setBooking((prev) => {
      const next = { ...prev, ...updates };
      try {
        if (typeof window !== 'undefined') {
          const draft: Partial<BookingDetails> = {
            fullName: next.fullName,
            email: next.email,
            phone: next.phone,
            companyName: next.companyName,
            industry: next.industry,
            tripObjective: next.tripObjective,
            travelWindow: next.travelWindow,
            selectedDate: next.selectedDate,
            selectedDateIso: next.selectedDateIso,
            selectedTime: next.selectedTime,
          };
          sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        }
      } catch (err) {
        console.warn('Could not save draft to sessionStorage:', err);
      }
      return next;
    });
  };

  const handleBookingSuccess = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Could not clear draft from sessionStorage:', err);
    }
    setShowPaymentSuccessModal(true);
    handleNavigate('confirmed');
  };

  const handleUpdateDiagnostic = (updates: Partial<DiagnosticData>) => {
    setDiagnostic((prev) => ({ ...prev, ...updates }));
  };

  const handleNavigate = (tab: AppTab) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectObjective = (obj: 'canton' | 'factory' | 'fx-logistics') => {
    setBooking((prev) => ({ ...prev, tripObjective: obj }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface antialiased selection:bg-secondary-fixed selection:text-secondary">
      {/* Fixed Application Header with Brand Emblem & WhatsApp Desk */}
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-20">
        {currentTab === 'advisory' && (
          <TradeIntelligenceView
            onNavigate={handleNavigate}
            onQuickBookModalOpen={() => handleNavigate('booking')}
          />
        )}

        {currentTab === 'canton-fair' && (
          <CantonFairView
            onNavigate={handleNavigate}
            onSelectObjective={handleSelectObjective}
          />
        )}

        {currentTab === 'verification' && (
          <VerificationView
            onNavigate={handleNavigate}
            onSelectObjective={handleSelectObjective}
          />
        )}

        {currentTab === 'booking' && (
          <BookingCheckoutView
            booking={booking}
            onUpdateBooking={handleUpdateBooking}
            onNavigate={handleNavigate}
            onBookingSuccess={handleBookingSuccess}
            user={user}
          />
        )}

        {currentTab === 'confirmed' && (
          <ConfirmationView
            booking={booking}
            onUpdateBooking={handleUpdateBooking}
            onNavigate={handleNavigate}
            user={user}
            onUserChange={setUser}
            diagnostic={diagnostic}
            onUpdateDiagnostic={handleUpdateDiagnostic}
          />
        )}
      </main>

      {/* High Interactive Payment Success Celebration Modal */}
      <PaymentCelebrationModal
        booking={booking}
        isOpen={showPaymentSuccessModal}
        onClose={() => setShowPaymentSuccessModal(false)}
        onViewDetails={() => {
          setShowPaymentSuccessModal(false);
          handleNavigate('confirmed');
        }}
      />

      {/* Corporate & Regulatory Footer */}
      <Footer />

      {/* Fixed Mobile Bottom Navigation */}
      <BottomNav currentTab={currentTab} onNavigate={handleNavigate} />
    </div>
  );
}

export default App;
