import React, { useState } from 'react';
import { Store } from '../utils/store';
import { User } from '../types';
import { Users, UserPlus, Trash2, Key, ShieldAlert, CheckCircle, Mail, Shield, UserX, UserCheck } from 'lucide-react';

interface EmployeeManagementProps {
  currentUser: User;
  onRefreshStats?: () => void;
}

export default function EmployeeManagement({ currentUser, onRefreshStats }: EmployeeManagementProps) {
  const [users, setUsers] = useState<User[]>(() => Store.getUsers());
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refreshUserList = () => {
    const list = Store.getUsers();
    setUsers(list);
    if (onRefreshStats) onRefreshStats();
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please provide the employee\'s full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid corporate email address.');
      return;
    }

    const currentUsers = Store.getUsers();
    const emailExists = currentUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (emailExists) {
      setError('An account with this email address is already registered.');
      return;
    }

    const newUserId = `user-${Date.now()}`;
    const newEmployee: User = {
      id: newUserId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role,
      joinedAt: new Date().toISOString(),
      firstTimePasswordChangeRequired: true,
      status: 'active'
    };

    // Save User
    Store.saveUsers([...currentUsers, newEmployee]);

    // Set Default Password to "Dialog123"
    const passwords = Store.getPasswords();
    passwords[newUserId] = 'Dialog123';
    Store.savePasswords(passwords);

    // Track activity
    Store.logActivity(
      currentUser.id,
      currentUser.name,
      'admin',
      'USER_CREATE',
      `Registered employee profile for ${newEmployee.name} (${newEmployee.email}) with temporary password 'Dialog123'.`
    );

    // Send Welcome Email Simulation
    Store.sendEmail(
      newEmployee.email,
      '👋 Welcome to GeoClock CRM - Your Temporary Credentials',
      `Hello ${newEmployee.name},\n\nYour profile has been successfully provisioned by ${currentUser.name}.\n\nYou can access the CRM at the link below:\n${window.location.origin}\n\nYour starting temporary password is:\nDialog123\n\nFor security compliance, you will be prompted to change this temporary password immediately upon your first login.\n\nRegards,\nGeoClock CRM Administration`,
      'system'
    );

    setName('');
    setEmail('');
    setRole('employee');
    setSuccess(`Successfully registered employee: "${newEmployee.name}"! An email containing starting password "Dialog123" has been sent.`);
    refreshUserList();
  };

  const handleDeleteEmployee = (id: string, employeeName: string) => {
    if (id === currentUser.id) {
      alert('You cannot delete your own administrative account.');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete employee "${employeeName}"? Their profiles and records will be deleted.`)) {
      const updated = Store.getUsers().filter(u => u.id !== id);
      Store.saveUsers(updated);

      // Clean password
      const passwords = Store.getPasswords();
      delete passwords[id];
      Store.savePasswords(passwords);

      // Track Activity
      Store.logActivity(
        currentUser.id,
        currentUser.name,
        'admin',
        'USER_DELETE',
        `Permanently purged employee profile and log registries for: "${employeeName}".`
      );

      setSuccess(`Purged employee record for "${employeeName}".`);
      refreshUserList();
    }
  };

  const handleToggleStatus = (id: string, currentStatus: 'active' | 'suspended', employeeName: string) => {
    if (id === currentUser.id) {
      alert('You cannot suspend your own administrative account.');
      return;
    }

    const nextStatus: 'active' | 'suspended' = currentStatus === 'active' ? 'suspended' : 'active';
    const updated = Store.getUsers().map(u => {
      if (u.id === id) {
        return { ...u, status: nextStatus };
      }
      return u;
    });
    Store.saveUsers(updated);

    // Track activity
    Store.logActivity(
      currentUser.id,
      currentUser.name,
      'admin',
      nextStatus === 'suspended' ? 'USER_SUSPEND' : 'USER_ACTIVATE',
      `${nextStatus === 'suspended' ? 'Suspended' : 'Re-activated'} employee credentials for: "${employeeName}".`
    );

    setSuccess(`Updated employee status for "${employeeName}" to ${nextStatus}.`);
    refreshUserList();
  };

  const handleAdminResetTrigger = (id: string, employeeName: string, employeeEmail: string) => {
    // Admin triggers a password reset email simulation
    const resetUrl = `${window.location.origin}${window.location.pathname}?resetUserId=${id}`;
    const mailBody = `Hello ${employeeName},\n\nAn administrator (${currentUser.name}) has initiated a password reset request for your GeoClock CRM profile.\n\nYou can click the link below to securely reset your password:\n${resetUrl}\n\nIf you did not request this, please contact support.\n\nRegards,\nGeoClock CRM Administration`;

    Store.sendEmail(
      employeeEmail,
      '🔑 Administrator Requested: Reset Password Link Request',
      mailBody,
      'password_reset'
    );

    // Track activity
    Store.logActivity(
      currentUser.id,
      currentUser.name,
      'admin',
      'USER_PASSWORD_RESET_TRIGGERED',
      `Sent custom password-reset url to employee inbox: ${employeeName} (${employeeEmail}).`
    );

    setSuccess(`Successfully generated and sent secure reset link to ${employeeEmail}. You can test this reset flow inside the simulated Inbox tab!`);
    refreshUserList();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-left">
      
      {/* Existing staff listing */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Corporate Employees ({users.length})
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Manage administrative credentials, trigger direct password resets, or toggle active accounts.</p>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl text-gray-400 text-xs font-medium tracking-wide shadow-[0_12px_30px_rgba(0,0,0,0.035)]">
            No employees registered in CRM. Use the form to enroll staff.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-3xl transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-500 uppercase tracking-wider font-semibold text-[9px]">
                  <th className="py-3 px-4 border-r border-gray-50">Employee</th>
                  <th className="py-3 px-4 border-r border-gray-50">Role / Access</th>
                  <th className="py-3 px-4 border-r border-gray-50">Account Status</th>
                  <th className="py-3 px-4 border-r border-gray-50 text-center">First-Time Change</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/40 transition-all">
                    <td className="py-3 px-4 border-r border-gray-50">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate leading-none">{user.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1 mt-1 truncate">
                            <Mail className="h-2.5 w-2.5 text-gray-300 shrink-0" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-r border-gray-50">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-medium tracking-wide bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full leading-none">
                          <Shield className="h-2.5 w-2.5 shrink-0" />
                          Manager
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[9px] font-medium tracking-wide bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full leading-none">
                          Staff
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 border-r border-gray-50">
                      {user.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Authorized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-rose-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 border-r border-gray-50 text-center">
                      {user.firstTimePasswordChangeRequired ? (
                        <span className="text-amber-700 bg-amber-50/50 border border-amber-100 px-2 py-0.5 rounded-full font-mono text-[9px] font-medium">
                          Pending Reset
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50/50 border border-emerald-100 px-2 py-0.5 rounded-full font-mono text-[9px] font-medium">
                          Completed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAdminResetTrigger(user.id, user.name, user.email)}
                          className="p-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-700 transition-colors"
                          title="Trigger Password Reset Link"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(user.id, user.status, user.name)}
                          className={`p-1.5 border rounded-lg transition-colors ${
                            user.status === 'active'
                              ? 'bg-amber-50/30 text-amber-600 border-amber-100 hover:bg-amber-50'
                              : 'bg-emerald-50/30 text-emerald-600 border-emerald-100 hover:bg-emerald-50'
                          }`}
                          title={user.status === 'active' ? 'Suspend Employee' : 'Activate Employee'}
                          disabled={user.id === currentUser.id}
                        >
                          {user.status === 'active' ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDeleteEmployee(user.id, user.name)}
                          className="p-1.5 bg-rose-50/40 hover:bg-rose-50 text-rose-600 border border-rose-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Purge Record"
                          disabled={user.id === currentUser.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enroll Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-3xl p-5 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <UserPlus className="h-4 w-4 text-blue-500" />
            Add Staff Member
          </h3>

          <form onSubmit={handleCreateEmployee} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs text-left font-medium animate-fade-in">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs text-left font-medium animate-fade-in">
                {success}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Michael Chen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition focus:bg-white text-gray-950 font-medium focus:ring-4 focus:ring-blue-500/5"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Corporate Email</label>
              <input
                type="email"
                placeholder="e.g. michael@geoclock.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition focus:bg-white text-gray-950 font-mono font-medium focus:ring-4 focus:ring-blue-500/5"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Role & Access Clearance</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition focus:bg-white text-gray-950 font-semibold focus:ring-4 focus:ring-blue-500/5 appearance-none"
              >
                <option value="employee">Staff (Gated Clock)</option>
                <option value="admin">Manager (Admin Access)</option>
              </select>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-2xl text-[10px] text-gray-500 text-left space-y-1 font-medium">
              <p className="font-semibold text-gray-800">Enrollment Policy:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Onboard pass is <code className="text-amber-800 bg-amber-50 border border-amber-100 px-1 py-0.5 font-mono">Dialog123</code></li>
                <li>Requires reset on first login</li>
                <li>Sends a simulated welcome mail</li>
              </ul>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-sm shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15 flex items-center justify-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              Enroll New Employee
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
