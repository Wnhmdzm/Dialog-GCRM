import React, { useState, useEffect, useRef } from 'react';
import { User, Certificate, CertificateRequest } from '../types';
import { Store } from '../utils/store';
import { 
  Award, FileText, CheckCircle, AlertTriangle, XCircle, Plus, Send, 
  Download, Sparkles, User as UserIcon, Shield, Info, UploadCloud, 
  Trash2, Calendar, Check, RefreshCcw, Search, Eye, AlertCircle
} from 'lucide-react';

interface CertificatesProps {
  currentUser: User;
}

export default function Certificates({ currentUser }: CertificatesProps) {
  const isAdmin = currentUser.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // Dynamic Malaysian offshore certificate types customizable by admin
  const [certTypes, setCertTypes] = useState<string[]>(() => Store.getCertificateTypes());

  // State Management
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [syncKey, setSyncKey] = useState(0);

  // Filter & Selected state for Admin DB View
  const [selectedCertFilter, setSelectedCertFilter] = useState<string>('All');
  
  // Active/expanded certificate request detail
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Form State for Employee uploads
  const [uploadType, setUploadType] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');

  // Form State for Offshore Profile fields
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [kinName, setKinName] = useState(currentUser.kinName || '');
  const [kinPhone, setKinPhone] = useState(currentUser.kinPhone || '');
  const [passportOrNric, setPassportOrNric] = useState(currentUser.passportOrNric || '');
  const [offshoreGridNumber, setOffshoreGridNumber] = useState(currentUser.offshoreGridNumber || '');
  const [epTravelStatus, setEpTravelStatus] = useState(currentUser.epTravelStatus || 'Not Started');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Form State for Admin issuing Request
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqType, setNewReqType] = useState('');
  const [newReqDesc, setNewReqDesc] = useState('');
  const [newReqDeadline, setNewReqDeadline] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');
  const [reqError, setReqError] = useState('');

  // Set default form choices once certificate types load
  useEffect(() => {
    if (certTypes.length > 0) {
      if (!uploadType) setUploadType(certTypes[0]);
      if (!newReqType) setNewReqType(certTypes[0]);
    }
  }, [certTypes]);

  // AI Audit State
  const [aiReport, setAiReport] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');

  // Drag and drop events handlers
  const [isDragging, setIsDragging] = useState(false);

  // Load state and listen to local store sync triggers
  const refreshData = () => {
    setCerts(Store.getCertificates());
    setRequests(Store.getCertificateRequests());
    setEmployees(Store.getUsers());
    setCertTypes(Store.getCertificateTypes());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [syncKey]);

  // Handle Drag-and-Drop file uploads
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSelectedFileBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Employee: Save certificate upload
  const handleUploadCert = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadSuccess('');
    setUploadError('');

    if (!issueDate || !expiryDate) {
      setUploadError('Please select valid Issue and Expiry Dates.');
      return;
    }

    if (new Date(issueDate) >= new Date(expiryDate)) {
      setUploadError('Issue Date must be earlier than Expiry Date.');
      return;
    }

    if (!selectedFileBase64) {
      setUploadError('Please choose or drag-and-drop a scanned certificate document (PDF/Image).');
      return;
    }

    const now = new Date();
    const expDate = new Date(expiryDate);
    let status: 'valid' | 'expiring' | 'expired' = 'valid';

    if (expDate <= now) {
      status = 'expired';
    } else {
      const threeMonthsInMs = 90 * 24 * 60 * 60 * 1000;
      if (expDate.getTime() - now.getTime() < threeMonthsInMs) {
        status = 'expiring';
      }
    }

    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      certType: uploadType,
      fileName: selectedFile ? selectedFile.name : 'scanned_certificate.pdf',
      fileData: selectedFileBase64,
      issueDate,
      expiryDate,
      uploadedAt: now.toISOString(),
      status
    };

    const currentCerts = Store.getCertificates();
    // Replace duplicate type if already exists for this user (updates credentials)
    const filteredCerts = currentCerts.filter(c => !(c.userId === currentUser.id && c.certType === uploadType));
    const updatedCerts = [...filteredCerts, newCert];
    Store.saveCertificates(updatedCerts);

    // Track activity log
    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'CERTIFICATE_UPLOAD',
      `Uploaded offshore certificate: ${uploadType}. Validity until: ${expiryDate}.`
    );

    setUploadSuccess(`Successfully uploaded and recorded your offshore ${uploadType} certificate!`);
    setIssueDate('');
    setExpiryDate('');
    setSelectedFile(null);
    setSelectedFileBase64('');
    setSyncKey(p => p + 1);
  };

  // Employee: Save Offshore Profile Info
  const handleUpdateOffshoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');

    const allUsers = Store.getUsers();
    const updatedUser: User = {
      ...currentUser,
      phone: phone.trim(),
      kinName: kinName.trim(),
      kinPhone: kinPhone.trim(),
      passportOrNric: passportOrNric.trim(),
      offshoreGridNumber: offshoreGridNumber.trim(),
      epTravelStatus: epTravelStatus as any
    };

    const updatedUsers = allUsers.map(u => u.id === currentUser.id ? updatedUser : u);
    Store.saveUsers(updatedUsers);
    Store.saveCurrentUser(updatedUser);

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'OFFSHORE_PROFILE_UPDATE',
      `Updated Malaysian offshore safety deployment profile parameters.`
    );

    setProfileSuccess('Offshore Personnel Profile successfully updated and synchronized.');
    setTimeout(() => setProfileSuccess(''), 4000);
  };

  // Admin: Delete certificate upload record
  const handleDeleteCert = (certId: string, certOwner: string, certTypeName: string) => {
    if (confirm(`Are you sure you want to delete the ${certTypeName} certificate belonging to ${certOwner}?`)) {
      const allCerts = Store.getCertificates();
      const updated = allCerts.filter(c => c.id !== certId);
      Store.saveCertificates(updated);

      Store.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'CERTIFICATE_DELETE',
        `Deleted ${certTypeName} certificate belonging to ${certOwner}.`
      );

      setSyncKey(p => p + 1);
    }
  };

  // Admin: Issue new certificate upload request
  const handleIssueRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setReqSuccess('');
    setReqError('');

    if (!newReqTitle.trim() || !newReqDeadline) {
      setReqError('Please provide a descriptive title and deadline date.');
      return;
    }

    const newRequest: CertificateRequest = {
      id: `req-${Date.now()}`,
      title: newReqTitle.trim(),
      certType: newReqType,
      description: newReqDesc.trim(),
      issuedAt: new Date().toISOString(),
      issuedBy: currentUser.name,
      requiredByDate: newReqDeadline
    };

    const currentReqs = Store.getCertificateRequests();
    Store.saveCertificateRequests([...currentReqs, newRequest]);

    // Send mock notification emails to all staff
    const employeesList = Store.getUsers().filter(u => u.role === 'employee');
    const emailsList = Store.getEmails();
    const newEmails = [...emailsList];

    employeesList.forEach(emp => {
      newEmails.push({
        id: `mail-req-${Date.now()}-${emp.id}`,
        recipientEmail: emp.email,
        subject: `⚠️ ACTION REQUIRED: New Certificate Request - ${newReqTitle}`,
        body: `Hello ${emp.name},\n\nAn administrator (${currentUser.name}) has issued a new request to submit and upload your relevant offshore credentials.\n\nRequest: ${newReqTitle}\nRequired Certificate Type: ${newReqType}\nDetails: ${newReqDesc || 'Please provide your scanned certificate in your POBS profile.'}\nSubmit Deadline: ${newReqDeadline}\n\nPlease log in to the Personnel On Board System and navigate to the Certificates page to upload your files.\n\nRegards,\nPOBS Automated Notification`,
        sentAt: new Date().toISOString(),
        type: 'system' as const,
        read: false
      });
    });
    Store.saveEmails(newEmails);

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'CERTIFICATE_REQUEST_CREATE',
      `Issued compliance request to all staff: "${newReqTitle}" for ${newReqType}.`
    );

    setReqSuccess('Successfully issued new upload request to all offshore personnel and dispatched automated email notifications.');
    setNewReqTitle('');
    setNewReqDesc('');
    setNewReqDeadline('');
    setSyncKey(p => p + 1);
  };

  // Admin: Send manual reminder to an employee who hasn't uploaded
  const handleSendReminder = (emp: User, reqTitle: string, certTypeRequired: string) => {
    const emailsList = Store.getEmails();
    const reminderEmail = {
      id: `mail-remind-${Date.now()}`,
      recipientEmail: emp.email,
      subject: `🚨 URGENT REMINDER: Missing ${certTypeRequired} Upload`,
      body: `Hello ${emp.name},\n\nThis is an urgent reminder that you have not uploaded your mandatory ${certTypeRequired} certificate as requested for "${reqTitle}".\n\nYour offshore mobilization status is currently flagged as PENDING due to this missing compliance document.\n\nPlease upload this document immediately in the POBS dashboard.\n\nRegards,\nHSE Department`,
      sentAt: new Date().toISOString(),
      type: 'missing_shift' as const,
      read: false
    };

    Store.saveEmails([...emailsList, reminderEmail]);
    alert(`Reminder notification dispatched successfully to ${emp.name} (${emp.email}).`);

    Store.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'REMINDER_SENT',
      `Sent compliance reminder to ${emp.name} for missing ${certTypeRequired}.`
    );
  };

  // AI Compliance Audit Call using Server Route
  const handleRunAiAudit = async () => {
    setIsAiLoading(true);
    setAiReport('');
    setAiError('');

    try {
      const response = await fetch('/api/certificates/ai-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificates: certs,
          employees: employees
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAiReport(data.report || 'No audit report received.');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'An unexpected error occurred during the AI Compliance check.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Export current table view as CSV
  const handleExportCSV = (tableType: string, filteredCertsList: Certificate[]) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Employee Name,Employee Email,Certificate Type,Issue Date,Expiry Date,Status,Uploaded At\n";

    filteredCertsList.forEach(c => {
      const row = `"${c.userName}","${c.userEmail}","${c.certType}","${c.issueDate}","${c.expiryDate}","${c.status}","${new Date(c.uploadedAt).toLocaleDateString()}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `POBS_Offshore_Certificates_${tableType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple Markdown Renderer Helper
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('###')) {
        return <h4 key={idx} className="text-sm font-bold text-gray-950 mt-4 mb-2 flex items-center gap-1.5 border-b pb-1 border-gray-100">{line.replace('###', '')}</h4>;
      }
      if (line.startsWith('####')) {
        return <h5 key={idx} className="text-xs font-bold text-blue-900 mt-3 mb-1.5 uppercase tracking-wide">{line.replace('####', '')}</h5>;
      }
      if (line.startsWith('##')) {
        return <h3 key={idx} className="text-base font-extrabold text-gray-900 mt-5 mb-2.5">{line.replace('##', '')}</h3>;
      }
      if (line.startsWith('*') || line.startsWith('-')) {
        let content = line.substring(1).trim();
        // Check for nested bold tag
        const boldMatch = content.match(/\*\*(.*?)\*\*/);
        if (boldMatch) {
          const parts = content.split('**');
          return (
            <li key={idx} className="text-[11px] text-gray-600 ml-4 list-disc py-0.5 leading-relaxed">
              {parts[0]}<strong className="text-gray-900 font-semibold">{boldMatch[1]}</strong>{parts.slice(2).join('')}
            </li>
          );
        }
        return <li key={idx} className="text-[11px] text-gray-600 ml-4 list-disc py-0.5 leading-relaxed">{content}</li>;
      }
      if (line.trim() === '---') {
        return <hr key={idx} className="my-4 border-gray-150" />;
      }
      
      // Regular line
      const boldMatch = line.match(/\*\*(.*?)\*\*/g);
      if (boldMatch) {
        let renderedLine = line;
        boldMatch.forEach(m => {
          const clean = m.replace(/\*\*/g, '');
          renderedLine = renderedLine.replace(m, `<strong class="text-gray-950 font-bold">${clean}</strong>`);
        });
        return <p key={idx} className="text-[11px] text-gray-600 my-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderedLine }} />;
      }

      return line.trim() ? <p key={idx} className="text-[11px] text-gray-600 my-1 leading-relaxed">{line}</p> : <div key={idx} className="h-2" />;
    });
  };

  // Helper to determine status color
  const getStatusBadge = (status: string, dateStr: string) => {
    if (status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full">
          <XCircle className="h-2.5 w-2.5" />
          Expired ({dateStr})
        </span>
      );
    }
    if (status === 'expiring') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
          <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
          Expiring Soon ({dateStr})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
        <CheckCircle className="h-2.5 w-2.5 text-emerald-500" />
        Valid (Expires {dateStr})
      </span>
    );
  };

  // Identify expiring certs within 3 months (90 days) for alerts
  const expiringCerts3Months = certs.filter(c => {
    const exp = new Date(c.expiryDate);
    const now = new Date();
    const threeMonths = 90 * 24 * 60 * 60 * 1000;
    return exp > now && exp.getTime() - now.getTime() < threeMonths;
  });

  // Render Employee Page
  const renderEmployeeView = () => {
    const myCerts = certs.filter(c => c.userId === currentUser.id);
    const myPendingRequests = requests.filter(r => !myCerts.some(c => c.certType === r.certType));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Upload Form & Offshore Profile */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* File Scanned Upload Card */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100">
            <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-blue-600" />
              Upload Scanned Certification
            </h4>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 mb-4 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-700 mb-4 flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadCert} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Certificate Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                >
                  {certTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                    required
                  />
                </div>
              </div>

              {/* Drag and Drop Container */}
              <div
                ref={dragRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[120px] ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50/30' 
                    : 'border-gray-200 bg-gray-50/20 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <UploadCloud className={`h-8 w-8 mb-2 ${selectedFile ? 'text-emerald-500 animate-bounce' : 'text-gray-400'}`} />
                {selectedFile ? (
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700 truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB • Click to swap file</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] font-medium text-gray-700">Drag & drop scanned file here</p>
                    <p className="text-[9px] text-gray-400 mt-1">or click to browse PDF / JPG / PNG</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition"
              >
                <Award className="h-4 w-4" />
                Upload Certificate
              </button>
            </form>
          </div>

          {/* Fully Completed Offshore Malaysia Specific Fields */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100">
            <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-blue-600" />
              Offshore Personnel Profile
            </h4>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-700 mb-4">
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateOffshoreProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Personal Mobile Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +60 12-345 6789"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Emergency Next of Kin Name</label>
                  <input
                    type="text"
                    value={kinName}
                    onChange={(e) => setKinName(e.target.value)}
                    placeholder="Kin Full Name"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Next of Kin Phone</label>
                  <input
                    type="text"
                    value={kinPhone}
                    onChange={(e) => setKinPhone(e.target.value)}
                    placeholder="Kin contact no."
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Passport / NRIC No.</label>
                  <input
                    type="text"
                    value={passportOrNric}
                    onChange={(e) => setPassportOrNric(e.target.value)}
                    placeholder="e.g. 950812-14-5541 / A12345"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Offshore Smart Card ID</label>
                  <input
                    type="text"
                    value={offshoreGridNumber}
                    onChange={(e) => setOffshoreGridNumber(e.target.value)}
                    placeholder="e.g. GRID-49320-MY"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">EP Travel / Mobilization Status</label>
                <select
                  value={epTravelStatus}
                  onChange={(e) => setEpTravelStatus(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                >
                  <option value="Not Started">Not Started (Prerequisites Pending)</option>
                  <option value="Pending">Pending Crew-List Approval</option>
                  <option value="Approved">Approved for Offshore Mobilization (Miri / Kemaman)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition"
              >
                Update Safety Profile
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: My Uploads & Active Requests */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Prerequisite Warnings / Requests Block */}
          {myPendingRequests.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 text-xs">⚠️ Core Prerequisite Deliverables Requested ({myPendingRequests.length})</p>
                  <p className="text-amber-700 text-[10px] mt-1">Management requires you to submit the following credentials immediately to clear your offshore safety record:</p>
                  
                  <div className="mt-3 space-y-2">
                    {myPendingRequests.map(req => (
                      <div key={req.id} className="bg-white/80 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-[11px] text-gray-900">{req.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Required Certificate: <span className="font-semibold text-blue-600">{req.certType}</span></p>
                          {req.description && <p className="text-[9px] text-gray-400 mt-0.5 italic">{req.description}</p>}
                        </div>
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold self-start sm:self-center">
                          Due: {req.requiredByDate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Scanned Certificates Table */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100">
            <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-600" />
                My Scanned Certificates Directory
              </span>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{myCerts.length} Files</span>
            </h4>

            {myCerts.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                <FileText className="h-8 w-8 text-gray-300" />
                <p>No scanned certifications uploaded yet.</p>
                <p className="text-[10px] text-gray-400">Use the form on the left to upload your BOSIET or PETRONAS Medical files.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[9px]">
                      <th className="py-3 font-semibold">Certificate Type</th>
                      <th className="py-3 font-semibold">File Scanned</th>
                      <th className="py-3 font-semibold">Issue Date</th>
                      <th className="py-3 font-semibold">Status & Expiry</th>
                      <th className="py-3 font-semibold text-right">Uploaded On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myCerts.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="py-3.5 font-bold text-gray-950">{c.certType}</td>
                        <td className="py-3.5 text-gray-500 font-mono text-[10px] max-w-[120px] truncate" title={c.fileName}>
                          <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="underline cursor-pointer">Scanned_Doc.pdf</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-gray-600 font-medium">{c.issueDate}</td>
                        <td className="py-3.5">{getStatusBadge(c.status, c.expiryDate)}</td>
                        <td className="py-3.5 text-right text-gray-400 text-[10px]">{new Date(c.uploadedAt).toLocaleDateString()}</td>
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
  };

  // Render Admin Page
  const renderAdminView = () => {
    // 1. Filtered cert list based on Admin DB View filter selector
    const filteredCerts = selectedCertFilter === 'All' 
      ? certs 
      : certs.filter(c => c.certType === selectedCertFilter);

    return (
      <div className="space-y-6">

        {/* TOP ALERT: Certificates expiring within 3 months */}
        {expiringCerts3Months.length > 0 && (
          <div className="bg-rose-50/60 border border-rose-200 rounded-3xl p-5 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0 animate-pulse" />
              <div className="flex-1">
                <p className="font-bold text-rose-950 text-xs">🚨 URGENT: Certification Expiries Flagged Within 3 Months ({expiringCerts3Months.length})</p>
                <p className="text-rose-700 text-[10px] mt-0.5">Offshore personnel must renew survival or medical certificates 3 months earlier under PETRONAS Guidelines. Reminders dispatched to:</p>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {expiringCerts3Months.map(c => (
                    <div key={c.id} className="bg-white/95 border border-rose-100 rounded-xl p-2.5 flex items-center justify-between text-[10px]">
                      <div>
                        <p className="font-bold text-gray-900">{c.userName}</p>
                        <p className="text-gray-500 font-mono text-[9px]">{c.certType}</p>
                        <p className="text-rose-600 font-medium font-mono text-[9px] mt-0.5">Expires: {c.expiryDate}</p>
                      </div>
                      <button
                        onClick={() => {
                          const targetEmp = employees.find(u => u.id === c.userId);
                          if (targetEmp) {
                            handleSendReminder(targetEmp, `Expiry warning for ${c.certType}`, c.certType);
                          }
                        }}
                        className="px-2 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold text-[9px] transition"
                      >
                        Remind
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1: AI CO-PILOT COMPLIANCE AUDITOR */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden text-left">
          {/* Subtle decoration elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full w-max mb-3">
                <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">AI compliance co-pilot</span>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-none text-white">Automated Offshore Readiness Auditing</h3>
              <p className="text-slate-300 text-[11px] mt-2 max-w-2xl leading-relaxed">
                Our AI-driven HSE inspector checks employee databases, scanned credentials, and emergency next-of-kin contacts against PETRONAS and SHELL compliance guidelines. It identifies safety risks instantly.
              </p>
            </div>
            
            <button
              onClick={handleRunAiAudit}
              disabled={isAiLoading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:text-slate-400 shrink-0 self-start sm:self-center"
            >
              {isAiLoading ? (
                <>
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  <span>Auditing Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Run AI Safety Audit</span>
                </>
              )}
            </button>
          </div>

          {/* AI Report Render Panel */}
          {(aiReport || isAiLoading || aiError) && (
            <div className="mt-5 bg-white rounded-2xl p-5 text-slate-900 border border-slate-700/10 animate-slide-in relative z-10 max-h-[400px] overflow-y-auto">
              {isAiLoading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                  <p className="text-xs text-gray-500 font-medium">Scanning scanned documents, dates, next of kin information, and compiling advisory report...</p>
                </div>
              )}

              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
                  <span>{aiError}</span>
                </div>
              )}

              {aiReport && !isAiLoading && (
                <div className="prose prose-sm max-w-none text-left">
                  {renderMarkdown(aiReport)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: SUBMITTED CERTIFICATES CENTRAL REGISTER */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100 text-left">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <div>
              <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-600" />
                Submitted Certificates Register
              </h4>
              <p className="text-[10px] text-gray-400 mt-1">Select any certificate type to load its dedicated tracking matrix and export the compliance table.</p>
            </div>

            {/* Select Certificate Filter to view "which certificate table we want to see" */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mr-1">View Table:</span>
              <select
                value={selectedCertFilter}
                onChange={(e) => setSelectedCertFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white text-gray-900 font-semibold focus:border-blue-500 transition"
              >
                <option value="All">All Certifications Combined</option>
                {certTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* CSV Export Option */}
              <button
                onClick={() => handleExportCSV(selectedCertFilter, filteredCerts)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                title="Export Visible Table as CSV file"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {filteredCerts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
              <FileText className="h-8 w-8 text-gray-300" />
              <p>No scanned certifications found for <strong>{selectedCertFilter}</strong>.</p>
              <p className="text-[10px] text-gray-400">Employees have not uploaded files matching this criteria yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-gray-400 uppercase tracking-wider text-[9px]">
                    <th className="py-3 font-semibold">Employee</th>
                    <th className="py-3 font-semibold">Certificate Type</th>
                    <th className="py-3 font-semibold">File Scanned</th>
                    <th className="py-3 font-semibold">Issue Date</th>
                    <th className="py-3 font-semibold">Status & Expiry</th>
                    <th className="py-3 font-semibold">Offshore Profile Data</th>
                    <th className="py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCerts.map((c) => {
                    const empProfile = employees.find(e => e.id === c.userId);
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="py-3.5">
                          <p className="font-bold text-gray-950">{c.userName}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{c.userEmail}</p>
                        </td>
                        <td className="py-3.5 font-semibold text-slate-800">{c.certType}</td>
                        <td className="py-3.5 text-blue-600 font-medium font-mono text-[10px]">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="underline cursor-pointer">View_Scanned.pdf</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-gray-600 font-medium">{c.issueDate}</td>
                        <td className="py-3.5">{getStatusBadge(c.status, c.expiryDate)}</td>
                        <td className="py-3.5 text-gray-500 leading-normal max-w-[150px] truncate text-[10px]">
                          {empProfile?.phone ? (
                            <div>
                              <p className="font-semibold text-gray-700">Phone: {empProfile.phone}</p>
                              <p>Kin: {empProfile.kinName || 'None'} ({empProfile.kinPhone || 'N/A'})</p>
                              <p className="text-[9px]">NRIC/Pass: {empProfile.passportOrNric || 'None'}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No offshore safety card details</span>
                          )}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteCert(c.id, c.userName, c.certType)}
                            className="p-1 text-gray-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Delete certificate record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ADMIN ONLY: CERTIFICATE TYPES CUSTOMIZATION PANEL */}
        {isAdmin && (
          <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100 mb-6 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-150 mb-5">
              <div>
                <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  HSE Certificate Types Manager
                </h4>
                <p className="text-xs text-gray-400 mt-1">As an HSE Administrator, you can rename, add, or delete the official certifications tracked by the platform.</p>
              </div>
            </div>

            {/* Editable Grid of Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certTypes.map((type, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50/50 rounded-2xl border border-gray-200/60">
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-bold font-mono">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={type}
                    onChange={(e) => {
                      const updated = [...certTypes];
                      updated[index] = e.target.value;
                      setCertTypes(updated);
                      Store.saveCertificateTypes(updated);
                    }}
                    placeholder="Enter type name"
                    className="flex-1 bg-white border border-gray-200/70 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-900 outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to remove safety certification "${type}"? This will not delete previously uploaded files, but will remove it from future selections.`)) {
                        const updated = certTypes.filter((_, i) => i !== index);
                        setCertTypes(updated);
                        Store.saveCertificateTypes(updated);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0"
                    title="Remove certification type"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add New Type input box */}
              <div className="flex items-center gap-2 p-3 bg-blue-50/20 rounded-2xl border border-dashed border-blue-200">
                <input
                  type="text"
                  id="new-cert-type-input"
                  placeholder="Add custom certification..."
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        if (certTypes.includes(val)) {
                          alert('This certification type already exists.');
                          return;
                        }
                        const updated = [...certTypes, val];
                        setCertTypes(updated);
                        Store.saveCertificateTypes(updated);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const el = document.getElementById('new-cert-type-input') as HTMLInputElement;
                    const val = el?.value.trim();
                    if (val) {
                      if (certTypes.includes(val)) {
                        alert('This certification type already exists.');
                        return;
                      }
                      const updated = [...certTypes, val];
                      setCertTypes(updated);
                      Store.saveCertificateTypes(updated);
                      el.value = '';
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition shrink-0"
                  title="Add safety certification type"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: CERTIFICATE UPLOAD REQUEST SYSTEM */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          
          {/* Form: Issue New Certificate Upload Request */}
          <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100">
            <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" />
              Issue New Upload Request
            </h4>

            {reqError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 mb-4">
                <span>{reqError}</span>
              </div>
            )}

            {reqSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-700 mb-4">
                <span>{reqSuccess}</span>
              </div>
            )}

            <form onSubmit={handleIssueRequest} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Request Title</label>
                <input
                  type="text"
                  value={newReqTitle}
                  onChange={(e) => setNewReqTitle(e.target.value)}
                  placeholder="e.g. Submit New PETRONAS Medical Cert"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Target Certificate Type</label>
                <select
                  value={newReqType}
                  onChange={(e) => setNewReqType(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                >
                  {certTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Required Submission Deadline</label>
                <input
                  type="date"
                  value={newReqDeadline}
                  onChange={(e) => setNewReqDeadline(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Description & Instructions</label>
                <textarea
                  value={newReqDesc}
                  onChange={(e) => setNewReqDesc(e.target.value)}
                  placeholder="Please enter details for offshore staff, such as medical provider guidelines..."
                  rows={3}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white text-gray-900 font-medium focus:border-blue-500 transition resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
              >
                <Send className="h-3.5 w-3.5" />
                Issue Request
              </button>
            </form>
          </div>

          {/* Table: Active Upload Requests */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.03)] border border-gray-100">
            <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-4 flex items-center justify-between">
              <span>Active Compliance Requests Directory</span>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{requests.length} Requests</span>
            </h4>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No active compliance certificate upload requests issued yet.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => {
                  const staffList = employees.filter(emp => emp.role === 'employee');
                  // Filter certs that correspond to this request type
                  const relevantUploadedCerts = certs.filter(c => c.certType === req.certType);
                  const submittedCount = relevantUploadedCerts.length;
                  const totalCount = staffList.length;
                  const pct = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

                  const isExpanded = expandedRequestId === req.id;

                  return (
                    <div key={req.id} className="border border-gray-150 rounded-2xl overflow-hidden transition hover:border-gray-300">
                      
                      {/* Request Accordion Header */}
                      <div className="p-4 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex-1">
                          <p className="font-extrabold text-gray-900">{req.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Required Certificate: <strong className="text-blue-600">{req.certType}</strong></p>
                          <p className="text-[9px] text-gray-400 mt-0.5">Issued: {new Date(req.issuedAt).toLocaleDateString()} • Deadline: <span className="font-semibold text-rose-600">{req.requiredByDate}</span></p>
                        </div>

                        {/* Progress Indicator */}
                        <div className="flex items-center gap-3 self-start sm:self-center">
                          <div className="text-right">
                            <p className="font-bold text-gray-900 text-[11px]">{submittedCount} / {totalCount} Submitted</p>
                            <p className="text-[9px] text-gray-400 font-medium font-mono">{pct}% Complete</p>
                          </div>

                          {/* Circular/Linear progress bar bar */}
                          <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <button
                            onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                            className="px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-[10px] font-semibold text-gray-700 transition"
                          >
                            {isExpanded ? 'Hide table' : 'View table'}
                          </button>
                        </div>
                      </div>

                      {/* Request Accordion Expanded Table */}
                      {isExpanded && (
                        <div className="border-t border-gray-150 p-4 animate-slide-in text-xs bg-white">
                          <p className="text-[10px] text-gray-400 mb-3 font-semibold uppercase tracking-wide">Tracking status of each employee for table: "{req.title}"</p>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                              <thead>
                                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                                  <th className="py-2">Employee</th>
                                  <th className="py-2">Submission Status</th>
                                  <th className="py-2">Scanned File Link</th>
                                  <th className="py-2">Certificate Validity</th>
                                  <th className="py-2 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {staffList.map(emp => {
                                  const matchingCert = relevantUploadedCerts.find(c => c.userId === emp.id);
                                  const hasSubmitted = !!matchingCert;

                                  return (
                                    <tr key={emp.id} className="border-b border-gray-50 last:border-0">
                                      <td className="py-2.5 font-bold text-gray-900">{emp.name}</td>
                                      <td className="py-2.5">
                                        {hasSubmitted ? (
                                          <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded-full">
                                            ✅ Submitted
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[9px] bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2 py-0.5 rounded-full">
                                            ❌ Pending Upload
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 text-blue-600 font-mono text-[10px]">
                                        {hasSubmitted ? (
                                          <span className="underline cursor-pointer">Scanned_Doc.pdf</span>
                                        ) : (
                                          <span className="text-gray-400 italic">No document</span>
                                        )}
                                      </td>
                                      <td className="py-2.5">
                                        {hasSubmitted && matchingCert ? (
                                          getStatusBadge(matchingCert.status, matchingCert.expiryDate)
                                        ) : (
                                          <span className="text-gray-400">N/A</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 text-right">
                                        {!hasSubmitted && (
                                          <button
                                            onClick={() => handleSendReminder(emp, req.title, req.certType)}
                                            className="px-2 py-0.5 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 rounded-lg text-[9px] font-bold transition"
                                            title="Dispatches immediate simulated reminder email"
                                          >
                                            Remind
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    );
  };

  return (
    <div className="font-sans text-left space-y-6">
      
      {/* Title Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-blue-600" />
            Certificates Tracking Hub
          </h2>
          <p className="text-[11px] text-gray-500 mt-1 font-normal">
            {isAdmin 
              ? `HSE Manager Compliance Center: Logged in as ${currentUser.name}.`
              : `Safety Certifications Upload Portal: Logged in as ${currentUser.name}.`
            }
          </p>
        </div>

        {/* Info Badge */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3 flex items-center gap-2 max-w-sm">
          <Info className="h-5 w-5 text-blue-600 shrink-0" />
          <p className="text-[10px] text-blue-800 leading-normal">
            Malaysian maritime regulations require mandatory BOSIET survival safety training, PETRONAS Medical, and OGSP credentials prior to platform helideck mobilizations.
          </p>
        </div>
      </div>

      {/* Render based on permission level */}
      {isAdmin ? renderAdminView() : renderEmployeeView()}

    </div>
  );
}
