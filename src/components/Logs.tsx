import React, { useState } from 'react';
import { Store } from '../utils/store';
import { ActivityLog, User } from '../types';
import { ShieldCheck, Info, Clock, Search, RefreshCw, Trash2 } from 'lucide-react';

interface LogsProps {
  currentUser: User;
}

export default function Logs({ currentUser }: LogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>(() => Store.getActivityLogs());
  const [searchQuery, setSearchQuery] = useState('');

  const refreshLogs = () => {
    setLogs(Store.getActivityLogs());
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to completely clear the administration activity log history? This action is irreversible.')) {
      const systemLog: ActivityLog = {
        id: `act-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'LOGS_CLEARED',
        details: 'Admin purged the activity history. System reboot trace established.',
        timestamp: new Date().toISOString()
      };
      Store.saveActivityLogs([systemLog]);
      setLogs([systemLog]);
    }
  };

  const filteredLogs = logs.filter(l => 
    l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
            Security Activity Audit Log
          </h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">Read-only immutable historical audit trails tracking password resets, geofence adjustments, and manager overrides.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          {/* Search box */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-56 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-400 transition-all">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-gray-800 placeholder:text-gray-400 w-full font-medium"
            />
          </div>

          <button
            onClick={refreshLogs}
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl transition shadow-sm"
            title="Refresh Logs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={handleClearLogs}
            className="p-2.5 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-500 border border-gray-200 rounded-xl transition shadow-sm"
            title="Clear Activity Trail"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden max-h-[480px] overflow-y-auto shadow-[0_8px_30px_rgb(0,0,0,0.012)]">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-xs font-medium">
            No matching security logs.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 text-xs">
            {filteredLogs.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div className="space-y-2">
                  <div className="flex items-center flex-wrap gap-2.5">
                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {new Date(item.timestamp).toLocaleString()}
                    </span>

                    {/* Action badge */}
                    <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                      item.action.includes('BOOT') || item.action.includes('ACTIVATE')
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.action.includes('DELETE') || item.action.includes('SUSPEND')
                        ? 'bg-rose-50 text-rose-700'
                        : item.action.includes('PASSWORD') || item.action.includes('RESET')
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50/50 text-blue-700'
                    }`}>
                      {item.action}
                    </span>

                    {/* Actor name */}
                    <span className="text-[10px] text-gray-500 font-medium">
                      {item.userName} ({item.userRole === 'admin' ? 'Manager' : 'Staff'})
                    </span>
                  </div>

                  {/* Details */}
                  <p className="text-gray-700 text-[11px] leading-relaxed font-sans font-medium">{item.details}</p>
                </div>

                <span className="text-[9px] text-gray-400 font-mono text-right shrink-0">
                  ID: {item.id.replace('act-', '')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl text-xs text-blue-800 text-left flex gap-2.5 font-medium shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">Activity records are generated automatically by internal system triggers following successful user authorizations or staff record modifications. Logs are tamper-proof.</p>
      </div>
    </div>
  );
}
