import React, { useState, useEffect } from 'react';
import { User, PunchLog, LeaveDay } from '../types';
import { Store } from '../utils/store';
import { User as UserIcon, Lock, Mail, Calendar, History, Clock, Trash2, Camera, Check, AlertTriangle, Shield, Save } from 'lucide-react';

interface UserProfileProps {
  currentUser: User;
  onProfileUpdate?: (updatedUser: User) => void;
}

export default function UserProfile({ currentUser, onProfileUpdate }: UserProfileProps) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Feedback states
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // History states
  const [myPunches, setMyPunches] = useState<PunchLog[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveDay[]>([]);
  
  const refreshHistory = () => {
    const allPunches = Store.getPunchLogs();
    const allLeaves = Store.getLeaveDays();
    
    // Filter for current user
    setMyPunches(allPunches.filter(p => p.userId === currentUser.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setMyLeaves(allLeaves.filter(l => l.userId === currentUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  useEffect(() => {
    refreshHistory();
    // Refresh history periodically
    const timer = setInterval(refreshHistory, 3000);
    return () => clearInterval(timer);
  }, [currentUser.id]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    if (!name.trim()) {
      setProfileError('Name field cannot be left blank.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setProfileError('Please provide a valid corporate email address.');
      return;
    }

    // Must be @dialogasia.com email format
    if (!email.toLowerCase().endsWith('@dialogasia.com')) {
      setProfileError('Email address must use the corporate @dialogasia.com suffix.');
      return;
    }

    const allUsers = Store.getUsers();
    // Check email uniqueness among other users
    const emailConflict = allUsers.some(u => u.id !== currentUser.id && u.email.toLowerCase() === email.toLowerCase().trim());
    if (emailConflict) {
      setProfileError('This email is already registered to another user profile.');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatarUrl: avatarUrl.trim() || undefined
    };

    const updatedUsers = allUsers.map(u => u.id === currentUser.id ? updatedUser : u);
    Store.saveUsers(updatedUsers);
    Store.saveCurrentUser(updatedUser);

    // Update denormalized items in punch logs
    const punchLogs = Store.getPunchLogs();
    const updatedPunches = punchLogs.map(p => {
      if (p.userId === currentUser.id) {
        return { ...p, userName: updatedUser.name, userEmail: updatedUser.email };
      }
      return p;
    });
    Store.savePunchLogs(updatedPunches);

    // Update denormalized items in leaves
    const leaveDays = Store.getLeaveDays();
    const updatedLeaves = leaveDays.map(l => {
      if (l.userId === currentUser.id) {
        return { ...l, userName: updatedUser.name };
      }
      return l;
    });
    Store.saveLeaveDays(updatedLeaves);

    Store.logActivity(
      currentUser.id,
      updatedUser.name,
      currentUser.role,
      'PROFILE_UPDATE',
      `Updated personal CRM profile configuration (Name: ${updatedUser.name}, Email: ${updatedUser.email}).`
    );

    setProfileSuccess('Your profile was successfully saved and synced with the cloud.');
    if (onProfileUpdate) {
      onProfileUpdate(updatedUser);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    const passwords = Store.getPasswords();
    const activePass = passwords[currentUser.id];

    if (currentPassword !== activePass) {
      setPasswordError('The current password you entered is incorrect.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Your new password must be at least 6 characters.');
      return;
    }

    if (newPassword === 'Dialog123') {
      setPasswordError('You cannot reuse the default temporary "Dialog123" password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('The new password and password confirmation do not match.');
      return;
    }

    passwords[currentUser.id] = newPassword;
    Store.savePasswords(passwords);

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'PASSWORD_UPDATE',
      'Changed personal CRM dashboard access credentials.'
    );

    setPasswordSuccess('Your password has been securely updated.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleDeletePunchLog = (punchId: string) => {
    if (confirm('Are you sure you want to permanently delete this clock-in/out attendance log? This action is irreversible.')) {
      const allPunches = Store.getPunchLogs();
      const updated = allPunches.filter(p => p.id !== punchId);
      Store.savePunchLogs(updated);
      setMyPunches(updated.filter(p => p.userId === currentUser.id));
      
      Store.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'PUNCH_LOG_DELETE',
        `Permanently deleted attendance punch log entry (ID: ${punchId}).`
      );
    }
  };

  const handleDeleteLeaveRequest = (leaveId: string) => {
    if (confirm('Are you sure you want to cancel and permanently delete this leave request?')) {
      const allLeaves = Store.getLeaveDays();
      const target = allLeaves.find(l => l.id === leaveId);
      if (!target) return;

      const updated = allLeaves.filter(l => l.id !== leaveId);
      Store.saveLeaveDays(updated);
      setMyLeaves(updated.filter(l => l.userId === currentUser.id));

      Store.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'LEAVE_CANCEL_PROFILE',
        `Cancelled and deleted leave request for ${target.date} (${target.type})`
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-left">
      
      {/* Edit Profile Column */}
      <div className="space-y-6">
        
        {/* Profile Card Summary */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          <div className="relative mt-4 cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
            <div className="h-20 w-20 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center font-bold text-blue-600 text-3xl overflow-hidden shadow-inner group-hover:opacity-85 transition">
              {avatarUrl ? (
                <img src={avatarUrl} alt={currentUser.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                currentUser.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-lg border border-white group-hover:scale-110 transition">
              <Camera className="h-3.5 w-3.5" />
            </div>
          </div>

          <h3 className="text-base font-bold text-gray-950 mt-4 leading-none">{currentUser.name}</h3>
          <p className="text-xs text-gray-400 font-mono mt-1.5">{currentUser.email}</p>
          
          <div className="mt-4 flex items-center gap-2">
            {currentUser.role === 'admin' ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider bg-zinc-950 text-white px-2.5 py-1 rounded-full">
                <Shield className="h-3 w-3 text-blue-400 shrink-0" />
                Manager Access
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                HSE Staff Group
              </span>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 w-full text-left flex items-center justify-between text-xs text-gray-400">
            <span>Joined date:</span>
            <span className="font-medium text-gray-700">{new Date(currentUser.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Profile Details Form */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100">
          <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-blue-500" />
            Edit Profile Parameters
          </h4>

          {profileError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-700 flex items-start gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{profileSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Corporate Email (@dialogasia.com)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white text-gray-900 font-mono font-medium focus:border-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Avatar Image URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white text-gray-900 font-mono focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition"
            >
              <Save className="h-3.5 w-3.5" />
              Save Profile
            </button>
          </form>
        </div>
      </div>

      {/* Security & Password Column */}
      <div className="space-y-6">
        
        {/* Security Password Form */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100">
          <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-500" />
            Update Credentials
          </h4>

          {passwordError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-700 flex items-start gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white text-gray-900 focus:border-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">New Secure Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="•••••••• (Min 6 chars)"
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white text-gray-900 focus:border-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white text-gray-900 focus:border-blue-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition"
            >
              <Lock className="h-3.5 w-3.5" />
              Change Password
            </button>
          </form>
        </div>

        {/* HSE System Info Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl">
          <h4 className="text-xs font-bold uppercase text-blue-400 tracking-wider mb-2">HSE Compliance Checklist</h4>
          <p className="text-slate-300 text-[11px] leading-relaxed mb-4">
            You are operating within the DIALOG Group attendance CRM. Under regional geofence requirements:
          </p>
          <ul className="text-[10px] text-slate-400 space-y-2 list-disc pl-4 text-left">
            <li>Keep coordinate detection active on your mobile app when clocking in.</li>
            <li>Register any planned absence or rest leave at least 24h prior.</li>
            <li>In case of workplace emergency, immediately open the **Emergency Evacuation** module.</li>
          </ul>
        </div>
      </div>

      {/* Track Record & History Column */}
      <div className="space-y-6">
        
        {/* Punch Logs History */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100">
          <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Punch Log History
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{myPunches.length}</span>
          </h4>

          {myPunches.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No clock-in or clock-out logs registered.</p>
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {myPunches.map((p) => {
                const clockIn = p.type === 'in';
                const date = new Date(p.timestamp);
                return (
                  <div key={p.id} className="p-3 bg-gray-50/50 border border-gray-150 rounded-2xl flex items-center justify-between text-xs transition hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${clockIn ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div>
                        <p className="font-semibold text-gray-950">{clockIn ? 'Clocked In' : 'Clocked Out'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {p.officeSiteName && (
                        <span className="text-[9px] bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded-full max-w-[90px] truncate">
                          {p.officeSiteName}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeletePunchLog(p.id)}
                        className="p-1 text-gray-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete Attendance Record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leave Requests History */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100">
          <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Personal Leave Log
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{myLeaves.length}</span>
          </h4>

          {myLeaves.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No leave requests logged yet.</p>
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {myLeaves.map((l) => {
                const date = new Date(l.date);
                const statusColor = l.status === 'Approved' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : l.status === 'Pending' 
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : 'bg-rose-50 text-rose-700 border-rose-100';

                return (
                  <div key={l.id} className="p-3 bg-gray-50/50 border border-gray-150 rounded-2xl flex items-center justify-between text-xs transition hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-950">{l.type} Leave</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ${statusColor}`}>
                        {l.status}
                      </span>
                      <button
                        onClick={() => handleDeleteLeaveRequest(l.id)}
                        className="p-1 text-gray-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Cancel & Delete Leave Request"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
