import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

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

export async function fetchDayAvailability(
  dateIso: string,
  refresh = false
): Promise<DayAvailabilityResponse> {
  try {
    const q = query(collection(db, 'bookings'), where('dateIso', '==', dateIso));
    const snap = await getDocs(q);
    const bookedSlots = new Set<string>();
    
    snap.forEach(d => {
      const data = d.data();
      // If confirmed, or held within the last 15 minutes
      if (data.status === 'confirmed' || (data.status === 'held' && Date.now() - data.createdAt < 15 * 60 * 1000)) {
         bookedSlots.add(data.timeSlot);
      }
    });

    const defaultSlots = [
      { slot: '10:00 AM', time24: '10:00', startIso: '', endIso: '' },
      { slot: '11:30 AM', time24: '11:30', startIso: '', endIso: '' },
      { slot: '02:00 PM', time24: '14:00', startIso: '', endIso: '' },
      { slot: '04:00 PM', time24: '16:00', startIso: '', endIso: '' },
      { slot: '06:00 PM', time24: '18:00', startIso: '', endIso: '' },
      { slot: '08:00 PM', time24: '20:00', startIso: '', endIso: '' },
    ];

    const slots: SlotAvailability[] = defaultSlots.map(s => ({
      ...s,
      available: !bookedSlots.has(s.slot),
      status: bookedSlots.has(s.slot) ? 'booked_client' : 'available'
    }));

    return {
      dateIso,
      slots,
      calendarSynced: false,
      totalAvailable: slots.filter(s => s.available).length,
      totalSlots: slots.length,
      syncInfo: {
        status: 'unconfigured',
        message: 'Using direct Firestore booking ledger',
      },
    };
  } catch (err: any) {
    console.warn('Could not fetch server availability:', err);
    return {
      dateIso,
      slots: [],
      calendarSynced: false,
      totalAvailable: 0,
      totalSlots: 0,
      syncInfo: { status: 'error', message: err.message },
    };
  }
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

export async function fetchMonthOverview(year = 2026, month = 10): Promise<MonthOverviewResponse> {
  return { year, month, overview: {} };
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
    const slotId = `${data.dateIso}_${data.timeSlot.replace(/[\s:]/g, '')}`;
    const slotRef = doc(db, 'bookings', slotId);
    
    const snap = await getDoc(slotRef);
    if (snap.exists()) {
      const slotData = snap.data();
      if (slotData.status === 'confirmed' || (slotData.status === 'held' && Date.now() - slotData.createdAt < 15 * 60 * 1000)) {
        return { success: false, error: 'This slot is already booked or held by another client.' };
      }
    }

    await setDoc(slotRef, {
      ...data,
      status: 'held',
      createdAt: Date.now()
    });

    return { success: true, holdId: slotId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error checking slot availability' };
  }
}
