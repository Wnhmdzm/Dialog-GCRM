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
  UserCheck
} from 'lucide-react';

interface OperationGuideProps {
  currentUser: User;
  onRefreshAll?: () => void;
}

export default function OperationGuide({ currentUser, onRefreshAll }: OperationGuideProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [activeStep, setActiveStep] = useState<number>(0);

  const isAdmin = currentUser.role === 'admin';

  const handleResetSystem = async () => {
    if (!isAdmin) {
      alert('Only administrative accounts can trigger a system-wide database clearance.');
      return;
    }

    const confirmFirst = window.confirm(
      '⚠️ WARNING: You are about to clear all demo data presets!\n\n' +
      'This action will permanently delete all mock employees, dummy clock-ins, leave planner logs, certificate requests, and evacuation drills from BOTH LocalStorage and Firestore.\n\n' +
      'It will retain ONLY your account (Khairumi Kasim) so the platform is completely clean and ready for real operations.\n\n' +
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
        // Refresh page to guarantee all components reload with empty arrays
        window.location.reload();
      }, 2500);
    } catch (err: any) {
      setResetError(err.message || 'Failed to wipe database records.');
    } finally {
      setIsResetting(false);
    }
  };

  const operationalSteps = [
    {
      title: "1. Register Your HSE Crew & Officers",
      icon: <UserPlus className="h-5 w-5 text-blue-500" />,
      role: "Admin (Khairumi)",
      desc: "Go to the 'Employee Management' page. Enter the full name, corporate email address, and role. Upon creation, the employee is provisioned with a temporary password (Dialog123) and receive a simulated welcome invitation in the Simulated Mailroom.",
      tip: "Newly registered employees will be forced to change their password on their first login for security compliance."
    },
    {
      title: "2. Define Offshore Rigs & Geofence Boundaries",
      icon: <MapPin className="h-5 w-5 text-emerald-500" />,
      role: "Admin (Khairumi)",
      desc: "Navigate to 'Geofence Boundaries' to map physical work sites or offshore drilling platforms (e.g., PFLNG Satu, Temana Platform). Set exact latitude, longitude, and an electronic fence radius in meters.",
      tip: "The system enforces these boundaries when employees check in to prevent out-of-bounds attendance logging."
    },
    {
      title: "3. Onsite Geofenced Attendance Clocking",
      icon: <Clock className="h-5 w-5 text-indigo-500" />,
      role: "Admin & Employees",
      desc: "Personnel navigate to 'Onsite Shift Clock'. Using the simulated location tool, select an authorized site and click 'Clock In'. The system verifies GPS coordinates in real-time, calculates elapsed manhours upon clock-out, and records verification status.",
      tip: "Admins can run a 'Shift Audit' on the Overview dashboard to detect missing clock-outs and notify employees automatically."
    },
    {
      title: "4. Issue & Verify Offshore Safety Certificates",
      icon: <Award className="h-5 w-5 text-amber-500" />,
      role: "Admin & Employees",
      desc: "Offshore safety requires valid credentials. Admins go to 'Certificates', input a title (e.g., 'BOSIET Recertification') and assign to crew. Employees then upload their certificate scan. Admins can verify or reject submissions.",
      tip: "Expired or pending certificates will flag the employee as 'PENDING COMPLIANCE' on the global overview dashboard."
    },
    {
      title: "5. Real-Time Emergency Muster Alarm & Evacuation",
      icon: <Flame className="h-5 w-5 text-rose-500" />,
      role: "Admin (Khairumi)",
      desc: "In an emergency, navigate to 'Vacuation Panel'. Admins can trigger a muster drill or live evacuation. All active checked-in crew are instantly mobilized and must confirm their safety via their device.",
      tip: "Real-time statistics show exact safe counts vs. missing crew on the muster platform."
    },
    {
      title: "6. Security Audit Tracking & Simulated Mailroom",
      icon: <ShieldCheck className="h-5 w-5 text-purple-500" />,
      role: "Admin & Employees",
      desc: "Admins can review tamper-proof 'Security Audit Logs' recording system boot, user creations, password changes, and geofence alerts. Check 'Simulated Mailroom' to review dispatched system emails.",
      tip: "The mailroom is perfect for monitoring compliance reminders, password reset links, and over-time alerts."
    }
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
            <p className="text-blue-100/80 leading-relaxed text-sm md:text-base">
              Welcome to the HSE & Geofenced Crew Management console. This manual details the workflow to mobilize offshore teams, verify safety certifications, manage geofence sites, and enforce real-time evacuation muster drills.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 self-start md:self-center">
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Current Session Role</p>
            <p className="text-lg font-bold text-white flex items-center gap-2 mt-1">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              {currentUser.name}
            </p>
            <span className="inline-block mt-1.5 text-xs bg-indigo-500/35 text-indigo-100 font-mono px-2 py-0.5 rounded border border-indigo-400/20 capitalize">
              Role: {currentUser.role}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Instructions vs Database Live Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Step-by-Step interactive manual (Col 7) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Operational Manual
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Click any stage below to inspect detailed operational instructions</p>
            </div>
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
              6 Simple Steps
            </span>
          </div>

          {/* Interactive Step Switcher */}
          <div className="flex flex-wrap gap-2">
            {operationalSteps.map((s, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeStep === index 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Step {index + 1}
              </button>
            ))}
          </div>

          {/* Step Detail Card */}
          <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-100/60 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 mt-1">
                {operationalSteps[activeStep].icon}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-gray-900 text-base">
                    {operationalSteps[activeStep].title}
                  </h3>
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                    {operationalSteps[activeStep].role}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mt-2">
                  {operationalSteps[activeStep].desc}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-xl">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 font-medium">
                  <span className="font-bold">Operational Tip: </span>
                  {operationalSteps[activeStep].tip}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Flow Visualizer */}
          <div className="border border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50/30">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Live Operational Lifecycle Flow</p>
            <div className="flex flex-col md:flex-row items-center gap-2 text-xs font-medium text-gray-600">
              <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1.5 w-full md:w-auto justify-center">
                <span className="font-bold text-blue-600">1</span> Admin Adds Crew
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 hidden md:block shrink-0" />
              <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1.5 w-full md:w-auto justify-center">
                <span className="font-bold text-emerald-600">2</span> Define Geofences
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 hidden md:block shrink-0" />
              <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1.5 w-full md:w-auto justify-center">
                <span className="font-bold text-indigo-600">3</span> Punch Attendance
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 hidden md:block shrink-0" />
              <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1.5 w-full md:w-auto justify-center">
                <span className="font-bold text-amber-600">4</span> Verify Safety Certs
              </div>
            </div>
          </div>
        </div>

        {/* Database Clearance Command Center (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Action Card: Go Live database wipe */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-1 flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl -mr-6 -mt-6"></div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <Database className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Go-Live Command Center</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Database & Demo Presets Clearance
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Before launching the Personnel On Board System for real corporate employees, you should clear all pre-populated demo records. 
              </p>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2.5">
                <p className="text-xs font-bold text-gray-700">Wiping database presets will perform the following:</p>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>Remove dummy workers <span className="font-semibold">(John Doe, Sarah Jenkins, Bob Smith)</span>.</li>
                  <li>Purge all historical shift logs, clock-ins, and leave quotas.</li>
                  <li>Delete old evacuation drills and test certificate requests.</li>
                  <li>Wipe all demo sites <span className="font-semibold">(Silicon Valley HQ, London Hub, etc)</span> so you can define real platforms.</li>
                  <li><span className="font-semibold text-emerald-600">Retain only</span> <span className="underline">Khairumi Kasim (HSE Engineer)</span> as the main live Admin.</li>
                </ul>
              </div>
            </div>

            {/* Clear Database Actions */}
            <div className="space-y-3 pt-4">
              {isAdmin ? (
                <>
                  <button
                    onClick={handleResetSystem}
                    disabled={isResetting}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-red-100 transition duration-150 flex items-center justify-center gap-2 disabled:bg-red-400"
                    id="btn-wipe-pobs-presets"
                  >
                    {isResetting ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Purging & Synchronizing Firestore...
                      </>
                    ) : (
                      <>
                        <Database className="h-5 w-5" />
                        Wipe Demo Presets & Make Live
                      </>
                    )}
                  </button>
                  <p className="text-2xs text-center text-gray-400">
                    This triggers complete synchronization of both LocalStorage and Google Firestore database.
                  </p>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl text-xs">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Permission Restriction
                  </p>
                  <p className="mt-1 leading-relaxed">
                    You are currently logged in as an <span className="font-semibold">employee</span>. Wiping mock databases and initializing live systems can only be executed by administrators. Please log in as <span className="font-semibold">khairumi.kasim@dialogasia.com</span> (Password: Dialog123) to perform this operation.
                  </p>
                </div>
              )}

              {/* Status Alerts */}
              {resetSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-start gap-2.5 animate-pulse">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Live System Activated Successfully!</p>
                    <p className="mt-1">All demo data has been cleared from LocalStorage and Firestore database. The application is reloading automatically in a moment...</p>
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

          {/* Quick Specs / Environment Info */}
          <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 space-y-4">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-gray-400" />
              Live Deployment Parameters
            </h4>
            
            <div className="grid grid-cols-2 gap-3 text-2xs font-mono text-gray-600">
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <p className="text-gray-400 uppercase">Admin Account</p>
                <p className="font-bold text-gray-800 mt-1 truncate">khairumi.kasim@dialogasia.com</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <p className="text-gray-400 uppercase">Starting Password</p>
                <p className="font-bold text-gray-800 mt-1">Dialog123</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <p className="text-gray-400 uppercase">Target Ingress Port</p>
                <p className="font-bold text-gray-800 mt-1">3000</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <p className="text-gray-400 uppercase">Database Engine</p>
                <p className="font-bold text-gray-800 mt-1">Google Firestore</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
