import React, { useState } from 'react';
import { X, Calendar, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { LeaveType, User } from '../types';

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  user: User;
}

export const LeaveModal: React.FC<LeaveModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
}) => {
  const [leaveType, setLeaveType] = useState<LeaveType>('WEEKEND_HOME');
  const [departureDate, setDepartureDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [expectedReturnDate, setExpectedReturnDate] = useState(() =>
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  );
  const [destinationAddress, setDestinationAddress] = useState(
    'House 12, Road 4, Dhanmondi, Dhaka'
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    user.guardianPhone || '+8801711999999'
  );
  const [reason, setReason] = useState<string>('Family visit and rest during weekend');
  const [guardianConsentVerified, setGuardianConsentVerified] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSubmit({
        leaveType,
        departureDate: new Date(departureDate).toISOString(),
        expectedReturnDate: new Date(expectedReturnDate).toISOString(),
        destinationAddress,
        emergencyContactPhone,
        reason,
        guardianConsentVerified,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800/80 p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-hall-500/20 rounded-xl text-hall-400 border border-hall-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Hall Leave Application</h3>
              <p className="text-xs text-slate-400">Formal Multi-Day Absence Request & Guardian Consent</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Leave Category
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-hall-500"
            >
              <option value="WEEKEND_HOME">Weekend / Holiday Home Visit</option>
              <option value="ACADEMIC">Academic Conference / Field Work</option>
              <option value="MEDICAL">Medical Treatment / Doctor Care</option>
              <option value="EMERGENCY">Family Emergency</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Departure Date *
              </label>
              <input
                type="date"
                required
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Expected Return Date *
              </label>
              <input
                type="date"
                required
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-hall-400" />
              Destination Staying Address *
            </label>
            <input
              type="text"
              required
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="Full address where resident will reside..."
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-hall-400" />
              Guardian / Emergency Phone Number *
            </label>
            <input
              type="text"
              required
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Reason for Absence *
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Detailed reason for absence from hall..."
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
            />
          </div>

          <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={guardianConsentVerified}
                onChange={(e) => setGuardianConsentVerified(e.target.checked)}
                className="mt-1 rounded border-slate-700 text-hall-600 focus:ring-hall-500"
              />
              <span className="text-xs text-slate-300">
                I certify that my registered parent/guardian is fully aware and has consented to this hall leave.
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-hall-600 hover:bg-hall-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-glow-primary transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Application...' : 'Submit Application to Warden'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
