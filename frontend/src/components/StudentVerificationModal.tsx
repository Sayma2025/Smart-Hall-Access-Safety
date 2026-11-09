import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Phone,
  Home,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Radio,
  XCircle,
  Key,
} from 'lucide-react';
import { StudentListItem, UserRole, VerificationSessionItem } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

interface StudentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentListItem | null;
  viewerRole: UserRole;
  onMovementCompleted?: () => void;
}

export const StudentVerificationModal: React.FC<StudentVerificationModalProps> = ({
  isOpen,
  onClose,
  student,
  viewerRole,
  onMovementCompleted,
}) => {
  const [activeSession, setActiveSession] = useState<VerificationSessionItem | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [latePermission, setLatePermission] = useState<any | null>(null);
  const [leavePermission, setLeavePermission] = useState<any | null>(null);

  // Reset state when modal opens/closes or student changes, and check permissions
  useEffect(() => {
    if (!isOpen || !student) {
      setActiveSession(null);
      setError(null);
      setLoading(false);
      setLatePermission(null);
      setLeavePermission(null);
      return;
    }

    const checkStudentPermissions = async () => {
      try {
        const [lateRes, leavesRes] = await Promise.allSettled([
          api.checkLatePermission(student.studentId),
          api.getAuthorizedLeavePermissions(),
        ]);

        if (lateRes.status === 'fulfilled' && lateRes.value?.hasPermission) {
          setLatePermission(lateRes.value.permission);
        } else {
          setLatePermission(null);
        }

        if (leavesRes.status === 'fulfilled' && Array.isArray(leavesRes.value)) {
          const authLeave = leavesRes.value.find(
            (l: any) =>
              l.resident?.studentId === student.studentId ||
              l.resident?._id === student._id ||
              l.resident === student._id
          );
          setLeavePermission(authLeave || null);
        } else {
          setLeavePermission(null);
        }
      } catch (err: any) {
        console.warn('Could not check permissions', err.message);
      }
    };

    checkStudentPermissions();
  }, [isOpen, student?._id, student?.studentId]);

  // Real-time Socket.IO and Polling Fallback
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'PENDING') return;

    const socket = getSocket();
    if (socket) {
      setSocketConnected(socket.connected);

      const handleVerificationCompleted = (data: any) => {
        if (data.sessionId === activeSession._id || data.sessionToken === activeSession.sessionToken) {
          setActiveSession((prev) => (prev ? { ...prev, status: data.status, accessLog: data.log } : null));
          if (data.status === 'APPROVED' && onMovementCompleted) {
            onMovementCompleted();
          }
        }
      };

      socket.on('verification:completed', handleVerificationCompleted);

      // Cleanup
      return () => {
        socket.off('verification:completed', handleVerificationCompleted);
      };
    }
  }, [activeSession?._id, activeSession?.status, onMovementCompleted]);

  // Polling fallback every 2 seconds
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'PENDING') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getVerificationStatus(activeSession._id);
        if (res.session && res.session.status !== activeSession.status) {
          setActiveSession(res.session);
          if (res.session.status === 'APPROVED' && onMovementCompleted) {
            onMovementCompleted();
          }
        }
      } catch (err: any) {
        console.warn('Status poll notice:', err.message);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeSession?._id, activeSession?.status, onMovementCompleted]);

  // Countdown timer for pending session
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'PENDING') return;

    const updateTimer = () => {
      const remainingMs = new Date(activeSession.expiresAt).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeLeft(secs);
      if (secs <= 0) {
        setActiveSession((prev) => (prev ? { ...prev, status: 'EXPIRED' } : null));
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeSession?.expiresAt, activeSession?.status]);

  if (!isOpen || !student) return null;

  const isGateStaff = viewerRole === 'GATE_STAFF' || viewerRole === 'GUARD';

  const handleInitiate = async (movement: 'ENTRY' | 'EXIT') => {
    setError(null);
    setLoading(true);

    try {
      const response = await api.initiateVerification({
        studentIdentifier: student.studentId,
        requestedMovement: movement,
      });

      setActiveSession(response.session);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate verification session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-hall-500/20 text-hall-400 rounded-2xl border border-hall-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {isGateStaff ? 'Gate Security Verification Terminal' : 'Student Resident Dossier'}
              </h3>
              <p className="text-xs text-slate-400">Pritilata Waddedar Female Residential Hall</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Identity Card */}
          <div className="flex items-center space-x-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-hall-500 to-hall-700 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
              {student.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-lg truncate">{student.fullName}</h4>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                    student.currentStatus === 'INSIDE'
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                      : 'bg-blue-950/70 text-blue-300 border-blue-500/40'
                  }`}
                >
                  RECORDED {student.currentStatus}
                </span>
              </div>
              <p className="font-mono text-hall-400 text-xs font-semibold">{student.studentId}</p>
              <p className="text-xs text-slate-400 truncate">{student.department}</p>
            </div>
          </div>

          {/* Active Verified Permissions for Gate Staff */}
          {latePermission && (
            <div className="p-3.5 bg-amber-950/50 border border-amber-500/40 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Authorized Late Entry Permission
                </span>
                <span className="px-2 py-0.5 bg-amber-500/20 rounded text-[10px] uppercase font-mono">
                  APPROVED
                </span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Arrival permitted by <span className="font-mono font-bold text-amber-200">{latePermission.expectedArrivalTime}</span>. Reason: "{latePermission.reason}"
              </p>
            </div>
          )}

          {leavePermission && (
            <div className="p-3.5 bg-purple-950/50 border border-purple-500/40 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between text-purple-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-purple-400" />
                  Authorized Hall Leave
                </span>
                <span className="px-2 py-0.5 bg-purple-500/20 rounded text-[10px] uppercase font-mono">
                  SANCTIONED
                </span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Destination: <span className="text-purple-200 font-medium">{leavePermission.destinationAddress}</span> (Return by {new Date(leavePermission.expectedReturnDate).toLocaleDateString()})
              </p>
            </div>
          )}

          {/* Verification Session Active View */}
          {activeSession ? (
            <div className="space-y-4">
              {/* Session State Card */}
              {activeSession.status === 'PENDING' && (
                <div className="p-5 bg-gradient-to-br from-amber-950/40 via-slate-800 to-slate-900 border-2 border-amber-500/50 rounded-2xl space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase tracking-wide">
                      <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Awaiting Resident Approval</span>
                    </div>
                    <div className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-mono font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{timeLeft}s</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-300 font-semibold">
                      Cryptographic challenge sent to resident's enrolled device for{' '}
                      <span className="font-black text-white">{activeSession.requestedMovement}</span>.
                    </p>
                    <p className="font-mono text-[11px] text-hall-400">
                      Token: {activeSession.sessionToken}
                    </p>
                  </div>

                  <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all duration-1000"
                      style={{ width: `${Math.max(0, (timeLeft / 90) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
                        }`}
                      />
                      {socketConnected ? 'Real-Time WebSocket Active' : 'Polling Fallback Active'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSession(null)}
                      className="text-red-400 hover:text-red-300 font-semibold"
                    >
                      Cancel Request
                    </button>
                  </div>
                </div>
              )}

              {/* Resolved APPROVED */}
              {activeSession.status === 'APPROVED' && (
                <div className="p-5 bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl space-y-3 text-center animate-in zoom-in-95">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <div>
                    <h4 className="font-black text-emerald-300 text-base">
                      VERIFICATION APPROVED & RECORDED
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Resident authenticated with enrolled cryptographic device. Movement successfully logged.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSession(null)}
                    className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Done / Next Verification
                  </button>
                </div>
              )}

              {/* Resolved DENIED */}
              {activeSession.status === 'DENIED' && (
                <div className="p-5 bg-red-950/40 border-2 border-red-500 rounded-2xl space-y-3 text-center">
                  <XCircle className="w-10 h-10 text-red-400 mx-auto" />
                  <div>
                    <h4 className="font-black text-red-300 text-base">
                      REQUEST DENIED BY RESIDENT
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Resident explicitly denied this movement request on their trusted device. Movement was NOT recorded.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSession(null)}
                    className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    Back to Resident
                  </button>
                </div>
              )}

              {/* Resolved EXPIRED */}
              {activeSession.status === 'EXPIRED' && (
                <div className="p-5 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-3 text-center">
                  <Clock className="w-10 h-10 text-amber-400 mx-auto" />
                  <div>
                    <h4 className="font-black text-amber-300 text-base">
                      VERIFICATION REQUEST EXPIRED
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      The resident did not respond within the 90-second cryptographic challenge window.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSession(null)}
                    className="mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Resident Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Home className="w-3.5 h-3.5 text-hall-400" />
                    Room Allotment
                  </span>
                  <p className="font-semibold text-white">{student.roomNumber || 'Block B'}</p>
                  <p className="text-[11px] text-slate-500">{student.hallName}</p>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Curfew Cutoff
                  </span>
                  <p className="font-semibold text-amber-300">8:00 PM Sharp</p>
                  <p className="text-[11px] text-slate-500">Auto late-curfew flag</p>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-hall-400" />
                    Guardian Phone
                  </span>
                  <p className="font-mono font-semibold text-slate-200">
                    {student.guardianPhone || 'Not recorded'}
                  </p>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Account Status
                  </span>
                  <p className="font-semibold text-emerald-300">
                    {student.isActive ? 'Active Resident' : 'Suspended'}
                  </p>
                </div>
              </div>

              {/* Secure Cryptographic Movement Actions */}
              {isGateStaff && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-hall-400" />
                      Cryptographic Gate Challenge
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Dispatches single-use passkey challenge
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={loading || student.currentStatus === 'INSIDE'}
                      onClick={() => handleInitiate('ENTRY')}
                      className={`py-3 px-3 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition ${
                        student.currentStatus === 'INSIDE'
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95'
                      }`}
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      <span>INITIATE ENTRY</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading || student.currentStatus === 'OUTSIDE'}
                      onClick={() => handleInitiate('EXIT')}
                      className={`py-3 px-3 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition ${
                        student.currentStatus === 'OUTSIDE'
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>INITIATE EXIT</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
