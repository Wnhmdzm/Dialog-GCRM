import React, { useState, useEffect } from 'react';
import { Store } from '../utils/store';
import { PunchLog, User, OfficeSite } from '../types';
import { getDistanceMeters, formatDistance } from '../utils/geo';
import { LayoutDashboard, Clock, MapPin, Tag, Search, ArrowRight, ShieldAlert, BadgeAlert, Plus, CheckCircle2, ChevronRight, UserCheck, Calendar } from 'lucide-react';

interface DashboardProps {
  currentUser: User;
  onNavigateToTab: (tabId: string) => void;
}

export default function Dashboard({ currentUser, onNavigateToTab }: DashboardProps) {
  const isAdmin = currentUser.role === 'admin';

  // State
  const [logs, setLogs] = useState<PunchLog[]>(() => Store.getPunchLogs());
  const [offices, setOffices] = useState<OfficeSite[]>(() => Store.getOffices());
  const [currentLocation, setCurrentLocation] = useState(() => Store.getSimulatedLocation());

  // Search & Tagging state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);

  // Quick custom tagging modal/flow
  const [taggingLogId, setTaggingLogId] = useState<string | null>(null);
  const [newTagVal, setNewTagVal] = useState('');

  // Sync state periodically
  useEffect(() => {
    const handleSync = () => {
      setLogs(Store.getPunchLogs());
      setOffices(Store.getOffices());
      setCurrentLocation(Store.getSimulatedLocation());
    };
    const interval = setInterval(handleSync, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute nearest office site geofence status dynamically
  let gpsStatusLabel = currentLocation.name;
  let activeOffice: OfficeSite | null = null;
  let nearestOffice: OfficeSite | null = null;
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
    gpsStatusLabel = `Authorized: ${activeOffice.name}`;
  } else if (nearestOffice) {
    gpsStatusLabel = `Away / Near ${nearestOffice.name} (${formatDistance(minDistanceMeters)})`;
  } else {
    gpsStatusLabel = currentLocation.name;
  }

  // Filter logs based on search query and active filter tag
  const filteredLogs = logs.filter(log => {
    const isOwner = isAdmin || log.userId === currentUser.id;
    if (!isOwner) return false;

    const matchesSearch = log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (log.officeSiteName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = !activeFilterTag || log.tags.includes(activeFilterTag);

    return matchesSearch && matchesTag;
  });

  // Calculate stats
  const activeStaffCount = Array.from(
    new Set(
      logs
        .filter(l => l.type === 'in' && !logs.some(out => out.userId === l.userId && out.type === 'out' && new Date(out.timestamp).getTime() > new Date(l.timestamp).getTime()))
        .map(l => l.userId)
    )
  ).length;

  const totalLogsCount = logs.length;

  // Personal metrics (Employee-only)
  const myLogs = logs.filter(l => l.userId === currentUser.id);
  const isClockedIn = myLogs.length > 0 && myLogs[myLogs.length - 1].type === 'in';
  const myLastPunch = myLogs.length > 0 ? myLogs[myLogs.length - 1] : null;

  // Compute multi-slice combined logged hours for the graph (Yearly, Quarterly, Monthly, Weekly)
  type ChartSlice = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  const [chartSlice, setChartSlice] = useState<ChartSlice>('weekly');
  const [pieSlice, setPieSlice] = useState<ChartSlice>('weekly');

  // 1. Weekly slice (Mon-Sun)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyHoursMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

  // 2. Monthly slice (Week 1, Week 2, Week 3, Week 4)
  const monthlyLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const monthlyHoursMap: Record<string, number> = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 };

  // 3. Quarterly slice (3 months ending in current month)
  const getMonthShortName = (mIndex: number) => {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[(mIndex + 12) % 12];
  };
  const today = new Date();
  const currentMonthIdx = today.getMonth();
  const qLabels = [
    getMonthShortName(currentMonthIdx - 2),
    getMonthShortName(currentMonthIdx - 1),
    getMonthShortName(currentMonthIdx)
  ];
  const qHoursMap: Record<string, number> = {
    [qLabels[0]]: 0,
    [qLabels[1]]: 0,
    [qLabels[2]]: 0
  };

  // 4. Yearly slice (Q1, Q2, Q3, Q4)
  const yearlyLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
  const yearlyHoursMap: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

  logs.forEach(log => {
    if (log.type === 'out' && log.manhours !== undefined) {
      const logDate = new Date(log.timestamp);
      
      // Weekly distribution
      const dayIndex = logDate.getDay(); // 0 is Sun, 1 is Mon... 6 is Sat
      const daysOfWeekIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      const dayName = daysOfWeek[daysOfWeekIndex];
      if (dayName) {
        dailyHoursMap[dayName] += log.manhours;
      }

      // Monthly distribution (democratize for demo so user has rich visual graphs)
      const dateNum = logDate.getDate();
      if (dateNum <= 7) {
        monthlyHoursMap['Week 1'] += log.manhours;
      } else if (dateNum <= 14) {
        monthlyHoursMap['Week 2'] += log.manhours;
      } else if (dateNum <= 21) {
        monthlyHoursMap['Week 3'] += log.manhours;
      } else {
        monthlyHoursMap['Week 4'] += log.manhours;
      }

      // Quarterly distribution
      const mName = getMonthShortName(logDate.getMonth());
      if (qHoursMap[mName] !== undefined) {
        qHoursMap[mName] += log.manhours;
      } else {
        const fallbackIdx = logDate.getMonth() % 3;
        qHoursMap[qLabels[fallbackIdx]] += log.manhours;
      }

      // Yearly distribution
      const monthVal = logDate.getMonth();
      if (monthVal <= 2) {
        yearlyHoursMap['Q1'] += log.manhours;
      } else if (monthVal <= 5) {
        yearlyHoursMap['Q2'] += log.manhours;
      } else if (monthVal <= 8) {
        yearlyHoursMap['Q3'] += log.manhours;
      } else {
        yearlyHoursMap['Q4'] += log.manhours;
      }
    }
  });

  // Choose labels & map based on selection
  const activeLabels = 
    chartSlice === 'weekly' ? daysOfWeek :
    chartSlice === 'monthly' ? monthlyLabels :
    chartSlice === 'quarterly' ? qLabels :
    yearlyLabels;

  const activeHoursMap = 
    chartSlice === 'weekly' ? dailyHoursMap :
    chartSlice === 'monthly' ? monthlyHoursMap :
    chartSlice === 'quarterly' ? qHoursMap :
    yearlyHoursMap;

  // Format chart coordinates for premium SVG area graph (maximum value ~40 hours)
  const maxDailyHourValue = Math.max(...Object.values(activeHoursMap), 8);
  const chartPoints = activeLabels.map((label, idx) => {
    const hours = activeHoursMap[label];
    const x = activeLabels.length > 1 
      ? 50 + (idx * (400 / (activeLabels.length - 1))) 
      : 250;
    const y = 130 - (hours / maxDailyHourValue) * 100;
    return { x, y, label, value: hours };
  });

  // Build coordinate SVG path string
  const areaPath = chartPoints.length > 0
    ? `M ${chartPoints[0].x} 130 ` + chartPoints.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${chartPoints[chartPoints.length - 1].x} 130 Z`
    : '';
  const linePath = chartPoints.length > 0
    ? chartPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // 1. Filter and aggregate hours by office name for pieSlice
  const officeHoursMap: Record<string, number> = {};
  offices.forEach(o => {
    officeHoursMap[o.name] = 0;
  });

  logs.forEach(log => {
    if (log.type === 'out' && log.manhours !== undefined) {
      const logDate = new Date(log.timestamp);
      const officeName = log.officeSiteName || 'Unknown Office';

      let isIncluded = false;
      if (pieSlice === 'weekly') {
        isIncluded = true;
      } else if (pieSlice === 'monthly') {
        isIncluded = true;
      } else if (pieSlice === 'quarterly') {
        const mName = getMonthShortName(logDate.getMonth());
        isIncluded = qLabels.includes(mName);
      } else if (pieSlice === 'yearly') {
        isIncluded = true;
      }

      if (isIncluded) {
        if (officeHoursMap[officeName] === undefined) {
          officeHoursMap[officeName] = 0;
        }
        officeHoursMap[officeName] += log.manhours;
      }
    }
  });

  const pieData = Object.entries(officeHoursMap)
    .map(([name, hours]) => ({ name, value: hours }))
    .filter(item => item.value >= 0);

  const totalPieHours = pieData.reduce((sum, item) => sum + item.value, 0);

  // Compute angles for drawing paths
  let currentAngle = 0;
  const pieSlices = pieData.map((item) => {
    const percentage = totalPieHours > 0 ? (item.value / totalPieHours) : 0;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    return {
      ...item,
      startAngle,
      endAngle,
      percentage
    };
  });

  // Polar coordinate helper for SVG paths
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const getPieSlicePath = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle - 0.1);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    if (endAngle - startAngle >= 360) {
      const startFull = polarToCartesian(x, y, radius, 359.9);
      const endFull = polarToCartesian(x, y, radius, 0);
      return `M ${x} ${y} L ${startFull.x} ${startFull.y} A ${radius} ${radius} 0 1 0 ${endFull.x} ${endFull.y} Z`;
    }

    return `M ${x} ${y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  const pieColors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f43f5e', // Rose
  ];

  // Extract all unique tags present across visible records for quick toggle filters
  const allAvailableTags = Array.from(
    new Set(
      logs
        .filter(l => isAdmin || l.userId === currentUser.id)
        .flatMap(l => l.tags)
    )
  ).slice(0, 8);

  const handleAddQuickTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taggingLogId || !newTagVal.trim()) return;

    const cleanTag = newTagVal.trim().replace(/[^a-zA-Z0-9-]/g, '');
    if (cleanTag) {
      const currentList = Store.getPunchLogs();
      const updated = currentList.map(item => {
        if (item.id === taggingLogId) {
          const currentTags = item.tags || [];
          if (!currentTags.includes(cleanTag)) {
            return { ...item, tags: [...currentTags, cleanTag] };
          }
        }
        return item;
      });
      Store.savePunchLogs(updated);
      setLogs(updated);

      Store.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'TAG_ADD',
        `Appended custom metadata tag "#${cleanTag}" to punch record ID ${taggingLogId.substring(0, 8)}.`
      );
    }
    setTaggingLogId(null);
    setNewTagVal('');
  };

  return (
    <div className="space-y-6 font-sans text-left">
      
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200/60">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-blue-600" />
            CRM Central Operations
          </h2>
          <p className="text-[11px] text-gray-500 mt-1 font-normal">
            {isAdmin 
              ? `Authorized Administrator Profile: ${currentUser.name}. Gated geo-tracking active.`
              : `Welcome Back, Employee Associate: ${currentUser.name}.`
            }
          </p>
        </div>

        {/* Real-time geofence indicator badge */}
        <div className="px-3.5 py-2 bg-white border border-gray-150 rounded-2xl flex items-center gap-3 shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
          <div className="text-xs">
            <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider block leading-none">GPS Coordinates Status</span>
            <span className="text-gray-900 font-medium block mt-1 leading-none">{gpsStatusLabel}</span>
          </div>
        </div>
      </div>

      {/* TIER CARD OVERVIEWS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {isAdmin ? (
          <>
            {/* Card A1: Active Staff */}
            <div className="p-5 bg-white rounded-2xl relative flex flex-col justify-between h-36 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block leading-none">Active Attendance</span>
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                </div>
                <span className="text-2xl font-semibold text-emerald-600 mt-3. block leading-none tracking-tight">{activeStaffCount} Staff Online</span>
              </div>
              <button 
                onClick={() => onNavigateToTab('reports')} 
                className="text-[10px] text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors text-left font-medium uppercase tracking-wider mt-auto border-t border-gray-100 pt-2.5"
              >
                Inspect shift registries
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              </button>
            </div>

            {/* Card A2: Total sites */}
            <div className="p-5 bg-white rounded-2xl relative flex flex-col justify-between h-36 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block leading-none">Authorized Site Areas</span>
                  <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                </div>
                <span className="text-2xl font-semibold text-blue-600 mt-3. block leading-none tracking-tight">{offices.length} Gated Sites</span>
              </div>
              <button 
                onClick={() => onNavigateToTab('locations')} 
                className="text-[10px] text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors text-left font-medium uppercase tracking-wider mt-auto border-t border-gray-100 pt-2.5"
              >
                Modify geofence configurations
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              </button>
            </div>

            {/* Card A3: Simulated Inbox Alert logs */}
            <div className="p-5 bg-white rounded-2xl relative flex flex-col justify-between h-36 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block leading-none">System Email Dispatches</span>
                  <span className="h-2 w-2 bg-amber-500 rounded-full"></span>
                </div>
                <span className="text-2xl font-semibold text-amber-600 mt-3. block leading-none tracking-tight">{Store.getEmails().length} Alerts Sent</span>
              </div>
              <button 
                onClick={() => onNavigateToTab('emails')} 
                className="text-[10px] text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors text-left font-medium uppercase tracking-wider mt-auto border-t border-gray-100 pt-2.5"
              >
                View automated alerts sandbox
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Card E1: Active Attendance status */}
            <div className="p-5 bg-white rounded-2xl relative flex flex-col justify-between h-36 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block leading-none">Active Shift Status</span>
                  <span className={`h-2 w-2 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                </div>
                <span className={`text-2xl font-semibold mt-3. block leading-none tracking-tight ${isClockedIn ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {isClockedIn ? 'CLOCKED IN' : 'OFF DUTY'}
                </span>
              </div>
              <button 
                onClick={() => onNavigateToTab('clock')} 
                className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors text-left font-medium uppercase tracking-wider mt-auto border-t border-gray-100 pt-2.5"
              >
                Open Punch Clock Station
                <ChevronRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              </button>
            </div>

            {/* Card E2: Accumulated hours */}
            <div className="p-5 bg-white rounded-2xl relative flex flex-col justify-between h-36 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block leading-none">Logged Attendance</span>
                  <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                </div>
                <span className="text-2xl font-semibold text-blue-600 mt-3. block leading-none tracking-tight">
                  {myLogs.filter(l => l.type === 'out').length} Shifts Saved
                </span>
              </div>
              <button 
                onClick={() => onNavigateToTab('reports')} 
                className="text-[10px] text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors text-left font-medium uppercase tracking-wider mt-auto border-t border-gray-100 pt-2.5"
              >
                Inspect personal work hours
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              </button>
            </div>

            {/* Card E3: Inbox alert count */}
            <div className="p-5 bg-white rounded-2xl relative flex flex-col justify-between h-36 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block leading-none">Notifications Received</span>
                  <span className="h-2 w-2 bg-amber-500 rounded-full"></span>
                </div>
                <span className="text-2xl font-semibold text-amber-600 mt-3. block leading-none tracking-tight">
                  {Store.getEmails().filter(e => e.recipientEmail.toLowerCase() === currentUser.email.toLowerCase()).length} Alerts
                </span>
              </div>
              <button 
                onClick={() => onNavigateToTab('emails')} 
                className="text-[10px] text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors text-left font-medium uppercase tracking-wider mt-auto border-t border-gray-100 pt-2.5"
              >
                Inspect simulated notification logs
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              </button>
            </div>
          </>
        )}

      </div>

      {/* MAIN CHART AND QUICK TAGGING SIDEBAR SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Graph: Multi-slice aggregate Hours */}
        <div className="xl:col-span-2 p-5 bg-white rounded-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 w-full">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
                {chartSlice === 'weekly' && 'Weekly Aggregate Manhours'}
                {chartSlice === 'monthly' && 'Monthly Production Trend'}
                {chartSlice === 'quarterly' && 'Quarterly Attendance Summary'}
                {chartSlice === 'yearly' && 'Yearly Operational Output'}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1 font-normal">
                {chartSlice === 'weekly' && 'Summed team production times plotted from Monday to Friday.'}
                {chartSlice === 'monthly' && 'Weekly aggregate labor duration across current month cycles.'}
                {chartSlice === 'quarterly' && 'Consolidated monthly production hours over the current quarter.'}
                {chartSlice === 'yearly' && 'Consolidated performance metrics distributed by financial quarters.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/40">
                {(['weekly', 'monthly', 'quarterly', 'yearly'] as ChartSlice[]).map((slice) => (
                  <button
                    key={slice}
                    type="button"
                    onClick={() => setChartSlice(slice)}
                    className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-150 ${
                      chartSlice === slice
                        ? 'bg-white text-blue-600 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {slice}
                  </button>
                ))}
              </div>
              <span className="text-[10px] px-2.5 py-1 bg-gray-50 border border-gray-200/60 text-gray-600 rounded-full font-mono font-semibold shrink-0">
                Peak: {maxDailyHourValue.toFixed(1)} hrs
              </span>
            </div>
          </div>

          {/* Premium Vector SVG Chart */}
          <div className="h-44 w-full relative pt-2 border-t border-gray-50">
            <svg viewBox="0 0 500 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f8fafc" strokeWidth="1" />
                </pattern>
                <linearGradient id="blue-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <rect width="500" height="150" fill="url(#grid-pattern)" />

              {/* Grid Lines */}
              <line x1="50" y1="130" x2="450" y2="130" stroke="#f1f5f9" strokeWidth="1.5" />
              <line x1="50" y1="80" x2="450" y2="80" stroke="#f8fafc" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="50" y1="30" x2="450" y2="30" stroke="#f8fafc" strokeWidth="1" strokeDasharray="4,4" />

              {/* Area filled graph */}
              {areaPath && <path d={areaPath} fill="url(#blue-gradient)" />}
              
              {/* Line stroke graph */}
              {linePath && <path d={linePath.replace(/M /g, 'M ').replace(/L /g, 'L ')} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

              {/* Interactive nodes */}
              {chartPoints.map((pt, i) => (
                <g key={i} className="group/node">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    className="fill-white stroke-blue-500 stroke-2 hover:fill-blue-600 hover:scale-125 cursor-pointer transition-all duration-150 shadow-xs"
                  />
                  <g className="opacity-0 hover:opacity-100 group-hover/node:opacity-100 transition duration-150">
                    <rect x={pt.x - 24} y={pt.y - 25} width="48" height="16" rx="4" fill="#1e293b" />
                    <text x={pt.x} y={pt.y - 14} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="500" fontFamily="monospace">
                      {pt.value.toFixed(1)}h
                    </text>
                  </g>
                  {/* Persistent value label above each point */}
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    fill="#334155"
                    fontSize="8.5"
                    fontWeight="700"
                    fontFamily="monospace"
                    className="select-none filter drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
                  >
                    {pt.value.toFixed(1)}h
                  </text>
                </g>
              ))}

              {/* Bottom Labels */}
              {chartPoints.map((pt, i) => (
                <text key={i} x={pt.x} y="145" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="500" className="tracking-wide">
                  {pt.label}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Quick Tag filtering panel */}
        <div className="xl:col-span-1 p-5 bg-white rounded-2xl flex flex-col justify-between transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
          <div className="text-left space-y-1">
            <h3 className="text-sm font-semibold text-gray-900 tracking-tight flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-blue-500 shrink-0" />
              Filter Tags
            </h3>
            <p className="text-[11px] text-gray-400 font-normal">Query visible punch registries instantly.</p>
          </div>

          <div className="flex-1 mt-4">
            {allAvailableTags.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs font-medium">
                No active tags registered.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 justify-start">
                <button
                  onClick={() => setActiveFilterTag(null)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-150 ${
                    activeFilterTag === null
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  ALL ENTRIES
                </button>

                {allAvailableTags.map((tg, i) => {
                  const isSelected = activeFilterTag === tg;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveFilterTag(String(tg))}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-150 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      #{String(tg).toUpperCase()}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 mt-4 text-[10px] text-gray-400 text-left font-normal">
            <span>Tap filter pills to query attendance logs.</span>
          </div>
        </div>

      </div>

      {/* SECONDARY ROW OF CHARTS: PIE CHART LOCATION ANALYSIS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Pie Chart: Workplace Hours Distribution */}
        <div className="xl:col-span-2 p-5 bg-white rounded-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 w-full">
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
                {pieSlice === 'weekly' && 'Weekly Site Distribution'}
                {pieSlice === 'monthly' && 'Monthly Site Distribution'}
                {pieSlice === 'quarterly' && 'Quarterly Site Distribution'}
                {pieSlice === 'yearly' && 'Yearly Site Distribution'}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1 font-normal">
                Visual breakdown of total logged hours across authorized workspace office areas.
              </p>
            </div>
            
            {/* Same slicer function! */}
            <div className="flex items-center gap-0.5 bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/40 shrink-0">
              {(['weekly', 'monthly', 'quarterly', 'yearly'] as ChartSlice[]).map((slice) => (
                <button
                  key={`pie-${slice}`}
                  type="button"
                  onClick={() => setPieSlice(slice)}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-150 ${
                    pieSlice === slice
                      ? 'bg-white text-blue-600 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {slice}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 py-4 border-t border-gray-50">
            {/* Circular Pie Chart SVG */}
            <div className="w-44 h-44 relative shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                {totalPieHours === 0 ? (
                  <g>
                    <circle cx="100" cy="100" r="75" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                    <text x="100" y="105" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="500">
                      No Data
                    </text>
                  </g>
                ) : (
                  pieSlices.map((slice, idx) => {
                    if (slice.percentage === 0) return null;
                    const pathD = getPieSlicePath(100, 100, 75, slice.startAngle, slice.endAngle);
                    const color = pieColors[idx % pieColors.length];
                    
                    // calculate mid-angle for label placing if large enough
                    const midAngle = slice.startAngle + (slice.endAngle - slice.startAngle) / 2;
                    const labelPos = polarToCartesian(100, 100, 48, midAngle);
                    const showLabel = slice.percentage > 0.08; // only show percent if slice > 8%
                    
                    return (
                      <g key={slice.name} className="group/slice">
                        <path
                          d={pathD}
                          fill={color}
                          className="transition-all duration-300 hover:scale-[1.03] hover:brightness-105 cursor-pointer origin-center"
                          style={{ transformOrigin: '100px 100px' }}
                        >
                          <title>{slice.name}: {slice.value.toFixed(1)} hrs ({ (slice.percentage * 100).toFixed(1) }%)</title>
                        </path>
                        {showLabel && (
                          <text
                            x={labelPos.x}
                            y={labelPos.y + 3}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                            className="pointer-events-none drop-shadow-xs"
                          >
                            { (slice.percentage * 100).toFixed(0) }%
                          </text>
                        )}
                      </g>
                    );
                  })
                )}
              </svg>
            </div>

            {/* Legends Panel (Requested explicitly) */}
            <div className="flex-1 w-full text-left space-y-2.5">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Office Sites Logged</h4>
              {totalPieHours === 0 ? (
                <p className="text-xs text-gray-400 font-medium italic">No attendance hours logged in this selected time range.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pieSlices.map((slice, idx) => {
                    const color = pieColors[idx % pieColors.length];
                    return (
                      <div
                        key={slice.name}
                        className="p-2.5 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-between text-xs transition-all hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                          <span className="font-semibold text-gray-800 truncate" title={slice.name}>{slice.name}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="font-mono font-bold text-gray-900 leading-none">{slice.value.toFixed(1)} hrs</p>
                          <p className="text-[9px] text-gray-400 font-medium mt-1">{(slice.percentage * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informative Side Card: Top Location Insight */}
        <div className="xl:col-span-1 p-5 bg-white rounded-2xl flex flex-col justify-between transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] text-left">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 tracking-tight flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
              Location Insights
            </h3>
            <p className="text-[11px] text-gray-400 font-normal">
              Analytics of operations based on GPS logs and office geofence entry dispatches.
            </p>
            
            <div className="border-t border-gray-100 pt-3 space-y-4">
              {pieSlices.length > 0 && totalPieHours > 0 ? (
                <>
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Primary Production Hub</span>
                    <p className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                      {pieSlices.reduce((max, s) => s.value > max.value ? s : max, pieSlices[0]).name}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      This site accounts for the largest share of team output in this duration.
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/50 border border-emerald-100/60 rounded-xl">
                    <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider block">Total Slice Volume</span>
                    <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                      {totalPieHours.toFixed(1)} hrs
                    </p>
                    <p className="text-[9px] text-emerald-600 font-medium mt-0.5">
                      Aggregated manhours across all tracked geo-spaces.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-gray-400 text-xs font-medium">
                  Select a wider date slicer to display detailed geographic performance metrics.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 mt-4 text-[10px] text-gray-400">
            <span>Data synced with GPS geofencing emulator settings.</span>
          </div>
        </div>

      </div>

      {/* QUICK SEARCH TERMINAL & CUSTOM LOG LISTING */}
      <div className="bg-white rounded-2xl p-5 space-y-4 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
              Attendance Records
            </h3>
            <p className="text-[11px] text-gray-400 mt-1 font-normal">
              Search workplace coordinates, comment summaries, or assign compliance labels.
            </p>
          </div>

          {/* Real-time search bar */}
          <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 w-full sm:w-72 shrink-0 focus-within:bg-white focus-within:border-blue-400 transition-colors">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search employee, site, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-gray-800 placeholder:text-gray-400 w-full font-medium"
            />
          </div>
        </div>

        {/* Tagging form overlay inline card */}
        {taggingLogId && (
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-fade-in">
            <span className="text-blue-900 font-medium text-[11px]">
              Apply compliance label:
            </span>
            <form onSubmit={handleAddQuickTag} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="e.g. APPROVED"
                value={newTagVal}
                onChange={(e) => setNewTagVal(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 outline-none text-xs text-gray-800 font-medium focus:border-blue-400"
                required
              />
              <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-medium text-[11px] hover:bg-blue-500 transition shadow-sm shadow-blue-500/10">
                Save Tag
              </button>
              <button type="button" onClick={() => setTaggingLogId(null)} className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 font-medium text-[11px] transition">
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Attendance listings */}
        <div className="overflow-hidden border border-gray-150 rounded-xl">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs font-medium">
              No matching records registered.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 bg-slate-50/50 text-gray-500 tracking-wide font-medium text-[10px] uppercase">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Punch State</th>
                    <th className="py-3 px-4">Workspace Verified</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Descriptions</th>
                    <th className="py-3 px-4">Manhours</th>
                    <th className="py-3 px-4 text-right">Interactive Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.slice().reverse().map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-gray-900">{log.userName}</p>
                        <p className="text-[10px] text-gray-400 block mt-0.5">{log.userEmail}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        {log.type === 'in' ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full font-medium text-[9px] tracking-wide uppercase">PUNCH IN</span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full font-medium text-[9px] tracking-wide uppercase">PUNCH OUT</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-gray-900 text-[11px]">{log.officeSiteName || 'Site Approved'}</p>
                        <p className="text-[9px] text-emerald-600 font-medium mt-0.5 uppercase tracking-wide">Verified GPS</p>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 max-w-[180px] truncate" title={log.note}>
                        {log.note}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                        {log.manhours !== undefined ? `${log.manhours.toFixed(1)} hrs` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {log.tags.map((tg, i) => (
                            <span key={i} className="text-[9px] bg-gray-50 text-gray-500 border border-gray-150 px-2 py-0.5 rounded-full font-medium">
                              #{tg}
                            </span>
                          ))}
                          
                          <button
                            onClick={() => setTaggingLogId(log.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                            title="Attach custom tag"
                          >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
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
      </div>

    </div>
  );
}
