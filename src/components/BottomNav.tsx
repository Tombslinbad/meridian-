import React from 'react';
import { AppTab } from '../types';

interface BottomNavProps {
  currentTab: AppTab;
  onNavigate: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate }) => {
  return (
    <nav
      className="md:hidden fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.06)] border-t border-surface-container"
      data-active-classes="text-secondary font-semibold"
    >
      <div className="flex justify-around items-center h-16 px-space-xs max-w-2xl mx-auto">
        {/* Advisory Tab */}
        <button
          onClick={() => onNavigate('advisory')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            currentTab === 'advisory'
              ? 'text-secondary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          aria-label="Trade Advisory"
        >
          <span className="material-symbols-outlined text-[20px]">hub</span>
          <span className="font-label-sm text-label-sm mt-0.5">Advisory</span>
        </button>

        {/* Canton Fair Tab */}
        <button
          onClick={() => onNavigate('canton-fair')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            currentTab === 'canton-fair'
              ? 'text-secondary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          aria-label="Canton Fair Delegation"
        >
          <span className="material-symbols-outlined text-[20px]">flight_takeoff</span>
          <span className="font-label-sm text-label-sm mt-0.5">Canton Fair</span>
        </button>

        {/* Verification Tab */}
        <button
          onClick={() => onNavigate('verification')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            currentTab === 'verification'
              ? 'text-secondary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          aria-label="Supplier & Factory Verification"
        >
          <span className="material-symbols-outlined text-[20px]">verified</span>
          <span className="font-label-sm text-label-sm mt-0.5">Verification</span>
        </button>

        {/* Book ₦50k Tab */}
        <button
          onClick={() => onNavigate('booking')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            currentTab === 'booking' || currentTab === 'confirmed'
              ? 'text-secondary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          aria-label="Book ₦50k Consultation"
        >
          <span className="material-symbols-outlined text-[20px]">event_available</span>
          <span className="font-label-sm text-label-sm mt-0.5">Book ₦50k</span>
        </button>
      </div>
    </nav>
  );
};
