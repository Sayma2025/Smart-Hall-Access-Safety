import React, { useState } from 'react';
import { X, ShieldAlert, MapPin, HeartPulse, Shield, Flame, AlertCircle } from 'lucide-react';
import { SOSAlertType, User } from '../types';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { alertType: SOSAlertType; location: string; notes?: string }) => Promise<void>;
  user: User;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
}) => {
  const [alertType, setAlertType] = useState<SOSAlertType>('SECURITY');
  const [location, setLocation] = useState(user.roomNumber || 'Block B - Corridor');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;

    try {
      setIsSubmitting(true);
      await onSubmit({ alertType, location, notes });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const types: { id: SOSAlertType; label: string; icon: any; color: string }[] = [
    { id: 'SECURITY', label: 'Security Threat', icon: Shield, color: 'text-amber-400 border-amber-500/30' },
    { id: 'MEDICAL', label: 'Medical Emergency', icon: HeartPulse, color: 'text-rose-400 border-rose-500/30' },
    { id: 'HARASSMENT', label: 'Harassment / Stalking', icon: AlertCircle, color: 'text-purple-400 border-purple-500/30' },
    { id: 'FIRE', label: 'Fire / Hazard', icon: Flame, color: 'text-orange-400 border-orange-500/30' },
    { id: 'OTHER', label: 'Urgent Other', icon: ShieldAlert, color: 'text-blue-400 border-blue-500/30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-red-600/80 rounded-2xl w-full max-w-md shadow-glow-red overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-hall-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-black/20 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">EMERGENCY SOS SIGNAL</h3>
              <p className="text-xs text-red-100">Dispatches alert to Hall Guard & Provost Office</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-red-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Distress Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {types.map((t) => {
                const Icon = t.icon;
                const isSelected = alertType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAlertType(t.id)}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-red-950/60 border-red-500 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-red-400' : 'text-slate-400'}`} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              Your Exact Location in Hall *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Block B, 3rd Floor washroom / Room 304"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Urgent Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brief details for security responders..."
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-glow-red transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <ShieldAlert className="w-5 h-5 text-white" />
              <span>{isSubmitting ? 'BROADCASTING SOS...' : 'BROADCAST DISTRESS CALL NOW'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
