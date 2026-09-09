import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-low mt-20 pt-16 pb-32 sm:pb-20 border-t border-surface-container">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-12 text-on-surface-variant">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Col 1: Brand & Mission */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <img
                alt="Meridian China Advisory Logo"
                className="h-8 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida/AEtjO1WF3MF9hGrmEfgvZFxPK0eucnkOb3rH7KGfH58tKaaaRvsfTCPfNLKUCv89x3LOKNBvYF8zd0m4X5zR-cw26PTzHqPJTU3MMVOBkrnXJns2XKsTDtwyIv1EMj9H8P4oL3ENFAVrDjEboSPhiRprCFJ_LMgR4lDZE52bQZn73Dqyz-eA6zQ2VUEkvCtw5dHJ7zTScvtIrJSLGjx2248bUeJ3Ztkq_2W7_ld1k-FQE5ydTsz8xtmXiewamw"
              />
              <span className="text-base font-bold text-on-surface">
                Meridian China Advisory
              </span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Professional China business consultation and strategic planning for Nigerian importers, entrepreneurs, and buyers before booking flights, visas, and supplier commitments.
            </p>
          </div>

          {/* Col 2: Service Focus */}
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider font-bold text-on-surface">
              Advisory Focus
            </span>
            <div className="flex flex-col gap-2 text-xs">
              <span className="text-on-surface-variant">China Business Trip Assessment</span>
              <span className="text-on-surface-variant">Canton Fair Commodity Planning</span>
              <span className="text-on-surface-variant">Direct Supplier &amp; Factory Strategy</span>
              <span className="text-on-surface-variant">Visa Documentation Review</span>
              <span className="text-on-surface-variant">Trip Budget &amp; Expense Modeling</span>
            </div>
          </div>

          {/* Col 3: Direct Liaison Channels */}
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider font-bold text-on-surface">
              Direct Contact
            </span>
            <div className="flex flex-col gap-2.5 text-xs">
              <a
                href="https://wa.me/23480063743426?text=Hello%20Meridian%20Trade%20Desk"
                target="_blank"
                rel="noreferrer"
                className="text-on-surface hover:text-secondary flex items-center gap-2 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
                <span>WhatsApp: +234 800 MERIDIAN</span>
              </a>
              <a
                href="mailto:trade.desk@meridianchina.ng"
                className="text-on-surface hover:text-secondary flex items-center gap-2 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span>Email: trade.desk@meridianchina.ng</span>
              </a>
              <div className="text-xs text-on-surface-variant pt-1">
                Consultation Desks: WAT (Nigeria) &amp; CST (China) Timezones
              </div>
            </div>
          </div>

          {/* Col 4: Statutory Notice */}
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider font-bold text-on-surface">
              Regulatory Notice
            </span>
            <p className="text-[11px] text-outline leading-relaxed">
              Meridian China Advisory Desk provides professional management consulting and commercial planning services. Consultations are conducted online via private video conference.
            </p>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest/60 text-xs text-on-surface-variant leading-relaxed">
          <strong className="text-on-surface font-semibold block mb-1">Important Advisory Disclaimer:</strong>
          Consultation and planning services do not guarantee visa approval, admission to any event, supplier availability, business results, or procurement outcomes. Official fees and third-party costs are separate unless explicitly stated.
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-surface-container flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-outline">
          <span>© 2026 Meridian China Advisory Desk. All rights reserved.</span>
          <span>Nigeria ⇄ China Cross-Border Trade Planning</span>
        </div>
      </div>
    </footer>
  );
};
