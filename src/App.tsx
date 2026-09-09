import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth } from './services/googleWorkspace';
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

export function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('advisory');
  const [user, setUser] = useState<User | null>(null);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);

  // Initial Booking State with shadow names/placeholders, requiring explicit user input
  const [booking, setBooking] = useState<BookingDetails>({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    industry: 'Auto Parts & Heavy Machinery (Guangzhou / Yiwu)',
    tripObjective: 'canton',
    travelWindow: 'October - November 2026 (140th Canton Fair, Guangzhou)',
    selectedDate: 'Monday, Oct 12, 2026',
    selectedDateIso: '2026-10-12',
    selectedTime: '11:30 AM',
    paymentChannel: 'card',
    auditReference: `MCA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    meetUrl: 'https://meet.google.com/mca-strategy-desk',
    amountNgn: 50000,
  });

  // Diagnostic state
  const [diagnostic, setDiagnostic] = useState<DiagnosticData>({
    hsCodesOrUrls: '',
    orderSizing: 'fcl',
    currentRoadblocks: '',
    submitted: false,
  });

  // Check for Bachs payment redirect parameters on load
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status');
      const ref = urlParams.get('ref');
      const sessionId = urlParams.get('session_id');

      if (paymentStatus === 'success') {
        if (ref || sessionId) {
          setBooking((prev) => ({
            ...prev,
            auditReference: ref || prev.auditReference,
            bachsCheckoutId: sessionId || prev.bachsCheckoutId,
            paymentStatus: 'succeeded',
          }));
        }
        setShowPaymentSuccessModal(true);
        setCurrentTab('confirmed');
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
    setBooking((prev) => ({ ...prev, ...updates }));
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
      {/* Fixed Application Header with Brand Emblem & Google Workspace Connection */}
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        user={user}
        onUserChange={setUser}
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
            onBookingSuccess={() => {
              setShowPaymentSuccessModal(true);
              handleNavigate('confirmed');
            }}
            user={user}
          />
        )}

        {currentTab === 'confirmed' && (
          <ConfirmationView
            booking={booking}
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
