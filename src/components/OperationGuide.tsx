import React, { useState } from 'react';
import { Store } from '../utils/store';
import { User } from '../types';
import { 
  BookOpen, 
  UserPlus, 
  MapPin, 
  Flame, 
  Award, 
  ShieldCheck, 
  Mail, 
  Database, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  Settings, 
  AlertTriangle, 
  CheckCircle2,
  FileText,
  UserCheck,
  Building,
  Lock,
  ChevronRight,
  Server
} from 'lucide-react';

interface OperationGuideProps {
  currentUser: User;
  onRefreshAll?: () => void;
}

export default function OperationGuide({ currentUser, onRefreshAll }: OperationGuideProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [activeSection, setActiveSection] = useState<string>('intro');

  const isAdmin = currentUser.role === 'admin';

  const handleResetSystem = async () => {
    if (!isAdmin) {
      alert('Only administrative accounts can trigger a system-wide database clearance.');
      return;
    }

    const confirmFirst = window.confirm(
      '⚠️ WARNING: You are about to clear all demo data presets!\n\n' +
      'This action will permanently delete all mock employees, dummy clock-ins, leave planner logs, certificate requests, and evacuation drills from BOTH LocalStorage and Firestore.\n\n' +
      'It will retain ONLY your active administrator account so the platform is completely clean and ready for real operations.\n\n' +
      'Are you absolutely sure you want to proceed?'
    );

    if (!confirmFirst) return;

    setIsResetting(true);
    setResetSuccess(false);
    setResetError('');

    try {
      await Store.resetDatabaseToLive();
      setResetSuccess(true);
      if (onRefreshAll) {
        onRefreshAll();
      }
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err: any) {
      setResetError(err.message || 'Failed to wipe database records.');
    } finally {
      setIsResetting(false);
    }
  };

  const menuItems = [
    { id: 'intro', label: 'Centralization & HSE Value', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'crew', label: 'Crew Onboarding & Roles', icon: <UserPlus className="h-4 w-4" /> },
    { id: 'geofencing', label: 'Geofence Boundaries & GPS', icon: <MapPin className="h-4 w-4" /> },
    { id: 'certs', label: 'Offshore Safety Certificates', icon: <Award className="h-4 w-4" /> },
    { id: 'evac', label: 'Emergency Evacuation & QR', icon: <Flame className="h-4 w-4" /> },
    { id: 'audits', label: 'Tamper-Proof Audit Logs', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'db-clear', label: 'Database Reset Center', icon: <Database className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-8" id="operational-guide-view">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-blue-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-2xl -ml-20 -mb-20"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-blue-500/30 inline-flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              Interactive Operational Guide
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              DIALOG Personnel On Board (POB) System
            </h1>
            <p className="text-blue-100/80 leading-relaxed text-sm">
              An advanced enterprise workspace centralizing geofenced tracking, certification safety compliance, real-time muster roll-calls, and audit accountability for hazardous offshore environments.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 self-start md:self-center shrink-0">
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Session Security Status</p>
            <p className="text-base font-bold text-white flex items-center gap-2 mt-1">
              <UserCheck className="h-4.5 w-4.5 text-emerald-400" />
              Active Secure Session
            </p>
            <span className="inline-block mt-1.5 text-xs bg-indigo-500/35 text-indigo-100 font-mono px-2 py-0.5 rounded border border-indigo-400/20 capitalize">
              Role: {currentUser.role === 'admin' ? 'HSE Administrator' : 'General Crew Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Sidebar Menu */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-3 mb-2">Manual Sections</p>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold text-left transition-all ${
                  activeSection === item.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200/80 translate-x-1'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${activeSection === item.id ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {item.icon}
                </div>
                <span className="truncate">{item.label}</span>
                <ChevronRight className={`ml-auto h-3.5 w-3.5 transition-transform ${activeSection === item.id ? 'translate-x-0.5 opacity-100' : 'opacity-0'}`} />
              </button>
            ))}
          </div>
          <div className="pt-4 mt-4 border-t border-gray-100 px-3">
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <Server className="h-3 w-3 text-emerald-500" />
              <span>Status: Synchronized</span>
            </div>
          </div>
        </div>

        {/* Right Content Pane */}
        <div className="lg:col-span-9 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[460px]">
          
          {/* Section 1: Centralization & HSE Value */}
          {activeSection === 'intro' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Safety Paradigm Shift</span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">How POB Centralization Empowers HSE Teams</h2>
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                In hazardous offshore operations (such as drilling rigs, gas terminals, and production vessels), fragmented data is a major security and compliance threat. This platform consolidates personnel tracking, credential statuses, and emergency coordinates into a <strong>unified real-time dashboard</strong>. This central source of truth replaces vulnerable paper manifests and disconnected local files.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/50 space-y-2">
                  <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-blue-900 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    Unified Command Center
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    HSE supervisors can immediately identify exactly who is checked in to which offshore platform, verify overall team safety readiness, and track live compliance ratings.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/50 space-y-2">
                  <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    Instant Incident Response
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    In emergency evacuations, the system triggers alerts, dispatches secure roll-call credentials, and aggregates live muster logs on a single administrative screen.
                  </p>
                </div>

                <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100/50 space-y-2">
                  <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-amber-900 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                    Proactive Compliance Blocks
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Rather than reacting to expired safety qualifications after an incident, the platform blocks system access and site clock-ins for non-compliant crew members.
                  </p>
                </div>

                <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100/50 space-y-2">
                  <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-purple-900 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                    Immutable Audit Trail
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Provides tamper-proof logs capturing every security event, database modification, role change, and drill to facilitate smooth regulatory audits with oil-and-gas authorities.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Crew Onboarding & Roles */}
          {activeSection === 'crew' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Human Capital Control</span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Personnel Directory & Role Security</h2>
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                The platform relies on a strict dual-role security architecture: <strong>Administrators/HSE Managers</strong> and <strong>Crew Members/Employees</strong>. Administrators manage onboarding and global system settings, while Employees focus on geofenced check-ins and safety attestations.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150/60 space-y-3">
                  <h3 className="text-sm font-bold text-gray-900">Onboarding Workflow Details</h3>
                  <ol className="text-xs text-gray-600 list-decimal pl-4 space-y-2.5 leading-relaxed">
                    <li>
                      <strong className="text-gray-800">Admin Registration:</strong> The Administrator navigates to the 'Employee Management' panel, inputting full legal name, professional email, passport metadata, and emergency contacts.
                    </li>
                    <li>
                      <strong className="text-gray-800">Temporary Provisioning:</strong> The database initiates a profile record and sets a secure default system password (e.g., <code className="bg-white border px-1 rounded font-mono">Dialog123</code>).
                    </li>
                    <li>
                      <strong className="text-gray-800">Forced Security Reset:</strong> Upon logging in for the first time with temporary credentials, the platform requires the crew member to set a personalized, high-security password. This action terminates the temporary state and logs the compliance event in the security audit trails.
                    </li>
                  </ol>
                </div>

                <div className="bg-amber-50/50 border-l-4 border-amber-500 p-4 rounded-r-2xl text-xs text-amber-900">
                  <span className="font-bold">Compliance Standard:</span> Immediate suspension is supported. If a manager deactivates or suspends an account, their active tokens are blocked instantly, preventing unauthorized geofence check-ins or emergency safety mark-offs.
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Geofence Boundaries */}
          {activeSection === 'geofencing' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Spatial Boundaries Enforcement</span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Geofence Coordinates & Location Control</h2>
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                Offshore personnel must be physically present at authorized operational sites to log attendance or shifts. The system blocks attendance fraud and guarantees roster integrity through an electronic boundary geofence.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150/60 space-y-2">
                    <h4 className="font-bold text-gray-900 text-xs">Admin Boundaries Setup</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Managers navigate to 'Geofence Boundaries' to map locations (e.g., drilling vessels, production platforms). They input exact Latitude/Longitude coordinates and define a radial buffer zone in meters.
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150/60 space-y-2">
                    <h4 className="font-bold text-gray-900 text-xs">GPS Verification Logic</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Upon crew clock-in, the platform queries the client Geolocation API and calculates the distance using the ellipsoidal Haversine formula against authorized coordinates. If the user is outside the radius, check-in is blocked.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 leading-relaxed">
                    <strong className="block mb-1">Testing Tip (Location Sandbox):</strong>
                    You can easily test geofencing by using the <strong>Virtual Location Emulator</strong> in the navigation header or shift clock interface. Selecting a mock coordinate like 'Circular Quay HQ' or 'Silicon Valley SF' positions you inside authorized boundaries. Switching to 'Gated Breach Coordinate' will trigger the geofence compliance engine and block your shift punch.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Offshore Safety Certificates */}
          {activeSection === 'certs' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Regulatory Credentials Enforcer</span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Offshore Safety Certificates & Training Controls</h2>
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                Operating in offshore environments requires active, accredited certifications. The system regulates qualifications to prevent non-compliant personnel from working on platforms, which could breach safety mandates.
              </p>

              <div className="space-y-4">
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-150/60 space-y-3">
                  <h3 className="text-sm font-bold text-gray-900">Certificate Types Manager</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    The platform tracks essential certifications by default, which administrators can dynamically manage, expand, or rename:
                  </p>
                  <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1.5 leading-relaxed">
                    <li><strong>BOSIET:</strong> Basic Offshore Safety Induction and Emergency Training (with EBS).</li>
                    <li><strong>PETRONAS Medical (AHD):</strong> Valid offshore fit-for-work certification.</li>
                    <li><strong>CIDB Green Card:</strong> Standard personnel construction safety credential.</li>
                    <li><strong>HUET / FOET:</strong> Helicopter Underwater Escape Training / Further Offshore Emergency Training.</li>
                  </ul>
                </div>

                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/50 space-y-2">
                  <h4 className="font-bold text-gray-900 text-xs">Submission & Auditing Cycle</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Personnel upload PDF/image files and specify the document's expiration date. Administrators can verify or reject submissions. If a certificate expires or is missing, the profile is immediately flagged as 'PENDING COMPLIANCE' on the main HSE overview dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Emergency Evacuation */}
          {activeSection === 'evac' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Muster Roll-Call Operations</span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Emergency Evacuation & QR Muster Tracking</h2>
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                During emergencies or drills, every second counts. The centralized evacuation module replaces old paper-based headcounts with an instant, synchronized digital tracking system.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150/60 space-y-3.5">
                  <h3 className="text-sm font-bold text-gray-900">Digital Evacuation Lifecycle</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600 leading-relaxed">
                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                      <span className="font-bold text-red-600 block mb-1">1. MOBILIZE</span>
                      Admins select a coordinates sector and trigger an evacuation. This immediately alerts all checked-in personnel on-screen.
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                      <span className="font-bold text-amber-600 block mb-1">2. QR DISPATCH</span>
                      The system automatically dispatches a secure, unique Muster Assembly QR Code to the crew member's email inbox.
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                      <span className="font-bold text-emerald-600 block mb-1">3. ROLL-CALL</span>
                      Muster station wardens scan the QR codes using device cameras (requesting permission first), immediately marking workers as SAFE.
                    </div>
                  </div>
                </div>

                <div className="bg-red-50/50 border border-red-100 text-red-950 p-4 rounded-2xl text-xs leading-relaxed">
                  <strong>Emergency Drill Safety Note:</strong> Crews can also manually mark themselves safe on their personal dashboards if they are unable to reach a warden. The real-time evacuation summary continuously updates total safe, evacuating, and missing numbers across all administrative terminals.
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Tamper-Proof Audit Logs */}
          {activeSection === 'audits' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block mb-1">Security & Integrity Assurance</span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Immutable System & Security Audit Logs</h2>
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                Safety compliance requires unalterable evidence of all operations. This system integrates an immutable <strong>Security Audit Log</strong> to ensure robust auditing.
              </p>

              <div className="space-y-4">
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-150/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Captured Operational Events</h4>
                  <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4 leading-relaxed">
                    <li><strong>Authentication Audits:</strong> Successful logins, logouts, forced password updates, and password reset dispatches.</li>
                    <li><strong>Operational Audits:</strong> Site creations, coordinates adjustments, geofence radius changes, and personnel suspensions.</li>
                    <li><strong>Safety Audits:</strong> Certificate updates, document verifications, evacuation drill initiations, and muster marks.</li>
                    <li><strong>Compliance Alerts:</strong> Automatic background sweeps that flag shifts active for over 14 hours.</li>
                  </ul>
                </div>

                <div className="bg-blue-50/40 border border-blue-100/50 p-4 rounded-2xl text-xs text-blue-900 leading-relaxed">
                  <strong>Tamper-Proof Design:</strong> The audit logs cannot be modified, deleted, or cleared by any user. This guarantees an authentic historical log of compliance during official safety audits.
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Database Reset & Production Mode */}
          {activeSection === 'db-clear' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-[10px] text-red-600 font-extrabold uppercase tracking-widest block mb-1">Production Handover Console</span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Database & Demo Presets Clearance</h2>
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                Before transitioning this platform to live corporate operations, administrators should wipe all sandbox and pre-populated demo database presets. This ensures a clean environment for registering real personnel and authentic work coordinates.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                <div className="md:col-span-7 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150/60 space-y-2.5">
                    <p className="text-xs font-bold text-gray-700">Wiping database presets will execute the following:</p>
                    <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                      <li>Remove all dummy crew members.</li>
                      <li>Purge historical clock-ins, mock shifts, and leave records.</li>
                      <li>Clear prior test evacuation events and certificate requests.</li>
                      <li>Wipe pre-populated demo site locations.</li>
                      <li><span className="font-semibold text-emerald-600">Retain only</span> your active administrator account to prevent login lockouts.</li>
                    </ul>
                  </div>

                  {/* Clear Database Actions */}
                  <div className="space-y-3 pt-2">
                    {isAdmin ? (
                      <>
                        <button
                          onClick={handleResetSystem}
                          disabled={isResetting}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-red-100 transition duration-150 flex items-center justify-center gap-2 disabled:bg-red-400 text-xs uppercase tracking-wider"
                          id="btn-wipe-pobs-presets"
                        >
                          {isResetting ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Purging & Synchronizing Firestore...
                            </>
                          ) : (
                            <>
                              <Database className="h-4 w-4" />
                              Wipe Demo Presets & Make Live
                            </>
                          )}
                        </button>
                        <p className="text-2xs text-center text-gray-400">
                          This triggers a complete synchronization across both client LocalStorage and Google Firestore databases.
                        </p>
                      </>
                    ) : (
                      <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl text-xs leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" />
                          Permission Restricted
                        </p>
                        <p className="mt-1">
                          You are currently logged in as a general employee. Wiping mock databases and initializing production setups can only be executed by administrators. Please log in using administrative credentials to perform this operation.
                        </p>
                      </div>
                    )}

                    {/* Status Alerts */}
                    {resetSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-start gap-2.5 animate-pulse">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Production Setup Activated Successfully!</p>
                          <p className="mt-1">All pre-populated records have been cleared. The workspace is reloading...</p>
                        </div>
                      </div>
                    )}

                    {resetError && (
                      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs flex items-start gap-2.5">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Reset Execution Failed</p>
                          <p className="mt-1">{resetError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Database Specs / Environment Parameters */}
                <div className="md:col-span-5 bg-gray-50 rounded-2xl p-4 border border-gray-150/60 h-fit space-y-4">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-200 pb-2">
                    <Settings className="h-4 w-4 text-gray-400" />
                    System Parameters
                  </h4>
                  
                  <div className="space-y-3 text-2xs font-mono text-gray-600">
                    <div className="bg-white p-2 rounded-xl border border-gray-100">
                      <p className="text-gray-400 uppercase">Admin Account Group</p>
                      <p className="font-bold text-gray-800 mt-0.5">admin@dialog.corp</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-gray-100">
                      <p className="text-gray-400 uppercase">Default Password</p>
                      <p className="font-bold text-gray-800 mt-0.5">Dialog123</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-gray-100">
                      <p className="text-gray-400 uppercase">Database Engine</p>
                      <p className="font-bold text-gray-800 mt-0.5">Google Firestore & LocalStorage</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
