import React, { useState } from 'react';
import { X, QrCode, LogIn, LogOut, AlertTriangle, Shield } from 'lucide-react';
import { AccessType } from '../types';

interface GateScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: {
    studentIdentifier: string;
    type: AccessType;
    lateReason?: string;
    remarks?: string;
  }) => Promise<void>;
}

export const GateScannerModal: React.FC<GateScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [studentId, setStudentId] = useState('ASH2101001M');
  const [type, setType] = useState<AccessType>('ENTRY');
  const [lateReason, setLateReason] = useState('Attended department laboratory sessions');
  const [remarks, setRemarks] = useState('Main Gate Scanner Station 1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Curfew alert indicator
  const isLateTime = type === 'ENTRY'; // entry after curfew simulated

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    try {
      setIsSubmitting(true);
      await onScan({
        studentIdentifier: studentId,
        type,
        lateReason: isLateTime ? lateReason : undefined,
        remarks,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800/80 p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-hall-500/20 rounded-xl text-hall-400 border border-hall-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Gate Access Terminal</h3>
              <p className="text-xs text-slate-400">Scan Student Resident ID Card / QR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick resident switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Student ID / Roll Number *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. ASH2101001M"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm uppercase focus:outline-none focus:border-hall-500"
              />
              <button
                type="button"
                onClick={() => setStudentId('ASH2101001M')}
                className="text-xs px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-hall-300 rounded-xl border border-slate-700 whitespace-nowrap"
              >
                Sample 1
              </button>
              <button
                type="button"
                onClick={() => setStudentId('ASH2101002F')}
                className="text-xs px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-hall-300 rounded-xl border border-slate-700 whitespace-nowrap"
              >
                Sample 2
              </button>
            </div>
          </div>

          {/* Type Toggle: Entry vs Exit */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Movement Direction
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('ENTRY')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl border text-xs font-semibold transition ${
                  type === 'ENTRY'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>HALL ENTRY</span>
              </button>

              <button
                type="button"
                onClick={() => setType('EXIT')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl border text-xs font-semibold transition ${
                  type === 'EXIT'
                    ? 'bg-blue-950/60 border-blue-500 text-blue-300 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>HALL EXIT</span>
              </button>
            </div>
          </div>

          {/* Curfew warning */}
          {type === 'ENTRY' && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Curfew Threshold Notice (8:00 PM)</p>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Entries past curfew require an explanation and are automatically routed for Warden sign-off.
                </p>
              </div>
            </div>
          )}

          {/* Late reason */}
          {type === 'ENTRY' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Late Entry Justification / Reason
              </label>
              <textarea
                rows={2}
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="Reason for delayed arrival..."
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500 resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Guard Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-hall-600 hover:bg-hall-500 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-glow-primary transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Shield className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording Log...' : `Confirm ${type} Record`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
