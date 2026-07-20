import React, { useState, useEffect } from 'react';
import { User, OfficeSite, EvacuationEvent, EvacuationMember } from '../types';
import { Store } from '../utils/store';
import { ShieldAlert, MapPin, Users, CheckCircle, Flame, ArrowRight, UserCheck, AlertOctagon, Download, QrCode, Search, RefreshCw, Volume2, Sparkles, Check, CheckCircle2 } from 'lucide-react';

interface EvacuationProps {
  currentUser: User;
}

export default function Evacuation({ currentUser }: EvacuationProps) {
  const isAdmin = currentUser.role === 'admin';
  
  // Core state
  const [activeEvent, setActiveEvent] = useState<EvacuationEvent | null>(null);
  const [members, setMembers] = useState<EvacuationMember[]>([]);
  const [offices, setOffices] = useState<OfficeSite[]>([]);
  
  // Admin selected office to evac
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  
  // Scan simulators
  const [scannerMode, setScannerMode] = useState<'camera' | 'text'>('camera');
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [scanSuccessMsg, setScanSuccessMsg] = useState('');
  const [scanErrorMsg, setScanErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Audio chime feedback simulation
  const [chimeActive, setChimeActive] = useState(false);

  const refreshData = () => {
    // Load offices
    const allOffices = Store.getOffices();
    setOffices(allOffices);
    if (allOffices.length > 0 && !selectedOfficeId) {
      setSelectedOfficeId(allOffices[0].id);
    }

    // Load active evacuation event
    const events = Store.getEvacuationEvents();
    const active = events.find(e => e.active) || null;
    setActiveEvent(active);

    if (active) {
      const allMembers = Store.getEvacuationMembers();
      setMembers(allMembers.filter(m => m.eventId === active.id));
    } else {
      setMembers([]);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Determine if CURRENT USER is affected by the active evacuation
  // A user is affected if they are clocked into the office being evacuated
  const [isUserAffected, setIsUserAffected] = useState(false);
  const [userMemberRecord, setUserMemberRecord] = useState<EvacuationMember | null>(null);

  useEffect(() => {
    if (activeEvent) {
      const myRecord = members.find(m => m.userId === currentUser.id);
      if (myRecord) {
        setIsUserAffected(true);
        setUserMemberRecord(myRecord);
      } else {
        // Double check last punch log to see if they are clocked into the site
        const punches = Store.getPunchLogs();
        const myPunches = punches
          .filter(p => p.userId === currentUser.id)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        if (myPunches.length > 0) {
          const lastPunch = myPunches[myPunches.length - 1];
          const isCurrentlyClockedInHere = lastPunch.type === 'in' && lastPunch.officeSiteId === activeEvent.officeSiteId;
          
          if (isCurrentlyClockedInHere) {
            setIsUserAffected(true);
            // Create a member record in real-time if they were missed
            const newMember: EvacuationMember = {
              id: `${activeEvent.id}_${currentUser.id}`,
              eventId: activeEvent.id,
              userId: currentUser.id,
              userName: currentUser.name,
              userEmail: currentUser.email,
              status: 'missing',
              clockedInAt: lastPunch.timestamp
            };
            const updated = [...Store.getEvacuationMembers(), newMember];
            Store.saveEvacuationMembers(updated);
            setMembers(updated.filter(m => m.eventId === activeEvent.id));
            setUserMemberRecord(newMember);
          } else {
            setIsUserAffected(false);
            setUserMemberRecord(null);
          }
        } else {
          setIsUserAffected(false);
          setUserMemberRecord(null);
        }
      }
    } else {
      setIsUserAffected(false);
      setUserMemberRecord(null);
    }
  }, [activeEvent, members, currentUser.id]);

  // SVG QR Code Generator Component
  const renderQRCode = (value: string) => {
    // Simple deterministic hash
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const size = 21;
    const grid: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
    
    const drawFinder = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[row + r][col + c] = isBorder || isCenter;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);
    
    let seed = Math.abs(hash);
    const lcg = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isFinder = (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
        if (!isFinder) {
          grid[r][c] = lcg() > 0.48;
        }
      }
    }
    
    const rects: React.ReactNode[] = [];
    const cellSize = 100 / size;
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c]) {
          rects.push(
            <rect
              key={`${r}-${c}`}
              x={`${c * cellSize}%`}
              y={`${r * cellSize}%`}
              width={`${cellSize}%`}
              height={`${cellSize}%`}
              fill="#090d16"
            />
          );
        }
      }
    }
    
    return (
      <div className="w-36 h-36 bg-white p-2 border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-md">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          {rects}
        </svg>
      </div>
    );
  };

  // TRIGGER EVACUATION (Admin)
  const handleTriggerEvacuation = () => {
    const targetSite = offices.find(o => o.id === selectedOfficeId);
    if (!targetSite) return;

    if (activeEvent) {
      alert('There is already an active evacuation drill. Please resolve the current drill before launching another.');
      return;
    }

    if (!confirm(`⚠️ CRITICAL COMMAND: Are you sure you want to dispatch an EMERGENCY EVACUATION alert for the site: "${targetSite.name}"?`)) {
      return;
    }

    const eventId = `evac-${Date.now()}`;
    const newEvent: EvacuationEvent = {
      id: eventId,
      officeSiteId: targetSite.id,
      officeSiteName: targetSite.name,
      active: true,
      triggeredAt: new Date().toISOString(),
      triggeredBy: currentUser.id
    };

    // Find all clocked-in users at this office site
    const users = Store.getUsers();
    const punches = Store.getPunchLogs();
    const affectedMembers: EvacuationMember[] = [];

    users.forEach(u => {
      const uPunches = punches
        .filter(p => p.userId === u.id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (uPunches.length > 0) {
        const lastPunch = uPunches[uPunches.length - 1];
        if (lastPunch.type === 'in' && lastPunch.officeSiteId === targetSite.id) {
          affectedMembers.push({
            id: `${eventId}_${u.id}`,
            eventId: eventId,
            userId: u.id,
            userName: u.name,
            userEmail: u.email,
            status: 'missing',
            clockedInAt: lastPunch.timestamp
          });

          // Send simulated hazard notification email
          const emailBody = `🚨 CRITICAL EMERGENCY NOTICE 🚨\n\nDear ${u.name},\n\nAn emergency evacuation has been triggered for your current work coordinates at: "${targetSite.name}".\n\nPlease exit the premises immediately. Follow designated escape routes and locate the emergency assembly point.\n\nYour Safety Registration Code is: evac-${u.id}\n\nPlease scan this code with the HSE Warden or click "Mark Myself Safe" on your CRM dashboard immediately once you reach the Muster Point.\n\nSTAY SAFE.\n- HSE Control Room, DIALOG Asia`;
          
          Store.sendEmail(
            u.email,
            `🚨 EMERGENCY EVACUATION ORDER: ${targetSite.name}`,
            emailBody,
            'system'
          );
        }
      }
    });

    // Save
    const existingEvents = Store.getEvacuationEvents();
    Store.saveEvacuationEvents([...existingEvents, newEvent]);

    const existingMembers = Store.getEvacuationMembers();
    Store.saveEvacuationMembers([...existingMembers, ...affectedMembers]);

    // Track CRM Audit Activity
    Store.logActivity(
      currentUser.id,
      currentUser.name,
      'admin',
      'EVACUATION_TRIGGER',
      `DISPATCHED EMERGENCY EVACUATION ALARM at: "${targetSite.name}". Evacuating ${affectedMembers.length} logged employees.`
    );

    refreshData();
  };

  // RESOLVE EVACUATION (Admin)
  const handleResolveEvacuation = () => {
    if (!activeEvent) return;

    if (!confirm('Are you sure you want to declare the emergency over and cancel the active drill? This will clear active banners.')) {
      return;
    }

    const events = Store.getEvacuationEvents();
    const updatedEvents = events.map(e => e.id === activeEvent.id ? { ...e, active: false } : e);
    Store.saveEvacuationEvents(updatedEvents);

    // Track Activity
    Store.logActivity(
      currentUser.id,
      currentUser.name,
      'admin',
      'EVACUATION_RESOLVED',
      `Declared emergency resolved for "${activeEvent.officeSiteName}". Muster point check complete.`
    );

    setActiveEvent(null);
    setMembers([]);
    refreshData();
  };

  // REGISTER MEMBER AS SAFE (Manual or Scan)
  const markMemberSafe = (userId: string) => {
    if (!activeEvent) return;

    const allMembers = Store.getEvacuationMembers();
    const updated = allMembers.map(m => {
      if (m.eventId === activeEvent.id && m.userId === userId) {
        return { ...m, status: 'safe' as const, safeRegisteredAt: new Date().toISOString() };
      }
      return m;
    });

    Store.saveEvacuationMembers(updated);
    setMembers(updated.filter(m => m.eventId === activeEvent.id));

    // Get member name
    const member = members.find(m => m.userId === userId);
    const mName = member ? member.userName : userId;

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'EVACUATION_MEMBER_SAFE',
      `Registered employee "${mName}" as SAFE at Muster Assembly Point.`
    );

    // Audio chime simulation
    setChimeActive(true);
    setTimeout(() => setChimeActive(false), 800);
  };

  // SELF-REGISTRATION AS SAFE (Employee Action)
  const handleSelfRegisterSafe = () => {
    if (!activeEvent || !userMemberRecord) return;
    markMemberSafe(currentUser.id);
    alert('You have successfully self-registered as SAFE. Thank you. Please remain at the muster point.');
  };

  // SCAN SIMULATOR ACTION
  const handleSimulateScan = (userId: string) => {
    setScanSuccessMsg('');
    setScanErrorMsg('');

    const member = members.find(m => m.userId === userId);
    if (!member) {
      setScanErrorMsg('QR code contains an invalid or unknown user ID.');
      return;
    }

    if (member.status === 'safe') {
      setScanSuccessMsg(`"${member.userName}" is already registered as Safe.`);
      return;
    }

    markMemberSafe(userId);
    setScanSuccessMsg(`🎉 SCAN SUCCESSFUL: Registered "${member.userName}" as SAFE.`);
  };

  // MANUAL CODE QR REGISTRATION
  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScanSuccessMsg('');
    setScanErrorMsg('');

    const cleanInput = manualCodeInput.trim().toLowerCase();
    
    // Support formats "evac-user-emp1" or "user-emp1"
    const parsedUserId = cleanInput.replace('evac-', '');
    
    const targetMember = members.find(m => m.userId.toLowerCase() === parsedUserId);
    
    if (!targetMember) {
      setScanErrorMsg('The entered QR Token is invalid or does not match any clocked-in personnel.');
      return;
    }

    if (targetMember.status === 'safe') {
      setScanSuccessMsg(`"${targetMember.userName}" is already registered as Safe.`);
      setManualCodeInput('');
      return;
    }

    markMemberSafe(targetMember.userId);
    setScanSuccessMsg(`🎉 REGISTERED: "${targetMember.userName}" is safe!`);
    setManualCodeInput('');
  };

  // EXPORT SAFETY REGISTER TO TSV/CSV
  const handleExportData = () => {
    if (!activeEvent || members.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Muster Point Safety Registry\n';
    csvContent += `Office Site,${activeEvent.officeSiteName}\n`;
    csvContent += `Triggered At,${new Date(activeEvent.triggeredAt).toLocaleString()}\n\n`;
    csvContent += 'Employee Name,Email Address,Clocked In At,Muster Status,Registered Safe At\n';

    members.forEach(m => {
      const clockIn = new Date(m.clockedInAt).toLocaleString();
      const safeTime = m.safeRegisteredAt ? new Date(m.safeRegisteredAt).toLocaleString() : 'N/A';
      csvContent += `"${m.userName}","${m.userEmail}","${clockIn}","${m.status.toUpperCase()}","${safeTime}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Evacuation_Report_${activeEvent.officeSiteName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Count metrics
  const missingCount = members.filter(m => m.status === 'missing').length;
  const safeCount = members.filter(m => m.status === 'safe').length;
  const totalCount = members.length;

  const filteredMembers = members.filter(m => 
    m.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Critical active notification block */}
      {activeEvent && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse-slow">
          <div className="flex items-start gap-3.5">
            <div className="p-3.5 bg-rose-600 text-white rounded-2xl shadow-md shrink-0">
              <Flame className="h-6 w-6 animate-bounce-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider px-2 py-0.5 rounded-full">Critical Alert</span>
                <span className="text-[10px] text-rose-500 font-mono font-bold">EVENT: {activeEvent.id}</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-950 mt-1 leading-tight">
                ACTIVE EVACUATION: {activeEvent.officeSiteName}
              </h3>
              <p className="text-xs text-rose-700/90 mt-1">
                Dispatched by Warden at {new Date(activeEvent.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}. Please proceed to assembly coordinates.
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleResolveEvacuation}
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md transition"
            >
              Resolve Drill
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Left Side contains User view or Admin selection / Right side has Muster dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* COL 1: Drill Initiation or Personal QR ID Card */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* USER QR ID CARD (Displays if user is affected by evacuation) */}
          {activeEvent && isUserAffected && userMemberRecord && (
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 text-center relative overflow-hidden flex flex-col items-center">
              {/* Card visual elements */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600"></div>
              
              <div className="flex items-center gap-1.5 justify-center mb-4">
                <QrCode className="h-4 w-4 text-rose-500 shrink-0" />
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Warden QR Identifier</span>
              </div>

              {/* Checkerboard QR */}
              <div className="mt-2 mb-4">
                {renderQRCode(`evac-${currentUser.id}`)}
              </div>

              <h4 className="text-sm font-bold tracking-tight text-white">{currentUser.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
              
              <div className="mt-4 p-3 bg-slate-800/50 border border-slate-800 rounded-2xl w-full text-xs text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Station:</span>
                  <span className="font-semibold text-rose-400">{activeEvent.officeSiteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assembly Code:</span>
                  <span className="font-mono text-slate-300">evac-{currentUser.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Your Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    userMemberRecord.status === 'safe' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                  }`}>
                    {userMemberRecord.status}
                  </span>
                </div>
              </div>

              {/* Action: Mark Safe button directly */}
              {userMemberRecord.status === 'missing' && (
                <button
                  onClick={handleSelfRegisterSafe}
                  className="mt-5 w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-lg shadow-rose-950/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="h-4 w-4" />
                  Mark Myself Safe
                </button>
              )}

              {userMemberRecord.status === 'safe' && (
                <div className="mt-5 w-full py-2.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  Registered Safe at Assembly Point
                </div>
              )}
            </div>
          )}

          {/* NO ACTIVE EVENT - USER PANEL */}
          {!activeEvent && !isAdmin && (
            <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col items-center text-center">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">System Coordinates Secure</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                There are no active emergency evacuation events or fire drills at your current station. Have a safe shift!
              </p>
            </div>
          )}

          {/* ADMIN TRIGGER CONTROLLER PANEL (Admins only) */}
          {isAdmin && (
            <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100 space-y-4">
              <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-600" />
                Emergency Control Center
              </h4>

              <p className="text-xs text-gray-500 leading-relaxed">
                Choose an active office coordinate sector to initiate a muster-point drill or real-world emergency lock-out.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Affected Office Site</label>
                <select
                  value={selectedOfficeId}
                  onChange={(e) => setSelectedOfficeId(e.target.value)}
                  disabled={!!activeEvent}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none text-gray-900 font-medium focus:bg-white focus:border-blue-500 transition"
                >
                  {offices.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              {!activeEvent ? (
                <button
                  onClick={handleTriggerEvacuation}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md shadow-rose-100 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Flame className="h-4 w-4" />
                  Initiate "Vacuation" Alarm
                </button>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[11px] text-amber-700 leading-normal flex items-start gap-2">
                  <AlertOctagon className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>An evacuation drill is currently in progress. Close the active drill to re-open selection.</span>
                </div>
              )}
            </div>
          )}

          {/* ADMIN QR SCAN SIMULATOR SCREEN (Admins only - displays when active) */}
          {isAdmin && activeEvent && (
            <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                  <QrCode className="h-4.5 w-4.5 text-blue-500" />
                  Assembly Point Scanner
                </h4>
                
                <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px]">
                  <button
                    onClick={() => setScannerMode('camera')}
                    className={`px-2 py-0.5 rounded-md font-medium transition ${scannerMode === 'camera' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Camera Mock
                  </button>
                  <button
                    onClick={() => setScannerMode('text')}
                    className={`px-2 py-0.5 rounded-md font-medium transition ${scannerMode === 'text' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Token Text
                  </button>
                </div>
              </div>

              {scanSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>{scanSuccessMsg}</span>
                </div>
              )}

              {scanErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-800 flex items-start gap-2">
                  <AlertOctagon className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{scanErrorMsg}</span>
                </div>
              )}

              {scannerMode === 'camera' ? (
                <div className="space-y-3">
                  {/* Glowing Scanner Frame Mockup */}
                  <div className="relative aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-slate-800 shadow-inner group">
                    <div className="absolute inset-4 border-2 border-dashed border-blue-500/30 rounded-xl flex items-center justify-center">
                      <div className="h-2/3 aspect-square border-2 border-blue-500 rounded-lg animate-pulse-slow relative">
                        {/* Red scanning horizontal line */}
                        <div className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-lg shadow-rose-500/80 animate-scan-line"></div>
                      </div>
                    </div>
                    
                    <span className="text-[10px] font-mono text-slate-500 z-10 select-none">Camera active (simulated view)</span>
                  </div>

                  {/* Simulator Trigger Box: choose which missing user scans their QR */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Simulate Employee Scanning QR</label>
                    {members.filter(m => m.status === 'missing').length === 0 ? (
                      <p className="text-xs text-gray-400 py-1 font-medium">All clocked-in personnel are already registered as Safe! 🎉</p>
                    ) : (
                      <div className="space-y-1.5">
                        {members.filter(m => m.status === 'missing').map(m => (
                          <button
                            key={m.userId}
                            onClick={() => handleSimulateScan(m.userId)}
                            className="w-full text-left px-3.5 py-2 border border-gray-150 hover:border-blue-400 hover:bg-blue-50/20 text-xs rounded-xl flex items-center justify-between text-gray-800 transition"
                          >
                            <span className="font-semibold">{m.userName}</span>
                            <span className="font-mono text-[9px] text-gray-400">Scan QR Code</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleManualCodeSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Scan Code Token (e.g. evac-user-emp1)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCodeInput}
                        onChange={(e) => setManualCodeInput(e.target.value)}
                        placeholder="evac-[userId]"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none text-gray-900 font-mono focus:bg-white focus:border-blue-500 transition"
                        required
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl uppercase tracking-wider transition shadow-sm"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* COL 2 & 3: Muster Register Dashboard */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* STATS COUNT OVERVIEW CARD */}
          {activeEvent && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_12px_30px_rgba(0,0,0,0.02)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total At Site</span>
                <span className="text-2xl font-extrabold text-slate-950 mt-1 block leading-none">{totalCount}</span>
                <span className="text-[10px] text-gray-400 font-mono block mt-2">At timestamp of alert</span>
              </div>
              
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-5 shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Registered Safe</span>
                <span className="text-2xl font-extrabold text-emerald-700 mt-1 block leading-none">{safeCount}</span>
                <div className="flex items-center gap-1 mt-2">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-[10px] text-emerald-600 font-medium">Verified Safe</span>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Still Missing</span>
                <span className="text-2xl font-extrabold text-rose-700 mt-1 block leading-none">{missingCount}</span>
                <div className="flex items-center gap-1 mt-2">
                  <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-rose-600 font-medium">Awaiting check-in</span>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE DRILL REGISTER SHEET */}
          {activeEvent ? (
            <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Emergency Muster Attendance Register
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Real-time status tracking of clocked-in employees during current alarm.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportData}
                    className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                    title="Export Muster Data to CSV"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Search filter bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter register list by employee name, email..."
                  className="w-full pl-9 bg-gray-50/50 border border-gray-150 rounded-xl py-2 text-xs outline-none focus:bg-white text-gray-900 focus:border-blue-500 transition"
                />
              </div>

              {members.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs font-medium bg-gray-50/30 border border-dashed border-gray-150 rounded-2xl">
                  No corporate employees were clocked in at "{activeEvent.officeSiteName}" when this evacuation was triggered.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-400 uppercase font-semibold text-[9px] tracking-wider">
                        <th className="py-2.5 px-4">Employee</th>
                        <th className="py-2.5 px-4">Clocked In At</th>
                        <th className="py-2.5 px-4 text-center">QR Token ID</th>
                        <th className="py-2.5 px-4 text-center">Safety Status</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMembers.map((m) => {
                        const isSafe = m.status === 'safe';
                        
                        return (
                          <tr
                            key={m.userId}
                            className={`transition hover:bg-gray-50/30 ${
                              isSafe 
                                ? 'bg-emerald-50/40 text-emerald-950 border-l-4 border-emerald-500' 
                                : 'bg-rose-50/15 border-l-4 border-rose-500 animate-pulse-slow'
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-gray-900">{m.userName}</div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">{m.userEmail}</div>
                            </td>
                            <td className="py-3.5 px-4 text-gray-500">
                              {new Date(m.clockedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-[10px] text-gray-400 select-all">
                              evac-{m.userId}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                isSafe 
                                  ? 'bg-emerald-500/10 text-emerald-700' 
                                  : 'bg-rose-500/10 text-rose-600 animate-pulse'
                              }`}>
                                {isSafe ? 'Verified Safe' : 'Missing'}
                              </span>
                              {m.safeRegisteredAt && (
                                <div className="text-[9px] text-emerald-600 font-medium mt-0.5">
                                  Reg: {new Date(m.safeRegisteredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isAdmin && !isSafe && (
                                <button
                                  onClick={() => markMemberSafe(m.userId)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-semibold uppercase tracking-wider shadow-xs transition"
                                >
                                  Mark Safe
                                </button>
                              )}
                              {isSafe && (
                                <span className="text-xs text-emerald-500 font-semibold inline-flex items-center gap-1">
                                  <Check className="h-4 w-4 shrink-0" />
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Idle State Banner */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertOctagon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Muster Registry Idle</h3>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    The muster-point registry dashboard will populate and track personnel in real-time as soon as an emergency evacuation drill is triggered by an administrator.
                  </p>
                </div>
              </div>

              {/* EMERGENCY EVACUATION MANUAL SECTION */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100 space-y-6">
                <div className="pb-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-rose-500 shrink-0" />
                    HSE Standard Operating Procedure (SOP) & Evacuation Manual
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Compliant emergency protocols for all DIALOG regional corporate facilities.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Phase 1 */}
                  <div className="p-4 bg-slate-50 border border-gray-150 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Phase 1</span>
                      <span className="h-5 w-5 rounded-full bg-blue-100/50 text-blue-700 flex items-center justify-center text-[10px] font-bold">1</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900">Alert Dispatch</h4>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      When a hazard is identified, Administrators trigger the evacuation alarm. Clocked-in employees receive SMS/Email notifications with their safety QR code tokens immediately.
                    </p>
                  </div>

                  {/* Phase 2 */}
                  <div className="p-4 bg-slate-50 border border-gray-150 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Phase 2</span>
                      <span className="h-5 w-5 rounded-full bg-amber-100/50 text-amber-700 flex items-center justify-center text-[10px] font-bold">2</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900">Orderly Muster</h4>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Immediately shut down equipment, leave heavy bags, and proceed calmly along designated escape routes to your specified Muster Assembly Coordinates outside the geofence.
                    </p>
                  </div>

                  {/* Phase 3 */}
                  <div className="p-4 bg-slate-50 border border-gray-150 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Phase 3</span>
                      <span className="h-5 w-5 rounded-full bg-emerald-100/50 text-emerald-700 flex items-center justify-center text-[10px] font-bold">3</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900">Accountability</h4>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Report to the Fire Warden. Present your QR identifier for scanning, or click <strong>"Mark Myself Safe"</strong> directly inside this CRM panel to clear your missing status.
                    </p>
                  </div>
                </div>

                {/* Regional Muster Station Map Table */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">📍 Regional Muster Assembly Points</h4>
                  <div className="overflow-x-auto border border-gray-150 rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 font-semibold text-[9px] uppercase tracking-wider">
                          <th className="py-2 px-3.5">Office Site Location</th>
                          <th className="py-2 px-3.5">Designated Safe Assembly Zone</th>
                          <th className="py-2 px-3.5 text-right">Escape Clearance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 text-gray-600">
                        <tr>
                          <td className="py-2.5 px-3.5 font-semibold text-gray-900">Circular Quay HQ (Sydney)</td>
                          <td className="py-2.5 px-3.5">Customs House Square Plaza (North Zone)</td>
                          <td className="py-2.5 px-3.5 text-right font-medium text-emerald-600">Primary Clear</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3.5 font-semibold text-gray-900">Silicon Valley Branch (SF)</td>
                          <td className="py-2.5 px-3.5">Central Park Lawn (East Pavilion G1)</td>
                          <td className="py-2.5 px-3.5 text-right font-medium text-emerald-600">Primary Clear</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3.5 font-semibold text-gray-900">Marina Bay Corporate (SG)</td>
                          <td className="py-2.5 px-3.5">Promenade Boardwalk (A-Deck Muster Point)</td>
                          <td className="py-2.5 px-3.5 text-right font-medium text-emerald-600">Primary Clear</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3.5 font-semibold text-gray-900">Menara DIALOG (Kuala Lumpur)</td>
                          <td className="py-2.5 px-3.5">Central Fountain Garden (Main Gate Circle)</td>
                          <td className="py-2.5 px-3.5 text-right font-medium text-emerald-600">Primary Clear</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Extra warning footer */}
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] text-amber-700 leading-relaxed flex items-start gap-2">
                  <AlertOctagon className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>
                    <strong>Compliance Warning:</strong> Conducting false drills or neglecting to register during a live emergency is a breach of OHS/HSE corporate compliance rules. All scans and self-registrations are saved in the permanent compliance audit log.
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
