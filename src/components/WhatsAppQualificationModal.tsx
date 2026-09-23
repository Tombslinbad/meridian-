import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { ADVISOR_WHATSAPP_NUMBER } from '../services/googleWorkspace';
import {
  trackContact,
  trackQualificationStarted,
  trackQualificationCompleted,
  trackTikTokEvent
} from '../lib/analytics';

interface WhatsAppQualificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookNow?: () => void;
}

interface QualificationAnswers {
  travelPurpose: string;
  chinaExperience: string;
  plannedTravel: string;
  businessSituation: string;
}

const QUESTIONS = [
  {
    id: 'travelPurpose',
    title: 'What are you travelling to China for?',
    subtitle: 'Select the primary goal for your upcoming business trip',
    options: [
      { label: 'Canton Fair', desc: 'Attending the 140th Canton Fair in Guangzhou' },
      { label: 'Product sourcing', desc: 'Finding reliable wholesale manufacturers & goods' },
      { label: 'Factory visits', desc: 'Auditing manufacturing facilities & production lines' },
      { label: 'Meeting suppliers', desc: 'Negotiating pricing & contracts with existing contacts' },
      { label: 'Other', desc: 'Exploratory trade visit or custom business objective' },
    ],
  },
  {
    id: 'chinaExperience',
    title: 'Have you travelled to China for business before?',
    subtitle: 'Helps us tailor our advisory recommendations to your experience level',
    options: [
      { label: 'Yes', desc: 'I have previously visited China for commercial business' },
      { label: 'No', desc: 'This will be my first business journey to mainland China' },
    ],
  },
  {
    id: 'plannedTravel',
    title: 'When are you planning to travel?',
    subtitle: 'Assists us with timeline readiness and document preparation window',
    options: [
      { label: 'Within 1 month', desc: 'Urgent readiness needed for upcoming travel' },
      { label: '1–3 months', desc: 'Standard preparation window for fairs and visas' },
      { label: '3–6 months', desc: 'Mid-term strategic planning & market research' },
      { label: 'Just researching', desc: 'Evaluating opportunities and feasibility first' },
    ],
  },
  {
    id: 'businessSituation',
    title: 'What best describes your current business situation?',
    subtitle: 'Helps us structure our sourcing and financial risk guidance',
    options: [
      { label: 'I already import products', desc: 'Active commercial importer scaling trade volumes' },
      { label: "I'm starting an import business", desc: 'Launching a new Nigeria–China importation venture' },
      { label: 'I already have Chinese suppliers', desc: 'Looking to optimize margins or verify factory status' },
      { label: "I'm looking for suppliers", desc: 'Need direct factory contacts & trusted trade sources' },
      { label: 'Other', desc: 'Custom enterprise, distributor, or procurement role' },
    ],
  },
];

export const WhatsAppQualificationModal: React.FC<WhatsAppQualificationModalProps> = ({
  isOpen,
  onClose,
  onBookNow,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0); // 0-3 for questions, 4 for result
  const [answers, setAnswers] = useState<QualificationAnswers>({
    travelPurpose: '',
    chinaExperience: '',
    plannedTravel: '',
    businessSituation: '',
  });

  // Track modal open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      trackQualificationStarted();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentQ = QUESTIONS[currentStep];

  const handleSelectOption = (optionLabel: string) => {
    const updatedAnswers = {
      ...answers,
      [currentQ.id]: optionLabel,
    };
    setAnswers(updatedAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Completed question 4 -> Go to result
      setCurrentStep(4);
      trackQualificationCompleted({
        travel_purpose: updatedAnswers.travelPurpose,
        china_experience: updatedAnswers.chinaExperience,
        planned_travel: updatedAnswers.plannedTravel,
        business_situation: updatedAnswers.businessSituation,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Build WhatsApp URL
  const experienceText = answers.chinaExperience === 'No' ? 'First time' : 'Experienced';
  const whatsappMessage =
    `Hello Meridian, I'd like to discuss the China Business Consultation.\n\n` +
    `My answers:\n` +
    `Travel purpose: ${answers.travelPurpose || 'Business trip'}\n` +
    `China business experience: ${experienceText}\n` +
    `Planned travel: ${answers.plannedTravel || 'Upcoming'}\n` +
    `Business situation: ${answers.businessSituation || 'Trade operations'}\n\n` +
    `I'd like to know if the ₦50,000 consultation is suitable for me.`;

  const whatsappUrl = `https://wa.me/${ADVISOR_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleWhatsAppClick = () => {
    trackContact('WhatsApp', 'Pre-Payment Qualification');
    trackTikTokEvent('Contact', {
      content_name: 'China Business Consultation Inquiry',
      channel: 'WhatsApp',
      travel_purpose: answers.travelPurpose,
      china_experience: experienceText,
      planned_travel: answers.plannedTravel,
      business_situation: answers.businessSituation,
      value: 50000,
      currency: 'NGN',
    });
    // Modal will close gracefully after clicking WhatsApp link
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qualification-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-3xl border border-surface-container shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-surface-container flex items-center justify-between bg-surface-container-low/60 shrink-0">
          <div className="flex items-center gap-2.5">
            {currentStep > 0 && currentStep < 4 ? (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Previous question"
                className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors mr-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : null}
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 border border-emerald-500/25 shrink-0 shadow-xs">
              <WhatsAppIcon className="w-4 h-4 fill-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="qualification-modal-title" className="text-sm sm:text-base font-bold text-on-surface leading-tight">
                  {currentStep < 4 ? "Check If We're a Fit" : 'Assessment Result'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  <WhatsAppIcon className="w-2.5 h-2.5 fill-current" /> WhatsApp Fit Check
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                {currentStep < 4 ? `Question ${currentStep + 1} of 4 • Pre-qualify for WhatsApp Advisory` : 'Your Personalized Consultation Summary'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar (Only during questions) */}
        {currentStep < 4 && (
          <div className="w-full bg-surface-container h-1 shrink-0">
            <div
              className="bg-emerald-600 h-1 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 4) * 100}%` }}
            />
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {currentStep < 4 ? (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* WhatsApp Onboarding Context Notice */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3 text-xs text-on-surface shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <WhatsAppIcon className="w-4 h-4 fill-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                      Direct WhatsApp Advisory Onboarding
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/20 px-1.5 py-0.2 rounded">
                      4 Quick Questions
                    </span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant leading-tight mt-0.5">
                    Answer 4 quick questions. Your responses will generate a tailored trade brief sent directly to our Senior Advisor on WhatsApp.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Step {currentStep + 1} of 4
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-on-surface leading-snug">
                  {currentQ.title}
                </h3>
                <p className="text-xs text-on-surface-variant">{currentQ.subtitle}</p>
              </div>

              {/* Options list */}
              <div className="flex flex-col gap-2.5 pt-1">
                {currentQ.options.map((option) => {
                  const isSelected =
                    answers[currentQ.id as keyof QualificationAnswers] === option.label;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleSelectOption(option.label)}
                      className={`w-full min-h-[52px] p-3 sm:p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 active:scale-[0.99] ${
                        isSelected
                          ? 'bg-secondary/10 border-secondary text-on-surface shadow-xs'
                          : 'bg-surface-container-low hover:bg-surface-container border-surface-container text-on-surface'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-on-surface">
                          {option.label}
                        </span>
                        <span className="text-[11px] text-on-surface-variant leading-relaxed">
                          {option.desc}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-secondary bg-secondary text-white'
                            : 'border-outline/40 bg-surface'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom WhatsApp guarantee notice */}
              <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-surface-container text-xs">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600 shrink-0" />
                  Direct WhatsApp message link will be generated after step 4
                </span>
                <span className="text-[11px] font-mono text-outline">
                  Question {currentStep + 1} of 4
                </span>
              </div>
            </div>
          ) : (
            /* Result Screen */
            <div className="flex flex-col gap-5 animate-fade-in">
              {/* Fit assessment notice */}
              <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Good Fit Assessment
                  </span>
                  <p className="text-sm font-bold text-on-surface leading-snug">
                    Thanks. Based on your answers, a private China Business Consultation may be a good fit for your plans.
                  </p>
                </div>
              </div>

              {/* Consultation Details Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                    Advisory Format
                  </span>
                  <span className="text-xs font-bold text-secondary px-2 py-0.5 rounded-md bg-secondary/10">
                    1-on-1 Video Session
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pt-1 border-t border-surface-container">
                  <span className="text-base font-bold text-on-surface">
                    60-minute private consultation
                  </span>
                  <span className="text-2xl font-bold text-on-surface">
                    ₦50,000
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container/80 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Your consultation fee is credited toward an eligible future China business package, according to the applicable package terms.
                  </p>
                </div>

                {/* Dossier Summary Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-on-surface-variant">
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container font-medium">
                    🎯 {answers.travelPurpose}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container font-medium">
                    ✈️ {experienceText}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container font-medium">
                    📅 {answers.plannedTravel}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container font-medium">
                    🏢 {answers.businessSituation}
                  </span>
                </div>
              </div>

              {/* Primary Action: Continue to WhatsApp */}
              <div className="flex flex-col gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 transition-all active:scale-98 text-center"
                >
                  <WhatsAppIcon className="w-5 h-5 fill-white shrink-0" />
                  <span>Continue to WhatsApp</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </a>

                {/* Direct Booking Alternative */}
                {onBookNow && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onBookNow();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Ready to reserve your slot now?</span>
                    <span className="text-secondary font-bold">Book Consultation (₦50,000)</span>
                  </button>
                )}
              </div>

              {/* Compliance & Disclosure Notice */}
              <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container text-[11px] text-on-surface-variant leading-relaxed">
                <span className="font-semibold text-on-surface">Advisory Transparency: </span>
                Consultation provides professional trade planning and strategy guidance. It does not guarantee visa approval, supplier contracts, commercial profits, or Canton Fair access. Standard consular, regulatory, and trade requirements apply.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
