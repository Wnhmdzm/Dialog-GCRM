import { User, OfficeSite, PunchLog, ActivityLog, EmailNotification } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-khairumi',
    name: 'Khairumi Kasim (HSE Engineer)',
    email: 'khairumi.kasim@dialogasia.com',
    role: 'admin',
    joinedAt: '2026-07-20T08:00:00Z',
    firstTimePasswordChangeRequired: false,
    status: 'active',
    avatarUrl: 'https://hoirqrkdgbmvpwutwuwj-all.supabase.co/storage/v1/object/public/assets/assets/ea777f21-df8c-431d-956a-57390ff9e591_320w.jpg',
    phone: '+60 12-345 6789',
    offshoreGridNumber: 'GRID-PGR-01',
    epTravelStatus: 'Approved'
  },
  {
    id: 'user-ahmad',
    name: 'Ahmad Razak (Senior Tech)',
    email: 'ahmad.razak@dialogasia.com',
    role: 'employee',
    joinedAt: '2026-07-21T08:00:00Z',
    firstTimePasswordChangeRequired: true,
    status: 'active',
    phone: '+60 17-888 9900',
    offshoreGridNumber: 'GRID-KTB-04',
    epTravelStatus: 'Approved'
  }
];

export const INITIAL_USER_PASSWORDS: Record<string, string> = {
  'user-khairumi': 'Dialog123',
  'user-ahmad': 'Dialog123',
};

export const INITIAL_OFFICES: OfficeSite[] = [
  {
    id: 'site-pengerang',
    name: 'Dialog Pengerang Deepwater Terminal',
    latitude: 1.3650,
    longitude: 104.1350,
    radiusMeters: 500,
    address: 'Pengerang Deepwater Terminal, 81600 Pengerang, Johor, Malaysia'
  },
  {
    id: 'site-kerteh',
    name: 'Kerteh Supply Base (KSB)',
    latitude: 4.5833,
    longitude: 103.4500,
    radiusMeters: 500,
    address: 'Kerteh Supply Base, 24300 Kerteh, Terengganu, Malaysia'
  }
];

export const INITIAL_PUNCH_LOGS: PunchLog[] = [
  {
    id: 'punch-1',
    userId: 'user-khairumi',
    userName: 'Khairumi Kasim (HSE Engineer)',
    userEmail: 'khairumi.kasim@dialogasia.com',
    type: 'in',
    timestamp: new Date().toISOString(),
    latitude: 1.3650,
    longitude: 104.1350,
    officeSiteId: 'site-pengerang',
    officeSiteName: 'Dialog Pengerang Deepwater Terminal',
    tags: ['Shift Entry', 'Offshore On-Board'],
    note: 'Clocked in at Pengerang Terminal Jetty 2',
    verified: true
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'act-1',
    userId: 'user-khairumi',
    userName: 'Khairumi Kasim',
    userRole: 'admin',
    action: 'SYSTEM_BOOT',
    details: 'Personnel On Board System initial tables seeded successfully.',
    timestamp: new Date().toISOString()
  }
];

export const INITIAL_EMAILS: EmailNotification[] = [
  {
    id: 'email-1',
    recipientEmail: 'khairumi.kasim@dialogasia.com',
    subject: 'Welcome to Dialog Personnel On Board System',
    body: 'Your account has been configured with HSE Administrator permissions. System database synced with Firestore.',
    sentAt: new Date().toISOString(),
    type: 'system',
    read: false
  }
];

