import React, { useState } from 'react';
import { AppTab } from '../types';
import {
  ArrowRight,
  ChevronDown,
  Check,
  X,
  Shield,
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  FileText,
  HelpCircle,
  CreditCard,
  Building,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface TradeIntelligenceViewProps {
  onNavigate: (tab: AppTab) => void;
  onQuickBookModalOpen?: () => void;
}

export const TradeIntelligenceView: React.FC<TradeIntelligenceViewProps> = ({
  onNavigate,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleBookNow = () => {
    onNavigate('booking');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface relative">
      {/* 1. HERO SECTION */}
      <section className="relative w-full overflow-hidden pt-8 sm:pt-14 pb-16 sm:pb-24 border-b border-surface-container/80">
        {/* Soft Ambient Background Highlights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-80 h-80 bg-on-tertiary-container/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Direct Value Proposition & Action */}
            <div className="lg:col-span-7 flex flex-col items-start gap-6">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold shadow-xs border border-surface-container">
                <span className="text-secondary font-bold">Nigeria ⇄ China</span>
                <span className="text-on-surface-variant font-medium">B2B Business Consultation</span>
              </div>

              {/* Main Headline & Supporting Copy */}
              <div className="flex flex-col gap-3.5">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface leading-tight sm:leading-tight">
                  Planning a Business Trip to China? <br className="hidden sm:inline" />
                  <span className="text-secondary">Don’t Book the Flight Until You Have a Plan.</span>
                </h1>
                <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-xl">
                  Get a personalized 60-minute strategy session covering your China business objective, Canton Fair planning, visa-document readiness, sourcing approach, trip budget, and next steps — before you commit millions to the trip.
                </p>
              </div>

              {/* Price & Credit Mechanic Badge */}
              <div className="w-full sm:w-auto p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">Consultation Fee</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-on-surface">₦50,000</span>
                    <span className="text-xs text-on-surface-variant font-medium">/ 60-minute session</span>
                  </div>
                </div>
                <div className="h-9 w-px bg-surface-container-highest hidden sm:block" />
                <div className="flex flex-col">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-on-tertiary-container">
                    <CheckCircle2 className="w-4 h-4 text-on-tertiary-container" />
                    100% Credited Toward Future Services
                  </span>
                  <span className="text-xs text-on-surface-variant mt-0.5">
                    Credited toward eligible future sourcing or on-ground services
                  </span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  onClick={handleBookNow}
                  className="min-h-[46px] sm:min-h-[52px] px-4 sm:px-7 py-2.5 sm:py-3.5 bg-secondary text-on-secondary rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-secondary/20 hover:bg-secondary-container transition-all active:scale-98"
                >
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 shrink-0" />
                  <span className="whitespace-nowrap">Book Consultation — ₦50,000</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 shrink-0" />
                </button>
                <button
                  onClick={() => scrollToSection('whats-included')}
                  className="min-h-[46px] sm:min-h-[50px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-on-surface font-medium text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-surface-container transition-colors border border-surface-container sm:border-transparent whitespace-nowrap"
                >
                  <span>See What’s Included</span>
                  <ChevronDown className="w-4 h-4 text-secondary shrink-0" />
                </button>
              </div>

              {/* Service Delivery Assurances */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-on-surface-variant pt-2 border-t border-surface-container w-full">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Video className="w-4 h-4 text-secondary" />
                  Private 1-on-1 Video (Google Meet)
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-secondary" />
                  Full 60 Minutes Dedicated
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <FileText className="w-4 h-4 text-secondary" />
                  Written Action Plan Provided
                </span>
              </div>
            </div>

            {/* Right Column: Visual Strategy Presentation */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-surface-container bg-surface-container-lowest">
                <img
                  alt="China Business Strategy & Planning"
                  className="w-full h-72 sm:h-84 object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuADOer4UaN8rXLDR6yvNBI8SGzwc6U6o4lBx_lKZBuIpNQnN4K_Ic3jbEojlZDFyF6y49KtWuSL8FVwQ5bYkPb4WYyiMVkH3rJpxLxjckhQc8IfBFJXkeRxH13SQWtSS1lOlDCKE1eK5M5Rz0SPEfHW90Sr2V54go-PJmMMbkLh16KmemuqcSIaYYACpD2YX7ldDyiCZMvksu9PDwxni5j_kfQQDcZPw6qbqUfNi7N1ZGA1oarVoZ14"
                />

                {/* Information Overlay */}
                <div className="p-5 flex flex-col gap-3 bg-surface-container-lowest border-t border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-secondary">
                      Strategic Planning Scope
                    </span>
                    <span className="text-xs font-semibold text-on-tertiary-container bg-tertiary-fixed/30 px-2 py-0.5 rounded-md">
                      Online Video Session
                    </span>
                  </div>
                  <div className="text-sm font-bold text-on-surface">
                    Guangzhou • Foshan • Shenzhen • Yiwu Commodity Hubs
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Designed to give Nigerian entrepreneurs clarity on factory validation, Canton Fair trade phases, realistic budgets, and documentation before taking flight.
                  </p>
                </div>
              </div>

              {/* Core Reassurance Card */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-start gap-3">
                <Shield className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">Transparent Advisory Standard</span>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                    We charge a professional fee for planning and strategy. We do not sell visa guarantees or mark up third-party fees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Regulatory Disclaimer */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <p className="text-[11px] text-outline text-center sm:text-left leading-relaxed">
            * Consultation and planning services do not guarantee visa approval, admission to any event, supplier availability, business results, or procurement outcomes. Official fees and third-party costs are separate unless explicitly stated.
          </p>
        </div>
      </section>

      {/* 2. MAKE THE OFFER OBVIOUS: What You Get for ₦50,000 */}
      <section className="w-full py-16 sm:py-20 bg-surface-container-lowest border-b border-surface-container" id="whats-included">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 sm:gap-14">
          <div className="max-w-3xl flex flex-col gap-2.5">
            <span className="text-xs uppercase tracking-wider text-secondary font-bold">
              The Consultation Offer
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface">
              What You Get for ₦50,000
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed">
              Every consultation is a focused, 1-on-1 strategy working session tailored to your specific product, industry, and travel objectives. Here is what is covered:
            </p>
          </div>

          {/* 10 Clear Deliverable Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                title: "60-Minute Private Consultation",
                desc: "Direct, uninterrupted video strategy session conducted via Google Meet to address your specific trip goals and answer your questions.",
              },
              {
                title: "Business-Trip Objective Assessment",
                desc: "We analyze your exact commercial objectives to confirm whether traveling in person is genuinely necessary or if alternative approaches make more sense.",
              },
              {
                title: "Canton Fair Planning & Phase Guidance",
                desc: "Clear advice on which Canton Fair phase corresponds to your product categories, pavilion layout navigation, and official buyer badge procedures.",
              },
              {
                title: "China Sourcing Strategy Discussion",
                desc: "Frameworks for identifying legitimate manufacturing clusters in Guangdong and Zhejiang matching your product specifications and order volume.",
              },
              {
                title: "Visa-Document Readiness Review",
                desc: "A practical review of the commercial documentation required for Chinese business visa submission, including CAC corporate papers, tax records, and invitation protocols.",
              },
              {
                title: "Trip Budget Planning",
                desc: "Realistic, unpadded estimates of flights, hotels, high-speed rail, local transfers, and day-to-day business travel expenses in both NGN and RMB.",
              },
              {
                title: "Supplier & Factory Strategy",
                desc: "Guidance on how to structure RFQs, prepare product specification sheets, and establish direct contact with factories before traveling.",
              },
              {
                title: "Direct Factory vs. Intermediary Considerations",
                desc: "Learn the specific indicators that distinguish direct manufacturing plants from domestic trading company resellers.",
              },
              {
                title: "Personalized Next-Step Roadmap",
                desc: "A structured checklist of what needs to happen before you book flights, pay for accommodations, or wire production deposits.",
              },
              {
                title: "Post-Consultation Action Dossier",
                desc: "A written summary and action roadmap delivered following your consultation so you have your plan documented in writing.",
              },
              {
                title: "100% Retainer Credit Mechanic",
                desc: "If you decide to engage our team for future eligible on-ground or sourcing services, your full ₦50,000 fee is credited toward the contract.",
              },
              {
                title: "Independent Execution Freedom",
                desc: "You are never required or pressured to buy additional packages. You can take your plan and execute your trip completely independently.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-2.5 shadow-xs hover:border-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                  <h3 className="text-base font-bold text-on-surface">{item.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed pl-7.5">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Quick CTA strip */}
          <div className="p-6 sm:p-8 rounded-2xl bg-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <span className="text-base font-bold text-on-surface">Ready to plan your trip properly?</span>
              <span className="text-xs text-on-surface-variant">Reserve your 60-minute slot online in under 2 minutes.</span>
            </div>
            <button
              onClick={handleBookNow}
              className="min-h-[46px] px-6 py-2.5 bg-secondary text-on-secondary rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-secondary-container transition-all active:scale-98 shrink-0"
            >
              <span>Book Consultation — ₦50,000</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. PRACTICAL VALUE: Why the ₦50,000 is Worth It (Practical Risk Prevention) */}
      <section className="w-full py-16 sm:py-20 bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 sm:gap-14">
          <div className="max-w-3xl flex flex-col gap-2.5">
            <span className="text-xs uppercase tracking-wider text-secondary font-bold">
              Risk Prevention &amp; Preparation
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface">
              Why Spend ₦50,000 Before Spending Millions on Travel?
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed">
              A business trip to China involves flights, hotels, visa processing, and local transit. Arriving without preparation can result in wasted days, missed exhibition halls, and dealings with intermediaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* The Unplanned Trip */}
            <div className="p-7 sm:p-8 rounded-3xl bg-surface-container-lowest border border-error/25 shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-error/15">
                <span className="text-base font-bold text-error">Common Mistakes Without a Plan</span>
                <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-bold uppercase">
                  Unplanned
                </span>
              </div>
              <ul className="flex flex-col gap-3.5 text-xs sm:text-sm text-on-surface-variant">
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>Attending the wrong Canton Fair phase and missing your entire commodity category.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>Arriving in Guangzhou without confirmed appointments with actual production managers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>Unprepared visa documentation resulting in preventable application delays or rejections.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>Negotiating with trading intermediaries who present themselves as direct factory owners.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>Underestimating local Chinese travel logistics, digital payments, and transit between industrial towns.</span>
                </li>
              </ul>
            </div>

            {/* With the Strategic Plan */}
            <div className="p-7 sm:p-8 rounded-3xl bg-surface-container-lowest border border-secondary/30 shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-secondary/20">
                <span className="text-base font-bold text-secondary">What You Have After Your Consultation</span>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-secondary text-[11px] font-bold uppercase">
                  Prepared
                </span>
              </div>
              <ul className="flex flex-col gap-3.5 text-xs sm:text-sm text-on-surface-variant">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>Exact clarity on which exhibition phase or industrial market cluster hosts your goods.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>Practical questions and technical criteria to separate genuine factories from resellers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>A thorough checklist of required commercial documents before submitting for your business visa.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>Realistic itemized trip budget so you know your total travel commitment in NGN and RMB.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>A written roadmap of milestones to complete before booking flights and accommodation.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TRANSPARENCY SECTION: Know Exactly Where Your Money Goes */}
      <section className="w-full py-16 sm:py-20 bg-surface-container-lowest border-y border-surface-container" id="transparency">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 sm:gap-14">
          <div className="max-w-3xl flex flex-col gap-2.5">
            <span className="text-xs uppercase tracking-wider text-secondary font-bold">
              Fee Transparency
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface">
              Know Exactly Where Your Money Goes.
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed">
              We do not hide costs inside one inflated package. You should know what you are paying us for and what you are paying other official providers for directly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: What You Pay Us (5 cols) */}
            <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-surface-container-low border-2 border-secondary/40 shadow-sm flex flex-col gap-5">
              <div className="flex flex-col gap-1 pb-4 border-b border-surface-container">
                <span className="text-xs uppercase tracking-wider font-bold text-secondary">
                  You Pay Us
                </span>
                <h3 className="text-xl font-bold text-on-surface">
                  China Business Consultation
                </h3>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-on-surface">₦50,000</span>
                <span className="text-xs text-on-surface-variant font-medium">one-time professional fee</span>
              </div>

              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Covers our 60-minute private strategy session, trip feasibility assessment, Canton Fair phase planning, documentation review, and written post-consultation action plan.
              </p>

              <div className="p-3.5 rounded-xl bg-surface-container text-xs text-on-surface-variant flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                <span>
                  <strong>100% Credited:</strong> If you later engage our team for eligible future on-ground or sourcing services, this ₦50,000 is credited toward that contract.
                </span>
              </div>
            </div>

            {/* Right: What You Pay Third Parties Directly (7 cols) */}
            <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-5">
              <div className="flex flex-col gap-1 pb-4 border-b border-surface-container">
                <span className="text-xs uppercase tracking-wider font-bold text-on-surface-variant">
                  You May Pay Third Parties Directly
                </span>
                <h3 className="text-xl font-bold text-on-surface">
                  Third-Party &amp; Official Expenses
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-on-surface-variant">
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <strong className="text-on-surface text-sm">Visa &amp; Application Official Fees</strong>
                  <span>Paid directly by you to the official Chinese Visa Application Center / Embassy.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <strong className="text-on-surface text-sm">International Flights</strong>
                  <span>Booked directly with airlines or your chosen ticketing agent.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <strong className="text-on-surface text-sm">Hotel Accommodations</strong>
                  <span>Paid directly to hotels in Guangzhou, Foshan, Yiwu, or your destination city.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <strong className="text-on-surface text-sm">Ground Transportation</strong>
                  <span>High-speed trains (bullet trains), metro, taxis, and local car rentals in China.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <strong className="text-on-surface text-sm">Travel Insurance</strong>
                  <span>Purchased directly from licensed travel insurance underwriters.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <strong className="text-on-surface text-sm">Freight &amp; Customs Clearing</strong>
                  <span>Paid directly to freight forwarders and licensed customs clearing agents.</span>
                </div>
              </div>

              {/* Canton Fair Positioning Note */}
              <div className="p-4 rounded-xl bg-surface-container border border-surface-container flex items-start gap-2.5 text-xs text-on-surface-variant mt-1">
                <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <strong className="text-on-surface">Canton Fair Invitation &amp; Badge Note:</strong>
                  <span>
                    The Canton Fair invitation and buyer badge application is handled through the official Canton Fair process. We do not sell invitation letters as a paid product. Our service is the professional planning and business preparation around your trip.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. THE 5-STEP CONSULTATION PROCESS */}
      <section className="w-full py-16 sm:py-20 bg-surface" id="how-it-works">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 sm:gap-14">
          <div className="max-w-3xl flex flex-col gap-2.5">
            <span className="text-xs uppercase tracking-wider text-secondary font-bold">
              How It Works
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface">
              The 5-Step Consultation Process
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed">
              A straightforward process from booking your slot to receiving your tailored China travel roadmap.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-5">
            {[
              {
                step: "01",
                title: "Book",
                desc: "Pay ₦50,000 and select your preferred consultation date and time slot.",
              },
              {
                step: "02",
                title: "Tell Us About Your Business",
                desc: "Complete a short pre-consultation questionnaire with your product goals and questions.",
              },
              {
                step: "03",
                title: "Strategy Session",
                desc: "Attend your private 60-minute consultation via Google Meet with your advisor.",
              },
              {
                step: "04",
                title: "Receive Your Roadmap",
                desc: "Receive your personalized action plan and roadmap summarizing the session.",
              },
              {
                step: "05",
                title: "Decide Your Next Step",
                desc: "Proceed independently or discuss additional sourcing/on-ground services if needed.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-surface-container-lowest border border-surface-container flex flex-col gap-3 shadow-xs relative"
              >
                <span className="text-xl font-bold text-secondary">{item.step}</span>
                <h3 className="text-base font-bold text-on-surface">{item.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Clarity on Post-Consultation Freedom */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface-variant text-center">
            You are <strong>never forced or pressured</strong> to purchase additional services after the consultation. You can take your action plan and execute your trip completely independently.
          </div>
        </div>
      </section>

      {/* 6. WHO THIS IS FOR vs. WHO THIS IS NOT FOR */}
      <section className="w-full py-16 sm:py-20 bg-surface-container-lowest border-y border-surface-container">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 sm:gap-14">
          <div className="max-w-3xl flex flex-col gap-2.5">
            <span className="text-xs uppercase tracking-wider text-secondary font-bold">
              Target Audience
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface">
              Is This Consultation Right for You?
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed">
              We work with commercial business owners and serious buyers. Please review who this service is designed for:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Who This Is For */}
            <div className="p-7 sm:p-8 rounded-3xl bg-surface-container-low border border-on-tertiary-container/30 shadow-sm flex flex-col gap-5">
              <span className="text-base font-bold text-on-tertiary-container flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-on-tertiary-container" />
                This Consultation Is For:
              </span>
              <ul className="flex flex-col gap-3 text-xs sm:text-sm text-on-surface-variant">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>Nigerian importers and traders sourcing or planning to source products from China.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>Business owners planning their first commercial trip to China.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>Existing importers looking to visit suppliers, factories, or wholesale markets directly.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>Buyers considering attending the Canton Fair in Guangzhou.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>Businesses looking for direct manufacturers rather than trading intermediaries.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                  <span>Entrepreneurs who want a structured, realistic China sourcing and travel strategy.</span>
                </li>
              </ul>
            </div>

            {/* Who This Is NOT For */}
            <div className="p-7 sm:p-8 rounded-3xl bg-surface-container-low border border-error/25 shadow-sm flex flex-col gap-5">
              <span className="text-base font-bold text-error flex items-center gap-2">
                <X className="w-5 h-5 text-error" />
                This Consultation Is NOT For:
              </span>
              <ul className="flex flex-col gap-3 text-xs sm:text-sm text-on-surface-variant">
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>Tourists looking for vacation holiday packages.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>People looking for guaranteed visas or informal migration routes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>People looking for a free consultation.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>People expecting us to pay their government, embassy, or third-party fees.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>People expecting guaranteed suppliers, guaranteed prices, or guaranteed business results.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CURRENT CANTON FAIR INFORMATION (2026 Context) */}
      <section className="w-full py-16 sm:py-20 bg-surface border-b border-surface-container">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
          <div className="max-w-3xl flex flex-col gap-2.5">
            <span className="text-xs uppercase tracking-wider text-secondary font-bold">
              Exhibition Planning Context
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
              Planning for the Canton Fair in Guangzhou
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed">
              If your trip is planned around the Canton Fair, understanding which phase corresponds to your product category is essential before booking flights or accommodation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container flex flex-col gap-2">
              <span className="text-xs font-bold text-secondary uppercase">Phase 1</span>
              <strong className="text-base font-bold text-on-surface">October 15–19, 2026</strong>
              <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                Consumer Electronics, Household Electrical Appliances, Industrial Machinery, Hardware, Tools &amp; Automotive Spare Parts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container flex flex-col gap-2">
              <span className="text-xs font-bold text-secondary uppercase">Phase 2</span>
              <strong className="text-base font-bold text-on-surface">October 23–27, 2026</strong>
              <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                Ceramics, Building &amp; Decorative Materials, Sanitary Ware, Furniture, Kitchenware, Home Products &amp; Gifts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container flex flex-col gap-2">
              <span className="text-xs font-bold text-secondary uppercase">Phase 3</span>
              <strong className="text-base font-bold text-on-surface">October 31–November 4, 2026</strong>
              <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                Textiles, Garments, Footwear, Luggage &amp; Bags, Office Supplies, Medical Devices &amp; Healthcare Products.
              </p>
            </div>
          </div>

          <p className="text-xs text-on-surface-variant">
            * Note: The Canton Fair invitation and buyer badge are issued through the official Canton Fair portal. In our consultation, we help you prepare and navigate this process correctly.
          </p>
        </div>
      </section>

      {/* 8. DETAILED FAQ SECTION */}
      <section className="w-full py-16 sm:py-20 bg-surface-container-lowest border-b border-surface-container" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
          <div className="text-center flex flex-col gap-2.5 items-center">
            <span className="text-xs uppercase tracking-wider text-secondary font-bold">Frequently Asked Questions</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-on-surface-variant max-w-lg">
              Honest and clear answers about what is included, how the consultation works, and what to expect.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {[
              {
                q: "Is the ₦50,000 refundable?",
                a: "The ₦50,000 consultation fee is non-refundable once the session has taken place, as it covers the dedicated 60 minutes of professional advisory time. However, if you need to reschedule your appointment, you may do so with at least 4 hours' advance notice without any penalty. Furthermore, 100% of the ₦50,000 fee is credited toward eligible future sourcing or on-ground services if you choose to proceed with us.",
              },
              {
                q: "What exactly is included in the consultation?",
                a: "The consultation includes a 60-minute private 1-on-1 video session on Google Meet covering your business-trip objectives, Canton Fair planning and phase guidance (where relevant), China sourcing strategy discussion, visa-document readiness review, realistic trip budget planning, direct factory vs intermediary considerations, and a personalized written action plan and roadmap delivered following the session.",
              },
              {
                q: "Does the ₦50,000 include my visa fee?",
                a: "No. The ₦50,000 is our professional consultation fee. Official visa application tariffs are determined by the Chinese Embassy and paid directly by you to the official Chinese Visa Application Service Center (VFS/Embassy).",
              },
              {
                q: "Does it include my flight?",
                a: "No. Flight tickets are paid directly by you to the airline or ticketing agent of your choice. We provide realistic flight cost estimates and routing advice during the budget planning segment.",
              },
              {
                q: "Does it include hotel?",
                a: "No. Hotel accommodations are booked and paid directly by you to the hotel. We guide you on suitable business hotel locations in Guangzhou, Foshan, Yiwu, or your destination city with good transport access.",
              },
              {
                q: "Does it include the Canton Fair invitation?",
                a: "No. The Canton Fair invitation letter and buyer badge application are handled through the official Canton Fair process. We do not sell invitations as a paid product. In our session, we guide you through the official registration procedure and requirements.",
              },
              {
                q: "Can you guarantee my visa?",
                a: "No. No legitimate advisory can guarantee visa approval. Sovereign visas are granted solely at the discretion of the Chinese Embassy and consular officers. We review your commercial documentation, CAC records, and invitation requirements to help ensure your application is professionally prepared.",
              },
              {
                q: "Can you guarantee that I will find suppliers?",
                a: "We do not guarantee supplier outcomes or business success. What we provide is an objective sourcing methodology: how to locate genuine factory clusters, how to verify supplier credentials, what questions to ask, and how to protect yourself against trading company markups.",
              },
              {
                q: "What happens after the consultation?",
                a: "After your 60-minute session, you will receive a written summary and action roadmap outlining the key milestones for your trip. You can then execute your trip independently, or if you require on-ground support (such as factory audits or accompaniment), you can discuss retaining our team.",
              },
              {
                q: "Can the ₦50,000 be used toward future services?",
                a: "Yes. 100% of your ₦50,000 consultation fee is credited toward any eligible subsequent on-ground factory inspection, Canton Fair accompaniment, or sourcing retainer contract if you choose to engage us.",
              },
              {
                q: "Do I need to already have a business?",
                a: "Having a registered business (such as a Nigerian CAC entity) is strongly recommended, especially for business visa (M-Visa) documentation and commercial supplier dealings. If you are an early-stage entrepreneur, we will explain the corporate requirements you need to fulfill before applying.",
              },
              {
                q: "Is this for first-time China travelers?",
                a: "Yes. The consultation is particularly valuable for first-time business travelers who want to avoid common planning mistakes, understand the logistics and cultural expectations, and arrive in China with a structured plan.",
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl bg-surface-container-low border border-surface-container overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-on-surface"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-secondary shrink-0 transition-transform duration-200 ${
                      openFaqIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === index && (
                  <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-on-surface-variant leading-relaxed border-t border-surface-container/60 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FINAL CALL TO ACTION */}
      <section className="w-full py-16 sm:py-24 bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 py-1 px-3.5 rounded-full bg-secondary-fixed text-secondary text-xs font-bold uppercase tracking-wider">
            Clear Planning Before You Travel
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface max-w-2xl leading-tight">
            Before You Spend Millions on Your China Business Trip, Get the Plan Right.
          </h2>

          <p className="text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
            Book a 60-minute China Business Consultation and leave with a clearer strategy for your trip, sourcing goals, Canton Fair planning, documentation, and next steps.
          </p>

          {/* Pricing Highlight Pill */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-2 px-5 rounded-2xl bg-surface-container-low border border-surface-container text-xs sm:text-sm font-semibold text-on-surface">
            <span className="text-secondary font-bold text-base">₦50,000</span>
            <span className="text-on-surface-variant">•</span>
            <span>60-Minute Private Session</span>
            <span className="text-on-surface-variant">•</span>
            <span className="text-on-tertiary-container font-bold">100% Credited Toward Future Services</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2">
            <button
              onClick={handleBookNow}
              className="w-full sm:w-auto min-h-[48px] sm:min-h-[54px] px-6 sm:px-9 py-3 sm:py-3.5 bg-secondary text-on-secondary rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-secondary/20 hover:bg-secondary-container transition-all active:scale-98"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 shrink-0" />
              <span className="whitespace-nowrap">Book Consultation — ₦50,000</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 shrink-0" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-on-surface-variant font-medium pt-2">
            <span>Direct Google Meet Video</span>
            <span>•</span>
            <span>WAT / CST Timezone Options</span>
            <span>•</span>
            <span>Written Roadmap Included</span>
          </div>
        </div>
      </section>

      {/* 10. STICKY MOBILE BOTTOM CTA BAR */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-container p-3 px-4 flex items-center justify-between shadow-xl">
        <div className="flex flex-col">
          <span className="text-base font-bold text-on-surface leading-tight">₦50,000</span>
          <span className="text-[11px] text-secondary font-semibold">100% Credited to Retainers</span>
        </div>
        <button
          onClick={handleBookNow}
          className="min-h-[42px] px-4 py-2 bg-secondary text-on-secondary rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-98"
        >
          <span className="whitespace-nowrap">Book Consultation</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
};
