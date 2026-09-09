import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../services/googleWorkspace';
import { AppTab } from '../types';
import { Lock, LogOut, CheckCircle2, Video, Calendar, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  user,
  onUserChange,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    try {
      const result = await googleSignIn();
      if (result) {
        onUserChange(result.user);
      }
    } catch (err) {
      console.error('Sign in error:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onUserChange(null);
    setShowUserMenu(false);
  };

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
            src="https://lh3.googleusercontent.com/aida/AEtjO1WF3MF9hGrmEfgvZFxPK0eucnkOb3rH7KGfH58tKaaaRvsfTCPfNLKUCv89x3LOKNBvYF8zd0m4X5zR-cw26PTzHqPJTU3MMVOBkrnXJns2XKsTDtwyIv1EMj9H8P4oL3ENFAVrDjEboSPhiRprCFJ_LMgR4lDZE52bQZn73Dqyz-eA6zQ2VUEkvCtw5dHJ7zTScvtIrJSLGjx2248bUeJ3Ztkq_2W7_ld1k-FQE5ydTsz8xtmXiewamw"
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

          {/* User Account Avatar / Google Sign-in trigger */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-transparent hover:ring-secondary transition-all"
              aria-label="User Account"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-on-primary text-[18px]">
                  person
                </span>
              )}
            </button>

            {/* User Dropdown Popover */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container p-3 z-50 flex flex-col gap-3">
                  {user ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-surface-container">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || ''}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">
                            {user.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-md text-on-surface truncate">
                            {user.displayName || 'Executive Client'}
                          </span>
                          <span className="font-body-sm text-[11px] text-on-surface-variant truncate">
                            {user.email}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-surface-container-low flex flex-col gap-1.5 text-on-surface text-[11px]">
                        <div className="flex items-center gap-1.5 text-on-tertiary-container font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Google Workspace Connected</span>
                        </div>
                        <p className="text-on-surface-variant">
                          Calendar synchronization and Google Meet generation enabled for your advisory sessions.
                        </p>
                      </div>

                      <button
                        onClick={handleSignOut}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-error hover:bg-error-container/20 flex items-center justify-center gap-1.5 font-label-md text-[12px] transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-md text-on-surface text-[12px]">
                            Workspace Sync
                          </span>
                          <span className="font-body-sm text-[10px] text-on-surface-variant">
                            Google Calendar & Meet
                          </span>
                        </div>
                      </div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant leading-tight">
                        Sign in to sync your 1-on-1 advisory session directly to your Google Calendar and generate private Meet video credentials.
                      </p>

                      {/* Official Sign in with Google Button as mandated by skill */}
                      <button
                        onClick={handleSignIn}
                        disabled={isLoadingAuth}
                        className="w-full min-h-[42px] px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl hover:bg-surface-container-low flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 48 48">
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                          />
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                          />
                        </svg>
                        <span className="font-label-md text-on-surface text-[13px]">
                          {isLoadingAuth ? 'Connecting...' : 'Sign in with Google'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                        <Calendar className="w-3 h-3 text-secondary" />
                        <span>Calendar</span>
                        <span>•</span>
                        <Video className="w-3 h-3 text-secondary" />
                        <span>Meet</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
