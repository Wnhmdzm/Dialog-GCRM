import React, { useState } from 'react';
import { Store } from '../utils/store';
import { PunchLog, User } from '../types';
import { FileSpreadsheet, FileText, Download, Printer, Users, Calendar, AlertTriangle, TrendingUp, Search, Tag, Eye } from 'lucide-react';

interface ReportsProps {
  currentUser: User;
}

export default function Reports({ currentUser }: ReportsProps) {
  const [logs, setLogs] = useState<PunchLog[]>(() => Store.getPunchLogs());
  const [users, setUsers] = useState<User[]>(() => Store.getUsers());
  
  // Search / Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  
  // Refresh state
  const refreshReports = () => {
    setLogs(Store.getPunchLogs());
    setUsers(Store.getUsers());
  };

  React.useEffect(() => {
    refreshReports();
  }, []);

  // Compute stats per employee
  const employeeSummaries = users
    .filter(u => u.role !== 'admin')
    .map(user => {
      // Find all completed punch-out logs to compute man-hours
      const userLogs = logs.filter(l => l.userId === user.id);
      const outPunches = userLogs.filter(l => l.type === 'out');
      const inPunches = userLogs.filter(l => l.type === 'in');

      // Calculate total manhours
      let totalHours = 0;
      let regularHours = 0;
      let overtimeHours = 0;

      outPunches.forEach(punch => {
        if (punch.manhours !== undefined) {
          totalHours += punch.manhours;
          // Say up to 8 hours is regular, anything over is overtime
          if (punch.manhours > 8.0) {
            regularHours += 8.0;
            overtimeHours += (punch.manhours - 8.0);
          } else {
            regularHours += punch.manhours;
          }
        }
      });

      // Calculate missing clock-outs
      let missingClockouts = 0;
      
      // Sort punches chronologically to trace pairs
      const sortedPunches = [...userLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      let lastIn: PunchLog | null = null;
      sortedPunches.forEach(p => {
        if (p.type === 'in') {
          if (lastIn) {
            missingClockouts++;
          }
          lastIn = p;
        } else if (p.type === 'out') {
          lastIn = null; // matched
        }
      });

      // If the last punch remains 'in' and it is older than 16 hours
      if (lastIn) {
        const elapsedHours = (Date.now() - new Date((lastIn as PunchLog).timestamp).getTime()) / (1000 * 60 * 60);
        if (elapsedHours > 16) {
          missingClockouts++;
        }
      }

      // Attendance active days (unique calendar days they punched 'in')
      const activeDaysSet = new Set(inPunches.map(p => p.timestamp.split('T')[0]));
      const activeDays = activeDaysSet.size;

      // Attendance rate (out of 5-day week, e.g. 5 days = 100%)
      const attendanceRate = Math.min(100, Math.round((activeDays / 5) * 100));

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalHours: parseFloat(totalHours.toFixed(2)),
        regularHours: parseFloat(regularHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        missingClockouts,
        activeDays,
        attendanceRate
      };
    });

  // Calculate high-level collective CRM stats
  const totalStaff = users.filter(u => u.role !== 'admin').length;
  const collectiveTotalHours = employeeSummaries.reduce((sum, item) => sum + item.totalHours, 0);
  const collectiveOvertime = employeeSummaries.reduce((sum, item) => sum + item.overtimeHours, 0);
  const collectiveMissingClockouts = employeeSummaries.reduce((sum, item) => sum + item.missingClockouts, 0);

  // Extract all unique tags present in punch records for quick filter tagging
  const allTags = ['All', ...Array.from(new Set(logs.flatMap(l => l.tags)))];

  // Filter logs for log exploration
  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (l.officeSiteName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === 'All' || l.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // EXPORT TO EXCEL/CSV (Excel compatible CSV generation)
  const handleExportCSV = () => {
    let csvContent = 'Staff ID,Employee Name,Email Address,Total Regular Hours,Total Overtime Hours,Accumulated Manhours,Active Workdays,Attendance Rate (%),Missing Clockouts\n';
    
    employeeSummaries.forEach(row => {
      csvContent += `"${row.id}","${row.name}","${row.email}",${row.regularHours},${row.overtimeHours},${row.totalHours},${row.activeDays},${row.attendanceRate},${row.missingClockouts}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GeoClock_Weekly_Manhours_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'EXPORT_REPORTS_EXCEL',
      'Exported weekly calculated corporate manhours to Microsoft Excel CSV spreadsheet.'
    );
  };

  // EXPORT TO PDF via native window print trigger
  const handlePrintPDF = () => {
    window.print();
    
    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'EXPORT_REPORTS_PDF',
      'Generated and printed corporate calculated man-hours report.'
    );
  };

  return (
    <div className="space-y-6 font-sans text-left print:p-0 animate-fade-in">
      
      {/* KPI Cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        
        <div className="bg-white rounded-3xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Total Staff</span>
              <span className="text-xl font-semibold text-gray-900 mt-2 block tracking-tight">{totalStaff} Employees</span>
            </div>
            <Users className="h-5 w-5 text-blue-500 shrink-0" />
          </div>
          <div className="text-[9px] text-gray-400 font-medium uppercase mt-2">Corporate CRM Records</div>
        </div>

        <div className="bg-white rounded-3xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Weekly Aggregate</span>
              <span className="text-xl font-semibold text-emerald-600 mt-2 block tracking-tight">{collectiveTotalHours.toFixed(1)} hrs</span>
            </div>
            <Calendar className="h-5 w-5 text-emerald-500 shrink-0" />
          </div>
          <div className="text-[9px] text-gray-400 font-medium uppercase mt-2">Approved Shift Hours</div>
        </div>

        <div className="bg-white rounded-3xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Weekly Overtime</span>
              <span className="text-xl font-semibold text-amber-600 mt-2 block tracking-tight">{collectiveOvertime.toFixed(1)} hrs</span>
            </div>
            <TrendingUp className="h-5 w-5 text-amber-500 shrink-0" />
          </div>
          <div className="text-[9px] text-gray-400 font-medium uppercase mt-2">Exceeding 8 hrs/day</div>
        </div>

        <div className="bg-white rounded-3xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Pending Audits</span>
              <span className={`text-xl font-semibold mt-2 block tracking-tight ${collectiveMissingClockouts > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                {collectiveMissingClockouts} Alerts
              </span>
            </div>
            <AlertTriangle className={`h-5 w-5 shrink-0 ${collectiveMissingClockouts > 0 ? 'text-rose-500 animate-pulse' : 'text-gray-300'}`} />
          </div>
          <div className="text-[9px] text-gray-400 font-medium uppercase mt-2">Missing Clockouts</div>
        </div>

      </div>

      {/* Corporate Summary Table & Controls */}
      <div className="bg-white rounded-3xl p-5 relative transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-100 gap-4 mb-4 print:hidden">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">Calculated Weekly Summary</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Aggregated regular hours, authorized overtime, and compliance rates per registered employee.</p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs border border-gray-200 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-gray-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-sm shadow-blue-500/10 flex items-center justify-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* PRINT ONLY HEADER DESIGN */}
        <div id="print_header" className="hidden print:block border-b border-gray-200 pb-4 mb-6 text-left">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Dialog CRM - Attendance Audit</h1>
              <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Exported: {new Date().toLocaleDateString()} | Auditor: {currentUser.name}</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 block">Classification</span>
              <span className="text-xs text-gray-900 font-mono font-medium">CONFIDENTIAL - SECURE CRM LOGS</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-500 uppercase tracking-wider font-semibold text-[9px]">
                <th className="py-2.5 px-4 border-r border-gray-50">Employee</th>
                <th className="py-2.5 px-4 text-center border-r border-gray-50">Active Days</th>
                <th className="py-2.5 px-4 text-right border-r border-gray-50">Regular</th>
                <th className="py-2.5 px-4 text-right border-r border-gray-50">Overtime</th>
                <th className="py-2.5 px-4 text-right border-r border-gray-50">Total Hours</th>
                <th className="py-2.5 px-4 text-center border-r border-gray-50">Alerts</th>
                <th className="py-2.5 px-4 text-right">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 text-[11px] font-medium">
              {employeeSummaries.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/20 transition">
                  <td className="py-3 px-4 border-r border-gray-50 flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{row.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{row.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-gray-600 font-medium border-r border-gray-50">
                    {row.activeDays} days
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-600 font-medium border-r border-gray-50">
                    {row.regularHours.toFixed(1)}h
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-amber-600 border-r border-gray-50">
                    {row.overtimeHours > 0 ? (
                      <span className="bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full text-[10px]">+{row.overtimeHours.toFixed(1)}h</span>
                    ) : (
                      <span className="text-gray-300 font-normal">0.0h</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900 border-r border-gray-50">
                    {row.totalHours.toFixed(1)}h
                  </td>
                  <td className="py-3 px-4 text-center border-r border-gray-50">
                    {row.missingClockouts > 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full font-sans font-medium text-[10px]">
                        <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
                        {row.missingClockouts} Missing
                      </span>
                    ) : (
                      <span className="text-gray-300 font-mono text-[10px] uppercase font-normal">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2.5 font-mono">
                      <span className="font-semibold text-gray-800">{row.attendanceRate}%</span>
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-transparent">
                        <div
                          className={`h-full rounded-full ${
                            row.attendanceRate > 80 ? 'bg-emerald-500' : row.attendanceRate > 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${row.attendanceRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Logs Exploration with Tagging and Search */}
      <div className="bg-white rounded-3xl p-5 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3 border-b border-gray-100 gap-4 mb-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">Shift Punch Log Registry</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Explore individual shift punch histories. Search by employee name or tags.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto shrink-0 justify-end">
            {/* Search */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-60 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-400 transition-all">
              <Search className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search member, site..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-gray-800 placeholder:text-gray-400 w-full font-medium"
              />
            </div>

            {/* Tag Quick Selector */}
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 w-full sm:w-auto focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-400 transition-all">
              <Tag className="h-4 w-4 text-gray-400 shrink-0" />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-gray-800 font-medium cursor-pointer"
              >
                {allTags.map((tg, i) => (
                  <option key={i} value={tg} className="text-gray-900 bg-white">{tg}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Log table */}
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs font-medium">
              No matching shift records.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-500 uppercase tracking-wider font-semibold text-[9px]">
                  <th className="py-2.5 px-4 border-r border-gray-50">Staff Member</th>
                  <th className="py-2.5 px-4 border-r border-gray-50">Action</th>
                  <th className="py-2.5 px-4 border-r border-gray-50">Timestamp</th>
                  <th className="py-2.5 px-4 border-r border-gray-50">Authorized Location</th>
                  <th className="py-2.5 px-4 border-r border-gray-50">Shift Notes & Tags</th>
                  <th className="py-2.5 px-4 text-right">Elapsed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 text-[11px] font-medium">
                {filteredLogs.slice().reverse().map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/20 transition">
                    <td className="py-3 px-4 border-r border-gray-50 flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                        {p.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{p.userName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{p.userEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-r border-gray-50">
                      {p.type === 'in' ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-semibold">PUNCH IN</span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-semibold">PUNCH OUT</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500 font-medium border-r border-gray-50">
                      {new Date(p.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-900 font-semibold border-r border-gray-50">
                      {p.officeSiteName || 'Site Verified'}
                    </td>
                    <td className="py-3 px-4 border-r border-gray-50">
                      <p className="text-gray-700 max-w-[200px] truncate font-medium" title={p.note}>{p.note}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.tags.map((tg, i) => (
                          <span key={i} className="text-[8px] bg-gray-50 text-gray-600 border border-gray-100 px-2 py-0.5 rounded-full font-medium">#{tg}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                      {p.manhours !== undefined ? `${p.manhours.toFixed(1)} hrs` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
