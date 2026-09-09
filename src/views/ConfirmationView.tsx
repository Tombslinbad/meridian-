import React, { useState } from 'react';
import { BookingDetails, DiagnosticData, AppTab } from '../types';
import { User } from 'firebase/auth';
import {
  insertCalendarEventViaApi,
  generateGoogleCalendarUrl,
  downloadIcsFile,
  googleSignIn,
  getAccessToken,
  dispatchConsultationEmailsViaApi,
  ADVISOR_EMAIL,
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
} from 'lucide-react';

interface ConfirmationViewProps {
  booking: BookingDetails;
  onNavigate: (tab: AppTab) => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
  diagnostic: DiagnosticData;
  onUpdateDiagnostic: (data: Partial<DiagnosticData>) => void;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  booking,
  onNavigate,
  user,
  onUserChange,
  diagnostic,
  onUpdateDiagnostic,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<'idle' | 'confirming' | 'synced' | 'error'>('idle');
  const [calendarEventUrl, setCalendarEventUrl] = useState<string | null>(null);

  // Notification and Email Dispatch states
  const [showNotificationConfirmModal, setShowNotificationConfirmModal] = useState(false);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);
  const [previewEmailTab, setPreviewEmailTab] = useState<'advisor' | 'client'>('advisor');
  const [notificationDispatchStatus, setNotificationDispatchStatus] = useState<{
    isDispatching: boolean;
    advisorEmailSent: boolean;
    clientEmailSent: boolean;
    calendarSynced: boolean;
    error: string | null;
    lastDispatchedAt: string | null;
  }>({
    isDispatching: false,
    advisorEmailSent: false,
    clientEmailSent: false,
    calendarSynced: false,
    error: null,
    lastDispatchedAt: null,
  });

  // Modal states
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Diagnostic form fields
  const [hsCodes, setHsCodes] = useState(diagnostic.hsCodesOrUrls || '');
  const [orderSizing, setOrderSizing] = useState<'fcl' | 'lcl' | 'sample'>(diagnostic.orderSizing || 'fcl');
  const [roadblocks, setRoadblocks] = useState(diagnostic.currentRoadblocks || '');

  const copyMeetLink = () => {
    navigator.clipboard.writeText(booking.meetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenNotificationPrompt = () => {
    setShowNotificationConfirmModal(true);
  };

  const handleConfirmDispatchNotificationsAndCalendar = async () => {
    setShowNotificationConfirmModal(false);
    setNotificationDispatchStatus((prev) => ({ ...prev, isDispatching: true, error: null }));

    try {
      let token = await getAccessToken();

      if (!token) {
        const signResult = await googleSignIn();
        if (signResult) {
          token = signResult.accessToken;
          onUserChange(signResult.user);
        }
      }

      if (!token) {
        throw new Error('Google authorization was not completed. Please connect to Google to send emails and sync calendar.');
      }

      // 1. Dispatch formatted emails via Gmail API to BOTH Advisor and Client
      const emailRes = await dispatchConsultationEmailsViaApi({
        booking,
        token,
        diagnostic,
      });

      // 2. Insert Calendar Event with both attendees and Google Meet conference
      const calendarRes = await insertCalendarEventViaApi(booking, token);

      // 3. Register delivery log in server
      fetch('/api/notifications/consultation-booked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking, diagnostic }),
      }).catch((e) => console.warn('Notification log error:', e));

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setNotificationDispatchStatus({
        isDispatching: false,
        advisorEmailSent: emailRes.advisorResult.success,
        clientEmailSent: emailRes.clientResult.success,
        calendarSynced: calendarRes.success,
        error:
          !emailRes.advisorResult.success && !emailRes.clientResult.success
            ? emailRes.advisorResult.error || 'Failed to dispatch via Gmail'
            : null,
        lastDispatchedAt: nowStr,
      });

      if (calendarRes.success) {
        setCalendarSyncStatus('synced');
        setCalendarEventUrl(calendarRes.eventLink || null);
      }
    } catch (err: any) {
      console.error('Notification dispatch error:', err);
      setNotificationDispatchStatus((prev) => ({
        ...prev,
        isDispatching: false,
        error: err?.message || 'Error executing Google Workspace dispatch',
      }));
    }
  };

  const handleCalendarPrompt = () => {
    setCalendarSyncStatus('confirming');
  };

  const handleConfirmAddToCalendar = async () => {
    setIsAddingToCalendar(true);

    try {
      let token = await getAccessToken();

      if (!token) {
        const signResult = await googleSignIn();
        if (signResult) {
          token = signResult.accessToken;
          onUserChange(signResult.user);
        }
      }

      if (token) {
        const res = await insertCalendarEventViaApi(booking, token);
        if (res.success) {
          setCalendarSyncStatus('synced');
          setCalendarEventUrl(res.eventLink || null);
          return;
        }
      }

      // Fallback: direct Google Calendar URL web launch
      const url = generateGoogleCalendarUrl(booking);
      window.open(url, '_blank');
      setCalendarSyncStatus('synced');
      setCalendarEventUrl(url);
    } catch (err: any) {
      console.error('Calendar error:', err);
      const url = generateGoogleCalendarUrl(booking);
      window.open(url, '_blank');
      setCalendarSyncStatus('synced');
      setCalendarEventUrl(url);
    } finally {
      setIsAddingToCalendar(false);
    }
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
                <span className="text-xs uppercase tracking-wider font-bold text-on-surface-variant">
                  Private Google Meet Room:
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-low border border-surface-container">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Video className="w-5 h-5 text-secondary shrink-0" />
                    <span className="text-xs font-mono text-on-surface truncate">
                      {booking.meetUrl}
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
                      href={booking.meetUrl}
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

            {/* Google Workspace Notification & Calendar Dispatch Hub */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">Notifications &amp; Google Workspace Sync</h3>
                    <p className="text-xs text-on-surface-variant">Automated email alerts, Google Calendar event, and Google Meet integration</p>
                  </div>
                </div>
                {(notificationDispatchStatus.advisorEmailSent || calendarSyncStatus === 'synced') && (
                  <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-tertiary-fixed/40 text-on-tertiary-container text-xs font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Dispatched
                  </span>
                )}
              </div>

              {/* Notification Recipients Cards */}
              <div className="flex flex-col gap-3">
                {/* 1. Advisor Notification */}
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                        <Inbox className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-on-surface">Advisor Inbox Alert</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                        {ADVISOR_EMAIL}
                      </span>
                    </div>
                    {notificationDispatchStatus.advisorEmailSent ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Delivered
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-medium">
                        Ready to Dispatch
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Transmits complete client dossier: <strong className="text-on-surface">{booking.fullName}</strong> ({booking.phone}), <strong className="text-on-surface">{booking.companyName || 'Private Trader'}</strong>, sector <strong className="text-on-surface">{booking.industry}</strong>, Meet link, and escrow reference.
                  </p>
                </div>

                {/* 2. Client Notification */}
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-on-surface">Client Confirmation Email</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                        {booking.email}
                      </span>
                    </div>
                    {notificationDispatchStatus.clientEmailSent ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Delivered
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-medium">
                        Ready to Dispatch
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Sends client the official confirmation packet, WAT &amp; CST schedules, Google Meet access link, and desk contacts.
                  </p>
                </div>

                {/* 3. Google Calendar & Google Meet Space */}
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-on-surface">Google Calendar &amp; Meet Space</span>
                    </div>
                    {notificationDispatchStatus.calendarSynced || calendarSyncStatus === 'synced' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Calendar Synced
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-medium">
                        Ready to Sync
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Creates event with both attendees (<span className="font-mono text-on-surface">{ADVISOR_EMAIL}</span> &amp; <span className="font-mono text-on-surface">{booking.email}</span>) and attaches direct Google Meet teleconference.
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleOpenNotificationPrompt}
                  disabled={notificationDispatchStatus.isDispatching}
                  className="min-h-[46px] px-4 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-secondary-container transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {notificationDispatchStatus.isDispatching
                      ? 'Dispatching via Google API...'
                      : notificationDispatchStatus.advisorEmailSent
                      ? 'Resend Email Alerts & Sync'
                      : 'Send Email Alerts & Sync Calendar'}
                  </span>
                </button>

                <button
                  onClick={() => setShowEmailPreviewModal(true)}
                  className="min-h-[46px] px-4 py-2.5 bg-surface-container text-on-surface rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
                >
                  <Mail className="w-4 h-4 text-secondary" />
                  <span>Preview Notification Emails</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-surface-container text-xs">
                <button
                  onClick={() => downloadIcsFile(booking)}
                  className="text-on-surface-variant hover:text-on-surface font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-secondary" />
                  <span>Download .ICS file (Outlook/Apple Calendar)</span>
                </button>
                {calendarEventUrl && (
                  <a
                    href={calendarEventUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-secondary hover:underline font-bold flex items-center gap-1"
                  >
                    <span>View in Google Calendar</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Direct Concierge WhatsApp */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <MessageCircle className="w-5 h-5 text-on-tertiary-container shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-on-surface truncate">WhatsApp Executive Concierge</span>
                    <span className="text-[11px] text-on-surface-variant truncate">+234 800 MERIDIAN • Instant support</span>
                  </div>
                </div>
                <a
                  href={`https://wa.me/23480063743426?text=Hello%20Meridian%20Trade%20Desk,%20my%20booking%20ref%20is%20${booking.auditReference}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-on-tertiary-container text-white text-xs font-bold shrink-0 hover:opacity-90"
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
                onClick={handleConfirmAddToCalendar}
                disabled={isAddingToCalendar}
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-secondary text-white font-bold text-xs hover:bg-secondary-container transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                {isAddingToCalendar ? 'Syncing...' : 'Yes, Add to Calendar'}
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
                href={`https://wa.me/23480063743426?text=Hi,%20I%20would%20like%20to%20reschedule%20my%20session%20ref%20${booking.auditReference}`}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[46px] px-4 py-2 bg-surface-container text-on-surface rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
              >
                Coordinate via WhatsApp Desk
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
              <button
                onClick={() => {
                  alert('140th Canton Fair Strategy Blueprint downloaded successfully.');
                  setShowGuideModal(false);
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

            <button
              onClick={() => {
                alert('Official receipt downloaded.');
                setShowReceiptModal(false);
              }}
              className="w-full min-h-[46px] px-4 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Save Receipt PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. USER CONFIRMATION MODAL FOR EMAIL & WORKSPACE DISPATCH */}
      {showNotificationConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-on-surface">
                  Send Consultation Notification Emails?
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Workspace Schedule &amp; Email Dispatch
                </span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Confirm sending consultation booking details to both parties and synchronizing your Google Calendar:
            </p>

            <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-2.5 text-xs border border-surface-container">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-surface-container">
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface">1. Advisor Notification</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Dossier with phone, company, sector &amp; Meet link
                  </span>
                </div>
                <span className="font-mono text-[11px] text-secondary font-bold shrink-0">
                  {ADVISOR_EMAIL}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2 pb-2 border-b border-surface-container">
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface">2. Client Confirmation</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Appointment time (WAT/CST), Google Meet link &amp; receipt
                  </span>
                </div>
                <span className="font-mono text-[11px] text-secondary font-bold shrink-0">
                  {booking.email}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface">3. Google Calendar &amp; Meet</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Event created with video conference &amp; both attendees
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  Auto-invites
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNotificationConfirmModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatchNotificationsAndCalendar}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-secondary text-white font-bold text-xs hover:bg-secondary-container transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm &amp; Dispatch Emails</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. NOTIFICATION EMAIL PREVIEW MODAL */}
      {showEmailPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-secondary" />
                <h3 className="text-base font-bold text-on-surface">Notification Email Preview</h3>
              </div>
              <button
                onClick={() => setShowEmailPreviewModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab selector */}
            <div className="flex gap-2 p-1 rounded-xl bg-surface-container-low border border-surface-container">
              <button
                type="button"
                onClick={() => setPreviewEmailTab('advisor')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  previewEmailTab === 'advisor'
                    ? 'bg-surface-container-highest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Advisor Email ({ADVISOR_EMAIL})
              </button>
              <button
                type="button"
                onClick={() => setPreviewEmailTab('client')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  previewEmailTab === 'client'
                    ? 'bg-surface-container-highest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Client Email ({booking.email})
              </button>
            </div>

            {/* Preview Box */}
            {previewEmailTab === 'advisor' ? (
              <div className="p-5 rounded-2xl bg-white text-slate-900 border border-slate-200 text-xs shadow-sm flex flex-col gap-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide block">
                    Host Notification Packet
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    [New Consultation Booking] {booking.fullName} — {booking.companyName || 'Bilateral Trade Desk'}
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-3 font-mono">
                    <span>To: {ADVISOR_EMAIL}</span>
                    <span>Ref: {booking.auditReference}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex flex-col gap-2 font-sans">
                  <span className="font-bold text-[11px] text-slate-500 uppercase">Client Dossier</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Full Name:</span>
                      <strong className="text-slate-900">{booking.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Email:</span>
                      <strong className="text-slate-900">{booking.email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Phone / WhatsApp:</span>
                      <strong className="text-slate-900">{booking.phone}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Company / Entity:</span>
                      <strong className="text-slate-900">{booking.companyName || 'Not specified'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Industry Sector:</span>
                      <strong className="text-slate-900">{booking.industry}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Trip Objective:</span>
                      <strong className="text-slate-900">{booking.tripObjective} ({booking.travelWindow})</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-100 p-3.5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center">
                  <span className="text-teal-900 font-bold text-xs">Google Meet Video Room</span>
                  <span className="font-mono text-[11px] text-slate-700">{booking.meetUrl}</span>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-white text-slate-900 border border-slate-200 text-xs shadow-sm flex flex-col gap-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide block">
                    Client Confirmation Receipt
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    Confirmed: Meridian China Advisory 1-on-1 Consultation on {booking.selectedDate}
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-3 font-mono">
                    <span>To: {booking.email}</span>
                    <span>Advisor: {ADVISOR_EMAIL}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  Dear <strong>{booking.fullName}</strong>,<br />
                  Your executive 1-on-1 bilateral trade consultation is confirmed. Below are your meeting credentials:
                </p>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Date:</span>
                    <strong className="text-slate-900">{booking.selectedDate}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Time (WAT - Lagos):</span>
                    <strong className="text-slate-900">{booking.selectedTime}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Reference:</span>
                    <strong className="text-slate-900">{booking.auditReference}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Advisory Fee Cleared:</span>
                    <strong className="text-teal-700">₦50,000.00 NGN (Bachs Escrow)</strong>
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-100 p-3.5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center">
                  <span className="text-teal-900 font-bold text-xs">Your Private Google Meet Link</span>
                  <span className="font-mono text-[11px] text-slate-700">{booking.meetUrl}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowEmailPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailPreviewModal(false);
                  handleOpenNotificationPrompt();
                }}
                className="px-5 py-2 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-container flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Notifications Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
