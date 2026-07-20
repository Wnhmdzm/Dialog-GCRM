import { User, OfficeSite, PunchLog, ActivityLog, EmailNotification, SimulatedLocation, LeaveDay, LeaveQuota, EvacuationEvent, EvacuationMember, Certificate, CertificateRequest } from '../types';
import { INITIAL_USERS, INITIAL_USER_PASSWORDS, INITIAL_OFFICES, INITIAL_PUNCH_LOGS, INITIAL_ACTIVITY_LOGS, INITIAL_EMAILS } from '../mockData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';

// Local storage key constants
const KEY_CURRENT_USER = 'geoclock_current_user';
const KEY_USERS = 'geoclock_users';
const KEY_PASSWORDS = 'geoclock_passwords';
const KEY_OFFICES = 'geoclock_offices';
const KEY_PUNCH_LOGS = 'geoclock_punchlogs';
const KEY_ACTIVITY_LOGS = 'geoclock_activitylogs';
const KEY_EMAILS = 'geoclock_emails';
const KEY_LOCATION = 'geoclock_simulated_location';
const KEY_LEAVE_DAYS = 'geoclock_leave_days';
const KEY_LEAVE_QUOTAS = 'geoclock_leave_quotas';
const KEY_EVACUATION_EVENTS = 'geoclock_evacuation_events';
const KEY_EVACUATION_MEMBERS = 'geoclock_evacuation_members';
const KEY_CERTIFICATES = 'geoclock_certificates';
const KEY_CERTIFICATE_REQUESTS = 'geoclock_certificate_requests';

export class Store {
  private static unsubscribes: (() => void)[] = [];

  // Firestore synchronization helper that syncs adds, updates, and deletes
  private static async syncCollectionWrite<T>(collectionName: string, items: T[], idField: string = 'id') {
    try {
      // 1. Write or update all items in the new list to Firestore
      for (const item of items) {
        const id = String((item as any)[idField]);
        if (id) {
          await setDoc(doc(db, collectionName, id), item);
        }
      }
      
      // 2. Query and delete items from Firestore that are no longer present in local state
      const snapshot = await getDocs(collection(db, collectionName));
      const activeIds = new Set(items.map(item => String((item as any)[idField])));
      for (const docSnap of snapshot.docs) {
        if (!activeIds.has(docSnap.id)) {
          await deleteDoc(doc(db, collectionName, docSnap.id));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  }

  // Seeding mechanism to populate connected Firebase databases initially with mock workspace data
  static async seedFirestoreIfNeeded() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      if (usersSnapshot.empty) {
        console.log("Firestore database is empty. Bootstrapping initial mock data...");
        
        // Seed users
        for (const u of INITIAL_USERS) {
          await setDoc(doc(db, 'users', u.id), u);
        }
        
        // Seed passwords
        for (const [id, pass] of Object.entries(INITIAL_USER_PASSWORDS)) {
          await setDoc(doc(db, 'passwords', id), { password: pass });
        }
        
        // Seed offices
        for (const o of INITIAL_OFFICES) {
          await setDoc(doc(db, 'officeSites', o.id), o);
        }
        
        // Seed punch logs
        for (const p of INITIAL_PUNCH_LOGS) {
          await setDoc(doc(db, 'punchLogs', p.id), p);
        }
        
        // Seed activity logs
        for (const a of INITIAL_ACTIVITY_LOGS) {
          await setDoc(doc(db, 'activityLogs', a.id), a);
        }
        
        // Seed emails
        for (const e of INITIAL_EMAILS) {
          await setDoc(doc(db, 'emails', e.id), e);
        }
        
        // Seed leave quotas
        const initialQuotas: LeaveQuota[] = [
          { userId: 'user-khairumi', userName: 'Khairumi Kasim (HSE Engineer)', annual: 14, emergency: 5, sick: 10 },
        ];
        for (const q of initialQuotas) {
          await setDoc(doc(db, 'leaveQuotas', q.userId), q);
        }
        
        console.log("Firebase Firestore successfully bootstrapped with default CRM schema.");
      }

      // Ensure Khairumi Kasim exists as an admin in Firebase unconditionally (as requested by user)
      const khairumiUser: User = {
        id: 'user-khairumi',
        name: 'Khairumi Kasim (HSE Engineer)',
        email: 'khairumi.kasim@dialogasia.com',
        role: 'admin',
        joinedAt: '2026-07-20T08:00:00Z',
        firstTimePasswordChangeRequired: false,
        status: 'active',
        avatarUrl: 'https://hoirqrkdgbmvpwutwuwj-all.supabase.co/storage/v1/object/public/assets/assets/ea777f21-df8c-431d-956a-57390ff9e591_320w.jpg'
      };
      await setDoc(doc(db, 'users', khairumiUser.id), khairumiUser);
      await setDoc(doc(db, 'passwords', khairumiUser.id), { password: 'Dialog123' });
      await setDoc(doc(db, 'leaveQuotas', khairumiUser.id), {
        userId: khairumiUser.id,
        userName: khairumiUser.name,
        annual: 14,
        emergency: 5,
        sick: 10
      });

      // Clean up the legacy user-admin account from Firebase so it is fully deleted
      try {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'users', 'user-admin'));
        await deleteDoc(doc(db, 'passwords', 'user-admin'));
        await deleteDoc(doc(db, 'leaveQuotas', 'user-admin'));
      } catch (err) {
        console.warn("Could not delete old admin account documents:", err);
      }

      // Synchronize all preset user passwords in Firestore unconditionally to ensure they match "Dialog123"
      for (const [id, pass] of Object.entries(INITIAL_USER_PASSWORDS)) {
        await setDoc(doc(db, 'passwords', id), { password: pass });
      }
    } catch (error) {
      console.warn("Auto-seeding skipped (permission rules active or network pending).", error);
    }
  }

  // Real-time listener subscription to sync database collection events with local states
  static subscribeToAll(onSync: () => void) {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];

    const collections = [
      { name: 'users', key: KEY_USERS, defaultValue: INITIAL_USERS },
      { name: 'officeSites', key: KEY_OFFICES, defaultValue: INITIAL_OFFICES },
      { name: 'punchLogs', key: KEY_PUNCH_LOGS, defaultValue: INITIAL_PUNCH_LOGS },
      { name: 'activityLogs', key: KEY_ACTIVITY_LOGS, defaultValue: INITIAL_ACTIVITY_LOGS },
      { name: 'emails', key: KEY_EMAILS, defaultValue: INITIAL_EMAILS },
      { name: 'leaveDays', key: KEY_LEAVE_DAYS, defaultValue: [] },
      { name: 'leaveQuotas', key: KEY_LEAVE_QUOTAS, defaultValue: [] },
      { name: 'evacuationEvents', key: KEY_EVACUATION_EVENTS, defaultValue: [] },
      { name: 'evacuationMembers', key: KEY_EVACUATION_MEMBERS, defaultValue: [] },
      { name: 'certificates', key: KEY_CERTIFICATES, defaultValue: [] },
      { name: 'certificateRequests', key: KEY_CERTIFICATE_REQUESTS, defaultValue: [] },
    ];

    collections.forEach(col => {
      const unsub = onSnapshot(collection(db, col.name), (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map(docSnap => docSnap.data());
          localStorage.setItem(col.key, JSON.stringify(items));
        } else {
          localStorage.setItem(col.key, JSON.stringify(col.defaultValue));
        }
        onSync();
      }, (error) => {
        console.warn(`Firestore subscription error on collection [${col.name}]:`, error);
      });
      this.unsubscribes.push(unsub);
    });

    // Password map sync listener
    const unsubPass = onSnapshot(collection(db, 'passwords'), (snapshot) => {
      if (!snapshot.empty) {
        const passwords: Record<string, string> = {};
        snapshot.docs.forEach(docSnap => {
          passwords[docSnap.id] = docSnap.data().password || '';
        });
        localStorage.setItem(KEY_PASSWORDS, JSON.stringify(passwords));
      } else {
        localStorage.setItem(KEY_PASSWORDS, JSON.stringify(INITIAL_USER_PASSWORDS));
      }
      onSync();
    }, (error) => {
      console.warn("Firestore subscription error on passwords:", error);
    });
    this.unsubscribes.push(unsubPass);

    // Run connection seeds
    this.seedFirestoreIfNeeded();

    return () => {
      this.unsubscribes.forEach(unsub => unsub());
      this.unsubscribes = [];
    };
  }

  // Load initial data or localStorage
  static getUsers(): User[] {
    const data = localStorage.getItem(KEY_USERS);
    if (!data) {
      localStorage.setItem(KEY_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(data);
  }

  static saveUsers(users: User[]) {
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
    this.syncCollectionWrite('users', users);
  }

  static getPasswords(): Record<string, string> {
    const data = localStorage.getItem(KEY_PASSWORDS);
    if (!data) {
      localStorage.setItem(KEY_PASSWORDS, JSON.stringify(INITIAL_USER_PASSWORDS));
      return INITIAL_USER_PASSWORDS;
    }
    return JSON.parse(data);
  }

  static savePasswords(passwords: Record<string, string>) {
    localStorage.setItem(KEY_PASSWORDS, JSON.stringify(passwords));
    try {
      for (const [id, pass] of Object.entries(passwords)) {
        setDoc(doc(db, 'passwords', id), { password: pass });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'passwords');
    }
  }

  static getOffices(): OfficeSite[] {
    const data = localStorage.getItem(KEY_OFFICES);
    if (!data) {
      localStorage.setItem(KEY_OFFICES, JSON.stringify(INITIAL_OFFICES));
      return INITIAL_OFFICES;
    }
    return JSON.parse(data);
  }

  static saveOffices(offices: OfficeSite[]) {
    localStorage.setItem(KEY_OFFICES, JSON.stringify(offices));
    this.syncCollectionWrite('officeSites', offices);
  }

  static getPunchLogs(): PunchLog[] {
    const data = localStorage.getItem(KEY_PUNCH_LOGS);
    if (!data) {
      localStorage.setItem(KEY_PUNCH_LOGS, JSON.stringify(INITIAL_PUNCH_LOGS));
      return INITIAL_PUNCH_LOGS;
    }
    return JSON.parse(data);
  }

  static savePunchLogs(logs: PunchLog[]) {
    localStorage.setItem(KEY_PUNCH_LOGS, JSON.stringify(logs));
    this.syncCollectionWrite('punchLogs', logs);
  }

  static getActivityLogs(): ActivityLog[] {
    const data = localStorage.getItem(KEY_ACTIVITY_LOGS);
    if (!data) {
      localStorage.setItem(KEY_ACTIVITY_LOGS, JSON.stringify(INITIAL_ACTIVITY_LOGS));
      return INITIAL_ACTIVITY_LOGS;
    }
    return JSON.parse(data);
  }

  static saveActivityLogs(logs: ActivityLog[]) {
    localStorage.setItem(KEY_ACTIVITY_LOGS, JSON.stringify(logs));
    this.syncCollectionWrite('activityLogs', logs);
  }

  static getEmails(): EmailNotification[] {
    const data = localStorage.getItem(KEY_EMAILS);
    if (!data) {
      localStorage.setItem(KEY_EMAILS, JSON.stringify(INITIAL_EMAILS));
      return INITIAL_EMAILS;
    }
    return JSON.parse(data);
  }

  static saveEmails(emails: EmailNotification[]) {
    localStorage.setItem(KEY_EMAILS, JSON.stringify(emails));
    this.syncCollectionWrite('emails', emails);
  }

  static getCurrentUser(): User | null {
    const data = localStorage.getItem(KEY_CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }

  static saveCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEY_CURRENT_USER);
    }
  }

  static getSimulatedLocation(): SimulatedLocation {
    const data = localStorage.getItem(KEY_LOCATION);
    if (!data) {
      const defaultLoc = { latitude: 37.7749, longitude: -122.4194, name: 'Silicon Valley HQ (SF)' };
      localStorage.setItem(KEY_LOCATION, JSON.stringify(defaultLoc));
      return defaultLoc;
    }
    return JSON.parse(data);
  }

  static saveSimulatedLocation(loc: SimulatedLocation) {
    localStorage.setItem(KEY_LOCATION, JSON.stringify(loc));
  }

  static getLeaveDays(): LeaveDay[] {
    const data = localStorage.getItem(KEY_LEAVE_DAYS);
    if (!data) {
      localStorage.setItem(KEY_LEAVE_DAYS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  }

  static saveLeaveDays(days: LeaveDay[]) {
    localStorage.setItem(KEY_LEAVE_DAYS, JSON.stringify(days));
    this.syncCollectionWrite('leaveDays', days);
  }

  static getLeaveQuotas(): LeaveQuota[] {
    const data = localStorage.getItem(KEY_LEAVE_QUOTAS);
    if (!data) {
      const initialQuotas: LeaveQuota[] = [
        { userId: 'user-emp1', userName: 'John Doe', annual: 14, emergency: 5, sick: 10 },
        { userId: 'user-emp2', userName: 'Sarah Jenkins', annual: 14, emergency: 5, sick: 10 },
        { userId: 'user-emp3', userName: 'Bob Smith', annual: 14, emergency: 5, sick: 10 },
      ];
      localStorage.setItem(KEY_LEAVE_QUOTAS, JSON.stringify(initialQuotas));
      return initialQuotas;
    }
    return JSON.parse(data);
  }

  static saveLeaveQuotas(quotas: LeaveQuota[]) {
    localStorage.setItem(KEY_LEAVE_QUOTAS, JSON.stringify(quotas));
    this.syncCollectionWrite('leaveQuotas', quotas, 'userId');
  }

  // Logic helpers
  static logActivity(userId: string, userName: string, role: 'admin' | 'employee', action: string, details: string) {
    const logs = this.getActivityLogs();
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      userName,
      userRole: role,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    this.saveActivityLogs(logs);
  }

  static sendEmail(recipientEmail: string, subject: string, body: string, type: 'missing_shift' | 'overtime' | 'password_reset' | 'system') {
    const emails = this.getEmails();
    const newEmail: EmailNotification = {
      id: `mail-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      recipientEmail,
      subject,
      body,
      sentAt: new Date().toISOString(),
      type,
      read: false
    };
    emails.unshift(newEmail);
    this.saveEmails(emails);
  }

  static runShiftAudit(actorName: string, actorId: string): number {
    const logs = this.getPunchLogs();
    const users = this.getUsers();
    
    let alertCount = 0;
    
    users.forEach(user => {
      if (user.role === 'admin') return;
      
      const userPunches = logs
        .filter(l => l.userId === user.id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
      if (userPunches.length === 0) return;
      
      const lastPunch = userPunches[userPunches.length - 1];
      if (lastPunch.type === 'in') {
        const elapsedMs = Date.now() - new Date(lastPunch.timestamp).getTime();
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        
        if (elapsedHours > 14) {
          const emails = this.getEmails();
          const alreadySent = emails.some(e => 
            e.recipientEmail === user.email && 
            e.type === 'missing_shift' &&
            Date.now() - new Date(e.sentAt).getTime() < 12 * 60 * 60 * 1000
          );
          
          if (!alreadySent) {
            this.sendEmail(
              user.email,
              '🚨 Action Required: Missing Clock-Out Detected',
              `Hello ${user.name},\n\nOur POBS shift audit has flagged a missing clock-out. You clocked in on ${new Date(lastPunch.timestamp).toLocaleDateString()} at ${new Date(lastPunch.timestamp).toLocaleTimeString()} but never clocked out.\n\nPlease contact your administrator (${actorName}) or open the Personnel On Board System app to reconcile your hours.\n\nBest,\nPersonnel On Board Automated Audit System`,
              'missing_shift'
            );
            alertCount++;
          }
        }
      }
    });

    if (alertCount > 0) {
      this.logActivity(
        actorId,
        actorName,
        'admin',
        'SHIFT_AUDIT',
        `Run automated shift audit. Identified ${alertCount} missing clock-out(s) and dispatched warning email(s).`
      );
    } else {
      this.logActivity(
        actorId,
        actorName,
        'admin',
        'SHIFT_AUDIT',
        `Run automated shift audit. No new missing clock-outs detected.`
      );
    }
    
    return alertCount;
  }

  // --- Evacuation Operations ---
  static getEvacuationEvents(): EvacuationEvent[] {
    const data = localStorage.getItem(KEY_EVACUATION_EVENTS);
    if (!data) {
      localStorage.setItem(KEY_EVACUATION_EVENTS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  }

  static saveEvacuationEvents(events: EvacuationEvent[]) {
    localStorage.setItem(KEY_EVACUATION_EVENTS, JSON.stringify(events));
    this.syncCollectionWrite('evacuationEvents', events);
  }

  static getEvacuationMembers(): EvacuationMember[] {
    const data = localStorage.getItem(KEY_EVACUATION_MEMBERS);
    if (!data) {
      localStorage.setItem(KEY_EVACUATION_MEMBERS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  }

  static saveEvacuationMembers(members: EvacuationMember[]) {
    localStorage.setItem(KEY_EVACUATION_MEMBERS, JSON.stringify(members));
    this.syncCollectionWrite('evacuationMembers', members);
  }

  // --- Certificate Operations ---
  static getCertificates(): Certificate[] {
    const data = localStorage.getItem(KEY_CERTIFICATES);
    if (!data) {
      localStorage.setItem(KEY_CERTIFICATES, JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  }

  static saveCertificates(certs: Certificate[]) {
    localStorage.setItem(KEY_CERTIFICATES, JSON.stringify(certs));
    this.syncCollectionWrite('certificates', certs);
  }

  static getCertificateRequests(): CertificateRequest[] {
    const data = localStorage.getItem(KEY_CERTIFICATE_REQUESTS);
    if (!data) {
      localStorage.setItem(KEY_CERTIFICATE_REQUESTS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  }

  static saveCertificateRequests(requests: CertificateRequest[]) {
    localStorage.setItem(KEY_CERTIFICATE_REQUESTS, JSON.stringify(requests));
    this.syncCollectionWrite('certificateRequests', requests);
  }

  // Clear all database tables and make the system completely fresh for live operation
  static async resetDatabaseToLive() {
    try {
      const cleanUsers = [
        {
          id: 'user-khairumi',
          name: 'Khairumi Kasim (HSE Engineer)',
          email: 'khairumi.kasim@dialogasia.com',
          role: 'admin',
          joinedAt: new Date().toISOString(),
          firstTimePasswordChangeRequired: false,
          status: 'active',
          avatarUrl: 'https://hoirqrkdgbmvpwutwuwj-all.supabase.co/storage/v1/object/public/assets/assets/ea777f21-df8c-431d-956a-57390ff9e591_320w.jpg'
        }
      ];

      const cleanPasswords = {
        'user-khairumi': 'Dialog123'
      };

      // Set localStorage
      localStorage.setItem(KEY_USERS, JSON.stringify(cleanUsers));
      localStorage.setItem(KEY_PASSWORDS, JSON.stringify(cleanPasswords));
      localStorage.setItem(KEY_OFFICES, JSON.stringify([]));
      localStorage.setItem(KEY_PUNCH_LOGS, JSON.stringify([]));
      localStorage.setItem(KEY_ACTIVITY_LOGS, JSON.stringify([{
        id: `act-boot-${Date.now()}`,
        userId: 'user-khairumi',
        userName: 'Khairumi Kasim',
        userRole: 'admin',
        action: 'SYSTEM_LIVE_BOOT',
        details: 'Personnel On Board System cleared and initialized for live operations.',
        timestamp: new Date().toISOString()
      }]));
      localStorage.setItem(KEY_EMAILS, JSON.stringify([]));
      localStorage.setItem(KEY_LEAVE_DAYS, JSON.stringify([]));
      localStorage.setItem(KEY_LEAVE_QUOTAS, JSON.stringify([{
        userId: 'user-khairumi',
        userName: 'Khairumi Kasim (HSE Engineer)',
        annual: 14,
        emergency: 5,
        sick: 10
      }]));
      localStorage.setItem(KEY_EVACUATION_EVENTS, JSON.stringify([]));
      localStorage.setItem(KEY_EVACUATION_MEMBERS, JSON.stringify([]));
      localStorage.setItem(KEY_CERTIFICATES, JSON.stringify([]));
      localStorage.setItem(KEY_CERTIFICATE_REQUESTS, JSON.stringify([]));

      // Sync writes to Firestore (this will delete other docs thanks to syncCollectionWrite)
      await this.syncCollectionWrite('users', cleanUsers);
      await this.syncCollectionWrite('officeSites', []);
      await this.syncCollectionWrite('punchLogs', []);
      await this.syncCollectionWrite('activityLogs', [{
        id: `act-boot-${Date.now()}`,
        userId: 'user-khairumi',
        userName: 'Khairumi Kasim',
        userRole: 'admin',
        action: 'SYSTEM_LIVE_BOOT',
        details: 'Personnel On Board System cleared and initialized for live operations.',
        timestamp: new Date().toISOString()
      }]);
      await this.syncCollectionWrite('emails', []);
      await this.syncCollectionWrite('leaveDays', []);
      await this.syncCollectionWrite('leaveQuotas', [{
        userId: 'user-khairumi',
        userName: 'Khairumi Kasim (HSE Engineer)',
        annual: 14,
        emergency: 5,
        sick: 10
      }]);
      await this.syncCollectionWrite('evacuationEvents', []);
      await this.syncCollectionWrite('evacuationMembers', []);
      await this.syncCollectionWrite('certificates', []);
      await this.syncCollectionWrite('certificateRequests', []);

      // passwords is a special case
      await setDoc(doc(db, 'passwords', 'user-khairumi'), { password: 'Dialog123' });
      const passSnapshot = await getDocs(collection(db, 'passwords'));
      for (const passDoc of passSnapshot.docs) {
        if (passDoc.id !== 'user-khairumi') {
          await deleteDoc(doc(db, 'passwords', passDoc.id));
        }
      }

      console.log('Database successfully cleared and re-initialized.');
      return true;
    } catch (err) {
      console.error('Error during database live reset:', err);
      throw err;
    }
  }
}
