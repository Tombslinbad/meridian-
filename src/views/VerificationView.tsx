import React from 'react';
import { AppTab } from '../types';
import { ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, Building2, Search, FileCheck } from 'lucide-react';

interface VerificationViewProps {
  onNavigate: (tab: AppTab) => void;
  onSelectObjective: (obj: 'canton' | 'factory' | 'fx-logistics') => void;
}

export const VerificationView: React.FC<VerificationViewProps> = ({
  onNavigate,
  onSelectObjective,
}) => {
  const handleBookWithFactory = () => {
    onSelectObjective('factory');
    onNavigate('booking');
  };

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface min-h-screen py-10 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 sm:gap-14">
        
        {/* Header Block */}
        <div className="flex flex-col gap-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary-fixed text-secondary text-xs font-bold uppercase tracking-wider self-start">
            <ShieldCheck className="w-4 h-4" />
            Supplier Due Diligence Protocol
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface">
            Chinese Supplier &amp; Factory Strategy
          </h1>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Before wiring production deposits, learn how to verify corporate records, audit business licenses, and distinguish direct manufacturers from domestic trading resellers.
          </p>
        </div>

        {/* Warning Banner: The Intermediary Problem */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col sm:flex-row items-start gap-5">
          <div className="w-12 h-12 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-bold text-on-surface">
              Trading Companies vs. Direct Manufacturers
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Many overseas suppliers advertising online to Nigerian importers are domestic trading intermediaries rather than manufacturing facilities. They add substantial markups without controlling production lines. In your consultation, we teach you how to identify and verify the true legal nature of your supplier before you travel or place orders.
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: 4-Point Audit Framework (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-6">
              <div className="flex flex-col gap-1 pb-4 border-b border-surface-container">
                <span className="text-xs uppercase tracking-wider font-bold text-secondary">
                  Our Advisory Framework
                </span>
                <h3 className="text-xl font-bold text-on-surface">
                  4-Point Commercial Due Diligence
                </h3>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  {
                    icon: Search,
                    title: "Unified Social Credit Code (USCC) Search",
                    desc: "Official Chinese government corporate registry verification checking shareholder structure, paid-up registered capital, legal representative, and active court litigation records.",
                  },
                  {
                    icon: Building2,
                    title: "Production Scope Examination",
                    desc: "Rigorous inspection of the Chinese business license to confirm explicit manufacturing authorization (生产 - shengchan) versus simple domestic trading resale (销售 - xiaoshou).",
                  },
                  {
                    icon: FileCheck,
                    title: "Export & Bank Account Alignment",
                    desc: "Validation that the beneficiary bank account name precisely matches the corporate entity on the factory license, avoiding dangerous offshore intermediary escrow traps.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Physical On-Ground Audit Visit",
                    desc: "Physical inspection of machinery, real production capacity, ISO certifications, quality control stations, worker headcount, and warehouse finished goods inventory.",
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="p-5 rounded-2xl bg-surface-container-low border border-surface-container flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-sm font-bold text-on-surface">
                          {item.title}
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={handleBookWithFactory}
                  className="w-full min-h-[52px] px-8 py-3.5 bg-secondary text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg shadow-secondary/20 hover:bg-secondary-container transition-all active:scale-98"
                >
                  <span>Audit My Suppliers — ₦50,000 Consultation</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Industrial Hubs Covered (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-5">
              <h3 className="text-lg font-bold text-on-surface">
                Primary Industrial Clusters Covered
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Our bilingual field inspection teams operate across China's primary manufacturing hubs to provide rapid on-site intelligence.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Foshan Industrial Hub</span>
                  <span className="text-[11px] text-on-surface-variant">Ceramics, Sanitary Ware, Furniture &amp; Heavy Hardware</span>
                </div>
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Shenzhen Technology Hub</span>
                  <span className="text-[11px] text-on-surface-variant">Tier-1 Solar, Inverters, Lithium Batteries &amp; Electronics</span>
                </div>
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Zhongshan Lighting Hub</span>
                  <span className="text-[11px] text-on-surface-variant">Commercial LED, Architectural Lighting &amp; Fittings</span>
                </div>
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Yiwu &amp; Ningbo Hubs</span>
                  <span className="text-[11px] text-on-surface-variant">FMCG, General Merchandise, Packaging &amp; Fasteners</span>
                </div>
              </div>
            </div>

            {/* Credited Fee Notice */}
            <div className="p-6 rounded-3xl bg-secondary text-white shadow-md flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-secondary-fixed">Risk-Free Retainer</span>
              <h4 className="text-base font-bold text-white">Full ₦50,000 Credit</h4>
              <p className="text-xs text-blue-100 leading-relaxed">
                Your consultation fee is 100% credited toward your first on-ground factory audit or production inspection contract.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
