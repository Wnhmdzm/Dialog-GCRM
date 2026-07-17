import React, { useState } from 'react';
import { Store } from '../utils/store';
import { EmailNotification } from '../types';
import { Mail, MailOpen, AlertTriangle, Clock, Key, CheckCircle, Trash2, ArrowUpRight } from 'lucide-react';

interface EmailInboxSimProps {
  onTriggerResetFlow: (userId: string) => void;
  currentUserEmail: string;
  isAdmin: boolean;
}

export default function EmailInboxSim({ onTriggerResetFlow, currentUserEmail, isAdmin }: EmailInboxSimProps) {
  const [emails, setEmails] = useState<EmailNotification[]>(() => Store.getEmails());
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);

  const refreshEmails = () => {
    const list = Store.getEmails();
    setEmails(list);
    if (selectedEmail) {
      const updated = list.find(e => e.id === selectedEmail.id);
      if (updated) setSelectedEmail(updated);
    }
  };

  React.useEffect(() => {
    // Refresh periodically
    const t = setInterval(refreshEmails, 2000);
    return () => clearInterval(t);
  }, [selectedEmail]);

  const handleMarkRead = (id: string) => {
    const list = Store.getEmails();
    const updated = list.map(e => (e.id === id ? { ...e, read: true } : e));
    Store.saveEmails(updated);
    refreshEmails();
  };

  const handleDeleteEmail = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const list = Store.getEmails().filter(mail => mail.id !== id);
    Store.saveEmails(list);
    if (selectedEmail?.id === id) {
      setSelectedEmail(null);
    }
    refreshEmails();
  };

  const handleResetClick = (emailBody: string) => {
    // Extract userId from the reset URL simulated in the body
    const match = emailBody.match(/resetUserId=([^&\s\n]+)/);
    if (match && match[1]) {
      onTriggerResetFlow(match[1]);
    } else {
      alert('Could not parse user ID from reset link.');
    }
  };

  const filteredEmails = emails.filter(e => isAdmin || e.recipientEmail.toLowerCase() === currentUserEmail.toLowerCase());

  const getIconForType = (type: string) => {
    switch (type) {
      case 'missing_shift':
        return <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />;
      case 'overtime':
        return <Clock className="h-4 w-4 text-amber-600 shrink-0" />;
      case 'password_reset':
        return <Key className="h-4 w-4 text-indigo-600 shrink-0" />;
      default:
        return <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[550px] bg-white rounded-3xl p-4 transition-all duration-300 hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] relative font-sans overflow-hidden text-left">
      
      {/* Sidebar List */}
      <div className="md:col-span-1 border-r border-gray-100 pr-4 flex flex-col h-full">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            Simulated Inbox
          </h3>
          {isAdmin && (
            <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium tracking-wide shrink-0">
              Admin View
            </span>
          )}
        </div>
 
        <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1">
          {filteredEmails.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs font-medium uppercase tracking-wider">
              No simulated emails.
            </div>
          ) : (
            filteredEmails.map((email) => {
              const isSelected = selectedEmail?.id === email.id;
              return (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    handleMarkRead(email.id);
                  }}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col text-left relative group ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-200'
                      : email.read
                      ? 'bg-gray-50/50 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                      : 'bg-white border-gray-200 shadow-sm hover:border-gray-300'
                  }`}
                >
                  {!email.read && (
                    <span className="absolute top-3.5 right-3 h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                  )}
 
                  <div className="flex items-center gap-2 mb-1.5">
                    {getIconForType(email.type)}
                    <span className="text-[10px] font-medium text-gray-900 truncate max-w-[140px]">{email.recipientEmail.split('@')[0]}</span>
                  </div>
 
                  <p className="text-xs font-semibold text-gray-900 truncate pr-4">{email.subject}</p>
                  
                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-gray-100/50 text-[9px] text-gray-400 font-medium">
                    <span>{new Date(email.sentAt).toLocaleTimeString()}</span>
                    <button
                      onClick={(e) => handleDeleteEmail(email.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 transition"
                      title="Delete email"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reader Panel */}
      <div className="md:col-span-2 flex flex-col h-full bg-gray-50/30 border border-gray-100 rounded-2xl overflow-hidden">
        {selectedEmail ? (
          <div className="flex flex-col h-full p-4 overflow-y-auto">
            {/* Header info */}
            <div className="border-b border-gray-150 pb-3 mb-4 flex justify-between items-start">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 tracking-tight">{selectedEmail.subject}</h4>
                <div className="text-[10px] text-gray-400 mt-2 flex flex-col gap-1 font-medium">
                  <p>To: <span className="text-gray-900 font-normal">{selectedEmail.recipientEmail}</span></p>
                  <p>Sent: <span className="text-gray-900 font-normal">{new Date(selectedEmail.sentAt).toLocaleString()}</span></p>
                </div>
              </div>
              <span className="text-[9px] px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 uppercase font-semibold tracking-wide shrink-0 shadow-xs">
                {selectedEmail.type.replace('_', ' ')}
              </span>
            </div>

            {/* Email Body */}
            <div className="flex-1 bg-white border border-gray-150 rounded-2xl p-4 text-xs text-gray-800 whitespace-pre-line leading-relaxed font-mono font-medium shadow-xs">
              {selectedEmail.body}
            </div>

            {/* Action panel if reset code */}
            {selectedEmail.type === 'password_reset' && (
              <div className="mt-4 p-4 bg-white border border-gray-150 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <h5 className="text-xs font-semibold text-gray-900">Action Required</h5>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Click below to emulate loading secure link</p>
                </div>
                <button
                  onClick={() => handleResetClick(selectedEmail.body)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  Follow Reset Link
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <MailOpen className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-xs font-medium tracking-tight text-gray-400 max-w-sm leading-relaxed">Select a simulated notification to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
