import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppTab, BookingDetails } from '../types';
import { User } from 'firebase/auth';
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Clock,
  CreditCard,
  Building2,
  Globe2,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Zap,
  Smartphone,
  Coins,
  X
} from 'lucide-react';

interface BookingCheckoutViewProps {
  booking: BookingDetails;
  onUpdateBooking: (updates: Partial<BookingDetails>) => void;
  onNavigate: (tab: AppTab) => void;
  onBookingSuccess: () => void;
  user: User | null;
}

export const BookingCheckoutView: React.FC<BookingCheckoutViewProps> = ({
  booking,
  onUpdateBooking,
  onNavigate,
  onBookingSuccess,
}) => {
  const [currentMonth, setCurrentMonth] = useState<'September 2026' | 'October 2026' | 'November 2026'>('October 2026');
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(12);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(booking.selectedTime || '11:30 AM');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer' | 'mobile_money' | 'crypto'>('card');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentStepText, setPaymentStepText] = useState<string>('Initializing Secure Gateway...');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    industry?: string;
    agreedToTerms?: string;
  }>({});

  // Validation checking all required fields in the Executive Dossier before payment
  const validateBookingDetails = () => {
    const errors: {
      fullName?: string;
      email?: string;
      phone?: string;
      companyName?: string;
      industry?: string;
      agreedToTerms?: string;
    } = {};

    if (!booking.fullName || !booking.fullName.trim()) {
      errors.fullName = 'Full legal or executive name is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!booking.email || !booking.email.trim()) {
      errors.email = 'Corporate or personal email is required to send meeting access.';
    } else if (!emailRegex.test(booking.email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. name@company.ng).';
    }

    const digits = (booking.phone || '').replace(/\D/g, '');
    if (!booking.phone || !booking.phone.trim() || digits.length < 7) {
      errors.phone = 'WhatsApp contact number is required (at least 7 digits).';
    }

    if (!booking.companyName || !booking.companyName.trim()) {
      errors.companyName = 'Company, business, or trading name is required.';
    }

    if (!booking.industry || !booking.industry.trim()) {
      errors.industry = 'Please select your primary commodity sector.';
    }

    if (!agreedToTerms) {
      errors.agreedToTerms = 'You must acknowledge the terms to proceed to payment.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Bachs.io state
  const [bachsConfig, setBachsConfig] = useState<{
    configured: boolean;
    isSandbox: boolean;
    gateway: string;
  } | null>(null);
  const [createdCheckout, setCreatedCheckout] = useState<{
    checkoutId: string;
    checkoutUrl: string;
    reference: string;
    isSandbox: boolean;
  } | null>(null);
  const [isPollingBachs, setIsPollingBachs] = useState<boolean>(false);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);
  const [isVerifyingManual, setIsVerifyingManual] = useState<boolean>(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Bachs status on mount
  useEffect(() => {
    fetch('/api/payments/bachs/config')
      .then(async (res) => {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data) setBachsConfig(data);
      })
      .catch((err) => {
        console.warn('Could not load Bachs config:', err);
      });

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  // Poll Bachs checkout verification
  const checkBachsVerification = useCallback(
    async (checkoutId: string, isManual = false) => {
      if (isManual) setIsVerifyingManual(true);
      try {
        const res = await fetch(`/api/payments/bachs/verify-checkout/${checkoutId}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          return false;
        }
        const data = await res.json();
        if (data && data.isSucceeded) {
          if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
          }
          setIsPollingBachs(false);
          setIsProcessingPayment(false);
          onUpdateBooking({
            paymentStatus: 'succeeded',
            auditReference: data.reference || booking.auditReference,
            bachsCheckoutId: checkoutId,
          });
          onBookingSuccess();
          return true;
        } else if (isManual) {
          if (data && data.status === 'open') {
            // Check if user wants to finalize sandbox simulation
            const confirmTest = window.confirm(
              `Bachs checkout session is active (${data.paymentStatus || 'awaiting completion'}). Would you like to confirm the sandbox payment now to see your booked consultation details?`
            );
            if (confirmTest) {
              if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
              }
              setIsPollingBachs(false);
              setIsProcessingPayment(false);
              onUpdateBooking({
                paymentStatus: 'succeeded',
                auditReference: data.reference || booking.auditReference,
                bachsCheckoutId: checkoutId,
              });
              onBookingSuccess();
              return true;
            }
          }
        }
      } catch (e) {
        console.warn('Polling error:', e);
      } finally {
        if (isManual) setIsVerifyingManual(false);
      }
      return false;
    },
    [booking.auditReference, onBookingSuccess, onUpdateBooking]
  );

  // Start polling when checkout created
  const startPolling = useCallback(
    (checkoutId: string) => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
      setIsPollingBachs(true);
      pollingTimerRef.current = setInterval(async () => {
        const finished = await checkBachsVerification(checkoutId);
        if (finished && pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
        }
      }, 3000);
    },
    [checkBachsVerification]
  );

  // Active dates in October 2026
  const activeOctoberDays = [1, 2, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27, 28, 29, 30];

  const handleDateSelect = (dayNum: number) => {
    setSelectedDayNumber(dayNum);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(2026, 9, dayNum); // Month 9 is October (0-indexed)
    const dayName = dayNames[d.getDay()];
    const dateFormatted = `${dayName}, Oct ${dayNum}, 2026`;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const iso = `2026-10-${pad(dayNum)}`;

    onUpdateBooking({
      selectedDate: dateFormatted,
      selectedDateIso: iso,
    });
  };

  const handleTimeSelect = (timeStr: string) => {
    setSelectedTimeSlot(timeStr);
    onUpdateBooking({ selectedTime: timeStr });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateBookingDetails();
    if (!isValid) {
      setPaymentError('All information in the Executive Dossier (Step 3) must be filled before making payment.');
      const dossierEl = document.getElementById('step-3-dossier');
      if (dossierEl) {
        dossierEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setPaymentError(null);
    setIsProcessingPayment(true);
    setPaymentStepText('Connecting to Bachs.io Payments Gateway...');

    try {
      const res = await fetch('/api/payments/bachs/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: booking.fullName || 'Meridian Client',
          customerEmail: booking.email || 'client@trade-desk.com',
          phoneNumber: booking.phone || '',
          companyName: booking.companyName || 'Private Trader',
          industry: booking.industry,
          tripObjective: booking.tripObjective,
          travelWindow: booking.travelWindow,
          selectedDate: booking.selectedDate,
          selectedTime: booking.selectedTime,
          amount: booking.amountNgn || 50000,
          currency: 'NGN',
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        if (res.status === 404 || rawText.includes('The page could not be found') || rawText.includes('<!DOCTYPE html>')) {
          throw new Error(
            'Payment API route not found (404). If deployed on Vercel, ensure the /api serverless function is deployed with vercel.json and BACHS_API_KEY is configured in Vercel Environment Variables.'
          );
        }
        throw new Error(`Server returned status ${res.status}: ${rawText.slice(0, 100)}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to generate Bachs checkout session.');
      }

      setIsIframeLoading(true);
      setCreatedCheckout({
        checkoutId: data.checkoutId,
        checkoutUrl: data.checkoutUrl,
        reference: data.reference,
        isSandbox: data.isSandbox,
      });

      onUpdateBooking({
        auditReference: data.reference,
        bachsCheckoutId: data.checkoutId,
        bachsCheckoutUrl: data.checkoutUrl,
        paymentChannel: paymentMethod,
      });

      setPaymentStepText('Bachs Checkout Ready. Opening Session...');
      startPolling(data.checkoutId);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setPaymentError(err?.message || 'Failed to initialize Bachs checkout session.');
      setIsProcessingPayment(false);
    }
  };

  const handleCloseCheckoutModal = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
    setIsPollingBachs(false);
    setIsProcessingPayment(false);
  };

  const handleSimulateSandboxPayment = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
    setIsPollingBachs(false);
    setIsProcessingPayment(false);
    onUpdateBooking({
      paymentStatus: 'succeeded',
      auditReference: createdCheckout?.reference || booking.auditReference,
      bachsCheckoutId: createdCheckout?.checkoutId || 'chk_sandbox_verified',
      paymentChannel: paymentMethod,
    });
    onBookingSuccess();
  };

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface min-h-screen">
      {/* Top Header & Navigation Bar */}
      <div className="w-full bg-surface-container-lowest border-b border-surface-container py-4 sm:py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={() => onNavigate('advisory')}
            className="flex items-center gap-2 text-sm font-semibold text-on-surface hover:text-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-secondary" />
            <span>Back to Advisory Overview</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
              <ShieldCheck className="w-4 h-4 text-on-tertiary-container" />
              Secure 256-Bit Escrow
            </span>
            <span className="px-3 py-1 rounded-full bg-secondary-fixed text-secondary text-xs font-bold uppercase tracking-wider">
              ₦50,000 Fixed Fee
            </span>
          </div>
        </div>
      </div>

      {/* Main Container - 2-Column Responsive Desk */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: Date & Time Picker + Trip Objective (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-8">
            
            {/* Step 1 Card: Calendar & Slot Selection */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-secondary text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-on-surface">Select Consultation Slot</h2>
                    <p className="text-xs text-on-surface-variant">Synchronized West Africa Time (WAT / Lagos)</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-tertiary-fixed/30 text-on-tertiary-container flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-pulse" />
                  Live Desk
                </span>
              </div>

              {/* Month Header */}
              <div className="flex items-center justify-between px-2">
                <span className="text-base font-bold text-on-surface">{currentMonth}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(currentMonth === 'November 2026' ? 'October 2026' : 'September 2026')}
                    className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(currentMonth === 'September 2026' ? 'October 2026' : 'November 2026')}
                    className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-on-surface-variant">
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span className="text-outline/60">Sa</span>
                <span className="text-outline/60">Su</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                <span className="h-10 flex items-center justify-center text-xs text-outline/40">28</span>
                <span className="h-10 flex items-center justify-center text-xs text-outline/40">29</span>
                <span className="h-10 flex items-center justify-center text-xs text-outline/40">30</span>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => {
                  const isSelectable = activeOctoberDays.includes(dayNum);
                  const isSelected = selectedDayNumber === dayNum;

                  if (!isSelectable) {
                    return (
                      <span
                        key={dayNum}
                        className="h-10 flex items-center justify-center text-xs text-outline/40 font-medium"
                      >
                        {dayNum}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleDateSelect(dayNum)}
                      className={`h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-secondary text-white font-bold shadow-md shadow-secondary/20'
                          : 'text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Time Slots */}
              <div className="flex flex-col gap-3 pt-4 border-t border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface">
                    Available times for: <strong className="text-secondary">{booking.selectedDate}</strong>
                  </span>
                  <span className="text-[11px] text-on-surface-variant">60-Min Video Call</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {['10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map((slot) => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleTimeSelect(slot)}
                        className={`min-h-[44px] py-2.5 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                          isSelected
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 2 Card: Strategic Objective */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-container">
                <div className="w-8 h-8 rounded-xl bg-secondary text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Primary Trip Objective</h2>
                  <p className="text-xs text-on-surface-variant">We tailor your briefing to your specific outcome</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  {
                    id: 'canton',
                    title: '140th Canton Fair Attendance (Guangzhou)',
                    desc: 'Phase mapping, commodity alignment, official buyer badge pre-registration & hall navigation',
                  },
                  {
                    id: 'factory',
                    title: 'Direct Factory Sourcing & Supplier Meetings',
                    desc: 'Visiting manufacturers in Guangdong/Zhejiang, supplier vetting & price negotiation',
                  },
                  {
                    id: 'fx-logistics',
                    title: 'Trip Budgeting, Documentation & Sourcing Feasibility',
                    desc: 'Trip budget modeling, visa document review, shipping logistics & payment protocols',
                  },
                ].map((obj) => (
                  <label
                    key={obj.id}
                    onClick={() => onUpdateBooking({ tripObjective: obj.id as any })}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl cursor-pointer transition-all border ${
                      booking.tripObjective === obj.id
                        ? 'bg-surface-container-high/60 border-secondary shadow-xs'
                        : 'bg-surface-container-low border-surface-container/60 hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tripObjective"
                      value={obj.id}
                      checked={booking.tripObjective === obj.id}
                      onChange={() => onUpdateBooking({ tripObjective: obj.id as any })}
                      className="w-4 h-4 text-secondary accent-secondary mt-1"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-on-surface">{obj.title}</span>
                      <span className="text-xs text-on-surface-variant mt-0.5">{obj.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Planned Window */}
              <div className="flex flex-col gap-2 pt-2">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider" htmlFor="travelWindow">
                  Target Travel Window
                </label>
                <select
                  id="travelWindow"
                  value={booking.travelWindow}
                  onChange={(e) => onUpdateBooking({ travelWindow: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface text-sm font-medium border border-surface-container focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="October - November 2026 (140th Canton Fair, Guangzhou)">October - November 2026 (140th Canton Fair, Guangzhou)</option>
                  <option value="November - December 2026 (Post-Fair Sourcing & Factory Tours)">November - December 2026 (Post-Fair Sourcing &amp; Factory Tours)</option>
                  <option value="Q1 2027 (Spring Sourcing & Production Planning)">Q1 2027 (Spring Sourcing &amp; Production Planning)</option>
                  <option value="Exploring / Feasibility Stage (Within 6 months)">Exploring / Feasibility Stage (Within 6 months)</option>
                </select>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Contact Details + Summary + Payment (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-8">
            
            {/* Step 3 Card: Executive & Enterprise Details */}
            <div
              id="step-3-dossier"
              className={`p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border shadow-sm flex flex-col gap-6 transition-all ${
                Object.keys(fieldErrors).length > 0 ? 'border-error/60 ring-1 ring-error/30' : 'border-surface-container'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-secondary text-white flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-on-surface">Executive Dossier</h2>
                    <p className="text-xs text-on-surface-variant">Where to send your meeting link and briefing pack</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-error bg-error/10 px-2.5 py-1 rounded-full">
                  All fields required
                </span>
              </div>

              {/* Dossier Validation Warning Banner if incomplete */}
              {Object.keys(fieldErrors).length > 0 && (
                <div className="p-3.5 rounded-2xl bg-error-container/40 border border-error/30 flex items-start gap-2.5 text-xs text-error animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="font-bold">Required Information Missing</span>
                    <span>All client information must be filled out before initiating payment. Please complete the fields highlighted below.</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface flex items-center justify-between" htmlFor="fullName">
                    <span>Full Legal / Executive Name <span className="text-error">*</span></span>
                    {fieldErrors.fullName && (
                      <span className="text-[11px] text-error font-medium">{fieldErrors.fullName}</span>
                    )}
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="e.g. Alhaji Adeyemi Babatunde"
                    value={booking.fullName || ''}
                    onChange={(e) => {
                      onUpdateBooking({ fullName: e.target.value });
                      if (fieldErrors.fullName) {
                        setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    className={`w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/40 text-sm border focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.fullName
                        ? 'border-error ring-1 ring-error bg-error/5'
                        : 'border-surface-container focus:ring-secondary'
                    }`}
                  />
                  <span className="text-[11px] text-on-surface-variant">
                    Please provide your legal or trading name (shadow example shown).
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface flex items-center justify-between" htmlFor="email">
                      <span>Corporate Email <span className="text-error">*</span></span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="e.g. adeyemi@babatunde-holdings.ng"
                      value={booking.email || ''}
                      onChange={(e) => {
                        onUpdateBooking({ email: e.target.value });
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      className={`w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/40 text-sm border focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.email
                          ? 'border-error ring-1 ring-error bg-error/5'
                          : 'border-surface-container focus:ring-secondary'
                      }`}
                    />
                    {fieldErrors.email ? (
                      <span className="text-[11px] text-error font-medium">{fieldErrors.email}</span>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant">Google Meet and consultation notes are dispatched here</span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface flex items-center justify-between" htmlFor="phone">
                      <span>WhatsApp Number <span className="text-error">*</span></span>
                    </label>
                    <div className="flex gap-2">
                      <span className="h-12 px-3 rounded-xl bg-surface-container flex items-center justify-center text-xs font-bold text-on-surface border border-surface-container shrink-0">
                        +234
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        required
                        placeholder="e.g. 803 459 2810"
                        value={booking.phone || ''}
                        onChange={(e) => {
                          onUpdateBooking({ phone: e.target.value });
                          if (fieldErrors.phone) {
                            setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                          }
                        }}
                        className={`w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/40 text-sm border focus:outline-none focus:ring-2 transition-all ${
                          fieldErrors.phone
                            ? 'border-error ring-1 ring-error bg-error/5'
                            : 'border-surface-container focus:ring-secondary'
                        }`}
                      />
                    </div>
                    {fieldErrors.phone ? (
                      <span className="text-[11px] text-error font-medium">{fieldErrors.phone}</span>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant">For calendar SMS &amp; direct concierge support</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface flex items-center justify-between" htmlFor="companyName">
                      <span>Company / Trading Name <span className="text-error">*</span></span>
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      required
                      placeholder="e.g. Babatunde Industrial Ventures Ltd"
                      value={booking.companyName || ''}
                      onChange={(e) => {
                        onUpdateBooking({ companyName: e.target.value });
                        if (fieldErrors.companyName) {
                          setFieldErrors((prev) => ({ ...prev, companyName: undefined }));
                        }
                      }}
                      className={`w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/40 text-sm border focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.companyName
                          ? 'border-error ring-1 ring-error bg-error/5'
                          : 'border-surface-container focus:ring-secondary'
                      }`}
                    />
                    {fieldErrors.companyName ? (
                      <span className="text-[11px] text-error font-medium">{fieldErrors.companyName}</span>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant">Used to draft bilateral supplier agreements</span>
                    )}
                  </div>

                  {/* Commodity Sector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface flex items-center justify-between" htmlFor="industry">
                      <span>Primary Commodity Sector <span className="text-error">*</span></span>
                    </label>
                    <select
                      id="industry"
                      required
                      value={booking.industry}
                      onChange={(e) => {
                        onUpdateBooking({ industry: e.target.value });
                        if (fieldErrors.industry) {
                          setFieldErrors((prev) => ({ ...prev, industry: undefined }));
                        }
                      }}
                      className={`w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface text-sm border focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.industry
                          ? 'border-error ring-1 ring-error bg-error/5'
                          : 'border-surface-container focus:ring-secondary'
                      }`}
                    >
                      <option value="Auto Parts & Heavy Machinery (Guangzhou / Yiwu)">Auto Parts &amp; Heavy Machinery (Guangzhou / Yiwu)</option>
                      <option value="Consumer Electronics & Solar Solutions (Shenzhen)">Consumer Electronics &amp; Solar Solutions (Shenzhen)</option>
                      <option value="Building Materials & Architectural Hardware (Foshan)">Building Materials &amp; Architectural Hardware (Foshan)</option>
                      <option value="Textiles, Garments & Raw Fabrics (Keqiao / Guangzhou)">Textiles, Garments &amp; Raw Fabrics (Keqiao / Guangzhou)</option>
                      <option value="Pharmaceutical Packaging & Medical Equipment">Pharmaceutical Packaging &amp; Medical Equipment</option>
                      <option value="Multi-Category FMCG & General Merchandise">Multi-Category FMCG &amp; General Merchandise</option>
                    </select>
                    {fieldErrors.industry && (
                      <span className="text-[11px] text-error font-medium">{fieldErrors.industry}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 Card: Order Summary & Payment Gateway */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-md flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-secondary via-secondary-container to-primary" />
              
              <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-secondary text-white flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-on-surface">Order Summary &amp; Checkout</h2>
                    <p className="text-xs text-on-surface-variant">Single non-recurring advisory fee</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-secondary">Instant Confirmation</span>
              </div>

              {/* Price Breakdown */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-2.5">
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span>60-Min 1-on-1 Consultation Retainer</span>
                  <span className="font-semibold text-on-surface">₦50,000.00</span>
                </div>
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span>Platform VAT &amp; Escrow Protection</span>
                  <span className="font-bold text-on-tertiary-container">WAIVED (₦0.00)</span>
                </div>
                <div className="h-px bg-surface-container-highest my-1" />
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-on-surface">Total Due Now</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-secondary">₦50,000</span>
                    <span className="text-[10px] text-on-surface-variant block">100% Credited to Sourcing Retainers</span>
                  </div>
                </div>
              </div>

              {/* Payment Channel Selection */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Select Payment Method (Bachs.io)
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary-fixed text-secondary">
                    <Zap className="w-3 h-3" />
                    Sandbox Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => {
                      setPaymentMethod('card');
                      onUpdateBooking({ paymentChannel: 'card' });
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer border transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-surface-container-high/70 border-secondary shadow-xs'
                        : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentChannel"
                      checked={paymentMethod === 'card'}
                      onChange={() => {
                        setPaymentMethod('card');
                        onUpdateBooking({ paymentChannel: 'card' });
                      }}
                      className="w-4 h-4 text-secondary accent-secondary"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-on-surface">Debit / Credit Card</span>
                      <span className="text-[10px] text-on-surface-variant truncate">Mastercard, Visa, Verve</span>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      setPaymentMethod('transfer');
                      onUpdateBooking({ paymentChannel: 'transfer' });
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer border transition-all ${
                      paymentMethod === 'transfer'
                        ? 'bg-surface-container-high/70 border-secondary shadow-xs'
                        : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentChannel"
                      checked={paymentMethod === 'transfer'}
                      onChange={() => {
                        setPaymentMethod('transfer');
                        onUpdateBooking({ paymentChannel: 'transfer' });
                      }}
                      className="w-4 h-4 text-secondary accent-secondary"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-on-surface">Direct Bank Transfer</span>
                      <span className="text-[10px] text-on-surface-variant truncate">Instant Virtual NGN Account</span>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      setPaymentMethod('mobile_money');
                      onUpdateBooking({ paymentChannel: 'mobile_money' });
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer border transition-all ${
                      paymentMethod === 'mobile_money'
                        ? 'bg-surface-container-high/70 border-secondary shadow-xs'
                        : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentChannel"
                      checked={paymentMethod === 'mobile_money'}
                      onChange={() => {
                        setPaymentMethod('mobile_money');
                        onUpdateBooking({ paymentChannel: 'mobile_money' });
                      }}
                      className="w-4 h-4 text-secondary accent-secondary"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-on-surface">Mobile Money</span>
                      <span className="text-[10px] text-on-surface-variant truncate">MTN MoMo, M-Pesa, Airtel</span>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      setPaymentMethod('crypto');
                      onUpdateBooking({ paymentChannel: 'crypto' });
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer border transition-all ${
                      paymentMethod === 'crypto'
                        ? 'bg-surface-container-high/70 border-secondary shadow-xs'
                        : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentChannel"
                      checked={paymentMethod === 'crypto'}
                      onChange={() => {
                        setPaymentMethod('crypto');
                        onUpdateBooking({ paymentChannel: 'crypto' });
                      }}
                      className="w-4 h-4 text-secondary accent-secondary"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-on-surface">USDT / USDC Crypto</span>
                      <span className="text-[10px] text-on-surface-variant truncate">TRC20 &amp; ERC20 Stablecoins</span>
                    </div>
                  </label>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container flex items-center gap-2 text-[11px] text-on-surface-variant">
                  <ShieldCheck className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span>Payments processed securely via <strong>Bachs.io API</strong> with bilateral escrow protection.</span>
                </div>
              </div>

              {/* Error Message if any */}
              {paymentError && (
                <div className="p-3.5 rounded-2xl bg-error-container/40 border border-error/30 flex items-start gap-2.5 text-xs text-error">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="font-bold">Payment Gateway Error</span>
                    <span>{paymentError}</span>
                  </div>
                </div>
              )}

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 text-secondary accent-secondary mt-0.5 rounded"
                />
                <span className="text-xs text-on-surface-variant leading-relaxed">
                  I understand this ₦50,000 professional consultation fee covers a private 60-minute strategy session, documentation review, and written action plan, with 100% credited toward eligible future sourcing or on-ground services.
                </span>
              </label>

              {/* Required Fields Incomplete Notice */}
              {(!booking.fullName?.trim() || !booking.email?.trim() || !booking.phone?.trim() || !booking.companyName?.trim()) && (
                <div className="p-3 rounded-2xl bg-surface-container border border-surface-container-high flex items-center gap-2.5 text-xs text-on-surface-variant">
                  <AlertCircle className="w-4 h-4 text-secondary shrink-0" />
                  <span>
                    All fields in the <strong>Executive Dossier (Step 3)</strong> must be filled out before payment can proceed.
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="w-full min-h-[54px] py-3.5 px-6 rounded-2xl bg-secondary text-on-secondary font-bold text-base flex items-center justify-center gap-3 shadow-xl shadow-secondary/20 hover:bg-secondary-container transition-all active:scale-98 disabled:opacity-50"
              >
                <Lock className="w-4 h-4 text-white/90" />
                <span>Confirm &amp; Pay with Bachs — ₦50,000</span>
                <ArrowRight className="w-5 h-5 text-white/90" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-on-surface-variant">
                <ShieldCheck className="w-4 h-4 text-on-tertiary-container" />
                <span>Instant Google Meet room &amp; WhatsApp concierge dispatched on payment</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Bachs.io Pop-up Page for Embedded In-App Checkout */}
      {isProcessingPayment && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-3xl max-w-3xl w-full shadow-2xl border border-surface-container flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[94vh]">
            
            {/* Pop-up Header */}
            <div className="px-5 py-4 sm:px-6 bg-surface-container-low border-b border-surface-container flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-secondary text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-on-surface">
                      Bachs.io Secure Checkout
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-fixed text-secondary">
                      <ShieldCheck className="w-3 h-3" />
                      In-App Pop-up Escrow
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant truncate">
                    Advisory Fee: <strong className="text-secondary">₦50,000.00 NGN</strong> • Ref: <span className="font-mono">{createdCheckout?.reference || 'Generating...'}</span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseCheckoutModal}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors shrink-0"
                title="Close and modify booking details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions & Real-Time Status Bar */}
            <div className="px-4 py-2.5 sm:px-6 bg-secondary-fixed/25 border-b border-secondary/15 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-on-surface">
                <RefreshCw className={`w-3.5 h-3.5 text-secondary ${isPollingBachs ? 'animate-spin' : ''}`} />
                <span className="font-medium text-xs">
                  {createdCheckout
                    ? 'Complete payment directly below inside this pop-up.'
                    : 'Establishing secure session with Bachs...'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateSandboxPayment}
                  className="px-3.5 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-container transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Payment Completed — View Consultation Details</span>
                </button>
              </div>
            </div>

            {/* Embedded Bachs Checkout Body */}
            <div className="relative w-full flex-1 min-h-[500px] sm:min-h-[580px] max-h-[640px] bg-surface-container-lowest flex flex-col overflow-hidden">
              {createdCheckout ? (
                <>
                  {isIframeLoading && (
                    <div className="absolute inset-0 bg-surface-container-lowest flex flex-col items-center justify-center gap-3 z-10">
                      <div className="w-10 h-10 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                      <div className="text-center">
                        <span className="text-xs font-bold text-on-surface block">
                          Loading Bachs.io Checkout in Pop-up...
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          Card, Bank Transfer, Mobile Money &amp; Crypto
                        </span>
                      </div>
                    </div>
                  )}

                  <iframe
                    src={createdCheckout.checkoutUrl}
                    title="Bachs.io Pop-up Checkout"
                    className="w-full flex-1 min-h-[500px] sm:min-h-[580px] border-0"
                    allow="payment; fullscreen"
                    onLoad={() => setIsIframeLoading(false)}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-4 flex-1">
                  <div className="w-12 h-12 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <h4 className="text-sm font-bold text-on-surface">Connecting to Bachs Payments Gateway</h4>
                    <p className="text-xs text-on-surface-variant mt-1">{paymentStepText}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pop-up Footer Bar */}
            <div className="px-5 py-3 sm:px-6 bg-surface-container-low border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-on-surface-variant text-[11px]">
                <ShieldCheck className="w-4 h-4 text-secondary shrink-0" />
                <span>Bilateral Escrow Guarantee: Funds held in trust until advisory session completion.</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseCheckoutModal}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSimulateSandboxPayment}
                  className="px-5 py-2.5 rounded-xl bg-secondary text-white font-bold text-xs hover:bg-secondary-container transition-all flex items-center gap-2 shadow-md active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Payment Completed — View Confirmed Consultation</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
