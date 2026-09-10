import fs from 'fs';
import path from 'path';
import ical from 'node-ical';

export const ADVISOR_EMAIL = 'igwev2956@gmail.com';

export const STANDARD_SLOTS = [
  '10:00 AM',
  '11:30 AM',
  '02:00 PM',
  '04:00 PM',
  '06:00 PM',
  '08:00 PM',
];

export interface TimeSlotAvailability {
  slot: string;
  time24: string;
  startIso: string;
  endIso: string;
  available: boolean;
  status: 'available' | 'booked_client' | 'advisor_busy_calendar' | 'advisor_blocked_manual';
  reason?: string;
}

export interface AdvisorCalendarSettings {
  advisorEmail: string;
  googleCalendarIcalUrl?: string;
  googleCalendarId?: string;
  lastSyncedAt?: string | null;
  syncStatus: 'connected' | 'error' | 'unconfigured';
  syncMessage?: string;
  eventsCount?: number;
  workingHoursStart: string; // '09:00'
  workingHoursEnd: string; // '21:00'
  manualBlockedSlots: { dateIso: string; timeSlot: string; reason?: string }[];
  manualBlockedDates: string[]; // e.g. ['2026-10-15']
}

export interface ConfirmedBookingRecord {
  id: string;
  auditReference: string;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  dateIso: string; // 'YYYY-MM-DD'
  timeSlot: string; // '11:30 AM'
  meetUrl?: string;
  status: 'confirmed' | 'held';
  createdAt: string;
  holdExpiresAt?: number;
}

interface CalendarLedgerData {
  settings: AdvisorCalendarSettings;
  bookings: ConfirmedBookingRecord[];
}

const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION;
const LEDGER_FILE = isVercel
  ? path.join('/tmp', 'calendar_ledger.json')
  : path.join(process.cwd(), 'server', 'data', 'calendar_ledger.json');

// Memory cache for Google Calendar iCal events
interface CachedEvents {
  timestamp: number;
  events: { start: Date; end: Date; summary?: string }[];
}
let memoryEventsCache: CachedEvents | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

const defaultSettings: AdvisorCalendarSettings = {
  advisorEmail: ADVISOR_EMAIL,
  googleCalendarIcalUrl: process.env.ADVISOR_GOOGLE_CALENDAR_ICAL_URL || '',
  googleCalendarId: ADVISOR_EMAIL,
  lastSyncedAt: null,
  syncStatus: process.env.ADVISOR_GOOGLE_CALENDAR_ICAL_URL ? 'connected' : 'unconfigured',
  syncMessage: process.env.ADVISOR_GOOGLE_CALENDAR_ICAL_URL
    ? 'Configured via environment variable'
    : 'No Google Calendar iCal link configured yet',
  eventsCount: 0,
  workingHoursStart: '09:00',
  workingHoursEnd: '21:00',
  manualBlockedSlots: [],
  manualBlockedDates: [],
};

// Initial sample seed bookings to demonstrate conflict prevention on realistic dates
const initialSampleBookings: ConfirmedBookingRecord[] = [
  {
    id: 'SEED-001',
    auditReference: 'MCA-SAMPLE-001',
    fullName: 'Alhaji Bashir Dangote Logistics',
    email: 'b.dangote@sample-trade.ng',
    dateIso: '2026-10-13',
    timeSlot: '02:00 PM',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'SEED-002',
    auditReference: 'MCA-SAMPLE-002',
    fullName: 'Chukwudi Electronics Ltd',
    email: 'c.electronics@sample-trade.ng',
    dateIso: '2026-10-15',
    timeSlot: '11:30 AM',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
];

function loadLedger(): CalendarLedgerData {
  try {
    if (fs.existsSync(LEDGER_FILE)) {
      const raw = fs.readFileSync(LEDGER_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return {
        settings: { ...defaultSettings, ...(data.settings || {}) },
        bookings: Array.isArray(data.bookings) ? data.bookings : initialSampleBookings,
      };
    }
  } catch (err) {
    console.error('Error reading calendar ledger, initializing defaults:', err);
  }

  const initial: CalendarLedgerData = {
    settings: { ...defaultSettings },
    bookings: initialSampleBookings,
  };
  saveLedger(initial);
  return initial;
}

function saveLedger(data: CalendarLedgerData): void {
  try {
    const dir = path.dirname(LEDGER_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving calendar ledger:', err);
  }
}

/**
 * Converts a date string (YYYY-MM-DD) and 12h time slot (e.g. '11:30 AM')
 * into UTC Start and End Dates (assuming WAT is UTC+1).
 */
export function slotToUtcRange(dateIso: string, slotStr: string): { start: Date; end: Date } {
  const parts = dateIso.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const match = slotStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hours = 10;
  let minutes = 0;

  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    hours = h;
    minutes = m;
  }

  // WAT is UTC+1, so UTC hours = hours - 1
  const startUtc = new Date(Date.UTC(year, month, day, hours - 1, minutes, 0));
  const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000); // 60-minute duration

  return { start: startUtc, end: endUtc };
}

/**
 * Normalizes an iCal URL. Supports:
 * 1. Full https:// iCal URLs (Public or Secret)
 * 2. webcal:// protocols (auto-converted to https://)
 * 3. Raw email addresses (auto-formatted to public Google Calendar iCal feed)
 */
export function normalizeIcalUrl(rawInput?: string): string {
  if (!rawInput) return '';
  let trimmed = rawInput.trim();

  // If user passed webcal://, convert to https://
  if (trimmed.startsWith('webcal://')) {
    trimmed = 'https://' + trimmed.slice(9);
  }

  // If user entered a plain email address (e.g. igwev2956@gmail.com)
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `https://calendar.google.com/calendar/ical/${encodeURIComponent(trimmed)}/public/basic.ics`;
  }

  return trimmed;
}

/**
 * Fetches and parses the advisor's Google Calendar iCal feed
 */
export async function fetchGoogleCalendarEvents(
  icalUrl?: string,
  forceRefresh = false
): Promise<{ start: Date; end: Date; summary?: string }[]> {
  const rawUrl = icalUrl?.trim() || loadLedger().settings.googleCalendarIcalUrl?.trim();
  const url = normalizeIcalUrl(rawUrl);
  if (!url || !url.startsWith('http')) {
    return [];
  }

  const now = Date.now();
  if (!forceRefresh && memoryEventsCache && now - memoryEventsCache.timestamp < CACHE_TTL_MS) {
    return memoryEventsCache.events;
  }

  try {
    const rawEvents = await ical.async.fromURL(url);
    const parsed: { start: Date; end: Date; summary?: string }[] = [];

    for (const k in rawEvents) {
      const ev = rawEvents[k] as any;
      if (!ev || ev.type !== 'VEVENT') continue;

      let start: Date | null = ev.start ? new Date(ev.start) : null;
      let end: Date | null = ev.end ? new Date(ev.end) : null;

      if (start && isNaN(start.getTime())) start = null;
      if (end && isNaN(end.getTime())) end = null;

      if (start) {
        if (!end) {
          // If no end time, default to 1 hour after start
          end = new Date(start.getTime() + 60 * 60 * 1000);
        }
        parsed.push({
          start,
          end,
          summary: typeof ev.summary === 'string' ? ev.summary : 'Busy',
        });
      }
    }

    memoryEventsCache = {
      timestamp: now,
      events: parsed,
    };

    // Update settings in ledger
    const ledger = loadLedger();
    ledger.settings.lastSyncedAt = new Date().toISOString();
    ledger.settings.syncStatus = 'connected';
    ledger.settings.syncMessage = `Synchronized with Google Calendar (${parsed.length} calendar events loaded)`;
    ledger.settings.eventsCount = parsed.length;
    saveLedger(ledger);

    return parsed;
  } catch (err: any) {
    console.error('Failed to parse Google Calendar iCal feed:', err.message);
    const ledger = loadLedger();
    ledger.settings.syncStatus = 'error';
    ledger.settings.syncMessage = `Failed to sync: ${err.message}`;
    saveLedger(ledger);
    return memoryEventsCache ? memoryEventsCache.events : [];
  }
}

/**
 * Returns real-time slot availability for a specific date (YYYY-MM-DD)
 */
export async function getAvailabilityForDate(
  dateIso: string,
  forceRefresh = false
): Promise<{
  dateIso: string;
  slots: TimeSlotAvailability[];
  calendarSynced: boolean;
  totalAvailable: number;
  totalSlots: number;
  syncInfo: {
    status: string;
    message?: string;
    lastSyncedAt?: string | null;
  };
}> {
  const ledger = loadLedger();
  const settings = ledger.settings;
  const nowMs = Date.now();

  // Clean up expired temporary holds (> 15 minutes)
  ledger.bookings = ledger.bookings.filter((b) => {
    if (b.status === 'held' && b.holdExpiresAt && b.holdExpiresAt < nowMs) {
      return false;
    }
    return true;
  });
  saveLedger(ledger);

  // Fetch calendar events
  const googleEvents = await fetchGoogleCalendarEvents(settings.googleCalendarIcalUrl, forceRefresh);

  const isWholeDateBlocked = settings.manualBlockedDates.includes(dateIso);

  const slotsResult: TimeSlotAvailability[] = STANDARD_SLOTS.map((slot) => {
    const { start, end } = slotToUtcRange(dateIso, slot);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    // 1. Check if the whole date was manually blocked by the advisor
    if (isWholeDateBlocked) {
      return {
        slot,
        time24: slot,
        startIso,
        endIso,
        available: false,
        status: 'advisor_blocked_manual',
        reason: 'Advisor marked this entire date as unavailable',
      };
    }

    // 2. Check manual slot block
    const isSlotBlocked = settings.manualBlockedSlots.some(
      (m) => m.dateIso === dateIso && m.timeSlot.toLowerCase() === slot.toLowerCase()
    );
    if (isSlotBlocked) {
      return {
        slot,
        time24: slot,
        startIso,
        endIso,
        available: false,
        status: 'advisor_blocked_manual',
        reason: 'Advisor marked this specific slot as reserved/unavailable',
      };
    }

    // 3. Check if already booked in ledger by another client
    const bookedRecord = ledger.bookings.find(
      (b) =>
        b.dateIso === dateIso &&
        b.timeSlot.toLowerCase() === slot.toLowerCase() &&
        (b.status === 'confirmed' || (b.status === 'held' && b.holdExpiresAt && b.holdExpiresAt > nowMs))
    );
    if (bookedRecord) {
      return {
        slot,
        time24: slot,
        startIso,
        endIso,
        available: false,
        status: 'booked_client',
        reason:
          bookedRecord.status === 'confirmed'
            ? 'Already secured by another trade client'
            : 'Payment currently in progress by another client',
      };
    }

    // 4. Check if overlapping with advisor's personal Google Calendar events
    const hasGoogleConflict = googleEvents.some((ev) => {
      // Overlap: event starts before slot ends AND event ends after slot starts
      return ev.start.getTime() < end.getTime() && ev.end.getTime() > start.getTime();
    });

    if (hasGoogleConflict) {
      return {
        slot,
        time24: slot,
        startIso,
        endIso,
        available: false,
        status: 'advisor_busy_calendar',
        reason: "Advisor busy on personal Google Calendar at this hour",
      };
    }

    // Otherwise available!
    return {
      slot,
      time24: slot,
      startIso,
      endIso,
      available: true,
      status: 'available',
    };
  });

  const totalAvailable = slotsResult.filter((s) => s.available).length;

  return {
    dateIso,
    slots: slotsResult,
    calendarSynced: settings.syncStatus === 'connected',
    totalAvailable,
    totalSlots: slotsResult.length,
    syncInfo: {
      status: settings.syncStatus,
      message: settings.syncMessage,
      lastSyncedAt: settings.lastSyncedAt,
    },
  };
}

/**
 * Checks month availability overview (e.g. October 2026)
 */
export async function getMonthAvailability(
  year: number,
  month: number
): Promise<{
  [dateIso: string]: {
    availableSlots: number;
    totalSlots: number;
    isFullyBooked: boolean;
  };
}> {
  const ledger = loadLedger();
  const settings = ledger.settings;
  const daysInMonth = new Date(year, month, 0).getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const result: Record<string, { availableSlots: number; totalSlots: number; isFullyBooked: boolean }> = {};

  const googleEvents = await fetchGoogleCalendarEvents(settings.googleCalendarIcalUrl, false);
  const nowMs = Date.now();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateIso = `${year}-${pad(month)}-${pad(day)}`;

    if (settings.manualBlockedDates.includes(dateIso)) {
      result[dateIso] = { availableSlots: 0, totalSlots: STANDARD_SLOTS.length, isFullyBooked: true };
      continue;
    }

    let availableCount = 0;
    for (const slot of STANDARD_SLOTS) {
      // Check ledger
      const isBooked = ledger.bookings.some(
        (b) =>
          b.dateIso === dateIso &&
          b.timeSlot.toLowerCase() === slot.toLowerCase() &&
          (b.status === 'confirmed' || (b.status === 'held' && b.holdExpiresAt && b.holdExpiresAt > nowMs))
      );
      if (isBooked) continue;

      // Check manual slot
      const isManual = settings.manualBlockedSlots.some(
        (m) => m.dateIso === dateIso && m.timeSlot.toLowerCase() === slot.toLowerCase()
      );
      if (isManual) continue;

      // Check Google Calendar
      const { start, end } = slotToUtcRange(dateIso, slot);
      const conflict = googleEvents.some(
        (ev) => ev.start.getTime() < end.getTime() && ev.end.getTime() > start.getTime()
      );
      if (conflict) continue;

      availableCount++;
    }

    result[dateIso] = {
      availableSlots: availableCount,
      totalSlots: STANDARD_SLOTS.length,
      isFullyBooked: availableCount === 0,
    };
  }

  return result;
}

/**
 * Atomically reserves a slot or places a temporary hold to prevent double-booking
 */
export async function reserveSlot(
  dateIso: string,
  timeSlot: string,
  clientInfo: {
    fullName: string;
    email: string;
    phone?: string;
    companyName?: string;
  }
): Promise<{
  success: boolean;
  error?: string;
  holdId?: string;
}> {
  const ledger = loadLedger();
  const nowMs = Date.now();
  const emailLower = clientInfo.email.trim().toLowerCase();

  // If this same client email already has a hold on this slot, remove it first so they can resume checkout
  ledger.bookings = ledger.bookings.filter((b) => {
    if (
      b.dateIso === dateIso &&
      b.timeSlot.toLowerCase() === timeSlot.toLowerCase() &&
      b.status === 'held' &&
      b.email.trim().toLowerCase() === emailLower
    ) {
      return false;
    }
    return true;
  });
  saveLedger(ledger);

  const availability = await getAvailabilityForDate(dateIso, true);
  const targetSlot = availability.slots.find(
    (s) => s.slot.toLowerCase() === timeSlot.toLowerCase()
  );

  if (!targetSlot) {
    return { success: false, error: 'Invalid consultation slot requested.' };
  }

  if (!targetSlot.available) {
    return {
      success: false,
      error: targetSlot.reason || 'This time slot is no longer available. Please choose another open slot.',
    };
  }

  const holdId = `HOLD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  ledger.bookings.push({
    id: holdId,
    auditReference: holdId,
    fullName: clientInfo.fullName,
    email: clientInfo.email,
    phone: clientInfo.phone,
    companyName: clientInfo.companyName,
    dateIso,
    timeSlot,
    status: 'held',
    createdAt: new Date().toISOString(),
    holdExpiresAt: nowMs + 15 * 60 * 1000, // 15-minute hold
  });

  saveLedger(ledger);
  return { success: true, holdId };
}

/**
 * Confirms a booking permanently into the ledger upon completed payment
 */
export function confirmBookingInLedger(booking: {
  auditReference: string;
  dateIso: string;
  timeSlot: string;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  meetUrl?: string;
}): { success: boolean; record: ConfirmedBookingRecord } {
  const ledger = loadLedger();

  // Remove any holds for this same date & slot or reference
  ledger.bookings = ledger.bookings.filter(
    (b) =>
      !(
        b.auditReference === booking.auditReference ||
        (b.dateIso === booking.dateIso && b.timeSlot.toLowerCase() === booking.timeSlot.toLowerCase() && b.status === 'held')
      )
  );

  const record: ConfirmedBookingRecord = {
    id: `CONF-${Date.now()}`,
    auditReference: booking.auditReference,
    fullName: booking.fullName,
    email: booking.email,
    phone: booking.phone,
    companyName: booking.companyName,
    dateIso: booking.dateIso,
    timeSlot: booking.timeSlot,
    meetUrl: booking.meetUrl,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  ledger.bookings.push(record);
  saveLedger(ledger);

  return { success: true, record };
}

/**
 * Gets advisor calendar settings
 */
export function getAdvisorSettings(): AdvisorCalendarSettings & {
  recentBookings: ConfirmedBookingRecord[];
} {
  const ledger = loadLedger();
  return {
    ...ledger.settings,
    recentBookings: ledger.bookings.filter((b) => b.status === 'confirmed').slice(-10),
  };
}

/**
 * Updates advisor calendar settings
 */
export async function updateAdvisorSettings(
  updates: Partial<AdvisorCalendarSettings>
): Promise<{ success: boolean; settings: AdvisorCalendarSettings }> {
  const ledger = loadLedger();

  ledger.settings = {
    ...ledger.settings,
    ...updates,
  };

  // If a new ical URL was provided, attempt to verify it immediately
  if (updates.googleCalendarIcalUrl) {
    const normalized = normalizeIcalUrl(updates.googleCalendarIcalUrl);
    ledger.settings.googleCalendarIcalUrl = normalized;
    if (normalized.startsWith('http')) {
      try {
        const events = await fetchGoogleCalendarEvents(normalized, true);
        ledger.settings.syncStatus = 'connected';
        ledger.settings.lastSyncedAt = new Date().toISOString();
        ledger.settings.syncMessage = `Connection verified (${events.length} calendar events synchronized)`;
        ledger.settings.eventsCount = events.length;
      } catch (err: any) {
        ledger.settings.syncStatus = 'error';
        ledger.settings.syncMessage = `Connection error: ${err.message}`;
      }
    }
  }

  saveLedger(ledger);
  return { success: true, settings: ledger.settings };
}

/**
 * Verifies a Google Calendar iCal link directly
 */
export async function testIcalUrl(rawUrl: string): Promise<{
  success: boolean;
  eventsCount: number;
  message: string;
  sampleEvents: { summary: string; start: string; end: string }[];
}> {
  try {
    const url = normalizeIcalUrl(rawUrl);
    if (!url || !url.startsWith('http')) {
      return {
        success: false,
        eventsCount: 0,
        message: 'Invalid link. Please enter a valid Google Calendar URL or email.',
        sampleEvents: [],
      };
    }
    const rawEvents = await ical.async.fromURL(url);
    const parsed: { summary: string; start: string; end: string }[] = [];

    for (const k in rawEvents) {
      const ev = rawEvents[k] as any;
      if (!ev || ev.type !== 'VEVENT') continue;
      parsed.push({
        summary: typeof ev.summary === 'string' ? ev.summary : 'Busy',
        start: ev.start ? new Date(ev.start).toISOString() : '',
        end: ev.end ? new Date(ev.end).toISOString() : '',
      });
      if (parsed.length >= 5) break;
    }

    return {
      success: true,
      eventsCount: Object.keys(rawEvents).length,
      message: `Successfully connected to Google Calendar! Found ${Object.keys(rawEvents).length} calendar items.`,
      sampleEvents: parsed,
    };
  } catch (err: any) {
    return {
      success: false,
      eventsCount: 0,
      message: `Could not parse Google Calendar iCal URL: ${err.message}. Please verify the URL starts with https://calendar.google.com/calendar/ical/...`,
      sampleEvents: [],
    };
  }
}
