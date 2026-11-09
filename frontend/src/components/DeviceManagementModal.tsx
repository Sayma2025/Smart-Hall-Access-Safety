import React, { useState } from 'react';
import { X, Smartphone, ShieldCheck, Key, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { EnrolledDeviceItem } from '../types';
import { cryptoService } from '../services/cryptoService';

interface DeviceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: EnrolledDeviceItem[];
  onRefreshDevices: () => Promise<void>;
  onRevokeDevice: (id: string) => Promise<void>;
}

export const DeviceManagementModal: React.FC<DeviceManagementModalProps> = ({
  isOpen,
  onClose,
  devices,
  onRefreshDevices,
  onRevokeDevice,
}) => {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [deviceName, setDeviceName] = useState(
    `${navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Personal Computer'} (${navigator.platform || 'Browser'})`
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const enrolled = await cryptoService.enrollCurrentDevice(deviceName, password);
      setSuccess(`Device '${enrolled.deviceName}' enrolled with secure ECDSA P-256 credentials.`);
      setPassword('');
      setIsEnrolling(false);
      await onRefreshDevices();
    } catch (err: any) {
      setError(err.message || 'Device enrollment failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this device credential? It will be permanently deactivated.')) {
      return;
    }
    setError(null);
    try {
      await onRevokeDevice(id);
      await onRefreshDevices();
    } catch (err: any) {
      setError(err.message || 'Device revocation failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Enrolled Passkey Devices</h3>
              <p className="text-xs text-slate-400">Hardware & Browser Cryptographic Credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Enrolled Devices List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Trusted Hardware ({devices.length})
              </h4>
              {!isEnrolling && (
                <button
                  type="button"
                  onClick={() => setIsEnrolling(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>+ Enroll This Device</span>
                </button>
              )}
            </div>

            {devices.map((device) => (
              <div
                key={device._id}
                className="p-3.5 bg-slate-800/60 border border-slate-700/70 rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-700/60 text-slate-300 shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-white text-xs truncate">{device.deviceName}</p>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          device.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {device.status}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5">{device.deviceId}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      Fingerprint: {device.fingerprint.slice(0, 16)}...
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Enrolled: {new Date(device.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {device.status === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(device._id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition shrink-0"
                    title="Revoke device access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {devices.length === 0 && !isEnrolling && (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
                <ShieldCheck className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-semibold">No Enrolled Devices</p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                  You must enroll this device to enable secure gate entry and exit verification.
                </p>
              </div>
            )}
          </div>

          {/* Device Enrollment Form */}
          {isEnrolling && (
            <form onSubmit={handleEnrollSubmit} className="p-4 bg-slate-800/80 rounded-2xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Generate Cryptographic Key Pair
                </h5>
                <button
                  type="button"
                  onClick={() => setIsEnrolling(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Nusrat's iPhone 15"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Password Re-Authentication (Required)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Confirm account password"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Private keys are generated locally via WebCrypto and never transmitted.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {loading ? 'Generating Keys & Enrolling...' : 'Confirm & Enroll This Device'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

