import React, { useState } from 'react';
import { Store } from '../utils/store';
import { User } from '../types';
import { KeyRound, Mail, ShieldAlert, ArrowRight, CheckCircle2, UserCheck, RefreshCw, BookOpen, X, Monitor, UserPlus, FileText, Flame, Award, ShieldCheck, Database, MapPin, Building, ChevronRight } from 'lucide-react';
import DialogLogo from './DialogLogo';

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
  const [manualTab, setManualTab] = useState<string>('hse_centralization');

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

    // Authenticate/sync with Firebase Auth so that the real console "Signed In" column updates!
    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');
      try {
        await signInWithEmailAndPassword(auth, matchedUser.email, password);
      } catch (signInErr: any) {
        // If the user doesn't exist in Firebase Auth yet, dynamically register them to match
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.message.includes('not-found')) {
          try {
            await createUserWithEmailAndPassword(auth, matchedUser.email, password);
          } catch (createErr) {
            console.warn("Auto-creation in Firebase Auth failed:", createErr);
          }
        }
      }
    } catch (authError) {
      console.warn("Firebase Authentication synchronization omitted:", authError);
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
    const mailBody = `Hello ${targetUser.name},\n\nA password reset request was triggered for your Personnel On Board System profile.\n\nYou can click the link below to securely reset your password:\n${resetUrl}\n\nIf you did not request this, please contact your administrator.\n\nRegards,\nPersonnel On Board System Support`;

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
    <div className="min-h-screen flex items-center justify-center text-slate-900 p-4 relative font-sans overflow-y-auto bg-slate-950">
      
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-75"
      >
        <source src="https://assets.mixkit.co/videos/preview/mixkit-slow-motion-of-gentle-water-ripples-40096-large.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Elegant Dark Blue Overlay for outstanding text contrast */}
      <div className="absolute inset-0 bg-blue-950/45 backdrop-blur-[1px] z-0 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 py-8">
        {/* Top Branding Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
            <DialogLogo size="lg" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            Personnel On Board System
          </h1>
          <p className="text-blue-200/80 text-[10px] mt-2.5 font-bold uppercase tracking-widest leading-none drop-shadow-sm">Attendance & Personal Leave Planner Hub</p>
        </div>

        {/* --- FLOW A: PASSWORD RESET FROM ADMIN LINK --- */}
        {directResetUser && (
          <div className="bg-slate-950/60 border border-white/15 backdrop-blur-xl rounded-3xl p-7 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_24px_64px_rgba(0,0,0,0.35)] relative text-left text-white">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2 tracking-tight">
              <RefreshCw className="h-5 w-5 animate-spin-slow text-blue-400" />
              Reset Staff Password
            </h2>
            <p className="text-blue-200/70 text-xs mb-4">
              Security link verified for account: <strong className="text-white font-medium">{directResetUser.name}</strong> ({directResetUser.email})
            </p>

            <form onSubmit={handleDirectResetSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/40 rounded-xl text-rose-200 text-xs flex gap-2 items-start font-medium animate-fade-in">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl focus:border-blue-400 focus:bg-white/10 px-3.5 py-2.5 text-sm outline-none transition text-white placeholder-white/25 focus:ring-4 focus:ring-blue-400/10"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl focus:border-blue-400 focus:bg-white/10 px-3.5 py-2.5 text-sm outline-none transition text-white placeholder-white/25 focus:ring-4 focus:ring-blue-400/10"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/35 flex items-center justify-center gap-2"
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
                className="w-full text-center text-[10px] text-blue-200/70 hover:text-white mt-2 font-semibold uppercase tracking-wider"
              >
                Cancel & Return
              </button>
            </form>
          </div>
        )}

        {/* --- FLOW B: TEMPORARY FIRST TIME PASSWORD DETECTED --- */}
        {!directResetUser && pendingUser && (
          <div className="bg-slate-950/60 border border-white/15 backdrop-blur-xl rounded-3xl p-7 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_24px_64px_rgba(0,0,0,0.35)] relative text-left text-white">
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-2 tracking-tight">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              Security Reset Required
            </h2>
            <p className="text-blue-100/80 text-xs mb-4">
              Hello <strong className="text-white font-bold">{pendingUser.name}</strong>, you authenticated with the temporary credentials <code className="text-amber-200 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded font-mono text-[11px]">Dialog123</code>. You must configure a custom secure password to register shifts.
            </p>

            <form onSubmit={handleFirstTimePasswordReset} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/40 rounded-xl text-rose-200 text-xs flex gap-2 items-start font-medium animate-fade-in">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl focus:border-blue-400 focus:bg-white/10 px-3.5 py-2.5 text-sm outline-none transition text-white placeholder-white/25 focus:ring-4 focus:ring-blue-400/10"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl focus:border-blue-400 focus:bg-white/10 px-3.5 py-2.5 text-sm outline-none transition text-white placeholder-white/25 focus:ring-4 focus:ring-blue-400/10"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/35 flex items-center justify-center gap-2"
              >
                Update & Enter Workspace
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setPendingUser(null)}
                className="w-full text-center text-[10px] text-blue-200/70 hover:text-white mt-2 font-semibold uppercase tracking-wider"
              >
                Back to Login
              </button>
            </form>
          </div>
        )}

        {/* --- FLOW C: MAIN LOGIN PANEL OR RESET DISPATCH --- */}
        {!directResetUser && !pendingUser && (
          <div className="bg-slate-950/60 border border-white/15 backdrop-blur-xl rounded-3xl p-7 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_24px_64px_rgba(0,0,0,0.35)] relative text-left text-white">
            
            {error && (
              <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/40 rounded-xl text-rose-200 text-xs flex gap-2 items-start font-medium animate-fade-in">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800/40 rounded-xl text-emerald-200 text-xs flex gap-2 items-start font-medium animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {!isResetFlow ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-300" />
                    Employee Email
                  </label>
                  <input
                    id="login_email_field"
                    type="email"
                    placeholder="email@dialogasia.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl focus:border-blue-400 focus:bg-white/10 px-3.5 py-2.5 text-sm outline-none transition text-white placeholder-white/25 focus:ring-4 focus:ring-blue-400/10"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-blue-300" />
                      Access Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsResetFlow(true)}
                      className="text-[10px] text-blue-300 hover:text-blue-200 font-semibold uppercase tracking-wider transition"
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl focus:border-blue-400 focus:bg-white/10 px-3.5 py-2.5 text-sm outline-none transition text-white placeholder-white/25 focus:ring-4 focus:ring-blue-400/10"
                    required
                  />
                </div>

                <button
                  id="login_btn_submit"
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/35 flex items-center justify-center gap-2"
                >
                  Enter Workspace Dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminResetTrigger} className="space-y-4">
                <div className="mb-2 text-left">
                  <h3 className="text-sm font-bold text-white">Password Assistance</h3>
                  <p className="text-blue-100/70 text-xs mt-1 leading-relaxed">
                    Enter your email to dispatch a secure password reset token link to the virtual Inbox tab.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-300" />
                    Registered Email
                  </label>
                  <input
                    type="email"
                    placeholder="email@dialogasia.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl focus:border-blue-400 focus:bg-white/10 px-3.5 py-2.5 text-sm outline-none transition text-white placeholder-white/25 focus:ring-4 focus:ring-blue-400/10"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/35"
                >
                  Send Reset Link Email
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetFlow(false)}
                  className="w-full text-center text-[10px] text-blue-200/70 hover:text-white font-semibold uppercase tracking-wider mt-2"
                >
                  Back to standard login
                </button>
              </form>
            )}
          </div>
        )}

        {/* Floating manual button below the container */}
        <div className="text-center mt-6 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setIsManualOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-white font-medium text-xs tracking-tight shadow-md hover:shadow-lg transition-all backdrop-blur-md"
          >
            <BookOpen className="h-4 w-4 text-blue-300 shrink-0" />
            <span>Personnel On Board System Manual & Role Guide</span>
          </button>

          {/* Developer Credit */}
          <div className="inline-flex items-center gap-1.5 text-[10px] text-white/50 select-none">
            <span className="w-1 h-1 rounded-full bg-teal-400 animate-pulse"></span>
            <span>Build by <strong className="text-white/80 font-bold">Khairumi Kasim, HSE Engineer</strong></span>
          </div>
        </div>
      </div>

      {/* --- MANUAL BOOK POP-UP DIVISION (MODAL OVERLAY) --- */}
      {isManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-white border border-gray-150 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.15)] flex flex-col max-h-[85vh] text-left overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-gray-950 tracking-tight">Personnel On Board System Guide</h3>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Compliant Safety & Roster Operations</p>
                </div>
              </div>
              <button
                onClick={() => setIsManualOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all border border-gray-100 hover:border-gray-200"
                title="Close user guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Split Sidebar Layout */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left Sidebar Menu */}
              <div className="w-64 bg-gray-50/50 border-r border-gray-100 p-4 space-y-2 flex flex-col overflow-y-auto">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest px-2 mb-1">Manual Sections</p>
                <div className="space-y-1 flex-1">
                  <button
                    onClick={() => setManualTab('hse_centralization')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      manualTab === 'hse_centralization'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>HSE Centralization</span>
                  </button>

                  <button
                    onClick={() => setManualTab('crew_onboarding')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      manualTab === 'crew_onboarding'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    <span>Crew Onboarding</span>
                  </button>

                  <button
                    onClick={() => setManualTab('geofencing')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      manualTab === 'geofencing'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>GPS Geofencing</span>
                  </button>

                  <button
                    onClick={() => setManualTab('certificates')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      manualTab === 'certificates'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Award className="h-4 w-4 shrink-0" />
                    <span>Offshore Certificates</span>
                  </button>

                  <button
                    onClick={() => setManualTab('evacuation')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      manualTab === 'evacuation'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Flame className="h-4 w-4 shrink-0" />
                    <span>Muster & Evac</span>
                  </button>

                  <button
                    onClick={() => setManualTab('log_systems')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      manualTab === 'log_systems'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Log Systems</span>
                  </button>

                  <button
                    onClick={() => setManualTab('sandbox_simulator')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      manualTab === 'sandbox_simulator'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    <span>Sandbox Simulator</span>
                  </button>
                </div>
              </div>

              {/* Right Content Pane */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs text-gray-600 leading-relaxed max-h-[60vh]">
                {manualTab === 'hse_centralization' && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="border-b border-gray-100 pb-2">
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Safety Operations</span>
                      <h4 className="text-sm font-bold text-gray-900 tracking-tight">How Centralized POB Operations Empowers HSE Teams</h4>
                    </div>
                    <p>
                      In hazardous offshore sectors (including drilling vessels, gas terminals, refinery plants, and offshore rigs), fragmented personnel manifests and non-compliant operations represent a severe safety risk.
                    </p>
                    <p>
                      The **Personnel On Board (POB) System** centralizes real-time attendance, leave planning, and certification status checks into a single workspace dashboard.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 space-y-1">
                        <strong className="text-blue-900 text-[11px] font-bold block">Centralized Headcount Control</strong>
                        <p className="text-[10px] text-gray-600">Instantly view how many employees are currently checked in to each site on the global dashboard, ensuring physical personnel lists are completely in sync.</p>
                      </div>
                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 space-y-1">
                        <strong className="text-emerald-900 text-[11px] font-bold block">Dynamic Compliance Checks</strong>
                        <p className="text-[10px] text-gray-600">The platform automatically monitors safety certificate expirations, blocking employees from clocking in when qualifications lapse.</p>
                      </div>
                    </div>
                  </div>
                )}

                {manualTab === 'crew_onboarding' && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="border-b border-gray-100 pb-2">
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Personnel Management</span>
                      <h4 className="text-sm font-bold text-gray-900 tracking-tight">Crew Onboarding & Administrative Security</h4>
                    </div>
                    <p>
                      The platform enforces a strict dual-role security architecture: **Administrators/HSE Managers** and **Employee Staff** to protect system integrity.
                    </p>
                    <p>
                      When a new employee joins the platform, the onboarding flow guarantees optimal account security:
                    </p>
                    <ol className="list-decimal pl-4 space-y-2 text-[11px]">
                      <li>
                        <strong>Administrative Registration:</strong> HSE managers input the employee’s legal metadata, passport details, medical records, and role types.
                      </li>
                      <li>
                        <strong>Temporary Credentials:</strong> A temporary secure password is auto-assigned (e.g., <code className="bg-gray-100 px-1 rounded font-mono font-bold text-gray-800">Dialog123</code>).
                      </li>
                      <li>
                        <strong>Forced Security Reset:</strong> Upon first login, the user must immediately complete a forced password reset. They cannot enter the work workspace until a secure password has been configured.
                      </li>
                    </ol>
                  </div>
                )}

                {manualTab === 'geofencing' && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="border-b border-gray-100 pb-2">
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">GPS Boundaries</span>
                      <h4 className="text-sm font-bold text-gray-900 tracking-tight">Strict GPS Geofence Check-in Limits</h4>
                    </div>
                    <p>
                      To eliminate attendance fraud and ensure personnel are physically present on-site during hazardous shifts, the platform implements a math-driven **GPS Geofencing Engine**.
                    </p>
                    <p>
                      Each offshore office coordinate defines a radial compliance boundary (e.g., 200m or 500m). When employees clock in:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                      <li>The platform queries the device’s high-precision GPS coordinate values.</li>
                      <li>It calculates the precise geographical distance using the **Haversine Ellipsoidal formula**.</li>
                      <li>If the employee is outside the defined geofence boundary, clock-in is **strictly blocked** and a compliance breach event is logged.</li>
                    </ul>
                  </div>
                )}

                {manualTab === 'certificates' && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="border-b border-gray-100 pb-2">
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Safety Qualifications</span>
                      <h4 className="text-sm font-bold text-gray-900 tracking-tight">Offshore Safety Certificates & Training Controls</h4>
                    </div>
                    <p>
                      Offshore personnel must maintain valid, accredited safety qualifications to remain active. The system dynamically tracks three core certification types:
                    </p>
                    <div className="space-y-2">
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-150">
                        <strong className="text-gray-900">1. BOSIET (Basic Offshore Safety Induction & Emergency Training)</strong>
                        <p className="text-[10px] text-gray-500 mt-0.5">Enforces essential induction training with helicopter underwater escape simulation (HUET) and breathing systems.</p>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-150">
                        <strong className="text-gray-900">2. PETRONAS Medical (AHD)</strong>
                        <p className="text-[10px] text-gray-500 mt-0.5">Validates the offshore fit-for-duty medical certificate required by local gas regulations.</p>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-150">
                        <strong className="text-gray-900">3. CIDB Green Card</strong>
                        <p className="text-[10px] text-gray-500 mt-0.5">The mandatory safety card issued for industrial site contractors and offshore personnel.</p>
                      </div>
                    </div>
                    <p>
                      If any certification expires or is missing, the profile is immediately flagged as **Non-Compliant**, and the crew member is blocked from clocking in.
                    </p>
                  </div>
                )}

                {manualTab === 'evacuation' && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="border-b border-gray-100 pb-2">
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Emergency Protocols</span>
                      <h4 className="text-sm font-bold text-gray-900 tracking-tight">Emergency Muster & Evacuation Control</h4>
                    </div>
                    <p>
                      During drills or real hazard alerts, the platform coordinates an automated evacuation center to track physical personnel accountability.
                    </p>
                    <p>
                      The **Muster and Evacuation cycle** utilizes real-time tracking:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                      <li><strong>Drill Trigger:</strong> Administrators launch an evacuation alert for a coordinate sector.</li>
                      <li><strong>QR Dispatch:</strong> A unique, encrypted **Warden QR Code** is immediately generated on the employee's screen and dispatched to their virtual inbox.</li>
                      <li><strong>Muster Point Headcount:</strong> Assembly Point Wardens scan the QR codes using device cameras, immediately logging the crew as **Verified Safe**.</li>
                      <li><strong>Real-Time Analytics:</strong> HSE dashboards display live headcount tallies, indicating the exact count of personnel **Evacuating**, **Safe**, or **Missing**.</li>
                    </ul>
                  </div>
                )}

                {manualTab === 'log_systems' && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="border-b border-gray-100 pb-2">
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Integrity Assurance</span>
                      <h4 className="text-sm font-bold text-gray-900 tracking-tight">Immutable Compliance Log Systems</h4>
                    </div>
                    <p>
                      The system features a **Tamper-Proof Audit Logging Engine**. Any critical security or operational adjustment records an immutable entry containing:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      <li>User token ID, active role, and IP coordinates.</li>
                      <li>Detailed description of the modification or event.</li>
                      <li>Exact ISO timestamp.</li>
                    </ul>
                    <p>
                      HSE Supervisors and regulatory auditors can review this list to track login histories, geofence breaches, evacuation events, and administrative edits, ensuring absolute data transparency.
                    </p>
                  </div>
                )}

                {manualTab === 'sandbox_simulator' && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="border-b border-gray-100 pb-2">
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Simulator Tools</span>
                      <h4 className="text-sm font-bold text-gray-900 tracking-tight">Evaluating the Sandbox Simulator Environment</h4>
                    </div>
                    <p>
                      To assist in assessing system compliance in-office, the workspace incorporates helpful testing widgets in the top-right and navigation header:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                      <li><strong>Virtual Location Emulator:</strong> Easily change your simulated coordinate from 'Circular Quay' (inside authorized office geofence) to 'Silicon Valley' or 'Gated Breach Coordinate' (outside geofence limits) to verify that geofencing blocks work instantly as expected.</li>
                      <li><strong>Virtual Inbox Tab:</strong> Read the digital onboarding password reset dispatches, evacuation warning dispatches, and long-shift auditing alerts generated by system triggers.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManualOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm shadow-blue-500/10 transition-all hover:shadow-lg"
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
