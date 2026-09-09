import React, { useState } from 'react';
import { AppTab } from '../types';
import { ArrowRight, CheckCircle2, Shield, AlertCircle } from 'lucide-react';

interface CantonFairViewProps {
  onNavigate: (tab: AppTab) => void;
  onSelectObjective: (obj: 'canton' | 'factory' | 'fx-logistics') => void;
}

export const CantonFairView: React.FC<CantonFairViewProps> = ({
  onNavigate,
  onSelectObjective,
}) => {
  const [activePhase, setActivePhase] = useState<1 | 2 | 3>(1);

  const handleBookWithPhase = () => {
    onSelectObjective('canton');
    onNavigate('booking');
  };

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface min-h-screen py-10 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 sm:gap-14">
        
        {/* Header Block */}
        <div className="flex flex-col gap-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary-fixed text-secondary text-xs font-bold uppercase tracking-wider self-start">
            140th Canton Fair • 2026 Planning Guide
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface">
            Canton Fair Strategy &amp; Commodity Phase Planning
          </h1>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            The Pazhou Exhibition Complex in Guangzhou is one of the world's largest trade venues. Navigating it effectively requires matching your commercial buying requirements to the correct phase and preparing your supplier inquiries in advance.
          </p>
        </div>

        {/* Canton Fair Positioning Note */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-surface-container flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            <strong className="text-on-surface">Official Canton Fair Notice:</strong>
            <span>
              The Canton Fair invitation and buyer badge application process is handled directly through the official Canton Fair portal. We do not sell invitation letters or badges. Our service provides professional strategic planning, phase selection, and business travel preparation.
            </span>
          </div>
        </div>

        {/* Phase Selector Tabs */}
        <div className="grid grid-cols-3 gap-3 p-1.5 rounded-2xl bg-surface-container-low border border-surface-container max-w-2xl">
          {[
            { phase: 1 as const, dates: 'Oct 15–19, 2026', label: 'Phase 1', tag: 'Electronics & Machinery' },
            { phase: 2 as const, dates: 'Oct 23–27, 2026', label: 'Phase 2', tag: 'Building & Ceramics' },
            { phase: 3 as const, dates: 'Oct 31–Nov 4, 2026', label: 'Phase 3', tag: 'Textiles & Health' },
          ].map((tab) => (
            <button
              key={tab.phase}
              type="button"
              onClick={() => setActivePhase(tab.phase)}
              className={`py-3 px-2 rounded-xl flex flex-col items-center gap-0.5 transition-all ${
                activePhase === tab.phase
                  ? 'bg-surface-container-lowest text-secondary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="text-sm sm:text-base font-bold">{tab.label}</span>
              <span className="text-[11px] opacity-80 font-medium">{tab.dates}</span>
            </button>
          ))}
        </div>

        {/* 2-Column Responsive Layout for Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Active Phase Deep Dive (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-6">
              {activePhase === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-container">
                    <span className="text-xl font-bold text-secondary">
                      Phase 1: Industrial Machinery, Electronics &amp; Hardware
                    </span>
                    <span className="px-3 py-1 rounded-full bg-secondary-fixed text-secondary text-xs font-bold self-start sm:self-center">
                      October 15–19, 2026
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Designed for business owners, importers, distributors, and engineers sourcing electrical appliances, consumer electronics, solar components, machinery, and automotive spare parts.
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-on-surface">
                      Core Commodity Pavilions:
                    </span>
                    {[
                      "Consumer Electronics, Smart Appliances & Audio Systems",
                      "Automotive Spare Parts, Tires & Commercial Accessories",
                      "Solar Panels, Inverters & Energy Storage Systems",
                      "Industrial Machinery, Processing Lines & Power Equipment",
                      "Hardware, Tools, Fasteners & Electrical Engineering Supplies"
                    ].map((cat, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-on-surface">
                        <CheckCircle2 className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                        <span>{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePhase === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-container">
                    <span className="text-xl font-bold text-secondary">
                      Phase 2: Building Materials, Ceramics &amp; Home Goods
                    </span>
                    <span className="px-3 py-1 rounded-full bg-secondary-fixed text-secondary text-xs font-bold self-start sm:self-center">
                      October 23–27, 2026
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Essential for real estate developers, building contractors, interior suppliers, and home product distributors sourcing from Guangdong, Fujian, and Zhejiang.
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-on-surface">
                      Core Commodity Pavilions:
                    </span>
                    {[
                      "Ceramic Floor & Wall Tiles, Granite & Marble Materials",
                      "Sanitary Ware, Bathroom Fittings, Faucets & Shower Units",
                      "Commercial & Architectural Lighting Fixtures",
                      "Doors, Windows, Aluminum Profiles & Construction Hardware",
                      "Kitchenware, Household Glassware, Home Decor & Furniture"
                    ].map((cat, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-on-surface">
                        <CheckCircle2 className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                        <span>{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePhase === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-container">
                    <span className="text-xl font-bold text-secondary">
                      Phase 3: Textiles, Apparel, Footwear &amp; Health
                    </span>
                    <span className="px-3 py-1 rounded-full bg-secondary-fixed text-secondary text-xs font-bold self-start sm:self-center">
                      October 31–November 4, 2026
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Relevant for fashion importers, fabric wholesalers, luggage distributors, footwear traders, and medical supply importers sourcing from manufacturing centers across China.
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-on-surface">
                      Core Commodity Pavilions:
                    </span>
                    {[
                      "Apparel, Denim, Athletic Wear & Fashion Accessories",
                      "Fabrics, Yarns, Raw Materials & Garment Accessories",
                      "Footwear, Luggage, Handbags & Travel Accessories",
                      "Medical Consumables, Diagnostic Kits & Hospital Equipment",
                      "Personal Care, Beauty Hardware, Office Supplies & Packaging"
                    ].map((cat, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-on-surface">
                        <CheckCircle2 className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
                        <span>{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 border-t border-surface-container">
                <button
                  type="button"
                  onClick={handleBookWithPhase}
                  className="w-full min-h-[52px] px-8 py-3.5 bg-secondary text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg shadow-secondary/20 hover:bg-secondary-container transition-all active:scale-98"
                >
                  <span>Book Strategy Consultation for Phase {activePhase} — ₦50,000</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Buyer Badge Protocol & Guidance (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface">
                    Buyer Badge &amp; Portal Guidance
                  </h2>
                  <p className="text-xs text-on-surface-variant">China Foreign Trade Centre Protocol</p>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Overseas buyers are advised to complete online pre-registration on the official Canton Fair portal before traveling to ensure seamless badge issuance upon arrival at the Pazhou complex.
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Official Buyer Pre-Registration</span>
                  <span className="text-[11px] text-on-surface-variant">We guide you through the official government portal to request your buyer badge credentials.</span>
                </div>
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Hotel &amp; Transit Logistics</span>
                  <span className="text-[11px] text-on-surface-variant">Advice on choosing hotels with complimentary fair shuttle lines in Haizhu or Tianhe districts.</span>
                </div>
              </div>
            </div>

            {/* Quick Consultation Reminder */}
            <div className="p-6 rounded-3xl bg-surface-container-low border border-surface-container shadow-sm flex flex-col gap-3">
              <span className="text-xs uppercase tracking-wider font-bold text-secondary">Advisory Benefit</span>
              <h3 className="text-lg font-bold text-on-surface">100% Fee Credit</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your ₦50,000 consultation fee is 100% credited toward eligible subsequent on-ground accompaniment or factory inspection services if you choose to retain our team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
