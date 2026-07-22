export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  lastLoginAt?: string;
  firstTimePasswordChangeRequired: boolean;
  status: 'active' | 'suspended';
  avatarUrl?: string;
  // Offshore Malaysia Parameters
  phone?: string;
  kinName?: string;
  kinPhone?: string;
  passportOrNric?: string;
  offshoreGridNumber?: string;
  epTravelStatus?: 'Approved' | 'Pending' | 'Not Started';
}

export interface OfficeSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // radius within which staff can clock in
  address: string;
}

export interface PunchLog {
  id: string;
  userId: string;
  userName: string; // denormalized for easy table search
  userEmail: string;
  type: 'in' | 'out';
  timestamp: string; // ISO string
  latitude: number;
  longitude: number;
  manhours?: number; // populated on clock-out for the duration since corresponding clock-in
  officeSiteId: string | null; // which office site they clocked in at
  officeSiteName: string | null;
  tags: string[];
  note: string;
  verified: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string; // ISO string
}

export interface EmailNotification {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
  type: 'missing_shift' | 'overtime' | 'password_reset' | 'system';
  read: boolean;
}

export interface SimulatedLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export interface LeaveDay {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  type: 'Annual' | 'Emergency' | 'Sick' | 'Unpaid';
  status: 'Approved' | 'Pending' | 'Rejected';
  note: string;
}

export interface LeaveQuota {
  userId: string;
  userName: string;
  annual: number;
  emergency: number;
  sick: number;
}

export interface EvacuationEvent {
  id: string;
  officeSiteId: string;
  officeSiteName: string;
  active: boolean;
  triggeredAt: string; // ISO timestamp
  triggeredBy: string; // userId
}

export interface EvacuationMember {
  id: string; // e.g. eventId-userId
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'safe' | 'missing';
  clockedInAt: string; // ISO timestamp when they clocked in
  safeRegisteredAt?: string; // ISO timestamp when registered safe
  qrCode?: string; // unique code representation
}

export interface Certificate {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  certType: string;      // e.g. "BOSIET", "PETRONAS Medical", "OGSP", "CIDB Green Card", "HUET", "Other"
  fileName: string;
  fileData?: string;     // Base64 file contents for mock display/viewing
  issueDate: string;     // YYYY-MM-DD
  expiryDate: string;    // YYYY-MM-DD
  uploadedAt: string;    // ISO string
  status: 'valid' | 'expiring' | 'expired';
}

export interface CertificateRequest {
  id: string;
  title: string;
  certType: string;
  description: string;
  issuedAt: string;      // ISO string
  issuedBy: string;      // Admin name
  requiredByDate: string; // YYYY-MM-DD
}


