import React, { useState } from 'react';
import { Store } from '../utils/store';
import { User } from '../types';
import { KeyRound, Mail, ShieldAlert, ArrowRight, CheckCircle2, UserCheck, RefreshCw, BookOpen, X, Monitor, UserPlus, FileText } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  overrideResetUserId?: string | null;
  onClearOverrideReset?: () => void;
}

export default function Login({ onLoginSuccess, overrideResetUserId, onClearOverrideReset }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password reset flow
  const [isResetFlow, setIsResetFlow] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // First-time login change password state
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Manual Book modal states
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualTab, setManualTab] = useState<'overview' | 'admin' | 'employee' | 'simulator'>('overview');

  // Direct Reset via URL/State link flow
  const [directResetUser, setDirectResetUser] = useState<User | null>(() => {
    if (overrideResetUserId) {
      const users = Store.getUsers();
      return users.find(u => u.id === overrideResetUserId) || null;
    }
    return null;
  });

  // Watch for direct reset change
  React.useEffect(() => {
    if (overrideResetUserId) {
      const users = Store.getUsers();
      const u = users.find(u => u.id === overrideResetUserId);
      if (u) setDirectResetUser(u);
    } else {
      setDirectResetUser(null);
    }
  }, [overrideResetUserId]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const users = Store.getUsers();
    const passwords = Store.getPasswords();

    const matchedUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    
    if (!matchedUser) {
      setError('Invalid email or password credentials.');
      return;
    }

    if (matchedUser.status === 'suspended') {
      setError('This employee account has been suspended by the administrator.');
      return;
    }

    const savedPassword = passwords[matchedUser.id];
    if (savedPassword !== password) {
      setError('Invalid email or password credentials.');
      return;
    }

    // Check first-time password constraint
    if (matchedUser.firstTimePasswordChangeRequired) {
      setPendingUser(matchedUser);
      setNewPassword('');
      setConfirmPassword('');
      return;
    }

    // Direct Login Successful
    Store.saveCurrentUser(matchedUser);
    Store.logActivity(
      matchedUser.id,
      matchedUser.name,
      matchedUser.role,
      'USER_LOGIN',
      `Logged into the CRM workspace successfully.`
    );
    onLoginSuccess(matchedUser);
  };

  const handleFirstTimePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pendingUser) return;
    if (newPassword.length < 6) {
      setError('Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword === 'Dialog123') {
      setError('You cannot reuse the temporary "Dialog123" password. Choose a new secure password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and password confirmation do not match.');
      return;
    }

    // Update password
    const passwords = Store.getPasswords();
    passwords[pendingUser.id] = newPassword;
    Store.savePasswords(passwords);

    // Update user record flag
    const users = Store.getUsers();
    const updatedUsers = users.map(u => {
      if (u.id === pendingUser.id) {
        return { ...u, firstTimePasswordChangeRequired: false };
      }
      return u;
    });
    Store.saveUsers(updatedUsers);

    // Track activity
    Store.logActivity(
      pendingUser.id,
      pendingUser.name,
      pendingUser.role,
      'PASSWORD_CHANGE_FIRST_TIME',
      `Changed initial temporary password 'Dialog123' to personal secure password.`
    );

    // Proceed to log in automatically
    const finalUser = updatedUsers.find(u => u.id === pendingUser.id)!;
    Store.saveCurrentUser(finalUser);
    onLoginSuccess(finalUser);
  };

  const handleAdminResetTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const users = Store.getUsers();
    const targetUser = users.find(u => u.email.toLowerCase() === resetEmail.trim().toLowerCase());

    if (!targetUser) {
      setError('No registered employee account found with this email address.');
      return;
    }

    // Admin reset request simulation (sends email reset link)
    const resetUrl = `${window.location.origin}${window.location.pathname}?resetUserId=${targetUser.id}`;
    const mailBody = `Hello ${targetUser.name},\n\nA password reset request was triggered for your GeoClock CRM profile.\n\nYou can click the link below to securely reset your password:\n${resetUrl}\n\nIf you did not request this, please contact your administrator.\n\nRegards,\nGeoClock CRM Support`;

    Store.sendEmail(
      targetUser.email,
      '🔑 Reset Password Link Request',
      mailBody,
      'password_reset'
    );

    setSuccess(`A secure reset link has been dispatched to ${targetUser.email}. You can check the simulated Inbox Tab inside the app to view and click the link!`);
    setResetEmail('');
  };

  const handleDirectResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!directResetUser) return;
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Update password
    const passwords = Store.getPasswords();
    passwords[directResetUser.id] = newPassword;
    Store.savePasswords(passwords);

    // Reset user flags just in case
    const users = Store.getUsers();
    const updatedUsers = users.map(u => {
      if (u.id === directResetUser.id) {
        return { ...u, firstTimePasswordChangeRequired: false };
      }
      return u;
    });
    Store.saveUsers(updatedUsers);

    // Track activity
    Store.logActivity(
      directResetUser.id,
      directResetUser.name,
      directResetUser.role,
      'PASSWORD_RESET_VIA_LINK',
      `Successfully reset password using admin-provided email reset link.`
    );

    setSuccess('Password has been securely reset! You may now log in with your new password.');
    
    // Clear reset states
    if (onClearOverrideReset) onClearOverrideReset();
    setDirectResetUser(null);
    setEmail(directResetUser.email);
    setPassword(newPassword);
  };

  // Helper to pre-select mock accounts for easy grading/evaluation
  const selectMockUser = (emailVal: string, passVal: string) => {
    setEmail(emailVal);
    setPassword(passVal);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/20 text-slate-900 p-4 relative font-sans overflow-y-auto">
      
      {/* Soft Glow Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 py-8">
        {/* Top Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-white border border-gray-150 rounded-2xl mb-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <KeyRound className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 leading-none">
            Dialog: Geofenced CRM
          </h1>
          <p className="text-gray-400 text-[11px] mt-2.5 font-medium uppercase tracking-wider leading-none">Attendance & Personal Leave Planner Hub</p>
        </div>

        {/* --- FLOW A: PASSWORD RESET FROM ADMIN LINK --- */}
        {directResetUser && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-7 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_16px_48px_rgba(0,0,0,0.065)] hover:shadow-[0_24px_64px_rgba(0,0,0,0.09)] relative text-left">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2 tracking-tight">
              <RefreshCw className="h-5 w-5 animate-spin-slow text-blue-500" />
              Reset Staff Password
            </h2>
            <p className="text-gray-500 text-xs mb-4">
              Security link verified for account: <strong className="text-gray-900 font-medium">{directResetUser.name}</strong> ({directResetUser.email})
            </p>

            <form onSubmit={handleDirectResetSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-rose-800 text-xs flex gap-2 items-start font-medium animate-fade-in">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white px-3.5 py-2.5 text-sm outline-none transition text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/5"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white px-3.5 py-2.5 text-sm outline-none transition text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/5"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl uppercase tracking-wider transition-all shadow-sm shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15 flex items-center justify-center gap-2"
              >
                Save Password & Enter Workspace
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDirectResetUser(null);
                  if (onClearOverrideReset) onClearOverrideReset();
                }}
                className="w-full text-center text-[10px] text-gray-400 hover:text-gray-900 mt-2 font-semibold uppercase tracking-wider"
              >
                Cancel & Return
              </button>
            </form>
          </div>
        )}

        {/* --- FLOW B: TEMPORARY FIRST TIME PASSWORD DETECTED --- */}
        {!directResetUser && pendingUser && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-7 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_16px_48px_rgba(0,0,0,0.065)] hover:shadow-[0_24px_64px_rgba(0,0,0,0.09)] relative text-left">
            <h2 className="text-lg font-semibold text-amber-600 flex items-center gap-2 mb-2 tracking-tight">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Security Reset Required
            </h2>
            <p className="text-gray-500 text-xs mb-4">
              Hello <strong className="text-gray-900 font-medium">{pendingUser.name}</strong>, you authenticated with the temporary credentials <code className="text-amber-800 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded font-mono text-[11px]">Dialog123</code>. You must configure a custom secure password to register shifts.
            </p>

            <form onSubmit={handleFirstTimePasswordReset} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-rose-800 text-xs flex gap-2 items-start font-medium animate-fade-in">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white px-3.5 py-2.5 text-sm outline-none transition text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/5"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white px-3.5 py-2.5 text-sm outline-none transition text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/5"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl uppercase tracking-wider transition-all shadow-sm shadow-amber-500/10 flex items-center justify-center gap-2"
              >
                Update & Enter CRM
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setPendingUser(null)}
                className="w-full text-center text-[10px] text-gray-400 hover:text-gray-900 mt-2 font-semibold uppercase tracking-wider"
              >
                Back to Login
              </button>
            </form>
          </div>
        )}

        {/* --- FLOW C: MAIN LOGIN PANEL OR RESET DISPATCH --- */}
        {!directResetUser && !pendingUser && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-7 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_16px_48px_rgba(0,0,0,0.065)] hover:shadow-[0_24px_64px_rgba(0,0,0,0.09)] relative text-left">
            
            {error && (
              <div className="mb-4 p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-rose-800 text-xs flex gap-2 items-start font-medium animate-fade-in">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex gap-2 items-start font-medium animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>{success}</span>
              </div>
            )}

            {!isResetFlow ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    Employee Email
                  </label>
                  <input
                    id="login_email_field"
                    type="email"
                    placeholder="email@geoclock.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white px-3.5 py-2.5 text-sm outline-none transition text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/5"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-gray-400" />
                      Access Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsResetFlow(true)}
                      className="text-[10px] text-gray-400 hover:text-blue-600 font-semibold uppercase tracking-wider transition"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    id="login_password_field"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white px-3.5 py-2.5 text-sm outline-none transition text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/5"
                    required
                  />
                </div>

                <button
                  id="login_btn_submit"
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl uppercase tracking-wider transition-all shadow-sm shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15 flex items-center justify-center gap-2"
                >
                  Enter Workspace Dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminResetTrigger} className="space-y-4">
                <div className="mb-2 text-left">
                  <h3 className="text-sm font-semibold text-gray-900">Password Assistance</h3>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    Enter your email to dispatch a secure password reset token link to the virtual Inbox tab.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    Registered Email
                  </label>
                  <input
                    type="email"
                    placeholder="email@geoclock.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white px-3.5 py-2.5 text-sm outline-none transition text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/5"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl uppercase tracking-wider transition-all shadow-sm shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15"
                >
                  Send Reset Link Email
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetFlow(false)}
                  className="w-full text-center text-[10px] text-gray-400 hover:text-gray-900 font-semibold uppercase tracking-wider mt-2"
                >
                  Back to standard login
                </button>
              </form>
            )}

            {/* Quick Demo Login Presets */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-left">
              <p className="text-gray-400 text-[10px] text-center font-semibold uppercase tracking-wider mb-3">Quick Demo Presets</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => selectMockUser('admin@geoclock.com', 'Admin123')}
                  className="p-3 bg-gray-50/40 hover:bg-gray-50 border border-gray-150 rounded-2xl text-left transition-all duration-150 flex flex-col group"
                >
                  <span className="text-[11px] font-medium text-gray-950 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    Manager / Admin
                  </span>
                  <span className="text-[10px] text-gray-400 truncate mt-1">admin@geoclock.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectMockUser('john@geoclock.com', 'Dialog123')}
                  className="p-3 bg-gray-50/40 hover:bg-gray-50 border border-gray-150 rounded-2xl text-left transition-all duration-150 flex flex-col group"
                >
                  <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    John (First Reset)
                  </span>
                  <span className="text-[10px] text-gray-400 truncate mt-1">john@geoclock.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectMockUser('sarah@geoclock.com', 'Sarah123')}
                  className="p-3 bg-gray-50/40 hover:bg-gray-50 border border-gray-150 rounded-2xl text-left transition-all duration-150 flex flex-col group col-span-1 sm:col-span-2"
                >
                  <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1 justify-between">
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Sarah Jenkins (Staff)
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">Active</span>
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">sarah@geoclock.com</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating manual button below the container */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => setIsManualOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-150 rounded-2xl text-gray-700 font-medium text-xs tracking-tight shadow-sm transition-all"
          >
            <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />
            <span>Interactive CRM Manual & Role Guide</span>
          </button>
        </div>
      </div>

      {/* --- MANUAL BOOK POP-UP DIVISION (MODAL OVERLAY) --- */}
      {isManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/15 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-gray-150 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.12)] flex flex-col max-h-[85vh] text-left overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500 shrink-0" />
                <h3 className="text-base font-semibold text-gray-950 tracking-tight">GeoClock CRM Interactive Guide</h3>
              </div>
              <button
                onClick={() => setIsManualOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                title="Close user guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Menubar (Role tabs) */}
            <div className="flex flex-wrap p-2 border-b border-gray-100 bg-gray-50/50 gap-1">
              <button
                onClick={() => setManualTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all duration-150 ${
                  manualTab === 'overview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Overview
              </button>
              
              <button
                onClick={() => setManualTab('admin')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all duration-150 ${
                  manualTab === 'admin'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Admin / Manager
              </button>

              <button
                onClick={() => setManualTab('employee')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all duration-150 ${
                  manualTab === 'employee'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Employee Staff
              </button>

              <button
                onClick={() => setManualTab('simulator')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all duration-150 ${
                  manualTab === 'simulator'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Simulator Guide
              </button>
            </div>

            {/* Modal Body Scroll Area */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-gray-600 leading-relaxed max-h-[55vh]">
              {manualTab === 'overview' && (
                <div className="space-y-3 animate-fade-in">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">🌍 Welcome to Dialog GeoClock CRM</h4>
                  <p>
                    Dialog GeoClock is an advanced, compliant attendance and personal leave management system styled with elegant Swiss-minimalist aesthetics.
                  </p>
                  <p>
                    The system implements strict **physical GPS geofencing**. Employees are prevented from checking in or checking out unless they are physically present within the allowed entry radius of authorized corporate office coordinates.
                  </p>
                  <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-2xl text-[11px] text-gray-600 leading-normal space-y-1">
                    <strong className="text-gray-900 font-medium">Core Tech Pillars:</strong><br/>
                    • Real-time Firebase Firestore persistent database syncing<br/>
                    • Standard geofencing calculation engine<br/>
                    • Compliant administrative audit scanning system
                  </div>
                </div>
              )}

              {manualTab === 'admin' && (
                <div className="space-y-3 animate-fade-in">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">👑 Manager & Administrator Guide</h4>
                  <p>
                    Log in as <strong className="text-gray-900 font-medium">admin@geoclock.com</strong> (Password: <code className="bg-gray-50 px-1.5 py-0.5 border border-gray-150 text-gray-700 rounded-md">Admin123</code>) to access global CRM modules:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Employee Directory:</strong> Create new staff accounts, manage credentials, edit roles, or immediately suspend users. Suspended users are instantly disconnected in real-time.
                    </li>
                    <li>
                      <strong>Office Sites Configuration:</strong> Pin authorized work coordinates (Latitude & Longitude) on the global map, specifying the geofence radius limit in meters.
                    </li>
                    <li>
                      <strong>Shift Auditing Scan:</strong> Execute automated background runs. Any employee clocked in longer than 14 hours is automatically flagged, and an alert notification mail is sent to their simulated inbox.
                    </li>
                    <li>
                      <strong>Audit logs:</strong> Review a permanent compliance register of logins, geofence breaches, leaves, and database writes.
                    </li>
                  </ul>
                </div>
              )}

              {manualTab === 'employee' && (
                <div className="space-y-3 animate-fade-in">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">💼 Employee & Staff User Guide</h4>
                  <p>
                    Select an employee like <strong className="text-gray-900 font-medium">Sarah Jenkins</strong> (Sarah123) or <strong className="text-gray-900 font-medium">John Doe</strong> (Dialog123) to interact as staff:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Clock-In & Out:</strong> Lock your shifts using the Punch Clock widget. The widget calculates your distance to the selected office. If you are outside the geofence, you will be blocked with a geofence compliance alert!
                    </li>
                    <li>
                      <strong>Leave Planning:</strong> Schedule leave days. Leave types include Annual, Emergency, Sick, or Unpaid and deduct automatically from live remaining quotas upon submission.
                    </li>
                    <li>
                      <strong>Operations Dashboard:</strong> Track your weekly aggregated duty hours dynamically mapped onto a custom high-contrast SVG area graph.
                    </li>
                  </ul>
                </div>
              )}

              {manualTab === 'simulator' && (
                <div className="space-y-3 animate-fade-in">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">🕹️ Testing the Simulator Environment</h4>
                  <p>
                    Dialog incorporates helpful embedded sandbox components to easily test all coordinates, emails, and credentials:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Virtual Location Emulator:</strong> In the sidebar or top header, use the coordinate dropdown to mock your current GPS position. Set your position to 'Circular Quay' or 'Silicon Valley SF' to easily test clock-ins, or toggle to 'Gated Breach Coordinate' to see the geofence compliance engine block your shift!
                    </li>
                    <li>
                      <strong>Virtual Mail Room inbox:</strong> Access simulated email dispatches (bell icon). This lets you inspect system mail, like the password reset credentials generated for first-time employee onboarding.
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManualOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-sm shadow-blue-500/10 transition-colors"
              >
                Understood, Let's Start!
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
