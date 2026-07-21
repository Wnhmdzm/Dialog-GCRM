import React, { useState, useEffect } from 'react';
import { Store } from './utils/store';
import { User } from './types';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PunchClock from './components/PunchClock';
import OfficeManagement from './components/OfficeManagement';
import EmployeeManagement from './components/EmployeeManagement';
import Reports from './components/Reports';
import Logs from './components/Logs';
import EmailInboxSim from './components/EmailInboxSim';
import LeavePlanner from './components/LeavePlanner';
import UserProfile from './components/UserProfile';
import Evacuation from './components/Evacuation';
import Certificates from './components/Certificates';
import OperationGuide from './components/OperationGuide';
import DialogLogo from './components/DialogLogo';
import { motion, AnimatePresence } from 'motion/react';

import { ShieldCheck, CheckCircle2, AlertTriangle, Bell, Mail, RefreshCw, Sparkles, Menu, MapPin } from 'lucide-react';
import { getDistanceMeters, formatDistance } from './utils/geo';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(() => Store.getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Collapsed/hidden by default
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(() => Store.getSimulatedLocation());

  // Periodically read current location to keep header synchronized
  useEffect(() => {
    const syncLocation = () => {
      setCurrentLocation(Store.getSimulatedLocation());
    };
    const interval = setInterval(syncLocation, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time Firestore updates
  useEffect(() => {
    const unsubscribe = Store.subscribeToAll(() => {
      setSyncTrigger(prev => prev + 1);
      
      // Real-time synchronization of the active session
      const cached = Store.getCurrentUser();
      if (cached) {
        const users = Store.getUsers();
        const fresh = users.find(u => u.id === cached.id);
        if (fresh) {
          if (fresh.status === 'suspended') {
            setCurrentUser(null);
            Store.saveCurrentUser(null);
          } else {
            setCurrentUser(fresh);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Splash screen timeout (configured to last 10 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Password reset override from URL (e.g. ?resetUserId=user-emp1)
  const [resetUserIdOverride, setResetUserIdOverride] = useState<string | null>(null);

  // Administrative Audit Feedbacks
  const [auditFeedback, setAuditFeedback] = useState<{ count: number; active: boolean } | null>(null);

  // Parse URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetUserId = params.get('resetUserId');
    if (resetUserId) {
      setResetUserIdOverride(resetUserId);
      setCurrentUser(null); // Log out active session to process password reset securely
      Store.saveCurrentUser(null);
    }
  }, []);

  // Sync Unread Email Alerts
  const refreshUnreadEmails = () => {
    const list = Store.getEmails();
    if (currentUser) {
      const isManager = currentUser.role === 'admin';
      const myUnreads = list.filter(e => 
        !e.read && (isManager || e.recipientEmail.toLowerCase() === currentUser.email.toLowerCase())
      );
      setUnreadEmailsCount(myUnreads.length);
    } else {
      setUnreadEmailsCount(0);
    }
  };

  useEffect(() => {
    refreshUnreadEmails();
    const interval = setInterval(refreshUnreadEmails, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
    // Clear URL parameters elegantly
    if (window.history.pushState) {
      const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({ path: newurl }, '', newurl);
    }
    setResetUserIdOverride(null);
  };

  const handleLogout = () => {
    if (currentUser) {
      Store.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'USER_LOGOUT',
        'Logged out and terminated CRM session.'
      );
    }
    setCurrentUser(null);
    Store.saveCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Run Shift Auditing (Manager only action)
  const handleTriggerShiftAudit = () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    // Run compliance auditing
    const count = Store.runShiftAudit(currentUser.name, currentUser.id);
    
    // Display pop up feedback alert
    setAuditFeedback({ count, active: true });
    
    // Auto clear feedback after 5 seconds
    setTimeout(() => {
      setAuditFeedback(null);
    }, 5000);
  };

  // Switch workspace screens
  const renderActiveScreen = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} onNavigateToTab={(tab) => setActiveTab(tab)} />;
      case 'guide':
        return <OperationGuide currentUser={currentUser} />;
      case 'clock':
        return <PunchClock currentUser={currentUser} />;
      case 'calendar':
        return <LeavePlanner currentUser={currentUser} />;
      case 'reports':
        return <Reports currentUser={currentUser} />;
      case 'locations':
        return currentUser.role === 'admin' ? <OfficeManagement currentUser={currentUser} /> : null;
      case 'employees':
        return currentUser.role === 'admin' ? <EmployeeManagement currentUser={currentUser} /> : null;
      case 'logs':
        return currentUser.role === 'admin' ? <Logs currentUser={currentUser} /> : null;
      case 'profile':
        return <UserProfile currentUser={currentUser} onProfileUpdate={(u) => setCurrentUser(u)} />;
      case 'certificates':
        return <Certificates currentUser={currentUser} />;
      case 'evacuation':
        return <Evacuation currentUser={currentUser} />;
      case 'emails':
        return (
          <EmailInboxSim
            onTriggerResetFlow={(userId) => {
              setResetUserIdOverride(userId);
              setCurrentUser(null);
              Store.saveCurrentUser(null);
            }}
            currentUserEmail={currentUser.email}
            isAdmin={currentUser.role === 'admin'}
          />
        );
      default:
        return <Dashboard currentUser={currentUser} onNavigateToTab={(tab) => setActiveTab(tab)} />;
    }
  };

  // Compute nearest office site dynamically for header GPS status
  const offices = Store.getOffices();
  let headerGpsLabel = currentLocation.name;
  let activeOffice: any = null;
  let nearestOffice: any = null;
  let minDistanceMeters = Infinity;

  offices.forEach(office => {
    const dist = getDistanceMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      office.latitude,
      office.longitude
    );
    if (dist < minDistanceMeters) {
      minDistanceMeters = dist;
      nearestOffice = office;
    }
    if (dist <= office.radiusMeters) {
      activeOffice = office;
    }
  });

  if (activeOffice) {
    headerGpsLabel = `Authorized: ${activeOffice.name}`;
  } else if (nearestOffice) {
    headerGpsLabel = `Near ${nearestOffice.name} (${formatDistance(minDistanceMeters)})`;
  }

  return (
    <>
      {/* Main content layer */}
      {!currentUser ? (
        <Login
          onLoginSuccess={handleLoginSuccess}
          overrideResetUserId={resetUserIdOverride}
          onClearOverrideReset={() => {
            setResetUserIdOverride(null);
            if (window.history.pushState) {
              const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              window.history.pushState({ path: newurl }, '', newurl);
            }
          }}
        />
      ) : (
        <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col lg:flex-row font-sans overflow-x-hidden relative">

          {/* RENDER SIDEBAR */}
          <Sidebar
            currentUser={currentUser}
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              // Auto close/minimize the menubar on all screens for seamless UX
              setIsSidebarOpen(false);
            }}
            onLogout={handleLogout}
            unreadEmailCount={unreadEmailsCount}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          {/* CORE CONTENT LAYOUT AREA */}
          <main className="flex-1 flex flex-col relative z-10 min-w-0 bg-[#f5f5f7]/50">
            
            {/* Dynamic header row containing quick status checks, menu toggle, and manual shift-audit triggers */}
            <header className="h-16 border-b border-gray-150 bg-white flex items-center justify-between px-6 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <div className="flex items-center gap-3">
                {/* Toggle Button to open menu */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 rounded-xl text-gray-800 transition flex items-center justify-center gap-2 group font-medium text-xs tracking-tight"
                  title={isSidebarOpen ? "Collapse Navigation Menu" : "Expand Navigation Menu"}
                >
                  <Menu className={`h-4 w-4 text-gray-600 group-hover:rotate-12 transition-transform duration-200`} />
                  <span>Menu</span>
                </button>
                
                <div className="h-4 w-px bg-gray-200"></div>

                <div className="flex items-center gap-1.5 bg-emerald-50/60 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider hidden sm:inline">
                    Secure Link
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                
                {/* Active Session User Profile Indicator */}
                <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-left shadow-2xs">
                  <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 font-bold text-[11px] flex items-center justify-center border border-blue-100">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="leading-none">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Session Active</p>
                    <p className="text-[11px] font-bold text-gray-800 mt-0.5">{currentUser.name} ({currentUser.role === 'admin' ? 'Manager' : 'Staff'})</p>
                  </div>
                </div>

                {/* Real-time Nearest Geolocation Widget */}
                <div className="flex items-center gap-1.5 bg-blue-50/60 border border-blue-100 px-3 py-1.5 rounded-xl shrink-0" title="Nearest Admin Configured Site Area">
                  <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] text-blue-800 font-semibold tracking-tight">
                    Nearest: <strong className="text-blue-950 font-bold">{headerGpsLabel}</strong>
                  </span>
                </div>
                
                {/* AUDIT TRIGGER (Admins only) */}
                {currentUser.role === 'admin' && (
                  <button
                    onClick={handleTriggerShiftAudit}
                    className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-medium border border-gray-200 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    title="Run Automated Compliance Scan"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                    <span>Shift Audit</span>
                  </button>
                )}

                {/* Unread email bell notification indicator */}
                <button
                  onClick={() => setActiveTab('emails')}
                  className="relative p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition shadow-xs"
                  title="Mailroom Simulation"
                >
                  <Bell className="h-4 w-4" />
                  {unreadEmailsCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-blue-600 text-[8px] text-white rounded-full flex items-center justify-center font-bold">
                      {unreadEmailsCount}
                    </span>
                  )}
                </button>
              </div>
            </header>

            {/* FEEDBACK TOAST FROM SHIFT AUDIT */}
            {auditFeedback && (
              <div className="mx-6 mt-4 p-4 bg-white border border-emerald-100 rounded-2xl flex items-start gap-3 animate-slide-in text-xs text-left shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 tracking-tight">Compliance Audit Complete</p>
                  <p className="text-gray-500 mt-1 text-[11px] leading-relaxed">
                    Audited active employee sessions. Identified <strong className="text-gray-950 font-semibold">{auditFeedback.count}</strong> unresolved clock-ins and dispatched notifications.
                  </p>
                </div>
              </div>
            )}

            {/* MAIN BODY AREA */}
            <div className="flex-1 p-6 overflow-y-auto max-w-[1400px] w-full mx-auto flex flex-col justify-between">
              <div className="flex-1">
                {renderActiveScreen()}
              </div>
              
              {/* Page Footer */}
              <footer className="mt-12 pt-6 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-gray-400 select-none">
                <span>&copy; {new Date().getFullYear()} DIALOG Group. All rights reserved.</span>
                <div className="flex items-center gap-1 text-[9px]">
                  <span>Built by</span>
                  <strong className="text-gray-500 font-bold">Khairumi Kasim, HSE Engineer</strong>
                </div>
              </footer>
            </div>

          </main>

        </div>
      )}

      {/* Persistent splash screen with slow smooth fade-out exit transition */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center font-sans select-none"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center text-center max-w-lg px-6"
            >
              {/* Elegant Dialog Logo */}
              <div className="mb-6 transform scale-125">
                <DialogLogo size="lg" />
              </div>

              {/* Application Title */}
              <motion.h1
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                className="text-xl sm:text-2xl font-extrabold text-slate-900 uppercase tracking-tight leading-tight"
              >
                Personnel On Board System
              </motion.h1>

              {/* Progressive Loader over 10s */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "160px" }}
                transition={{ delay: 0.4, duration: 9.0, ease: "easeInOut" }}
                className="h-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full mt-6"
              />
              
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.45 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mt-3"
              >
                Loading Secure Environment...
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
