export interface SlotAvailability {
  slot: string;
  time24: string;
  startIso: string;
  endIso: string;
  available: boolean;
  status: 'available' | 'booked_client' | 'advisor_busy_calendar' | 'advisor_blocked_manual';
  reason?: string;
}

export interface DayAvailabilityResponse {
  dateIso: string;
  slots: SlotAvailability[];
  calendarSynced: boolean;
  totalAvailable: number;
  totalSlots: number;
  syncInfo: {
    status: string;
    message?: string;
    lastSyncedAt?: string | null;
  };
}

export interface MonthOverviewResponse {
  year: number;
  month: number;
  overview: {
    [dateIso: string]: {
      availableSlots: number;
      totalSlots: number;
      isFullyBooked: boolean;
    };
  };
}

export interface AdvisorSettingsResponse {
  advisorEmail: string;
  googleCalendarIcalUrl?: string;
  googleCalendarId?: string;
  lastSyncedAt?: string | null;
  syncStatus: 'connected' | 'error' | 'unconfigured';
  syncMessage?: string;
  eventsCount?: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  manualBlockedSlots: { dateIso: string; timeSlot: string; reason?: string }[];
  manualBlockedDates: string[];
  recentBookings?: {
    id: string;
    auditReference: string;
    fullName: string;
    email: string;
    dateIso: string;
    timeSlot: string;
    status: string;
    createdAt: string;
  }[];
}

export async function fetchDayAvailability(
  dateIso: string,
  refresh = false
): Promise<DayAvailabilityResponse> {
  try {
    const res = await fetch(`/api/calendar/availability?date=${encodeURIComponent(dateIso)}&refresh=${refresh}`);
    if (!res.ok) {
      throw new Error(`Availability status HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn('Could not fetch server availability, falling back to local defaults:', err);
    // Fallback if offline
    return {
      dateIso,
      slots: [
        { slot: '10:00 AM', time24: '10:00', startIso: '', endIso: '', available: true, status: 'available' },
        { slot: '11:30 AM', time24: '11:30', startIso: '', endIso: '', available: true, status: 'available' },
        { slot: '02:00 PM', time24: '14:00', startIso: '', endIso: '', available: true, status: 'available' },
        { slot: '04:00 PM', time24: '16:00', startIso: '', endIso: '', available: true, status: 'available' },
        { slot: '06:00 PM', time24: '18:00', startIso: '', endIso: '', available: true, status: 'available' },
        { slot: '08:00 PM', time24: '20:00', startIso: '', endIso: '', available: true, status: 'available' },
      ],
      calendarSynced: false,
      totalAvailable: 6,
      totalSlots: 6,
      syncInfo: {
        status: 'unconfigured',
        message: 'Running offline fallback',
      },
    };
  }
}

export async function fetchMonthOverview(year = 2026, month = 10): Promise<MonthOverviewResponse> {
  try {
    const res = await fetch(`/api/calendar/month-overview?year=${year}&month=${month}`);
    if (!res.ok) throw new Error(`Month overview HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch month overview:', err);
    return { year, month, overview: {} };
  }
}

export async function reserveSlotApi(data: {
  dateIso: string;
  timeSlot: string;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
}): Promise<{ success: boolean; holdId?: string; error?: string }> {
  try {
    const res = await fetch('/api/calendar/reserve-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'This slot is unavailable.' };
    }
    return json;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error checking slot availability' };
  }
}

export async function fetchAdvisorSettings(): Promise<AdvisorSettingsResponse> {
  const res = await fetch('/api/calendar/advisor-settings');
  if (!res.ok) throw new Error('Failed to load advisor settings');
  return await res.json();
}

export async function saveAdvisorSettings(
  settings: Partial<AdvisorSettingsResponse>
): Promise<{ success: boolean; settings: AdvisorSettingsResponse }> {
  const res = await fetch('/api/calendar/advisor-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save advisor settings');
  return await res.json();
}

export async function testGoogleCalendarSync(icalUrl: string): Promise<{
  success: boolean;
  eventsCount: number;
  message: string;
  sampleEvents: { summary: string; start: string; end: string }[];
}> {
  const res = await fetch('/api/calendar/test-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ icalUrl }),
  });
  return await res.json();
}
