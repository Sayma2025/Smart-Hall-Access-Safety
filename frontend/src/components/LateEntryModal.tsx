import React, { useState } from 'react';
import { X, Clock, Calendar, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface LateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { targetDate: string; expectedArrivalTime: string; reason: string }) => Promise<void>;
  user: User;
}

export const LateEntryModal: React.FC<LateEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user: _user,
}) => {
  const [targetDate, setTargetDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );
  const [expectedArrivalTime, setExpectedArrivalTime] = useState<string>('21:30');
  const [reason, setReason] = useState<string>('Academic lab research & project completion');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSubmitting(true);
      await onSubmit({
        targetDate,
        expectedArrivalTime,
        reason,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit late entry request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800/80 p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Advance Late Entry Request</h3>
              <p className="text-xs text-slate-400">Post-Curfew Permission Application</p>
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
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-xs text-amber-200/90 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-amber-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Hall Policy Note</span>
            </div>
            <p>
              Standard residential hall curfew is <strong>8:00 PM (20:00)</strong>. Approved late entry permissions allow you to enter past curfew without violation citations, but <strong>standard gate passkey verification is still required upon arrival</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-hall-400" />
                Target Date *
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Arrival Time *
              </label>
              <input
                type="time"
                required
                value={expectedArrivalTime}
                onChange={(e) => setExpectedArrivalTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-hall-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Reason for Late Entry *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a valid explanation (e.g., department laboratory work, university club event, library exam preparation)..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting to Warden...' : 'Submit Late Entry Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
