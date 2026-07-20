import React, { useState, useEffect } from 'react';
import { Store } from '../utils/store';
import { PunchLog, User, OfficeSite } from '../types';
import { getDistanceMeters, formatDistance } from '../utils/geo';
import { Clock, MapPin, CheckCircle, XCircle, Tag, FileText, ArrowRight, Activity, ShieldCheck, Compass, HelpCircle } from 'lucide-react';

interface PunchClockProps {
  currentUser: User;
  onPunchSuccess?: () => void;
}

export default function PunchClock({ currentUser, onPunchSuccess }: PunchClockProps) {
  const [offices, setOffices] = useState<OfficeSite[]>(() => Store.getOffices());
  const [logs, setLogs] = useState<PunchLog[]>(() => Store.getPunchLogs());
  const [currentLocation, setCurrentLocation] = useState(() => Store.getSimulatedLocation());

  // Punch fields
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Determine current active shift status (most recent punch for this user)
  const userPunches = logs
    .filter(l => l.userId === currentUser.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const lastPunch = userPunches.length > 0 ? userPunches[userPunches.length - 1] : null;
  const isClockedIn = lastPunch !== null && lastPunch.type === 'in';
  
  // Dynamic tick timer for active shift duration
  const [shiftElapsedStr, setShiftElapsedStr] = useState('00:00:00');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isClockedIn && lastPunch) {
      const elapsedTimer = setInterval(() => {
        const diffMs = Date.now() - new Date(lastPunch.timestamp).getTime();
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        
        const pad = (num: number) => String(num).padStart(2, '0');
        setShiftElapsedStr(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      }, 1000);
      return () => clearInterval(elapsedTimer);
    } else {
      setShiftElapsedStr('00:00:00');
    }
  }, [isClockedIn, lastPunch]);

  // Handle periodic location state synchronization
  useEffect(() => {
    const handleSync = () => {
      setCurrentLocation(Store.getSimulatedLocation());
      setOffices(Store.getOffices());
    };
    const syncInterval = setInterval(handleSync, 1000);
    return () => clearInterval(syncInterval);
  }, []);

  // Calculate distances to offices
  let activeOffice: OfficeSite | null = null;
  let minDistanceMeters = Infinity;
  let nearestOffice: OfficeSite | null = null;

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

  const isGeofencedAndEligible = activeOffice !== null;

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tagInput.trim().replace(/[^a-zA-Z0-9-]/g, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, i) => i !== indexToRemove));
  };

  const handleClockInOutSubmit = () => {
    if (!isGeofencedAndEligible) {
      alert('Forbidden Action: You must be physically within an authorized office site geofence to register a shift punch!');
      return;
    }

    const punchType = isClockedIn ? 'out' : 'in';
    const timestampStr = new Date().toISOString();
    
    // Create new Punch Log
    const newPunch: PunchLog = {
      id: `punch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      type: punchType,
      timestamp: timestampStr,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      officeSiteId: activeOffice!.id,
      officeSiteName: activeOffice!.name,
      tags: tags.length > 0 ? tags : [activeOffice!.name.split(' ')[0]],
      note: note.trim() || (punchType === 'in' ? 'Onsite shift started.' : 'Completed shift summary.'),
      verified: true
    };

    const currentLogs = Store.getPunchLogs();

    if (punchType === 'out' && lastPunch) {
      const durationMs = Date.now() - new Date(lastPunch.timestamp).getTime();
      const hours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
      newPunch.manhours = hours;

      Store.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'SHIFT_CLOCK_OUT',
        `Clocked out from site "${activeOffice!.name}". Registered shift man-hours: ${hours} hrs.`
      );

      if (hours > 8.0) {
        Store.sendEmail(
          currentUser.email,
          '⚠️ Overtime Shift Alert Warning',
          `Hello ${currentUser.name},\n\nYou logged ${hours} hours for your shift ending today at ${new Date(timestampStr).toLocaleTimeString()}.\n\nThis exceeds standard 8.0 hours. It has been marked as overtime and passed to administration for compensation approval.\n\nRegards,\nPersonnel On Board System`,
          'overtime'
        );
      }
    } else {
      Store.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'SHIFT_CLOCK_IN',
        `Registered onsite clock-in at "${activeOffice!.name}".`
      );
    }

    const updatedLogs = [...currentLogs, newPunch];
    Store.savePunchLogs(updatedLogs);
    setLogs(updatedLogs);
    
    setNote('');
    setTags([]);
    if (onPunchSuccess) onPunchSuccess();
  };

  // Preset location emulators
  const triggerLocationPreset = (name: string, lat: number, lon: number) => {
    const updatedLoc = { latitude: lat, longitude: lon, name };
    Store.saveSimulatedLocation(updatedLoc);
    setCurrentLocation(updatedLoc);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-left">
      
      {/* Clock in/out core widget */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
          
          <div className="space-y-4 text-center md:text-left flex-1">
            <span className="text-[10px] tracking-wider font-semibold uppercase text-blue-600 bg-blue-50/80 px-3 py-1 rounded-full border border-blue-100 inline-block">
              Shift Punch Station
            </span>
            
            <h2 className="text-5xl font-semibold tracking-tight text-gray-900">
              {currentTime.toLocaleTimeString()}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            {isClockedIn ? (
              <div className="pt-2">
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block">Current Shift Duration</span>
                <span className="text-3xl font-semibold font-mono text-emerald-600 tracking-wider">
                  {shiftElapsedStr}
                </span>
                <span className="text-[10px] text-gray-400 block mt-1 font-medium">CLOCK-IN SINCE: {new Date(lastPunch.timestamp).toLocaleTimeString()}</span>
              </div>
            ) : (
              <div className="text-xs text-gray-400 pt-2 flex items-center justify-center md:justify-start gap-1.5 font-medium tracking-wide">
                <Activity className="h-4 w-4 text-blue-500 animate-pulse shrink-0" />
                <span>STANDBY • AWAITING GEOLOCATION CHECK</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-5 bg-slate-50/50 rounded-2xl w-full md:w-80 shrink-0 relative shadow-sm">
            <div className="space-y-4.5 w-full">
              {/* Geofence Status Indicator */}
              <div className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs text-left ${
                isGeofencedAndEligible 
                  ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900' 
                  : 'bg-rose-50/60 border-rose-100 text-rose-900'
              }`}>
                {isGeofencedAndEligible ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-[11px] tracking-tight">Geofence Approved</p>
                      <p className="text-[10px] text-emerald-600/90 font-medium mt-0.5">Site: {activeOffice?.name}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-[11px] tracking-tight">Geofence Locked</p>
                      {nearestOffice ? (
                        <p className="text-[10px] text-rose-600/90 font-medium mt-0.5">Nearest: {nearestOffice.name} ({formatDistance(minDistanceMeters)})</p>
                      ) : (
                        <p className="text-[10px] text-rose-600/90 font-medium mt-0.5">Teleport to verified site</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Punch notes & tags */}
              {isGeofencedAndEligible && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Add shift comment..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-gray-800 placeholder:text-gray-400 w-full font-medium"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <form onSubmit={handleAddTag} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 focus-within:border-blue-400 transition-colors">
                      <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Add shift tag... (Enter)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        className="bg-transparent border-none outline-none text-[11px] text-gray-800 placeholder:text-gray-400 w-full font-medium"
                      />
                    </form>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tg, index) => (
                          <span key={index} className="inline-flex items-center gap-1 text-[9px] bg-gray-900 text-white px-2.5 py-0.5 rounded-full font-medium tracking-tight">
                            #{tg}
                            <button type="button" onClick={() => handleRemoveTag(index)} className="text-rose-300 hover:text-white font-medium ml-1 transition">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Core Punch Button */}
              <button
                onClick={handleClockInOutSubmit}
                disabled={!isGeofencedAndEligible}
                className={`w-full py-3 rounded-xl font-medium text-xs tracking-wide uppercase transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.01] active:scale-[0.99] ${
                  !isGeofencedAndEligible
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none'
                    : isClockedIn
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10'
                }`}
              >
                <span>{isClockedIn ? 'Clock Out Shift' : 'Clock In Shift'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Localized Personal Punch History logs */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 tracking-tight">Attendance History</h3>
          <div className="overflow-hidden bg-white rounded-2xl transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
            {userPunches.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-medium">
                No attendance logs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-150 bg-slate-50/50 text-gray-500 tracking-wide font-medium text-[10px] uppercase">
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Authorized Site Location</th>
                      <th className="py-3 px-4">Man-hours</th>
                      <th className="py-3 px-4">Notes & Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {userPunches.slice().reverse().map((lg) => (
                      <tr key={lg.id} className="hover:bg-slate-50/30 transition">
                        <td className="py-3.5 px-4">
                          {lg.type === 'in' ? (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium text-[9px] tracking-wide uppercase">IN</span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full font-medium text-[9px] tracking-wide uppercase">OUT</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">
                          <p className="font-medium text-gray-900">{new Date(lg.timestamp).toLocaleTimeString()}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-normal">{new Date(lg.timestamp).toLocaleDateString()}</p>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">
                          <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            <span>{lg.officeSiteName || 'Authorized Geofence'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                          {lg.manhours !== undefined ? `${lg.manhours.toFixed(1)} hrs` : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-gray-600 max-w-[200px] truncate font-normal" title={lg.note}>{lg.note}</p>
                          {lg.tags && lg.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {lg.tags.map((tg, i) => (
                                <span key={i} className="text-[8px] bg-gray-50 text-gray-500 border border-gray-150 px-2 py-0.5 rounded-full font-medium">#{tg}</span>
                              ))}
                            </div>
                          )}
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

      {/* Geolocation Emulator Helper Tab */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl p-5 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 tracking-tight flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-blue-500" />
              Coordinate Emulator
            </h3>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed font-normal">
              Simulate GPS coordinates to virtually position your session inside or outside of geofenced corporate boundaries.
            </p>
          </div>

          {/* Current emulator state */}
          <div className="p-3 bg-slate-50 border border-gray-150 rounded-xl space-y-1">
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest block">Current GPS position</span>
            <p className="text-xs font-semibold text-gray-900 leading-tight">{currentLocation.name}</p>
            <p className="text-[10px] text-blue-600 font-mono font-medium">
              LAT: {currentLocation.latitude.toFixed(4)}, LON: {currentLocation.longitude.toFixed(4)}
            </p>
          </div>

          <div className="space-y-1.5 text-left">
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Teleport GPS Presets</span>
            
            {offices.map((office) => (
              <button
                key={office.id}
                onClick={() => triggerLocationPreset(office.name, office.latitude, office.longitude)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between hover:bg-gray-50/50 ${
                  currentLocation.latitude === office.latitude && currentLocation.longitude === office.longitude
                    ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-600'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <div>
                  <p className="text-[11px] font-medium flex items-center gap-1">
                    <MapPin className={`h-3.5 w-3.5 shrink-0 ${currentLocation.latitude === office.latitude && currentLocation.longitude === office.longitude ? 'text-white' : 'text-emerald-500'}`} />
                    <span className="truncate max-w-[140px]">{office.name}</span>
                  </p>
                  <p className={`text-[9px] mt-0.5 font-normal ${currentLocation.latitude === office.latitude && currentLocation.longitude === office.longitude ? 'text-blue-100' : 'text-gray-400'}`}>Radius: {office.radiusMeters}m</p>
                </div>
                <span className={`text-[9px] font-medium uppercase tracking-tight ${currentLocation.latitude === office.latitude && currentLocation.longitude === office.longitude ? 'text-white' : 'text-blue-600'}`}>Teleport</span>
              </button>
            ))}

            {/* Out-of-bounds emulator button */}
            <button
              onClick={() => triggerLocationPreset('Away / Coffee Shop (Outside boundaries)', 37.7850, -122.4300)}
              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between hover:bg-gray-50/50 ${
                currentLocation.name.includes('Away')
                  ? 'bg-rose-50/60 border-rose-100 text-rose-950 font-medium'
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <div>
                <p className="text-[11px] font-medium flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span>Outside Geofence</span>
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5 font-normal">Locks clock station.</p>
              </div>
              <span className="text-[9px] font-medium text-rose-600 uppercase">Lock GPS</span>
            </button>
          </div>

          <div className="p-3 bg-white border border-gray-150 rounded-xl text-[10px] text-gray-500 leading-normal text-left flex gap-2 font-normal">
            <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-800 font-medium">How to test:</strong> Select any site above to enable clock-in, then tap "Outside Geofence" to lock.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
