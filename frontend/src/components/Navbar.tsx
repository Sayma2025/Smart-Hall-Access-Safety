import React from 'react';
import {
  ShieldAlert,
  Activity,
  LogOut,
  Building2,
  Clock,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { User, UserRole, HealthStatus } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onOpenSOS: () => void;
  onOpenHealth: () => void;
  health: HealthStatus | null;
  activeSosCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenSOS,
  onOpenHealth,
  health,
  activeSosCount,
}) => {
  const roleColors: Record<UserRole, { bg: string; text: string; label: string }> = {
    STUDENT: { bg: 'bg-pink-500/20 border-pink-500/30', text: 'text-pink-300', label: 'Resident Student' },
    GATE_STAFF: { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-300', label: 'Gate Staff' },
    GUARD: { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-300', label: 'Gate Staff' },
    WARDEN: { bg: 'bg-purple-500/20 border-purple-500/30', text: 'text-purple-300', label: 'Hall Warden' },
    ADMIN: { bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-300', label: 'Administrator' },
  };

  const badgeInfo = roleColors[user.role] || roleColors.STUDENT;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Hall Branding */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-hall-500 to-hall-700 flex items-center justify-center shadow-glow-primary border border-hall-400/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              {activeSosCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[10px] font-bold text-white items-center justify-center">
                    {activeSosCount}
                  </span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  SHASMS
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-hall-500/20 text-hall-300 border border-hall-500/30 font-medium">
                    Auth & RBAC
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:flex items-center gap-1">
                <Building2 className="w-3 h-3 text-hall-400" />
                Pritilata Waddedar Female Residential Hall
              </p>
            </div>
          </div>

          {/* Curfew & Server Health Indicators */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">Curfew:</span>
              <span className="font-semibold text-amber-300">8:00 PM</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <button
              onClick={onOpenHealth}
              className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-700/80 transition-colors px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs text-slate-300"
              title="Click to view Backend & MongoDB Health"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Database:</span>
              <span
                className={`font-semibold ${
                  health?.database.isConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {health?.database.isConnected ? 'MongoDB Connected' : 'Offline'}
              </span>
            </button>
          </div>

          {/* Action Area: Emergency SOS + User Profile + Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick SOS Trigger Button */}
            <button
              onClick={onOpenSOS}
              className="relative group flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-glow-red transition-all duration-200 animate-pulse-sos"
              id="sos-trigger-btn"
            >
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span>SOS ASSIST</span>
            </button>

            {/* Authenticated User Badge */}
            <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <UserIcon className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              <div className="text-left">
                <p className="font-semibold text-white text-[11px] sm:text-xs truncate max-w-[120px] sm:max-w-[150px]">
                  {user.fullName}
                </p>
                <span
                  className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded-full border ${badgeInfo.bg} ${badgeInfo.text}`}
                >
                  {badgeInfo.label}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={onLogout}
              className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-300 border border-slate-700 hover:border-red-800/60 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
