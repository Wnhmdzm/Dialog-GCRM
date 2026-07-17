import React, { useState, useEffect } from 'react';
import { User, LeaveDay, LeaveQuota } from '../types';
import { Store } from '../utils/store';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  User as UserIcon, 
  Award, 
  Info, 
  Clock, 
  Settings, 
  AlertCircle,
  Sparkles,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface LeavePlannerProps {
  currentUser: User;
}

export default function LeavePlanner({ currentUser }: LeavePlannerProps) {
  const isAdmin = currentUser.role === 'admin';
  const currentYear = 2026;

  // State
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [leaveDays, setLeaveDays] = useState<LeaveDay[]>([]);
  const [leaveQuotas, setLeaveQuotas] = useState<LeaveQuota[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  
  // Selection states for form
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestDate, setRequestDate] = useState('');
  const [requestType, setRequestType] = useState<'Annual' | 'Emergency' | 'Sick' | 'Unpaid'>('Annual');
  const [requestNote, setRequestNote] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(currentUser.id);
  
  // Admin Editing Quota state
  const [editingQuotaUserId, setEditingQuotaUserId] = useState<string | null>(null);
  const [editAnnual, setEditAnnual] = useState(14);
  const [editEmergency, setEditEmergency] = useState(5);
  const [editSick, setEditSick] = useState(10);

  // Status Filter for Lists
  const [activeTab, setActiveTab] = useState<'calendar' | 'requests' | 'quotas'>('calendar');

  // Messages
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Load Initial Data
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setLeaveDays(Store.getLeaveDays());
    setLeaveQuotas(Store.getLeaveQuotas());
    setEmployees(Store.getUsers().filter(u => u.role !== 'admin'));
  };

  const isLeapYear = (year: number) => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };

  const getDaysInMonth = (year: number, monthIndex: number) => {
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (monthIndex === 1 && isLeapYear(year)) {
      return 29;
    }
    return days[monthIndex];
  };

  const getFirstDayOfMonth = (year: number, monthIndex: number) => {
    return new Date(year, monthIndex, 1).getDay();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getLeaveBalances = (userId: string) => {
    const quota = leaveQuotas.find(q => q.userId === userId) || {
      userId,
      userName: 'Unknown',
      annual: 14,
      emergency: 5,
      sick: 10
    };

    const approvedLeaves = leaveDays.filter(d => d.userId === userId && d.status === 'Approved');
    
    const usedAnnual = approvedLeaves.filter(d => d.type === 'Annual').length;
    const usedEmergency = approvedLeaves.filter(d => d.type === 'Emergency').length;
    const usedSick = approvedLeaves.filter(d => d.type === 'Sick').length;
    const usedUnpaid = approvedLeaves.filter(d => d.type === 'Unpaid').length;

    return {
      quota,
      used: {
        annual: usedAnnual,
        emergency: usedEmergency,
        sick: usedSick,
        unpaid: usedUnpaid
      },
      remaining: {
        annual: Math.max(0, quota.annual - usedAnnual),
        emergency: Math.max(0, quota.emergency - usedEmergency),
        sick: Math.max(0, quota.sick - usedSick)
      }
    };
  };

  const handleRequestLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!requestDate) {
      setFormError('Please select a valid date.');
      return;
    }

    const d = new Date(requestDate);
    if (isNaN(d.getTime())) {
      setFormError('Invalid date format.');
      return;
    }

    const formattedDate = requestDate;
    
    const alreadyBooked = leaveDays.some(ld => ld.userId === selectedEmployeeId && ld.date === formattedDate);
    if (alreadyBooked) {
      setFormError('This employee already has a pending or approved leave record for this date.');
      return;
    }

    const balances = getLeaveBalances(selectedEmployeeId);
    
    if (requestType === 'Annual' && balances.remaining.annual <= 0) {
      setFormError('Insufficient Annual Leave quota remaining.');
      return;
    }
    if (requestType === 'Emergency' && balances.remaining.emergency <= 0) {
      setFormError('Insufficient Emergency Leave quota remaining.');
      return;
    }
    if (requestType === 'Sick' && balances.remaining.sick <= 0) {
      setFormError('Insufficient Medical/Sick Leave quota remaining.');
      return;
    }

    const allUsers = Store.getUsers();
    const targetUser = allUsers.find(u => u.id === selectedEmployeeId);
    if (!targetUser) {
      setFormError('User not found.');
      return;
    }

    const newLeave: LeaveDay = {
      id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: selectedEmployeeId,
      userName: targetUser.name,
      date: formattedDate,
      type: requestType,
      status: isAdmin ? 'Approved' : 'Pending',
      note: requestNote.trim() || `${requestType} Leave request`
    };

    const updated = [newLeave, ...leaveDays];
    Store.saveLeaveDays(updated);
    setLeaveDays(updated);

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'LEAVE_REQUEST',
      `Leave request submitted for ${targetUser.name} on ${formattedDate} (${requestType}). Status: ${newLeave.status}`
    );

    if (!isAdmin) {
      Store.sendEmail(
        'admin@geoclock.com',
        `📅 New Leave Request: ${targetUser.name}`,
        `Hello Admin,\n\n${targetUser.name} has submitted a request for ${requestType} Leave on ${formattedDate}.\n\nNote: "${newLeave.note}"\n\nPlease log in to Dialog CRM's Leave Planner to approve or deny this request.`,
        'system'
      );
    } else {
      Store.sendEmail(
        targetUser.email,
        `📅 Leave Booked on Your Behalf`,
        `Hello ${targetUser.name},\n\nYour manager (${currentUser.name}) has booked and approved a day of ${requestType} Leave for you on ${formattedDate}.\n\nNote: "${newLeave.note}"`,
        'system'
      );
    }

    setFormSuccess(isAdmin ? 'Leave booked and approved successfully!' : 'Leave request submitted and pending approval!');
    setRequestNote('');
    refreshData();
  };

  const handleDeleteLeave = (id: string) => {
    const target = leaveDays.find(l => l.id === id);
    if (!target) return;

    if (!isAdmin && target.userId !== currentUser.id) {
      alert('Access Denied');
      return;
    }

    const updated = leaveDays.filter(l => l.id !== id);
    Store.saveLeaveDays(updated);
    setLeaveDays(updated);

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'LEAVE_CANCEL',
      `Cancelled leave day for ${target.userName} on ${target.date} (${target.type})`
    );

    refreshData();
  };

  const handleApproveLeave = (id: string) => {
    if (!isAdmin) return;
    const target = leaveDays.find(l => l.id === id);
    if (!target) return;

    const updated = leaveDays.map(l => {
      if (l.id === id) {
        return { ...l, status: 'Approved' as const };
      }
      return l;
    });

    Store.saveLeaveDays(updated);
    setLeaveDays(updated);

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      'admin',
      'LEAVE_APPROVE',
      `Approved leave day request for ${target.userName} on ${target.date} (${target.type})`
    );

    const allUsers = Store.getUsers();
    const emp = allUsers.find(u => u.id === target.userId);
    if (emp) {
      Store.sendEmail(
        emp.email,
        `✅ Leave Approved: ${target.date}`,
        `Hello ${emp.name},\n\nGood news! Your request for ${target.type} Leave on ${target.date} has been approved by your manager.\n\nEnjoy your time off!`,
        'system'
      );
    }

    refreshData();
  };

  const handleRejectLeave = (id: string) => {
    if (!isAdmin) return;
    const target = leaveDays.find(l => l.id === id);
    if (!target) return;

    const updated = leaveDays.map(l => {
      if (l.id === id) {
        return { ...l, status: 'Rejected' as const };
      }
      return l;
    });

    Store.saveLeaveDays(updated);
    setLeaveDays(updated);

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      'admin',
      'LEAVE_REJECT',
      `Rejected leave day request for ${target.userName} on ${target.date} (${target.type})`
    );

    const allUsers = Store.getUsers();
    const emp = allUsers.find(u => u.id === target.userId);
    if (emp) {
      Store.sendEmail(
        emp.email,
        `❌ Leave Rejected: ${target.date}`,
        `Hello ${emp.name},\n\nWe regret to inform you that your request for ${target.type} Leave on ${target.date} was rejected by your manager.\n\nPlease discuss with your manager for further details.`,
        'system'
      );
    }

    refreshData();
  };

  const handleSaveQuota = (userId: string) => {
    if (!isAdmin) return;
    
    const updatedQuotas = leaveQuotas.map(q => {
      if (q.userId === userId) {
        return {
          ...q,
          annual: editAnnual,
          emergency: editEmergency,
          sick: editSick
        };
      }
      return q;
    });

    Store.saveLeaveQuotas(updatedQuotas);
    setLeaveQuotas(updatedQuotas);

    const empName = leaveQuotas.find(q => q.userId === userId)?.userName || 'Employee';

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      'admin',
      'QUOTA_CHANGE',
      `Updated leave quota for ${empName}. Annual: ${editAnnual}, Emergency: ${editEmergency}, Sick: ${editSick}`
    );

    setEditingQuotaUserId(null);
    refreshData();
  };

  const startEditingQuota = (userId: string, currentQuota: LeaveQuota) => {
    setEditingQuotaUserId(userId);
    setEditAnnual(currentQuota.annual);
    setEditEmergency(currentQuota.emergency);
    setEditSick(currentQuota.sick);
  };

  const getLeaveTypeStyle = (type: 'Annual' | 'Emergency' | 'Sick' | 'Unpaid', status: 'Approved' | 'Pending' | 'Rejected') => {
    if (status === 'Pending') {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-700',
        dot: 'bg-amber-500',
        square: 'bg-amber-50/80 border border-dashed border-amber-300 text-amber-700 rounded-lg font-semibold'
      };
    }
    if (status === 'Rejected') {
      return {
        bg: 'bg-rose-50 border-rose-150 text-rose-500 line-through',
        dot: 'bg-rose-400',
        square: 'bg-rose-50/50 border border-rose-150 text-rose-400 line-through font-medium'
      };
    }

    switch (type) {
      case 'Annual':
        return {
          bg: 'bg-blue-50/70 border-blue-100 text-blue-700',
          dot: 'bg-blue-500',
          square: 'bg-blue-600 text-white rounded-lg font-semibold shadow-sm shadow-blue-500/15'
        };
      case 'Emergency':
        return {
          bg: 'bg-orange-50/70 border-orange-100 text-orange-700',
          dot: 'bg-orange-500',
          square: 'bg-orange-500 text-white rounded-lg font-semibold shadow-sm shadow-orange-500/15'
        };
      case 'Sick':
        return {
          bg: 'bg-rose-50/70 border-rose-100 text-rose-700',
          dot: 'bg-rose-500',
          square: 'bg-rose-500 text-white rounded-lg font-semibold shadow-sm shadow-rose-500/15'
        };
      case 'Unpaid':
        return {
          bg: 'bg-purple-50/70 border-purple-100 text-purple-700',
          dot: 'bg-purple-500',
          square: 'bg-purple-500 text-white rounded-lg font-semibold shadow-sm shadow-purple-500/15'
        };
    }
  };

  const currentBalances = getLeaveBalances(isAdmin ? selectedEmployeeId : currentUser.id);

  const handleCalendarDayClick = (monthIdx: number, day: number) => {
    const formattedMonth = String(monthIdx + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const clickedDateString = `${selectedYear}-${formattedMonth}-${formattedDay}`;
    
    setRequestDate(clickedDateString);
    setShowRequestForm(true);
    setFormError('');
    setFormSuccess('');
  };

  return (
    <div className="space-y-6 font-sans text-left animate-fade-in">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-500 shrink-0" />
            Leave Planner
          </h2>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Submit and review leaves on our whole-year calendar. Quotas are adjusted securely by administration.
          </p>
        </div>

        {/* Year toggle & active selection */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50/50 p-1 shadow-sm">
            <button 
              onClick={() => setSelectedYear(y => y - 1)}
              className="p-1 hover:bg-white hover:shadow-sm text-gray-600 rounded-lg transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-gray-800 tracking-tight">{selectedYear} Leave Year</span>
            <button 
              onClick={() => setSelectedYear(y => y + 1)}
              className="p-1 hover:bg-white hover:shadow-sm text-gray-600 rounded-lg transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setShowRequestForm(!showRequestForm);
              setFormError('');
              setFormSuccess('');
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-sm shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Book Off-Day</span>
          </button>
        </div>
      </div>

      {/* Leave Quota and balance widget (User View or Admin selected user view) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Annual Leave card */}
        <div className="bg-white rounded-3xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Annual Leave</span>
              <span className="h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-50"></span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-4 block leading-none tracking-tight">
              {currentBalances.remaining.annual} <span className="text-xs font-normal text-gray-400">Days Left</span>
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Used: <strong className="text-blue-600 font-semibold">{currentBalances.used.annual}d</strong></span>
            <span>Quota: <strong className="text-gray-700 font-semibold">{currentBalances.quota.annual}d</strong></span>
          </div>
        </div>

        {/* Emergency Leave card */}
        <div className="bg-white rounded-3xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Emergency Leave</span>
              <span className="h-2 w-2 rounded-full bg-orange-500 ring-4 ring-orange-50"></span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-4 block leading-none tracking-tight">
              {currentBalances.remaining.emergency} <span className="text-xs font-normal text-gray-400">Days Left</span>
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Used: <strong className="text-orange-600 font-semibold">{currentBalances.used.emergency}d</strong></span>
            <span>Quota: <strong className="text-gray-700 font-semibold">{currentBalances.quota.emergency}d</strong></span>
          </div>
        </div>

        {/* Sick Leave card */}
        <div className="bg-white rounded-3xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sick Leave</span>
              <span className="h-2 w-2 rounded-full bg-rose-500 ring-4 ring-rose-50"></span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-4 block leading-none tracking-tight">
              {currentBalances.remaining.sick} <span className="text-xs font-normal text-gray-400">Days Left</span>
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Used: <strong className="text-rose-600 font-semibold">{currentBalances.used.sick}d</strong></span>
            <span>Quota: <strong className="text-gray-700 font-semibold">{currentBalances.quota.sick}d</strong></span>
          </div>
        </div>

        {/* Unpaid Leave card */}
        <div className="bg-white rounded-3xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Unpaid Leave</span>
              <span className="h-2 w-2 rounded-full bg-purple-500 ring-4 ring-purple-50"></span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-4 block leading-none tracking-tight">
              {currentBalances.used.unpaid} <span className="text-xs font-normal text-gray-400">Days Booked</span>
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span className="text-purple-600 font-semibold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Unlimited Allocation
            </span>
          </div>
        </div>

      </div>

      {/* Collapsible request leave form */}
      {showRequestForm && (
        <div className="bg-gray-50/50 border border-gray-150 rounded-3xl p-5 shadow-sm transition-all animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
              Book Leave & Request Off-Day
            </h3>
            <button 
              onClick={() => setShowRequestForm(false)} 
              className="p-1 hover:bg-gray-200/50 text-gray-400 hover:text-gray-600 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleRequestLeaveSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            
            {isAdmin && (
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Select Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    setSelectedEmployeeId(e.target.value);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition font-medium text-gray-950 focus:ring-4 focus:ring-blue-500/5"
                >
                  <option value={currentUser.id}>Ahmad Zaim (Myself)</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} (Employee)</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Leave Date</label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none transition font-mono font-medium text-gray-950 focus:ring-4 focus:ring-blue-500/5"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Leave Category</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as any)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition font-medium text-gray-950 focus:ring-4 focus:ring-blue-500/5"
              >
                <option value="Annual">Annual Leave</option>
                <option value="Emergency">Emergency Leave</option>
                <option value="Sick">Medical / Sick Leave</option>
                <option value="Unpaid">Unpaid Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Reason / Note</label>
              <input
                type="text"
                placeholder="E.g. dentist appointment, family event"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition font-medium text-gray-950 placeholder:text-gray-400 focus:ring-4 focus:ring-blue-500/5"
              />
            </div>

            <div className="md:col-span-4 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs border border-gray-200 rounded-xl transition shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-sm shadow-blue-500/15"
              >
                {isAdmin ? 'Book & Approve Leave' : 'Submit Leave Request'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Tab Switcher for different planner sections */}
      <div className="flex border-b border-gray-100 gap-6 shrink-0 select-none">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 text-xs font-semibold tracking-tight transition-all relative flex items-center gap-1.5 -mb-[1px] border-b-2 ${
            activeTab === 'calendar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span>{selectedYear} Whole-Year Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-xs font-semibold tracking-tight transition-all relative flex items-center gap-1.5 -mb-[1px] border-b-2 ${
            activeTab === 'requests'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span>Applications Queue ({leaveDays.length})</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('quotas')}
            className={`pb-3 text-xs font-semibold tracking-tight transition-all relative flex items-center gap-1.5 -mb-[1px] border-b-2 ${
              activeTab === 'quotas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Configure Quotas</span>
          </button>
        )}
      </div>

      {/* TAB 1: WHOLE YEAR CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          
          <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-2xl flex gap-2.5 items-center text-xs text-blue-800 font-medium">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <span>
              <strong>Tip:</strong> Click any blank day block to auto-fill the request form for that date. Hover displays details.
            </span>
          </div>

          {/* 12-Month Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {monthNames.map((monthName, monthIdx) => {
              const daysInMonth = getDaysInMonth(selectedYear, monthIdx);
              const firstDayIndex = getFirstDayOfMonth(selectedYear, monthIdx);
              
              const padDays = Array(firstDayIndex).fill(null);
              const daysArray = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);

              return (
                <div key={monthName} className="bg-white border border-gray-150 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.012)]">
                  <h4 className="text-xs font-semibold text-gray-900 mb-3 text-center border-b border-gray-100 pb-2 uppercase tracking-wider">
                    {monthName}
                  </h4>
                  
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 text-[9px] text-gray-400 font-semibold text-center mb-1.5 uppercase tracking-wide">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {padDays.map((_, i) => (
                      <div key={`pad-${i}`} className="h-7 w-full"></div>
                    ))}

                    {daysArray.map((day) => {
                      const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      
                      const dayLeaves = leaveDays.filter(ld => 
                        ld.date === dateStr && 
                        (isAdmin ? true : ld.userId === currentUser.id)
                      );

                      const mainLeave = dayLeaves.find(ld => ld.status === 'Approved') || dayLeaves.find(ld => ld.status === 'Pending');
                      const leaveStyles = mainLeave ? getLeaveTypeStyle(mainLeave.type, mainLeave.status) : null;

                      return (
                        <button
                          key={`day-${day}`}
                          onClick={() => handleCalendarDayClick(monthIdx, day)}
                          className={`h-7 w-full text-[10px] rounded-lg transition-all relative flex items-center justify-center font-semibold group ${
                            leaveStyles 
                              ? leaveStyles.square 
                              : 'bg-gray-50/50 hover:bg-gray-100 border border-transparent text-gray-600 hover:text-gray-900'
                          }`}
                          title={mainLeave ? `${mainLeave.userName}: ${mainLeave.type} (${mainLeave.status}) - ${mainLeave.note}` : 'Click to request leave'}
                        >
                          {day}

                          {/* Hover tooltip */}
                          {dayLeaves.length > 0 && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 bg-gray-950/95 backdrop-blur-md text-white text-[9px] rounded-xl p-3 shadow-lg w-44 pointer-events-none leading-relaxed font-sans">
                              {dayLeaves.map(ld => (
                                <div key={ld.id} className="border-b border-gray-800/80 last:border-0 pb-1.5 mb-1.5 last:pb-0 last:mb-0">
                                  <p className="font-semibold text-blue-300 truncate uppercase">{ld.userName}</p>
                                  <p className="font-medium text-gray-300 uppercase">{ld.type} ({ld.status})</p>
                                  {ld.note && <p className="italic text-gray-400 truncate">"{ld.note}"</p>}
                                </div>
                              ))}
                            </div>
                          )}

                          {dayLeaves.length > 1 && (
                            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-gray-900 text-[8px] text-white rounded-full font-bold flex items-center justify-center border border-white">
                              +{dayLeaves.length - 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color coding legend */}
          <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-wrap gap-4 justify-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            <span className="text-gray-400">Legend:</span>
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="h-2.5 w-2.5 bg-blue-600 rounded-sm"></span> Annual
            </span>
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="h-2.5 w-2.5 bg-orange-500 rounded-sm"></span> Emergency
            </span>
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="h-2.5 w-2.5 bg-rose-500 rounded-sm"></span> Medical/Sick
            </span>
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="h-2.5 w-2.5 bg-purple-500 rounded-sm"></span> Unpaid
            </span>
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="h-2.5 w-2.5 bg-amber-50 border border-dashed border-amber-300 rounded-sm"></span> Pending Request
            </span>
          </div>

        </div>
      )}

      {/* TAB 2: REQUEST LOGS AND QUEUE */}
      {activeTab === 'requests' && (
        <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.012)]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500 shrink-0" />
              Applications Queue ({leaveDays.length})
            </h3>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider font-mono">Immutable CRM Log</span>
          </div>

          {leaveDays.length === 0 ? (
            <div className="py-16 text-center text-gray-400 font-medium text-xs flex flex-col items-center justify-center gap-2">
              <HelpCircle className="h-8 w-8 text-gray-300" />
              <span>No active leave requests logged for the year.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-gray-50/60 text-gray-500 font-semibold uppercase tracking-wider text-[9px] border-b border-gray-100">
                    <th className="px-4 py-3 border-r border-gray-50">Employee</th>
                    <th className="px-4 py-3 border-r border-gray-50">Date</th>
                    <th className="px-4 py-3 border-r border-gray-50">Category</th>
                    <th className="px-4 py-3 border-r border-gray-50">Reason / Note</th>
                    <th className="px-4 py-3 border-r border-gray-50">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium text-[11px]">
                  {leaveDays.map((ld) => {
                    if (!isAdmin && ld.userId !== currentUser.id) return null;

                    const styles = getLeaveTypeStyle(ld.type, ld.status);

                    return (
                      <tr key={ld.id} className="hover:bg-gray-50/30 transition">
                        <td className="px-4 py-3 border-r border-gray-50 flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                            {ld.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900">{ld.userName}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-950 border-r-r border-gray-50 font-medium">
                          {ld.date}
                        </td>
                        <td className="px-4 py-3 border-r border-gray-50">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${styles?.bg}`}>
                            {ld.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-normal truncate max-w-xs border-r border-gray-50">
                          {ld.note}
                        </td>
                        <td className="px-4 py-3 border-r border-gray-50">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${
                            ld.status === 'Approved' ? 'text-emerald-600' : ld.status === 'Pending' ? 'text-amber-600' : 'text-rose-500'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              ld.status === 'Approved' ? 'bg-emerald-500' : ld.status === 'Pending' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
                            }`}></span>
                            {ld.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {isAdmin && ld.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveLeave(ld.id)}
                                  className="p-1.5 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg transition-colors"
                                  title="Approve Request"
                                >
                                  <Check className="h-4 w-4 shrink-0" />
                                </button>
                                <button
                                  onClick={() => handleRejectLeave(ld.id)}
                                  className="p-1.5 bg-rose-50/50 hover:bg-rose-50 text-rose-500 border border-rose-100 rounded-lg transition-colors"
                                  title="Reject Request"
                                >
                                  <X className="h-4 w-4 shrink-0" />
                                </button>
                              </>
                            )}

                            {(isAdmin || ld.userId === currentUser.id) && (
                              <button
                                onClick={() => handleDeleteLeave(ld.id)}
                                className="p-1.5 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200 rounded-lg transition-colors"
                                title="Cancel Off-day Reservation"
                              >
                                <Trash2 className="h-4 w-4 shrink-0" />
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONFIGURE QUOTAS (ADMIN ONLY) */}
      {isAdmin && activeTab === 'quotas' && (
        <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.012)]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500 shrink-0" />
                Staff Leave Quotas Setup
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Managers can set corporate total annual caps for employee leave accounts here.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50/60 text-gray-500 font-semibold uppercase tracking-wider text-[9px] border-b border-gray-100">
                  <th className="px-4 py-3 border-r border-gray-50">Employee</th>
                  <th className="px-4 py-3 border-r border-gray-50">Annual Quota</th>
                  <th className="px-4 py-3 border-r border-gray-50">Emergency Quota</th>
                  <th className="px-4 py-3 border-r border-gray-50">Sick Quota</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium text-[11px]">
                {employees.map((emp) => {
                  const quota = leaveQuotas.find(q => q.userId === emp.id) || {
                    userId: emp.id,
                    userName: emp.name,
                    annual: 14,
                    emergency: 5,
                    sick: 10
                  };

                  const isEditing = editingQuotaUserId === emp.id;

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/30 transition-all">
                      <td className="px-4 py-3 border-r border-gray-50 flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{emp.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{emp.email}</p>
                        </div>
                      </td>
                      
                      {/* Annual quota cell */}
                      <td className="px-4 py-3 border-r border-gray-50">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editAnnual}
                            onChange={(e) => setEditAnnual(Number(e.target.value))}
                            className="w-20 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 font-mono font-semibold text-gray-950 focus:ring-4 focus:ring-blue-500/5 outline-none"
                          />
                        ) : (
                          <span className="font-mono bg-blue-50 border border-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-full text-[9px]">
                            {quota.annual} DAYS
                          </span>
                        )}
                      </td>

                      {/* Emergency quota cell */}
                      <td className="px-4 py-3 border-r border-gray-50">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editEmergency}
                            onChange={(e) => setEditEmergency(Number(e.target.value))}
                            className="w-20 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 font-mono font-semibold text-gray-950 focus:ring-4 focus:ring-blue-500/5 outline-none"
                          />
                        ) : (
                          <span className="font-mono bg-orange-50 border border-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full text-[9px]">
                            {quota.emergency} DAYS
                          </span>
                        )}
                      </td>

                      {/* Sick quota cell */}
                      <td className="px-4 py-3 border-r border-gray-50">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editSick}
                            onChange={(e) => setEditSick(Number(e.target.value))}
                            className="w-20 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 font-mono font-semibold text-gray-950 focus:ring-4 focus:ring-blue-500/5 outline-none"
                          />
                        ) : (
                          <span className="font-mono bg-rose-50 border border-rose-100 text-rose-700 font-semibold px-2.5 py-1 rounded-full text-[9px]">
                            {quota.sick} DAYS
                          </span>
                        )}
                      </td>

                      {/* Quota Actions */}
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveQuota(emp.id)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] rounded-lg transition-colors shadow-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingQuotaUserId(null)}
                              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-[10px] font-semibold transition-colors shadow-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingQuota(emp.id, quota)}
                            className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-lg text-[10px] font-semibold transition-colors shadow-sm"
                          >
                            Edit Quota
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
