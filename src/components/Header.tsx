import React from 'react';
import { AppTab } from '../types';
import { Lock } from 'lucide-react';

interface HeaderProps {
  currentTab: AppTab;
  onNavigate: (tab: AppTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
}) => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-xs border-b border-surface-container">
      <div className="h-16 sm:h-20 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 max-w-6xl mx-auto">
        {/* Brand Logo */}
        <button
          onClick={() => onNavigate('advisory')}
          className="flex items-center gap-2 sm:gap-3 text-left focus:outline-none group shrink min-w-0"
          aria-label="Meridian China Advisory Home"
        >
          <img
            alt="Meridian China Advisory Logo"
            className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform group-hover:scale-105 shrink-0"
            src="/meridian-logo.svg"
          />
          <div className="hidden md:flex flex-col">
            <span className="font-title-md text-base sm:text-lg text-on-surface tracking-tight leading-none font-bold">
              Meridian
            </span>
            <span className="font-label-sm text-xs text-secondary font-semibold tracking-wide mt-0.5">
              China Advisory Desk
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => {
              if (currentTab !== 'advisory') {
                onNavigate('advisory');
                setTimeout(() => {
                  document.getElementById('whats-included')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              } else {
                document.getElementById('whats-included')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-3 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            What's Included
          </button>
          <button
            onClick={() => {
              if (currentTab !== 'advisory') {
                onNavigate('advisory');
                setTimeout(() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              } else {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-3 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            How It Works
          </button>
          <button
            onClick={() => {
              if (currentTab !== 'advisory') {
                onNavigate('advisory');
                setTimeout(() => {
                  document.getElementById('transparency')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              } else {
                document.getElementById('transparency')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-3 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Transparency
          </button>
          <button
            onClick={() => {
              if (currentTab !== 'advisory') {
                onNavigate('advisory');
                setTimeout(() => {
                  document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              } else {
                document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-3 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            FAQ
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Book Consultation Button */}
          <button
            onClick={() => onNavigate('booking')}
            className="min-h-[38px] sm:min-h-[44px] px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-secondary text-on-secondary rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-sm shadow-secondary/20 hover:bg-secondary-container transition-all active:scale-98 shrink-0"
          >
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90 shrink-0" />
            <span className="whitespace-nowrap font-bold sm:font-semibold">
              <span className="hidden lg:inline">Book Consultation — ₦50,000</span>
              <span className="lg:hidden">Book Consultation</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
