import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Key,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { cryptoService } from '../services/cryptoService';

interface StudentPendingVerificationModalProps {
  session: {
    sessionId: string;
    sessionToken: string;
    requestedMovement: 'ENTRY' | 'EXIT';
    isLate: boolean;
    expiresAt: string;
    challenge: string;
    gateName?: string;
    initiatedByName?: string;
  } | null;
  onClose: () => void;
  onResolved: (status: 'APPROVED' | 'DENIED') => void;
}

export const StudentPendingVerificationModal: React.FC<StudentPendingVerificationModalProps> = ({
  session,
  onClose,
  onResolved,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [lateReason, setLateReason] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [isDenying, setIsDenying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    const calculateRemaining = () => {
      const remainingMs = new Date(session.expiresAt).getTime() - Date.now();
      const seconds = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeLeft(seconds);
      if (seconds <= 0) {
        onClose();
      }
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [session, session?.expiresAt]);

  if (!session) return null;

  const isEntry = session.requestedMovement === 'ENTRY';

  const handleApprove = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Sign challenge using browser's stored non-extractable private key
      const { deviceId, signature } = await cryptoService.signVerificationChallenge(
        session.challenge
      );

      // 2. Submit cryptographic approval to backend
      await api.approveVerification(session.sessionId, {
        deviceId,
        signature,
        lateReason: session.isLate ? lateReason : undefined,
      });

      onResolved('APPROVED');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Cryptographic approval failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeny = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await api.denyVerification(
        session.sessionId,
        denyReason || 'Movement rejected by resident'
      );
      onResolved('DENIED');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Denial submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-hall-500/50 rounded-3xl w-full max-w-md shadow-glow-primary overflow-hidden space-y-0">
        {/* Header Banner */}
        <div
          className={`p-5 flex items-center justify-between border-b ${
            isEntry
              ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-emerald-500/30'
              : 'bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border-blue-500/30'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                isEntry
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}
            >
              {isEntry ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                Gate Security Verification
              </span>
              <h3 className="text-base font-black text-white">
                {isEntry ? 'Hall Entry Request' : 'Hall Exit Request'}
              </h3>
            </div>
          </div>

          {/* Countdown Clock Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Information Card */}
          <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Gate Location:</span>
              <span className="font-bold text-white">{session.gateName || 'Main Campus Terminal'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Initiated By:</span>
              <span className="font-semibold text-slate-200">{session.initiatedByName || 'Gate Staff Officer'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Session Challenge Token:</span>
              <span className="font-mono text-[10px] text-hall-400 font-bold">{session.sessionToken}</span>
            </div>
          </div>

          {/* Curfew Alert if Late */}
          {session.isLate && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-600/50 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Curfew Breach: Entry After 8:00 PM</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                This entry will be flagged for Warden review. Please submit your explanation below:
              </p>
              <input
                type="text"
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="Reason for late return (e.g. Lab experiment, transit delay)..."
                className="w-full px-3 py-2 bg-slate-900 border border-amber-600/40 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* Denial Reason Input */}
          {isDenying && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-2xl space-y-2">
              <p className="font-bold text-red-300">Reason for Denial:</p>
              <input
                type="text"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="Why are you denying this movement?"
                className="w-full px-3 py-2 bg-slate-900 border border-red-800 rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {!isDenying ? (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition active:scale-98"
                >
                  <Key className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Signing Cryptographic Challenge...'
                      : 'APPROVE WITH TRUSTED DEVICE PASSKEY'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDenying(true)}
                  disabled={isSubmitting}
                  className="w-full py-2 bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800 font-bold text-xs rounded-2xl transition"
                >
                  Deny Request
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDenying(false)}
                  className="py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeny}
                  disabled={isSubmitting}
                  className="py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Confirm Denial
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

