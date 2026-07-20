import React from 'react';
import { User } from '../types';
import { LayoutDashboard, Clock, MapPin, Users, FileBarChart2, ShieldAlert, Mail, LogOut, Shield, Calendar } from 'lucide-react';
import DialogLogo from './DialogLogo';

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

  // Navigation schema based on tier access permissions
  const navItems = [
    {
      id: 'dashboard',
      label: 'Global Overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
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
      label: 'Simulated Mailroom',
      icon: <Mail className="h-4 w-4" />,
      adminOnly: false,
      badge: unreadEmailCount > 0 ? unreadEmailCount : undefined
    }
  ];

  return (
    <aside className={`border-gray-200/80 bg-slate-50/70 backdrop-blur-lg flex flex-col z-20 shrink-0 select-none transition-all duration-300 ease-in-out ${
      isOpen
        ? 'w-full lg:w-64 p-5 border-b lg:border-b-0 lg:border-r h-auto lg:h-screen'
        : 'w-full lg:w-0 h-0 lg:h-screen p-0 overflow-hidden border-0 lg:border-r-0'
    }`}>
      
      {/* Branding and Title */}
      <div className="mb-6 flex flex-col gap-1.5 shrink-0 min-w-[200px] text-left px-1">
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

      {/* Footer log out action */}
      <div className="mt-auto pt-4 border-t border-gray-200/60 text-left space-y-3">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
        >
          <LogOut className="h-4 w-4 text-gray-400 group-hover:text-rose-600" />
          <span>Disconnect CRM</span>
        </button>

        <div className="px-2.5 py-2 bg-white/45 border border-gray-200/40 rounded-xl text-[10px] text-gray-400 leading-normal font-medium">
          <span className="block font-bold text-gray-500 uppercase tracking-wide text-[8px] mb-0.5">App Developer</span>
          Build by <span className="text-gray-700 font-bold block">Khairumi Kasim, HSE Engineer</span>
        </div>
      </div>

    </aside>
  );
}
