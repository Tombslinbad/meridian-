import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  Clock,
  Lock,
  Plus,
  Trash2,
  CalendarCheck,
  CalendarX,
} from 'lucide-react';
import {
  fetchAdvisorSettings,
  saveAdvisorSettings,
  testGoogleCalendarSync,
  AdvisorSettingsResponse,
} from '../services/calendarAvailability';

interface AdvisorCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvailabilityUpdated?: () => void;
}

export const AdvisorCalendarModal: React.FC<AdvisorCalendarModalProps> = ({
  isOpen,
  onClose,
  onAvailabilityUpdated,
}) => {
  const [settings, setSettings] = useState<AdvisorSettingsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    eventsCount?: number;
  } | null>(null);

  const [icalInput, setIcalInput] = useState<string>('');
  const [newBlockDate, setNewBlockDate] = useState<string>('2026-10-16');
  const [newBlockSlot, setNewBlockSlot] = useState<string>('02:00 PM');
  const [activeTab, setActiveTab] = useState<'sync' | 'bookings' | 'blocks'>('sync');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchAdvisorSettings();
      setSettings(data);
      setIcalInput(data.googleCalendarIcalUrl || '');
    } catch (err) {
      console.error('Error loading advisor settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestLink = async () => {
    if (!icalInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGoogleCalendarSync(icalInput.trim());
      setTestResult({
        success: res.success,
        message: res.message,
        eventsCount: res.eventsCount,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to connect to Google Calendar URL',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveIcal = async () => {
    if (!settings) return;
    setSaving(true);
    setSuccessMessage(null);
    try {
      const res = await saveAdvisorSettings({
        googleCalendarIcalUrl: icalInput.trim(),
      });
      setSettings(res.settings);
      setSuccessMessage('Google Calendar settings successfully updated and synchronized!');
      if (onAvailabilityUpdated) onAvailabilityUpdated();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlockedDate = async (dateIso: string) => {
    if (!settings || !dateIso) return;
    if (settings.manualBlockedDates.includes(dateIso)) return;

    const updated = [...settings.manualBlockedDates, dateIso];
    setSaving(true);
    try {
      const res = await saveAdvisorSettings({ manualBlockedDates: updated });
      setSettings(res.settings);
      if (onAvailabilityUpdated) onAvailabilityUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBlockedDate = async (dateIso: string) => {
    if (!settings) return;
    const updated = settings.manualBlockedDates.filter((d) => d !== dateIso);
    setSaving(true);
    try {
      const res = await saveAdvisorSettings({ manualBlockedDates: updated });
      setSettings(res.settings);
      if (onAvailabilityUpdated) onAvailabilityUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlockedSlot = async () => {
    if (!settings || !newBlockDate || !newBlockSlot) return;
    const exists = settings.manualBlockedSlots.some(
      (m) => m.dateIso === newBlockDate && m.timeSlot === newBlockSlot
    );
    if (exists) return;

    const updated = [
      ...settings.manualBlockedSlots,
      { dateIso: newBlockDate, timeSlot: newBlockSlot, reason: 'Advisor manual block' },
    ];
    setSaving(true);
    try {
      const res = await saveAdvisorSettings({ manualBlockedSlots: updated });
      setSettings(res.settings);
      if (onAvailabilityUpdated) onAvailabilityUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBlockedSlot = async (dateIso: string, timeSlot: string) => {
    if (!settings) return;
    const updated = settings.manualBlockedSlots.filter(
      (m) => !(m.dateIso === dateIso && m.timeSlot === timeSlot)
    );
    setSaving(true);
    try {
      const res = await saveAdvisorSettings({ manualBlockedSlots: updated });
      setSettings(res.settings);
      if (onAvailabilityUpdated) onAvailabilityUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-surface-container flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                Advisor Personal Calendar Sync
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary uppercase">
                  Double-Booking Prevention
                </span>
              </h2>
              <p className="text-xs text-on-surface-variant">
                Sync with <strong className="text-on-surface">igwev2956@gmail.com</strong> Google Calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-surface-container px-6 pt-2 bg-surface-container-low/30 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Google Calendar Sync
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'bookings'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Confirmed Client Bookings ({settings?.recentBookings?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'blocks'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <CalendarX className="w-3.5 h-3.5" />
            Manual Blackouts ({settings?.manualBlockedDates.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-sm">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <RefreshCw className="w-6 h-6 animate-spin text-secondary" />
              <span>Loading calendar settings...</span>
            </div>
          ) : activeTab === 'sync' ? (
            <>
              {/* How it works Banner */}
              <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div className="text-xs flex flex-col gap-1">
                  <span className="font-bold text-on-surface">Automatic Collision &amp; Double-Booking Protection</span>
                  <p className="text-on-surface-variant leading-relaxed">
                    When your Google Calendar is connected, the app reads your personal events in real time. Whenever you have a personal meeting, flight, or appointment on Google Calendar, that slot is <strong>automatically blocked</strong> from clients.
                  </p>
                </div>
              </div>

              {/* Success Notification */}
              {successMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Status indicator */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      settings?.syncStatus === 'connected'
                        ? 'bg-emerald-500 animate-pulse'
                        : settings?.syncStatus === 'error'
                        ? 'bg-amber-500'
                        : 'bg-outline/50'
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">
                      Status: {settings?.syncStatus === 'connected' ? 'Connected & Synchronized' : settings?.syncStatus === 'error' ? 'Connection Attention Needed' : 'Awaiting Google Calendar URL'}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {settings?.syncMessage || 'Paste your Google Calendar secret iCal URL below to activate live sync.'}
                    </span>
                  </div>
                </div>
                {settings?.lastSyncedAt && (
                  <span className="text-[10px] text-on-surface-variant flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(settings.lastSyncedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Input for Google Calendar iCal Address */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface flex items-center justify-between">
                  <span>Google Calendar iCal Address (Public or Secret)</span>
                  <a
                    href="https://calendar.google.com/calendar/r/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-secondary hover:underline flex items-center gap-1 font-normal"
                  >
                    <span>Open Google Calendar Settings</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={icalInput}
                    onChange={(e) => setIcalInput(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics or igwev2956@gmail.com"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-mono text-on-surface focus:outline-none focus:border-secondary"
                  />
                  <button
                    type="button"
                    onClick={handleTestLink}
                    disabled={testing || !icalInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Test Connection</span>
                  </button>
                </div>
                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Step Instruction Guide */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-3">
                <span className="text-xs font-bold text-on-surface">Choose Your Setup Method:</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Method A: Public Calendar */}
                  <div className="p-3 rounded-xl bg-surface-container/50 border border-surface-container flex flex-col gap-1.5">
                    <span className="font-bold text-secondary flex items-center gap-1">
                      <span>Method 1: Public Free/Busy Feed</span>
                    </span>
                    <p className="text-on-surface-variant text-[11px] leading-relaxed">
                      In Google Calendar settings under <strong>"Access permissions for events"</strong>, check <strong>"Make available to public"</strong> and select <strong>"See only free/busy (hide details)"</strong>.
                    </p>
                    <p className="text-on-surface-variant text-[11px]">
                      Then copy the <strong>"Public address in iCal format"</strong> (or simply enter <code>igwev2956@gmail.com</code> above).
                    </p>
                  </div>

                  {/* Method B: Secret Address */}
                  <div className="p-3 rounded-xl bg-surface-container/50 border border-surface-container flex flex-col gap-1.5">
                    <span className="font-bold text-secondary flex items-center gap-1">
                      <span>Method 2: Secret Address (Private)</span>
                    </span>
                    <p className="text-on-surface-variant text-[11px] leading-relaxed">
                      If you do not want to make your calendar public, scroll down to <strong>"Integrate calendar"</strong> and copy the <strong>"Secret address in iCal format"</strong>.
                    </p>
                    <p className="text-on-surface-variant text-[11px]">
                      The app will read your schedule securely while your personal events stay completely private.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-on-surface-variant bg-surface-container-lowest p-2.5 rounded-xl border border-surface-container">
                  <strong>Notice for clients:</strong> Regardless of which method you choose, clients visiting this website <strong>always see open consultation times publicly</strong> on the booking calendar. They will only see "Available" or "Unavailable" — never your personal notes or event names.
                </div>
              </div>

              {/* Working Hours Info */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-low/50 border border-surface-container text-xs">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Clock className="w-4 h-4 text-secondary" />
                  <span>Consultation Window: <strong>10:00 AM – 09:00 PM WAT</strong> (Lagos Time)</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-surface-container text-[10px] font-bold text-on-surface">
                  60-min slots
                </span>
              </div>
            </>
          ) : activeTab === 'bookings' ? (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">Confirmed Client Reservations</span>
                  <span className="text-[11px] text-on-surface-variant">These slots are permanently locked</span>
                </div>

                {settings?.recentBookings && settings.recentBookings.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {settings.recentBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-on-surface">{b.fullName}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              Confirmed
                            </span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant font-mono">{b.email} • Ref: {b.auditReference}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-1 rounded-xl bg-secondary/15 text-secondary text-xs font-bold">
                            {b.dateIso} @ {b.timeSlot}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-on-surface-variant">
                    No confirmed client bookings recorded yet.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Manual Blackouts */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Manual Blackout Dates</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Quickly block entire days when you are travelling or unavailable for consultations.
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {settings?.manualBlockedDates && settings.manualBlockedDates.length > 0 ? (
                    settings.manualBlockedDates.map((d) => (
                      <div
                        key={d}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2"
                      >
                        <span>{d}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlockedDate(d)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-on-surface-variant">No blackout dates added.</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="date"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddBlockedDate(newBlockDate)}
                    disabled={saving || !newBlockDate}
                    className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Block Entire Date</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-surface-container flex items-center justify-between bg-surface-container-low/30">
          <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-secondary" />
            <span>Encrypted local ledger &amp; live Google Calendar query</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors"
            >
              Close
            </button>
            {activeTab === 'sync' && (
              <button
                type="button"
                onClick={handleSaveIcal}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-white text-xs font-bold shadow-sm transition-all active:scale-98 disabled:opacity-50"
              >
                {saving ? 'Saving & Syncing...' : 'Save & Activate Sync'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
