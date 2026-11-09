import React from 'react';
import { X, Server, Database, Clock, Cpu, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { HealthStatus } from '../types';

interface HealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthStatus | null;
  onRefresh: () => void;
}

export const HealthModal: React.FC<HealthModalProps> = ({
  isOpen,
  onClose,
  health,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Backend & Database Health</h3>
              <p className="text-xs text-slate-400">REST API /api/v1/health Live Probe</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status summary banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              health?.database.isConnected
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              {health?.database.isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  API Status: {health?.status || 'Active'}
                </p>
                <p className="text-xs text-slate-400">
                  MongoDB: {health?.database.isConnected ? 'Connected & Synced' : health?.database.state || 'Local Demo Mode'}
                </p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Recheck
            </button>
          </div>

          {/* Diagnostics Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Database className="w-3.5 h-3.5 text-hall-400" />
                <span>MongoDB Target</span>
              </div>
              <p className="font-mono text-slate-200 truncate">
                {health?.database.name || 'shasms_db'}
              </p>
              <p className="text-[11px] text-slate-500">Mongoose ODM 8.x</p>
            </div>

            <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Curfew Rule</span>
              </div>
              <p className="font-semibold text-slate-200">
                {health?.hallPolicy.curfewTime || '20:00'} (8:00 PM)
              </p>
              <p className="text-[11px] text-slate-500">Auto late-entry flag</p>
            </div>

            <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Server Uptime</span>
              </div>
              <p className="font-mono text-slate-200">{health?.uptime || 'Active'}</p>
              <p className="text-[11px] text-slate-500">Express + TypeScript</p>
            </div>

            <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Security Engine</span>
              </div>
              <p className="font-semibold text-slate-200">JWT + RBAC + Helmet</p>
              <p className="text-[11px] text-slate-500">Bcrypt Salt 10</p>
            </div>
          </div>

          <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-medium text-slate-300">University Note: </span>
            To connect your live MongoDB Atlas cloud instance, specify your{' '}
            <code className="text-hall-400 font-mono">MONGODB_URI</code> in{' '}
            <code className="text-hall-400 font-mono">backend/.env</code> and restart the server.
          </div>
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
