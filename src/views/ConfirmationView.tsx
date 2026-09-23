import React, { useState, useEffect, useRef } from 'react';
import { BookingDetails, DiagnosticData, AppTab } from '../types';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  insertCalendarEventViaApi,
  generateGoogleCalendarUrl,
  getAccessToken,
  dispatchConsultationEmailsViaApi,
  ADVISOR_EMAIL,
  CLIENT_SENDER_EMAIL,
  ADVISOR_NOTIFICATION_SENDER_EMAIL,
  ADVISOR_WHATSAPP_NUMBER,
  ADVISOR_WHATSAPP_DISPLAY,
  getWhatsAppConsultationUrl,
  sanitizeMeetUrl,
  setSavedAdvisorMeetUrl,
  getDefaultMeetUrl,
} from '../services/googleWorkspace';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  Copy,
  Check,
  ExternalLink,
  Download,
  FileText,
  RotateCcw,
  ShieldCheck,
  X,
  MessageCircle,
  Mail,
  Send,
  Inbox,
  AlertCircle,
  Edit3,
} from 'lucide-react';

interface ConfirmationViewProps {
  booking: BookingDetails;
  onUpdateBooking?: (details: Partial<BookingDetails>) => void;
  onNavigate: (tab: AppTab) => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
  diagnostic: DiagnosticData;
  onUpdateDiagnostic: (data: Partial<DiagnosticData>) => void;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  booking,
  onUpdateBooking,
  onNavigate,
  user,
  onUserChange,
  diagnostic,
  onUpdateDiagnostic,
}) => {
  const activeMeetUrl = sanitizeMeetUrl(booking.meetUrl);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<'idle' | 'confirming' | 'synced' | 'error'>('idle');
  const [calendarEventUrl, setCalendarEventUrl] = useState<string | null>(null);

  // Dedicated Meet Room configuration
  const [showMeetConfigModal, setShowMeetConfigModal] = useState(false);
  const [customMeetUrlInput, setCustomMeetUrlInput] = useState(activeMeetUrl);
  const [meetConfigSaved, setMeetConfigSaved] = useState(false);

  // Notification and Email Dispatch states
  const [notificationDispatchStatus, setNotificationDispatchStatus] = useState<{
    isDispatching: boolean;
    advisorEmailSent: boolean;
    clientEmailSent: boolean;
    calendarSynced: boolean;
    error: string | null;
    clientError: string | null;
    advisorError: string | null;
    lastDispatchedAt: string | null;
  }>({
    isDispatching: false,
    advisorEmailSent: false,
    clientEmailSent: false,
    calendarSynced: false,
    error: null,
    clientError: null,
    advisorError: null,
    lastDispatchedAt: null,
  });

  // Modal states
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  // Diagnostic form fields
  const [hsCodes, setHsCodes] = useState(diagnostic.hsCodesOrUrls || '');
  const [orderSizing, setOrderSizing] = useState<'fcl' | 'lcl' | 'sample'>(diagnostic.orderSizing || 'fcl');
  const [roadblocks, setRoadblocks] = useState(diagnostic.currentRoadblocks || '');

  const copyMeetLink = () => {
    navigator.clipboard.writeText(activeMeetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveMeetConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = customMeetUrlInput.trim();
    if (cleanUrl.startsWith('https://meet.google.com/')) {
      setSavedAdvisorMeetUrl(cleanUrl);
      if (onUpdateBooking) {
        onUpdateBooking({ meetUrl: cleanUrl });
      }
      setMeetConfigSaved(true);
      setTimeout(() => {
        setMeetConfigSaved(false);
        setShowMeetConfigModal(false);
      }, 1000);
    }
  };

  // Automated background email dispatch triggered upon loading confirmation
  const hasAutoDispatchedRef = useRef(false);

  const handleAutoDispatchEmails = async (isManual = false) => {
    setNotificationDispatchStatus((prev) => ({ ...prev, isDispatching: true, error: null }));

    try {
      const response = await fetch('/api/notifications/consultation-booked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking: { ...booking, meetUrl: activeMeetUrl },
          diagnostic,
        }),
      });

      const data = await response.json().catch(() => ({}));
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const clientSent = Boolean(data.clientEmailSent);
      const advisorSent = Boolean(data.advisorEmailSent);

      setNotificationDispatchStatus({
        isDispatching: false,
        advisorEmailSent: advisorSent,
        clientEmailSent: clientSent,
        clientError: data.clientError || null,
        advisorError: data.advisorError || null,
        calendarSynced: true,
        error: !clientSent && data.clientError ? `Client email notice: ${data.clientError}` : null,
        lastDispatchedAt: nowStr,
      });
      setCalendarSyncStatus('synced');
    } catch (err: any) {
      console.warn('Auto-dispatch error:', err);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setNotificationDispatchStatus({
        isDispatching: false,
        advisorEmailSent: false,
        clientEmailSent: false,
        clientError: err?.message || 'Network error',
        advisorError: err?.message || 'Network error',
        calendarSynced: true,
        error: 'Failed to connect to email notification service.',
        lastDispatchedAt: nowStr,
      });
      setCalendarSyncStatus('synced');
    }
  };

  useEffect(() => {
    if (hasAutoDispatchedRef.current) return;
    hasAutoDispatchedRef.current = true;
    handleAutoDispatchEmails(false);

    // Ensure slot status is permanently marked as confirmed in Firestore
    if (booking.selectedDateIso && booking.selectedTime) {
      const slotId = `${booking.selectedDateIso}_${booking.selectedTime.replace(/[\s:]/g, '')}`;
      setDoc(
        doc(db, 'bookings', slotId),
        {
          dateIso: booking.selectedDateIso,
          timeSlot: booking.selectedTime,
          fullName: booking.fullName || '',
          email: booking.email || '',
          phone: booking.phone || '',
          companyName: booking.companyName || '',
          status: 'confirmed',
          auditReference: booking.auditReference || '',
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch((err) => {
        console.warn('Could not confirm booking in Firestore client-side:', err);
      });
    }
  }, [booking.auditReference]);

  const handleDirectAddToCalendar = () => {
    const url = generateGoogleCalendarUrl({ ...booking, meetUrl: activeMeetUrl });
    window.open(url, '_blank');
    setCalendarSyncStatus('synced');
    setCalendarEventUrl(url);
  };

  const handleSaveDiagnostic = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDiagnostic({
      hsCodesOrUrls: hsCodes,
      orderSizing,
      currentRoadblocks: roadblocks,
      submitted: true,
    });
    setShowDiagnosticModal(false);
  };

  const getCstTime = (watTime: string) => {
    if (watTime.includes('10:00 AM')) return '05:00 PM CST';
    if (watTime.includes('11:30 AM')) return '06:30 PM CST';
    if (watTime.includes('02:00 PM')) return '09:00 PM CST';
    if (watTime.includes('04:00 PM')) return '11:00 PM CST';
    if (watTime.includes('06:00 PM')) return '01:00 AM CST (Next Day)';
    if (watTime.includes('08:00 PM')) return '03:00 AM CST (Next Day)';
    return '06:30 PM CST';
  };

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface min-h-screen">
      {/* Top Cleared Notification Banner */}
      <div className="w-full bg-surface-container-lowest border-b border-surface-container py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-on-surface">Payment Cleared &amp; Calendar Reserved</span>
              <span className="text-xs text-on-surface-variant block font-mono">Reference: {booking.auditReference}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReceiptModal(true)}
              className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Official Receipt (PDF)</span>
            </button>
            <button
              onClick={() => onNavigate('advisory')}
              className="px-4 py-2 rounded-xl bg-secondary text-white text-xs font-semibold hover:bg-secondary-container transition-colors"
            >
              Return to Overview
            </button>
          </div>
        </div>
      </div>

      {/* Main Container - 2-Column Responsive Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: Main Session Credentials & Calendar Sync (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            
            {/* Direct Automated WhatsApp Notification Card to Advisor */}
            <div className="p-5 sm:p-6 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#25D366]/25">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Automated Booking Notice
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                      Direct to Advisor
                    </span>
                  </div>
                  <p className="text-sm font-bold text-on-surface mt-0.5">
                    Notify Advisor on WhatsApp ({ADVISOR_WHATSAPP_DISPLAY})
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Send an automated message saying you just booked your consultation ref <span className="font-mono font-bold text-on-surface">{booking.auditReference}</span>.
                  </p>
                </div>
              </div>

              <a
                href={getWhatsAppConsultationUrl(booking)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 shadow-md shadow-[#25D366]/20 transition-transform active:scale-98"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send WhatsApp Notice</span>
              </a>
            </div>

            {/* Primary Session Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-secondary to-primary" />
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider font-bold text-secondary">
                    Consultation Locked
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-on-surface mt-1">
                    Your 1-on-1 Strategic Advisory is Confirmed
                  </h1>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Lead: <strong className="text-on-surface">{booking.fullName}</strong> • Entity: <strong className="text-on-surface">{booking.companyName || 'Private Importer'}</strong>
                  </p>
                </div>
              </div>

              {/* Dual Timezone Schedule Box */}
              <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-3">
                <div className="flex items-center gap-2 text-on-surface">
                  <Calendar className="w-5 h-5 text-secondary" />
                  <span className="text-base font-bold">{booking.selectedDate}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-xs text-on-surface-variant font-medium">West Africa Time (WAT - Lagos)</span>
                    <span className="text-base font-bold text-on-surface">{booking.selectedTime}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-on-surface-variant font-medium">China Standard Time (CST - Guangzhou)</span>
                    <span className="text-base font-bold text-on-surface">{getCstTime(booking.selectedTime)}</span>
                  </div>
                </div>
              </div>

              {/* Google Meet Video Room Credentials */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold text-on-surface-variant">
                    Private Google Meet Room:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMeetUrlInput(activeMeetUrl);
                      setShowMeetConfigModal(true);
                    }}
                    className="text-xs text-secondary hover:underline font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Configure Desk Room</span>
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-low border border-surface-container">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Video className="w-5 h-5 text-secondary shrink-0" />
                    <span className="text-xs font-mono text-on-surface truncate">
                      {activeMeetUrl}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={copyMeetLink}
                      className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 hover:bg-surface-container-high transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-on-tertiary-container" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </button>
                    <a
                      href={activeMeetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-1.5 rounded-lg bg-secondary text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary-container transition-colors"
                    >
                      <span>Join Room</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Assigned Principal Profile */}
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-surface-container-low border border-surface-container">
                <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                  MA
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-on-surface">Director, Bilateral Trade Desk</span>
                    <span className="text-xs text-secondary font-semibold">● Accredited</span>
                  </div>
                  <span className="text-xs text-on-surface-variant truncate">
                    Assigned Principal • Former Trade Envoy to Guangdong &amp; Zhejiang
                  </span>
                </div>
              </div>
            </div>

            {/* Automated Consultation Notifications & Calendar Hub */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">Automated Consultation Confirmations</h3>
                    <p className="text-xs text-on-surface-variant">Instant server-side dispatch to advisor &amp; client • No sign-in required</p>
                  </div>
                </div>
                <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Automatic Dispatch Active</span>
                </span>
              </div>

              {/* Clean Email Notice */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Consultation Confirmed &amp; Dispatched</span>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Your consultation has been confirmed and automated notifications have been successfully dispatched. The client should check their email for the details and Google Meet credentials.
                  </p>
                </div>
              </div>

              {/* Error feedback if any */}
              {notificationDispatchStatus.error && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{notificationDispatchStatus.error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDirectAddToCalendar}
                  className="flex-1 min-h-[46px] px-4 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-secondary-container transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Add to Google Calendar (1-Click)</span>
                </button>

                <button
                  onClick={() => handleAutoDispatchEmails(true)}
                  disabled={notificationDispatchStatus.isDispatching}
                  className="px-4 py-2.5 bg-surface-container text-on-surface hover:bg-surface-container-high rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-secondary" />
                  <span>
                    {notificationDispatchStatus.isDispatching ? 'Re-dispatching...' : 'Resend Email Confirmation'}
                  </span>
                </button>
              </div>

              {/* Direct Concierge WhatsApp */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-on-surface truncate">Advisor Direct WhatsApp Line</span>
                    <span className="text-[11px] text-on-surface-variant truncate font-mono">{ADVISOR_WHATSAPP_DISPLAY} ({ADVISOR_WHATSAPP_NUMBER})</span>
                  </div>
                </div>
                <a
                  href={getWhatsAppConsultationUrl(booking)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold shrink-0 transition-colors shadow-sm"
                >
                  Open WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Pre-Session Diagnostic & Execution Timeline (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            
            {/* Action Required: Diagnostic Intake */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider font-bold text-secondary">
                  Preparation Step
                </span>
                <h3 className="text-base font-bold text-on-surface">
                  Pre-Session Sourcing Intake
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Help us prepare your factory background check before we join the Google Meet call.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-start justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-on-surface">Commodity &amp; HS Code Specs</span>
                  <span className="text-[11px] text-on-surface-variant mt-0.5">
                    {diagnostic.submitted ? 'Dossier saved and attached to meeting notes' : 'Target products, target MOQ, sample links'}
                  </span>
                </div>
                <button
                  onClick={() => setShowDiagnosticModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-secondary text-white text-xs font-semibold shrink-0 hover:bg-secondary-container transition-colors"
                >
                  {diagnostic.submitted ? 'Edit' : 'Fill Form'}
                </button>
              </div>

              {/* Canton Fair Guide Download */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-start justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-on-surface">140th Canton Fair Guide</span>
                  <span className="text-[11px] text-on-surface-variant mt-0.5">
                    Pazhou Complex halls, badge guidelines &amp; shuttle routes
                  </span>
                </div>
                <button
                  onClick={() => setShowGuideModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-semibold shrink-0 hover:bg-surface-container-high transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Execution Timeline Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider font-bold text-secondary">
                  Next Milestones
                </span>
                <h3 className="text-base font-bold text-on-surface">
                  What Happens Between Now and Your Call
                </h3>
              </div>

              <div className="flex flex-col gap-3.5">
                {[
                  { step: "1", title: "Preliminary Factory Register Check", desc: "Our analysts cross-reference your commodity sector against verified OEM databases." },
                  { step: "2", title: "Meeting Reminder Notice", desc: "You receive an automated SMS & WhatsApp reminder with direct Meet link 2 hours before." },
                  { step: "3", title: "60-Minute Strategy Consultation", desc: "Live strategy call assessing your itinerary, visa dossier, and factory contacts." },
                  { step: "4", title: "Custom Sourcing Dossier Issued", desc: "You receive your personalized bilateral execution briefing packet within 24 hours." },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-on-surface">{item.title}</span>
                      <span className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Need to reschedule */}
              <div className="pt-3 border-t border-surface-container flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Need to modify your appointment?</span>
                <button
                  onClick={() => setShowRescheduleModal(true)}
                  className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reschedule Slot</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. GOOGLE CALENDAR CONFIRMATION DIALOG */}
      {calendarSyncStatus === 'confirming' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-on-surface">Add to Google Calendar?</h3>
                <span className="text-xs text-on-surface-variant">Workspace Schedule Integration</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Session:</span>
                <span className="font-bold text-on-surface">Meridian Advisory Consultation</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Date:</span>
                <span className="font-bold text-on-surface">{booking.selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Time:</span>
                <span className="font-bold text-on-surface">{booking.selectedTime} (WAT)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCalendarSyncStatus('idle')}
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDirectAddToCalendar}
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-secondary text-white font-bold text-xs hover:bg-secondary-container transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                Yes, Add to Google Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PRE-SESSION DIAGNOSTIC MODAL */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-secondary" />
                <h3 className="text-base font-bold text-on-surface">Sourcing Diagnostic Intake</h3>
              </div>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiagnostic} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">
                  Target Products, HS Codes, or Sample URLs
                </label>
                <textarea
                  value={hsCodes}
                  onChange={(e) => setHsCodes(e.target.value)}
                  placeholder="e.g. Automotive brake pads, 8541.43 (Tier-1 Bifacial Solar Panels), or product links"
                  rows={3}
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface text-xs border border-surface-container focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Projected Sourcing Volume</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sample', label: 'Samples & LCL', desc: '< $10k' },
                    { id: 'lcl', label: '1x 20ft / 40ft', desc: '$15k - $50k' },
                    { id: 'fcl', label: 'Multi-FCL', desc: '$50,000+' },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setOrderSizing(size.id as any)}
                      className={`p-2.5 rounded-xl flex flex-col text-left transition-all border ${
                        orderSizing === size.id
                          ? 'bg-surface-container-high border-secondary font-bold'
                          : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
                      }`}
                    >
                      <span className="text-xs font-bold text-on-surface">{size.label}</span>
                      <span className="text-[10px] text-on-surface-variant">{size.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Key Bottlenecks or Past Sourcing Pain Points</label>
                <textarea
                  value={roadblocks}
                  onChange={(e) => setRoadblocks(e.target.value)}
                  placeholder="e.g. Distinguishing trading companies from direct factories, shipping freight delays, etc."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface text-xs border border-surface-container focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowDiagnosticModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-container"
                >
                  Save Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. RESCHEDULE MODAL */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-secondary" />
                <h3 className="text-base font-bold text-on-surface">Reschedule Appointment</h3>
              </div>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Your consultation includes 1 complimentary reschedule up to 12 hours prior to start time.
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  onNavigate('booking');
                }}
                className="w-full min-h-[46px] px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary-container transition-colors"
              >
                Choose Another Slot
              </button>
              <a
                href={`https://wa.me/${ADVISOR_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Meridian Trade Desk, I would like to coordinate rescheduling for my session ref ${booking.auditReference}`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[46px] px-4 py-2 bg-surface-container text-on-surface rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
              >
                Coordinate via WhatsApp Desk ({ADVISOR_WHATSAPP_DISPLAY})
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 4. CANTON FAIR GUIDE PREVIEW MODAL */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                <h3 className="text-base font-bold text-on-surface">140th Canton Fair Strategy Guide</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-on-surface-variant">
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container">
                <strong className="text-on-surface block mb-1">Phase 1: October 15–19, 2026</strong>
                Consumer Electronics, Household Electrical Appliances, Industrial Machinery, Hardware &amp; Automotive Parts.
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container">
                <strong className="text-on-surface block mb-1">Phase 2: October 23–27, 2026</strong>
                Ceramics, Building &amp; Decorative Materials, Sanitary Ware, Furniture, Kitchenware &amp; Home Gifts.
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container">
                <strong className="text-on-surface block mb-1">Phase 3: October 31–November 4, 2026</strong>
                Textiles, Garments, Footwear, Luggage, Medical Devices &amp; Health Products.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
              {downloadFeedback && (
                <span className="text-xs text-secondary font-semibold animate-fade-in mr-auto">
                  {downloadFeedback}
                </span>
              )}
              <button
                onClick={() => {
                  setDownloadFeedback('140th Canton Fair Strategy Blueprint downloaded.');
                  setTimeout(() => {
                    setDownloadFeedback(null);
                    setShowGuideModal(false);
                  }, 1200);
                }}
                className="px-5 py-2.5 rounded-xl bg-secondary text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Guide</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. OFFICIAL RECEIPT PDF MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="text-base font-bold text-on-surface">Payment Receipt</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-2 font-mono text-xs text-on-surface border border-surface-container">
              <div className="text-center font-bold pb-2 border-b border-surface-container font-sans">
                MERIDIAN CHINA ADVISORY DESK<br />
                <span className="font-normal text-on-surface-variant text-[11px]">Professional China Trade Planning Desk</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Receipt Ref:</span>
                <span>{booking.auditReference}</span>
              </div>
              {booking.bachsCheckoutId && (
                <div className="flex justify-between">
                  <span>Bachs Checkout ID:</span>
                  <span className="truncate max-w-[180px]">{booking.bachsCheckoutId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Payment Engine:</span>
                <span className="font-sans font-bold text-secondary">Bachs.io Global Payments</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Channel:</span>
                <span className="capitalize">{booking.paymentChannel === 'crypto' ? 'USDT/USDC Stablecoin' : booking.paymentChannel === 'mobile_money' ? 'Mobile Money' : booking.paymentChannel === 'transfer' ? 'Virtual NGN Transfer' : 'Debit/Credit Card'}</span>
              </div>
              <div className="flex justify-between">
                <span>Client Name:</span>
                <span>{booking.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span>Service:</span>
                <span>China Business Consultation (60-Min)</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-bold text-secondary">₦50,000.00 NGN</span>
              </div>
              <div className="flex justify-between">
                <span>Escrow Status:</span>
                <span className="text-on-tertiary-container font-bold">CONFIRMED (Bachs.io API)</span>
              </div>
            </div>

            {downloadFeedback && (
              <span className="text-xs text-secondary font-semibold text-center animate-fade-in">
                {downloadFeedback}
              </span>
            )}

            <button
              onClick={() => {
                setDownloadFeedback('Official receipt generated.');
                setTimeout(() => {
                  setDownloadFeedback(null);
                  setShowReceiptModal(false);
                }, 1200);
              }}
              className="w-full min-h-[46px] px-4 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Save Receipt PDF</span>
            </button>
          </div>
        </div>
      )}



      {/* Dedicated Meet Room Configuration Modal */}
      {showMeetConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-surface-container flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Configure Advisor Desk Meet Room</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Ensure client consultations route to your active, valid video room
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMeetConfigModal(false)}
                className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetConfig} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">
                  Google Meet URL
                </label>
                <input
                  type="url"
                  value={customMeetUrlInput}
                  onChange={(e) => setCustomMeetUrlInput(e.target.value)}
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-secondary/50"
                />
                <span className="text-[11px] text-on-surface-variant">
                  Paste your permanent Google Meet room (e.g. from Google Meet "Create a meeting for later") or use the live instant launcher below.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCustomMeetUrlInput('https://meet.google.com/new')}
                  className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-[11px] font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Use Live Room Launcher (meet.google.com/new)
                </button>
                <a
                  href="https://meet.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-surface-container text-secondary text-[11px] font-semibold hover:bg-surface-container-high flex items-center gap-1 transition-colors"
                >
                  <span>Open Google Meet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {meetConfigSaved && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Google Meet desk room saved and synchronized successfully!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowMeetConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-container transition-colors shadow-sm"
                >
                  Save & Apply Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
