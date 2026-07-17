import { User, OfficeSite, PunchLog, ActivityLog, EmailNotification } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Ahmad Zaim (Manager)',
    email: 'admin@geoclock.com',
    role: 'admin',
    joinedAt: '2025-01-10T08:00:00Z',
    firstTimePasswordChangeRequired: false,
    status: 'active',
    avatarUrl: 'https://hoirqrkdgbmvpwutwuwj-all.supabase.co/storage/v1/object/public/assets/assets/ea777f21-df8c-431d-956a-57390ff9e591_320w.jpg'
  },
  {
    id: 'user-emp1',
    name: 'John Doe',
    email: 'john@geoclock.com',
    role: 'employee',
    joinedAt: '2026-07-10T09:00:00Z',
    firstTimePasswordChangeRequired: true, // Requires changing password from "Dialog123"
    status: 'active',
  },
  {
    id: 'user-emp2',
    name: 'Sarah Jenkins',
    email: 'sarah@geoclock.com',
    role: 'employee',
    joinedAt: '2026-03-15T09:00:00Z',
    firstTimePasswordChangeRequired: false, // Has already changed password
    status: 'active',
  },
  {
    id: 'user-emp3',
    name: 'Bob Smith',
    email: 'bob@geoclock.com',
    role: 'employee',
    joinedAt: '2026-06-01T09:00:00Z',
    firstTimePasswordChangeRequired: true, // Needs first-time reset
    status: 'active',
  }
];

export const INITIAL_USER_PASSWORDS: Record<string, string> = {
  'user-admin': 'Admin123',
  'user-emp1': 'Dialog123',
  'user-emp2': 'Sarah123',
  'user-emp3': 'Dialog123',
};

export const INITIAL_OFFICES: OfficeSite[] = [
  {
    id: 'site-sf',
    name: 'Silicon Valley HQ (SF)',
    latitude: 37.7749,
    longitude: -122.4194,
    radiusMeters: 100,
    address: 'Market St, San Francisco, CA'
  },
  {
    id: 'site-london',
    name: 'London Finance Core',
    latitude: 51.5074,
    longitude: -0.1278,
    radiusMeters: 150,
    address: 'Bishopgate, London, UK'
  },
  {
    id: 'site-sydney',
    name: 'Sydney Waterfront Pier',
    latitude: -33.8688,
    longitude: 151.2093,
    radiusMeters: 200,
    address: 'Circular Quay, Sydney, NSW'
  }
];

// Helper to construct historical times
const getPastDateString = (daysAgo: number, timeStr: string) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const datePart = d.toISOString().split('T')[0];
  return `${datePart}T${timeStr}`;
};

export const INITIAL_PUNCH_LOGS: PunchLog[] = [
  // Sarah Jenkins - Monday
  {
    id: 'punch-1',
    userId: 'user-emp2',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah@geoclock.com',
    type: 'in',
    timestamp: getPastDateString(4, '08:55:00Z'),
    latitude: 37.77492,
    longitude: -122.41941,
    officeSiteId: 'site-sf',
    officeSiteName: 'Silicon Valley HQ (SF)',
    tags: ['HQ-Onsite', 'Shift-A'],
    note: 'Starting early for client call.',
    verified: true
  },
  {
    id: 'punch-2',
    userId: 'user-emp2',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah@geoclock.com',
    type: 'out',
    timestamp: getPastDateString(4, '17:35:00Z'),
    latitude: 37.77488,
    longitude: -122.41939,
    manhours: 8.67,
    officeSiteId: 'site-sf',
    officeSiteName: 'Silicon Valley HQ (SF)',
    tags: ['HQ-Onsite', 'Shift-A'],
    note: 'Wrapped up code review.',
    verified: true
  },

  // Sarah Jenkins - Tuesday (Generates Overtime Alert > 8 hours, let's say 10 hours)
  {
    id: 'punch-3',
    userId: 'user-emp2',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah@geoclock.com',
    type: 'in',
    timestamp: getPastDateString(3, '08:30:00Z'),
    latitude: 37.77491,
    longitude: -122.41945,
    officeSiteId: 'site-sf',
    officeSiteName: 'Silicon Valley HQ (SF)',
    tags: ['HQ-Onsite', 'Shift-A'],
    note: 'Sprint planning day.',
    verified: true
  },
  {
    id: 'punch-4',
    userId: 'user-emp2',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah@geoclock.com',
    type: 'out',
    timestamp: getPastDateString(3, '19:00:00Z'),
    latitude: 37.77494,
    longitude: -122.41942,
    manhours: 10.5, // 10.5 hours!
    officeSiteId: 'site-sf',
    officeSiteName: 'Silicon Valley HQ (SF)',
    tags: ['HQ-Onsite', 'Critical-Release'],
    note: 'Deployed hotfix to production. Approved by Ahmad.',
    verified: true
  },

  // Sarah Jenkins - Wednesday
  {
    id: 'punch-5',
    userId: 'user-emp2',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah@geoclock.com',
    type: 'in',
    timestamp: getPastDateString(2, '09:00:00Z'),
    latitude: 37.7749,
    longitude: -122.4194,
    officeSiteId: 'site-sf',
    officeSiteName: 'Silicon Valley HQ (SF)',
    tags: ['HQ-Onsite'],
    note: 'Regular work day.',
    verified: true
  },
  {
    id: 'punch-6',
    userId: 'user-emp2',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah@geoclock.com',
    type: 'out',
    timestamp: getPastDateString(2, '17:00:00Z'),
    latitude: 37.7749,
    longitude: -122.4194,
    manhours: 8.0,
    officeSiteId: 'site-sf',
    officeSiteName: 'Silicon Valley HQ (SF)',
    tags: ['HQ-Onsite'],
    note: 'Leaving on time.',
    verified: true
  },

  // Bob Smith - Wednesday (Missing Clock Out Alert! He clocked in but never out!)
  {
    id: 'punch-7',
    userId: 'user-emp3',
    userName: 'Bob Smith',
    userEmail: 'bob@geoclock.com',
    type: 'in',
    timestamp: getPastDateString(2, '08:50:00Z'),
    latitude: 51.5074,
    longitude: -0.1278,
    officeSiteId: 'site-london',
    officeSiteName: 'London Finance Core',
    tags: ['London-Finance'],
    note: 'Onboarding new contractor.',
    verified: true
  },

  // Sarah Jenkins - Thursday (Yesterday)
  {
    id: 'punch-8',
    userId: 'user-emp2',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah@geoclock.com',
    type: 'in',
    timestamp: getPastDateString(1, '09:02:00Z'),
    latitude: 37.7749,
    longitude: -122.4194,
    officeSiteId: 'site-sf',
    officeSiteName: 'Silicon Valley HQ (SF)',
    tags: ['HQ-Onsite'],
    note: 'Team sync.',
    verified: true
  },
  {
    id: 'punch-9',
    userId: 'user-emp2',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah@geoclock.com',
    type: 'out',
    timestamp: getPastDateString(1, '17:05:00Z'),
    latitude: 37.7749,
    longitude: -122.4194,
    manhours: 8.05,
    officeSiteId: 'site-sf',
    officeSiteName: 'Silicon Valley HQ (SF)',
    tags: ['HQ-Onsite'],
    note: 'All good.',
    verified: true
  },

  // John Doe - Thursday (First punch, onsite in London Hub)
  {
    id: 'punch-10',
    userId: 'user-emp1',
    userName: 'John Doe',
    userEmail: 'john@geoclock.com',
    type: 'in',
    timestamp: getPastDateString(1, '08:45:00Z'),
    latitude: 51.5074,
    longitude: -0.1278,
    officeSiteId: 'site-london',
    officeSiteName: 'London Finance Core',
    tags: ['London-Hub'],
    note: 'First day at the office!',
    verified: true
  },
  {
    id: 'punch-11',
    userId: 'user-emp1',
    userName: 'John Doe',
    userEmail: 'john@geoclock.com',
    type: 'out',
    timestamp: getPastDateString(1, '17:15:00Z'),
    latitude: 51.5074,
    longitude: -0.1278,
    manhours: 8.5,
    officeSiteId: 'site-london',
    officeSiteName: 'London Finance Core',
    tags: ['London-Hub'],
    note: 'Finished setup and first tutorial.',
    verified: true
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'act-1',
    userId: 'user-admin',
    userName: 'Ahmad Zaim',
    userRole: 'admin',
    action: 'SYSTEM_BOOT',
    details: 'GeoClock CRM initial tables seeded successfully.',
    timestamp: getPastDateString(5, '08:00:00Z')
  },
  {
    id: 'act-2',
    userId: 'user-admin',
    userName: 'Ahmad Zaim',
    userRole: 'admin',
    action: 'USER_CREATE',
    details: 'Created employee profile for John Doe (john@geoclock.com).',
    timestamp: getPastDateString(5, '09:15:00Z')
  },
  {
    id: 'act-3',
    userId: 'user-emp2',
    userName: 'Sarah Jenkins',
    userRole: 'employee',
    action: 'PASSWORD_RESET',
    details: 'Changed password from default Dialog123 to secure user password.',
    timestamp: getPastDateString(4, '08:50:00Z')
  },
  {
    id: 'act-4',
    userId: 'user-admin',
    userName: 'Ahmad Zaim',
    userRole: 'admin',
    action: 'SITE_UPDATE',
    details: 'Updated geofencing radius for Sydney Waterfront Pier to 200m.',
    timestamp: getPastDateString(3, '14:22:00Z')
  }
];

export const INITIAL_EMAILS: EmailNotification[] = [
  {
    id: 'mail-1',
    recipientEmail: 'sarah@geoclock.com',
    subject: '⚠️ Overtime Notification Alert',
    body: 'Hello Sarah Jenkins,\n\nYou logged 10.5 hours on Tuesday. This exceeds the standard daily shift threshold (8.0 hours). Your overtime of 2.5 hours has been recorded for manager review.\n\nRegards,\nGeoClock CRM Automation',
    sentAt: getPastDateString(3, '19:15:00Z'),
    type: 'overtime',
    read: false
  },
  {
    id: 'mail-2',
    recipientEmail: 'bob@geoclock.com',
    subject: '🚨 Action Required: Missing Clock-Out Alert',
    body: 'Hello Bob Smith,\n\nOur system detected that you clocked in at London Finance Core on Wednesday at 08:50, but did not register a clock-out. Please contact manager Ahmad Zaim to reconcile your man-hours.\n\nRegards,\nGeoClock CRM System',
    sentAt: getPastDateString(1, '20:00:00Z'),
    type: 'missing_shift',
    read: false
  }
];
