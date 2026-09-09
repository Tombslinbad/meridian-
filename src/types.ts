export type AppTab = 'advisory' | 'canton-fair' | 'verification' | 'booking' | 'confirmed';

export interface BookingDetails {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  industry: string;
  tripObjective: 'canton' | 'factory' | 'fx-logistics';
  travelWindow: string;
  selectedDate: string; // e.g. "Wednesday, Apr 9, 2025"
  selectedDateIso: string; // e.g. "2025-04-09"
  selectedTime: string; // e.g. "11:30 AM"
  paymentChannel: 'card' | 'transfer' | 'mobile_money' | 'crypto' | 'bachs' | 'intl';
  auditReference: string;
  meetUrl: string;
  amountNgn: number;
  bachsCheckoutId?: string;
  bachsCheckoutUrl?: string;
  paymentStatus?: 'pending' | 'completed' | 'succeeded';
}

export interface DiagnosticData {
  hsCodesOrUrls: string;
  orderSizing: 'fcl' | 'lcl' | 'sample';
  currentRoadblocks: string;
  submitted: boolean;
}

export interface UserAuth {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  accessToken: string | null;
}
