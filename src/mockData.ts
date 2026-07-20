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
    avatarUrl: 'https://hoirqrkdgbmvpwutwuwj-all.supabase.co/storage/v1/object/public/assets/assets/ea777f21-df8c-431d-956a-57390ff9e591_320w.jpg'
  }
];

export const INITIAL_USER_PASSWORDS: Record<string, string> = {
  'user-khairumi': 'Dialog123',
};

export const INITIAL_OFFICES: OfficeSite[] = [];

export const INITIAL_PUNCH_LOGS: PunchLog[] = [];

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

export const INITIAL_EMAILS: EmailNotification[] = [];
