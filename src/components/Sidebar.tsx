import React, { useState } from 'react';
import { User } from '../types';
import { LayoutDashboard, Clock, MapPin, Users, FileBarChart2, ShieldAlert, Mail, LogOut, Shield, Calendar, X, User as UserIcon, Flame, Award, BookOpen, MessageSquare, RotateCcw } from 'lucide-react';
import DialogLogo from './DialogLogo';
import { Store } from '../utils/store';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  unreadEmailCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ 
  currentUser, 
  activeTab, 
  onTabChange, 
  onLogout, 
  unreadEmailCount,
  isOpen,
  onToggle
}: SidebarProps) {
  const isAdmin = currentUser.role === 'admin';
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetDatabase = async () => {
    if (confirm("Are you sure you want to reset all database records to a clean fresh start? This will overwrite local cache and push clean default users to Firestore.")) {
      setIsResetting(true);
      setResetMessage(null);
      try {
        const ok = await Store.resetAndFreshSeedFirestore();
        if (ok) {
          setResetMessage("Database reset & written to dialog-gcrm!");
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setResetMessage("Reset completed.");
        }
      } catch (e) {
        setResetMessage("Reset failed.");
      } finally {
        setIsResetting(false);
      }
    }
  };

  // Navigation schema based on tier access permissions
  const navItems = [
    {
      id: 'dashboard',
      label: 'Global Overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      adminOnly: false
    },
    {
      id: 'guide',
      label: 'User Guide & Go-Live',
      icon: <BookOpen className="h-4 w-4 text-indigo-500" />,
      adminOnly: false
    },
    {
      id: 'clock',
      label: 'Onsite Shift Clock',
      icon: <Clock className="h-4 w-4" />,
      adminOnly: false
    },
    {
      id: 'calendar',
      label: 'Leave Planner',
      icon: <Calendar className="h-4 w-4" />,
      adminOnly: false
    },
    {
      id: 'reports',
      label: 'Calculated Manhours',
      icon: <FileBarChart2 className="h-4 w-4" />,
      adminOnly: false
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: <Award className="h-4 w-4" />,
      adminOnly: false
    },
    {
      id: 'evacuation',
      label: 'Evacuation',
      icon: <Flame className="h-4 w-4 text-rose-500" />,
      adminOnly: false
    },
    {
      id: 'locations',
      label: 'Geofence Boundaries',
      icon: <MapPin className="h-4 w-4" />,
      adminOnly: true
    },
    {
      id: 'employees',
      label: 'Employee Management',
      icon: <Users className="h-4 w-4" />,
      adminOnly: true
    },
    {
      id: 'logs',
      label: 'Security Audit Logs',
      icon: <ShieldAlert className="h-4 w-4" />,
      adminOnly: true
    },
    {
      id: 'emails',
      label: 'Chat',
      icon: <MessageSquare className="h-4 w-4 text-emerald-500" />,
      adminOnly: false,
      badge: unreadEmailCount > 0 ? unreadEmailCount : undefined
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: <UserIcon className="h-4 w-4" />,
      adminOnly: false
    }
  ];

  return (
    <>
      {/* Sidebar Backdrop Overlay with background blur */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-md transition-opacity duration-300 ease-in-out"
          onClick={onToggle}
        />
      )}

      {/* Sidebar container */}
      <aside className={`border-gray-200/80 bg-slate-50/95 flex flex-col shrink-0 select-none transition-transform duration-300 ease-out
        fixed top-0 left-0 h-full w-[285px] z-50 p-5 border-r shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
      
      {/* Branding and Title */}
      <div className="mb-6 flex items-center justify-between shrink-0 min-w-[200px] text-left px-1">
        <div className="flex flex-col gap-1.5">
          <DialogLogo size="sm" className="justify-start" />
          <div className="flex items-center gap-1.5 mt-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-600"></span>
            </span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Attendance & CRM Hub
            </span>
          </div>
        </div>

        {/* Minimize menu button */}
        <button
          onClick={onToggle}
          className="p-1.5 px-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition flex items-center justify-center gap-1 border border-gray-200/50"
          title="Minimize Navigation Menu"
        >
          <X className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Minimize</span>
        </button>
      </div>

      {/* Profile info card */}
      <div className="mb-6 p-3 bg-white border border-gray-100 rounded-2xl flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-left">
        <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-semibold text-blue-600 shrink-0">
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-950 truncate leading-none">{currentUser.name}</p>
          <div className="mt-1 flex items-center">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 text-[8px] font-medium uppercase tracking-wider bg-zinc-950 text-white px-2 py-0.5 rounded-full leading-none">
                Manager
              </span>
            ) : (
              <span className="inline-flex items-center text-[8px] font-medium uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full leading-none">
                Staff
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left group text-xs font-medium ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                  : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`transition-colors ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-800'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`h-5 min-w-5 px-1.5 rounded-full text-[9px] font-medium flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer log out and database status action */}
      <div className="mt-auto pt-4 border-t border-gray-200/60 text-left space-y-2">
        <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200/60">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Firestore Auto-Sync Active</span>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleResetDatabase}
            disabled={isResetting}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl text-[11px] font-semibold text-amber-700 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/60 transition-all disabled:opacity-50"
            title="Reset database and sync fresh initial records to Firestore"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              <span>{isResetting ? 'Resetting DB...' : 'Reset & Fresh Seed DB'}</span>
            </div>
          </button>
        )}

        {resetMessage && (
          <p className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 animate-fade-in">
            {resetMessage}
          </p>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
        >
          <LogOut className="h-4 w-4 text-gray-400 group-hover:text-rose-600" />
          <span>Disconnect CRM</span>
        </button>

        <div className="pt-2 select-none">
          <p className="text-[9px] text-gray-400 font-medium">
            Built by <strong className="text-gray-600 font-bold">Khairumi Kasim, HSE Engineer</strong>
          </p>
        </div>
      </div>

    </aside>
  </>
  );
}
