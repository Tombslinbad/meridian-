import React, { useState } from 'react';
import { BookingDetails } from '../types';
import {
  ADVISOR_EMAIL,
  ADVISOR_WHATSAPP_NUMBER,
  ADVISOR_WHATSAPP_DISPLAY,
  downloadIcsFile,
  sanitizeMeetUrl
} from '../services/googleWorkspace';
import {
  Check,
  Calendar,
  Video,
  Copy,
  ExternalLink,
  Mail,
  ShieldCheck,
  X,
  ArrowRight,
  Download,
  MessageSquare
} from 'lucide-react';

interface PaymentCelebrationModalProps {
  booking: BookingDetails;
  isOpen: boolean;
  onClose: () => void;
  onViewDetails?: () => void;
}

export const PaymentCelebrationModal: React.FC<PaymentCelebrationModalProps> = ({
  booking,
  isOpen,
  onClose,
  onViewDetails,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const effectiveMeetUrl = sanitizeMeetUrl(booking.meetUrl);

  const automatedWhatsAppText =
    `Hello Meridian China Advisory Desk,\n\n` +
    `I just completed payment and booked my 1-on-1 Bilateral Trade Consultation.\n\n` +
    `• Booking Reference: ${booking.auditReference}\n` +
    `• Client Name: ${booking.fullName || 'Trade Client'}\n` +
    `• Company: ${booking.companyName || 'Private Trader'}\n` +
    `• Sector: ${booking.industry}\n` +
    `• Session Date: ${booking.selectedDate} at ${booking.selectedTime} (WAT)\n` +
    `• Google Meet Room: ${effectiveMeetUrl}\n\n` +
    `Please confirm receipt and acknowledge my session. Thank you!`;

  const whatsappUrl = `https://wa.me/${ADVISOR_WHATSAPP_NUMBER}?text=${encodeURIComponent(automatedWhatsAppText)}`;

  const handleCopyMeet = () => {
    navigator.clipboard.writeText(effectiveMeetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleViewConsultationDossier = () => {
    onClose();
    if (onViewDetails) {
      onViewDetails();
    }
  };

  return (
    <div
      id="payment-success-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
    >
      <div
        id="payment-success-modal-card"
        className="relative w-full max-w-xl bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container flex flex-col items-center text-center overflow-hidden my-auto"
      >
        {/* Top Celebration Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Pulsing Animated Green Tick / Checkmark */}
        <div className="relative mt-2 mb-4 flex items-center justify-center">
          {/* Animated Glow Rings */}
          <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-500/15 animate-ping" />
          <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/25 blur-sm" />

          {/* Core Green Tick Badge */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-500/30">
            <Check className="w-9 h-9 sm:w-11 sm:h-11 stroke-[3] animate-in zoom-in-75 duration-300" />
          </div>
        </div>

        {/* Exact User Wording Headlines */}
        <div className="flex flex-col gap-2 max-w-lg mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight leading-snug">
            You Have Successfully Booked Your Consultations!
          </h2>
          <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold">
            <Mail className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>You&apos;ll receive an email shortly to view your consultation details.</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Official notification dispatched to <strong className="text-on-surface">{booking.email || 'your email'}</strong> and the Advisor desk (<span className="font-mono text-secondary">{ADVISOR_EMAIL}</span>).
          </p>
        </div>

        {/* Automated WhatsApp Message CTA to Advisor */}
        <div className="w-full mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center gap-2.5 text-center">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Automated WhatsApp Notification to Advisor</span>
          </div>
          <p className="text-xs text-on-surface-variant max-w-md">
            Send an automated notification directly to the Advisor at <strong className="text-on-surface font-mono">{ADVISOR_WHATSAPP_DISPLAY} ({ADVISOR_WHATSAPP_NUMBER})</strong> saying you just booked a consultation.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20 transition-transform active:scale-98"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send Message to Advisor on WhatsApp</span>
          </a>
        </div>

        {/* Interactive Consultation Summary Card */}
        <div className="w-full p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-3 text-left mb-6">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-secondary shrink-0" />
              <span className="text-xs font-bold text-on-surface">Escrow Payment Confirmed</span>
            </div>
            <span className="text-xs font-mono font-bold text-secondary">
              Ref: {booking.auditReference || 'MCA-2026-CONFIRMED'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-on-surface-variant text-[11px]">Appointment Date &amp; Time</span>
                <span className="font-bold text-on-surface">
                  {booking.selectedDate || 'Upcoming Session'}
                </span>
                <span className="text-secondary font-semibold text-[11px]">
                  {booking.selectedTime || '11:30 AM'} (WAT - Lagos Time)
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Video className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-on-surface-variant text-[11px]">Client &amp; Entity</span>
                <span className="font-bold text-on-surface truncate">
                  {booking.fullName || 'Valued Client'}
                </span>
                <span className="text-on-surface-variant text-[11px] truncate">
                  {booking.companyName || 'Bilateral Trade Venture'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Google Meet Box */}
          <div className="mt-1 p-3 rounded-xl bg-surface-container border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Video className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Your Google Meet Video Room
                </span>
                <span className="text-xs font-mono text-on-surface truncate max-w-[240px] sm:max-w-xs">
                  {effectiveMeetUrl}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyMeet}
                className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Copy Google Meet Room Link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-secondary" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <a
                href={effectiveMeetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-secondary text-white text-xs font-bold hover:bg-secondary-container flex items-center gap-1 transition-colors"
              >
                <span>Join</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleViewConsultationDossier}
            className="w-full sm:flex-1 min-h-[48px] px-5 py-3 rounded-2xl bg-secondary text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-secondary/20 hover:bg-secondary-container transition-all active:scale-98"
          >
            <span>View Consultation Details &amp; Dossier</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => downloadIcsFile(booking)}
            className="w-full sm:w-auto min-h-[48px] px-4 py-3 rounded-2xl bg-surface-container text-on-surface text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
          >
            <Download className="w-4 h-4 text-secondary" />
            <span>Download .ICS</span>
          </button>
        </div>

        {/* WhatsApp Concierge Note */}
        <div className="mt-4 text-[11px] text-on-surface-variant flex items-center justify-center gap-2">
          <span>Need direct adjustments? Reach Concierge on WhatsApp:</span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="text-secondary font-bold hover:underline"
          >
            {ADVISOR_WHATSAPP_DISPLAY} ({ADVISOR_WHATSAPP_NUMBER})
          </a>
        </div>
      </div>
    </div>
  );
};
