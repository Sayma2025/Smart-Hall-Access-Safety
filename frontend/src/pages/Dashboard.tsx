import React, { useState } from 'react';
import {
  Users,
  Clock,
  Calendar,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  QrCode,
  PlusCircle,
  Building,
  Phone,
  Shield,
  Check,
  X,
  Search,
  UserPlus,
  Home,
  User as UserIcon,
  Building2,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from 'lucide-react';
import {
  AccessLog,
  DashboardLiveStats,
  EmergencyAlert,
  Gate,
  Hall,
  LateEntryRequest,
  LeaveRequest,
  ManagedUser,
  Room,
  StudentListItem,
  User,
} from '../types';

interface DashboardProps {
  user: User;
  liveStats: DashboardLiveStats | null;
  logs: AccessLog[];
  leaves: LeaveRequest[];
  alerts: EmergencyAlert[];
  lateEntries?: LateEntryRequest[];
  managedUsers: ManagedUser[];
  students: StudentListItem[];
  studentsTotal: number;
  studentsPage: number;
  studentsTotalPages: number;
  halls: Hall[];
  rooms: Room[];
  gates: Gate[];
  onSearchStudents: (params: { page?: number; search?: string; status?: string; department?: string }) => void;
  onSelectStudent: (student: StudentListItem) => void;
  onOpenScanner: () => void;
  onOpenLeaveModal: () => void;
  onOpenLateEntryModal?: () => void;
  onOpenSOS: () => void;
  onOpenAdminUserModal: () => void;
  onOpenInfrastructureModal: () => void;
  onReviewLateEntry: (id: string, status: 'APPROVED_LATE' | 'REJECTED_LATE', remarks?: string) => void;
  onReviewLateEntryRequest?: (id: string, action: 'APPROVE' | 'REJECT', note?: string) => void;
  onCancelLateEntry?: (id: string) => void;
  onUpdateLeaveStatus: (id: string, status: string, remarks?: string) => void;
  onCancelLeave?: (id: string) => void;
  onResolveSOS: (id: string, status: string, notes?: string) => void;
  onAcknowledgeSOS?: (id: string, notes?: string) => void;
  onToggleUserStatus: (id: string, isActive: boolean) => void;
  onToggleGateStatus: (id: string, status: string) => void;
  onOpenDeviceModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  liveStats,
  logs,
  leaves,
  alerts,
  lateEntries = [],
  managedUsers,
  students,
  studentsTotal,
  studentsPage,
  studentsTotalPages,
  halls,
  rooms,
  gates,
  onSearchStudents,
  onSelectStudent,
  onOpenScanner,
  onOpenLeaveModal,
  onOpenLateEntryModal,
  onOpenSOS,
  onOpenAdminUserModal,
  onOpenInfrastructureModal,
  onReviewLateEntry,
  onReviewLateEntryRequest,
  onCancelLateEntry,
  onUpdateLeaveStatus,
  onCancelLeave,
  onResolveSOS,
  onAcknowledgeSOS,
  onToggleUserStatus,
  onToggleGateStatus,
  onOpenDeviceModal,
}) => {
  const isStudent = user.role === 'STUDENT';
  const isGateStaff = user.role === 'GATE_STAFF' || user.role === 'GUARD';
  const isWarden = user.role === 'WARDEN';
  const isAdmin = user.role === 'ADMIN';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isGateStaff) return 'VERIFICATION';
    if (isWarden) return 'WARDEN_STUDENTS';
    if (isAdmin) return 'ADMIN_INFRASTRUCTURE';
    return 'STUDENT_PORTAL';
  });

  // Filters for students
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'LATE'>('ALL');
  const [logSearch, setLogSearch] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchStudents({ search: studentSearch, status: statusFilter, page: 1 });
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'LATE' && !l.isLate) return false;
    if (logSearch) {
      const term = logSearch.toLowerCase();
      const matchName = l.resident?.fullName?.toLowerCase().includes(term);
      const matchId = l.resident?.studentId?.toLowerCase().includes(term);
      return matchName || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Role-Specific Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                isStudent
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                  : isGateStaff
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : isWarden
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}
            >
              {user.role} WORKSPACE
            </span>
            <span className="text-xs text-slate-400">Authenticated Session</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            {isStudent && `Welcome, ${user.fullName}`}
            {isGateStaff && `Main Gate Verification Terminal`}
            {isWarden && `Provost & Warden Review Desk`}
            {isAdmin && `Central Administration & Infrastructure`}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isStudent && `Manage your digital hall pass, curfew status, and leave applications.`}
            {isGateStaff && `Search students, verify status, and log movements with automated 8:00 PM curfew compliance.`}
            {isWarden && `Review authorized student records, late arrivals, leaves, and emergency alerts.`}
            {isAdmin && `Manage student and staff accounts, halls, rooms, gates, and curfew policies.`}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isStudent && (
            <>
              {onOpenDeviceModal && (
                <button
                  onClick={onOpenDeviceModal}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Passkey Devices</span>
                </button>
              )}
              {onOpenLateEntryModal && (
                <button
                  onClick={onOpenLateEntryModal}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
                >
                  <Clock className="w-4 h-4" />
                  <span>Late Entry Pass</span>
                </button>
              )}
              <button
                onClick={onOpenLeaveModal}
                className="px-4 py-2.5 bg-hall-600 hover:bg-hall-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-glow-primary transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Apply For Leave</span>
              </button>
            </>
          )}

          {isGateStaff && (
            <button
              onClick={onOpenScanner}
              className="px-4 py-2.5 bg-hall-600 hover:bg-hall-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-glow-primary transition"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch ID Scanner</span>
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={onOpenInfrastructureModal}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition"
              >
                <Building2 className="w-4 h-4 text-hall-400" />
                <span>+ Infrastructure</span>
              </button>
              <button
                onClick={onOpenAdminUserModal}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Provision User</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenSOS}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-glow-red transition animate-pulse-sos"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency SOS</span>
          </button>
        </div>
      </div>

      {/* Real Dynamic MongoDB Dashboard Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Students Inside vs Outside */}
        <div className="bg-slate-900/80 p-4 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Recorded Hall Presence</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-2xl font-black text-emerald-400">
              {liveStats?.studentsInside ?? 0}
            </p>
            <span className="text-xs text-slate-400">INSIDE</span>
            <span className="text-slate-600">/</span>
            <p className="text-lg font-bold text-blue-400">
              {liveStats?.studentsOutside ?? 0}
            </p>
            <span className="text-xs text-slate-400">OUTSIDE</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total {liveStats?.totalStudents ?? 0} verified residents
          </p>
        </div>

        {/* Today's Movements */}
        <div className="bg-slate-900/80 p-4 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Gate Logs Today</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {liveStats?.todayMovements ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Total {liveStats?.totalMovements ?? 0} all-time movement scans
          </p>
        </div>

        {/* Flagged Late Entries */}
        <div className="bg-slate-900/80 p-4 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Curfew Breaches</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">
            {liveStats?.flaggedLateCurfews ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Entries flagged past 8:00 PM</p>
        </div>

        {/* Active Emergency SOS */}
        <div
          className={`p-4 rounded-3xl border shadow-lg transition ${
            (liveStats?.activeAlerts ?? 0) > 0
              ? 'bg-red-950/40 border-red-700/60 shadow-glow-red'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active SOS Alerts</span>
            <div
              className={`p-2 rounded-xl ${
                (liveStats?.activeAlerts ?? 0) > 0
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-black mt-2 ${
              (liveStats?.activeAlerts ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {liveStats?.activeAlerts ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {(liveStats?.activeAlerts ?? 0) > 0 ? 'Urgent responder dispatch needed' : 'All residential blocks safe'}
          </p>
        </div>
      </div>

      {/* Role Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center justify-between overflow-x-auto">
        <div className="flex space-x-2 sm:space-x-4 min-w-max">
          {/* Student Persona Tab */}
          {isStudent && (
            <button
              onClick={() => setActiveTab('STUDENT_PORTAL')}
              className={`pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
                activeTab === 'STUDENT_PORTAL'
                  ? 'border-hall-500 text-hall-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>My Resident Pass & Status</span>
            </button>
          )}

          {/* Gate Staff Persona Tab */}
          {isGateStaff && (
            <button
              onClick={() => setActiveTab('VERIFICATION')}
              className={`pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
                activeTab === 'VERIFICATION'
                  ? 'border-hall-500 text-hall-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Gate Student Verification</span>
            </button>
          )}

          {/* Warden Persona Tab */}
          {isWarden && (
            <>
              <button
                onClick={() => setActiveTab('WARDEN_STUDENTS')}
                className={`pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
                  activeTab === 'WARDEN_STUDENTS'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Hall Resident Roster</span>
              </button>

              <button
                onClick={() => setActiveTab('LATE_REVIEW')}
                className={`pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
                  activeTab === 'LATE_REVIEW'
                    ? 'border-hall-500 text-hall-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Late Approvals</span>
                {(liveStats?.flaggedLateCurfews ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {liveStats?.flaggedLateCurfews}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Administrator Persona Tabs */}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('ADMIN_INFRASTRUCTURE')}
                className={`pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
                  activeTab === 'ADMIN_INFRASTRUCTURE'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Halls, Rooms & Gates</span>
              </button>

              <button
                onClick={() => setActiveTab('ADMIN_USERS')}
                className={`pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
                  activeTab === 'ADMIN_USERS'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>User Accounts</span>
              </button>
            </>
          )}

          {/* Shared Movement Logs Tab */}
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'LOGS'
                ? 'border-hall-500 text-hall-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isStudent ? 'My Movements' : 'Movement Logs'}</span>
          </button>

          {/* Shared Leaves Tab */}
          <button
            onClick={() => setActiveTab('LEAVES')}
            className={`pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'LEAVES'
                ? 'border-hall-500 text-hall-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Leave Requests</span>
            {(liveStats?.pendingLeaves ?? 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                {liveStats?.pendingLeaves}
              </span>
            )}
          </button>

          {/* Shared Emergency SOS Tab */}
          <button
            onClick={() => setActiveTab('SOS')}
            className={`pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'SOS'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency SOS</span>
            {(liveStats?.activeAlerts ?? 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                {liveStats?.activeAlerts}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. STUDENT VIEW: Digital Resident ID & Pass              */}
      {/* ======================================================== */}
      {activeTab === 'STUDENT_PORTAL' && isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Digital ID Pass Card */}
          <div className="bg-gradient-to-br from-hall-950/80 via-slate-900 to-slate-900 p-6 rounded-3xl border-2 border-hall-500/40 shadow-glow-primary relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between border-b border-hall-500/30 pb-4">
              <div className="flex items-center space-x-2.5">
                <Shield className="w-5 h-5 text-hall-400" />
                <span className="font-extrabold text-sm text-white tracking-wide">
                  DIGITAL RESIDENT PASS
                </span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  user.currentStatus === 'INSIDE'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                }`}
              >
                RECORDED {user.currentStatus || 'INSIDE'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Resident Full Name</p>
                <h3 className="text-lg font-bold text-white">{user.fullName}</h3>
                <p className="text-xs text-hall-400">{user.department || 'Computer Science & Engineering'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">Student ID</p>
                  <p className="font-mono font-bold text-hall-300">{user.studentId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Allotted Room</p>
                  <p className="font-semibold text-white">{user.roomNumber || 'Room 304, Block B'}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400">Gate Presence Status</p>
                  <p className={`text-sm font-black ${user.currentStatus === 'OUTSIDE' ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {user.currentStatus === 'OUTSIDE' ? 'OUTSIDE HALL' : 'INSIDE HALL'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">Curfew Cutoff</p>
                  <p className="text-sm font-bold text-amber-300">8:00 PM</p>
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl w-32 h-32 mx-auto flex items-center justify-center shadow-lg">
                <QrCode className="w-28 h-28 text-slate-900" />
              </div>
              <p className="text-[10px] text-center text-slate-400">
                Present this QR code to Main Gate staff for instant entry/exit scan
              </p>
            </div>
          </div>

          {/* Student Actions & Policies */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-hall-400" />
                Quick Student Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {onOpenDeviceModal && (
                  <button
                    onClick={onOpenDeviceModal}
                    className="p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-2xl text-left transition hover:border-emerald-500/50"
                  >
                    <Smartphone className="w-5 h-5 text-emerald-400 mb-2" />
                    <h4 className="font-bold text-white text-sm">Passkey Devices</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage cryptographic enrolled hardware for gate passage
                    </p>
                  </button>
                )}

                {onOpenLateEntryModal && (
                  <button
                    onClick={onOpenLateEntryModal}
                    className="p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-2xl text-left transition hover:border-amber-500/50"
                  >
                    <Clock className="w-5 h-5 text-amber-400 mb-2" />
                    <h4 className="font-bold text-white text-sm">Advance Late Entry</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Apply for authorized post-8:00 PM entry permission
                    </p>
                  </button>
                )}

                <button
                  onClick={onOpenLeaveModal}
                  className="p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-2xl text-left transition hover:border-hall-500/50"
                >
                  <PlusCircle className="w-5 h-5 text-hall-400 mb-2" />
                  <h4 className="font-bold text-white text-sm">Apply for Hall Leave</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-day leave application with verified guardian consent
                  </p>
                </button>

                <button
                  onClick={onOpenSOS}
                  className="p-4 bg-red-950/30 hover:bg-red-950/50 border border-red-800/60 rounded-2xl text-left transition"
                >
                  <ShieldAlert className="w-5 h-5 text-red-400 mb-2 animate-pulse" />
                  <h4 className="font-bold text-red-300 text-sm">Trigger Emergency SOS</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Instantly broadcast your room location to on-duty staff
                  </p>
                </button>
              </div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-2">
              <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Curfew Compliance Notice
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                All residents must return to Pritilata Waddedar Hall before <strong>8:00 PM</strong>. Any entry past 8:00 PM requires justification and triggers an automatic late flag requiring Warden review.
              </p>
            </div>

            {/* Resident Advance Late Entry Requests */}
            {lateEntries.length > 0 && (
              <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    My Late Entry Permissions
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {lateEntries.length} recorded
                  </span>
                </h4>
                <div className="space-y-2.5">
                  {lateEntries.map((req) => (
                    <div
                      key={req._id}
                      className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-white">
                            {new Date(req.targetDate).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-amber-300 font-mono font-semibold">
                            Arrival: {req.expectedArrivalTime}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : req.status === 'REJECTED'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : req.status === 'CANCELLED'
                                ? 'bg-slate-700 text-slate-400'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          <span className="text-slate-400">Reason:</span> {req.reason}
                        </p>
                        {req.wardenDecisionNote && (
                          <p className="text-[11px] text-purple-300">
                            Warden Note: {req.wardenDecisionNote}
                          </p>
                        )}
                      </div>

                      {req.status === 'PENDING' && onCancelLateEntry && (
                        <button
                          onClick={() => onCancelLateEntry(req._id)}
                          className="px-3 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 rounded-xl text-xs font-semibold self-start sm:self-center transition"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. GATE STAFF & WARDEN: Student Search & Verification   */}
      {/* ======================================================== */}
      {(activeTab === 'VERIFICATION' || activeTab === 'WARDEN_STUDENTS') && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <form onSubmit={handleSearchSubmit} className="bg-slate-900/80 p-4 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by student name, ID (e.g. ASH2101001M), department, or room..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-hall-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  onSearchStudents({ search: studentSearch, status: e.target.value, page: 1 });
                }}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-hall-500"
              >
                <option value="">All Statuses</option>
                <option value="INSIDE">INSIDE Hall</option>
                <option value="OUTSIDE">OUTSIDE Hall</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-hall-600 hover:bg-hall-500 text-white rounded-xl text-xs font-semibold shadow-glow-primary transition"
              >
                Search
              </button>
            </div>
          </form>

          {/* Students Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Student Resident</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Room & Hall</th>
                    <th className="py-3.5 px-4">Current Status</th>
                    <th className="py-3.5 px-4 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {students.map((st) => (
                    <tr
                      key={st._id}
                      onClick={() => onSelectStudent(st)}
                      className="hover:bg-slate-800/50 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white text-sm">{st.fullName}</p>
                        <p className="font-mono text-hall-400 text-[11px] font-semibold">{st.studentId}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {st.department || 'General Studies'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">{st.roomNumber || 'Room 304'}</span>
                        <p className="text-[11px] text-slate-500">{st.hallName}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                            st.currentStatus === 'INSIDE'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                              : 'bg-blue-950/70 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          {st.currentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-hall-300 rounded-lg text-xs font-semibold border border-slate-700 transition">
                          Verify Profile →
                        </span>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {studentsTotalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing Page {studentsPage} of {studentsTotalPages} ({studentsTotal} Total Students)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={studentsPage <= 1}
                    onClick={() => onSearchStudents({ page: studentsPage - 1, search: studentSearch, status: statusFilter })}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={studentsPage >= studentsTotalPages}
                    onClick={() => onSearchStudents({ page: studentsPage + 1, search: studentSearch, status: statusFilter })}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ADMINISTRATOR VIEW: Halls, Rooms & Gates              */}
      {/* ======================================================== */}
      {activeTab === 'ADMIN_INFRASTRUCTURE' && isAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Residential Halls & Infrastructure</h3>
              <p className="text-xs text-slate-400">
                Configure buildings, rooms, capacities, and physical access gates.
              </p>
            </div>
            <button
              onClick={onOpenInfrastructureModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
            >
              <Building2 className="w-4 h-4" />
              <span>+ Configure Infrastructure</span>
            </button>
          </div>

          {/* Halls List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {halls.map((h) => (
              <div key={h._id} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {h.code}
                    </span>
                    <h4 className="font-extrabold text-white text-base mt-2">{h.name}</h4>
                    <p className="text-xs text-slate-400">Provost: {h.provostName || 'Dr. Sultana Razia'}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Capacity: {h.capacity}
                  </span>
                </div>
                <div className="text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span>Curfew Rule:</span>
                  <span className="font-semibold text-amber-300">{h.curfewTime} (Grace: {h.lateGraceMinutes}m)</span>
                </div>
              </div>
            ))}
          </div>

          {/* Rooms Grid */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Home className="w-4 h-4 text-hall-400" />
              Configured Residential Rooms ({rooms.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {rooms.map((r) => (
                <div key={r._id} className="p-3 bg-slate-800/50 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-sm">Room {r.roomNumber}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                      {r.block}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Floor {r.floor} • Cap: {r.capacity}</p>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-400">Occupied: {r.occupiedCount}</span>
                    <span className={`font-bold ${r.status === 'FULL' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gates List */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <QrCode className="w-4 h-4 text-amber-400" />
              Physical Access Gates ({gates.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gates.map((g) => (
                <div key={g._id} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-amber-300 text-xs font-bold">{g.code}</span>
                    <h5 className="font-bold text-white text-sm mt-0.5">{g.name}</h5>
                    <p className="text-xs text-slate-400">{g.location}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      g.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {g.status}
                    </span>
                    <div>
                      <button
                        onClick={() => onToggleGateStatus(g._id, g.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE')}
                        className="text-[11px] text-slate-400 hover:text-white underline"
                      >
                        {g.status === 'ACTIVE' ? 'Lock Gate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ADMINISTRATOR VIEW: User Accounts                     */}
      {/* ======================================================== */}
      {activeTab === 'ADMIN_USERS' && isAdmin && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-white text-lg">Central User Accounts Management</h3>
              <p className="text-xs text-slate-400">
                Server-enforced role assignments. Provision staff, wardens, students, and administrators.
              </p>
            </div>
            <button
              onClick={onOpenAdminUserModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Provision New Account</span>
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Room / Department</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Access Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {managedUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{u.fullName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.role === 'ADMIN'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : u.role === 'WARDEN'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : u.role === 'GATE_STAFF' || u.role === 'GUARD'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {u.studentId ? (
                          <div>
                            <span className="font-mono text-hall-300 font-semibold">{u.studentId}</span>
                            <p className="text-[11px] text-slate-400">{u.department} • {u.roomNumber}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">{u.hallName}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onToggleUserStatus(u._id, !u.isActive)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            u.isActive
                              ? 'bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SHARED: Movements Log Table                          */}
      {/* ======================================================== */}
      {activeTab === 'LOGS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search movements by resident name or ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-hall-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLogFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  logFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Movements ({logs.length})
              </button>
              <button
                onClick={() => setLogFilter('LATE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                  logFilter === 'LATE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Late Only</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Resident</th>
                    <th className="py-3.5 px-4">Movement</th>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4">Late Reason / Remarks</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {log.resident?.fullName || 'Resident Student'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-hall-300">{log.resident?.studentId || 'N/A'}</span>
                          <span>•</span>
                          <span>{log.resident?.roomNumber}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            log.type === 'ENTRY'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                              : 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                          }`}
                        >
                          {log.type === 'ENTRY' ? (
                            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                          )}
                          <span>{log.type}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <p className="text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {log.lateReason ? (
                          <p className="text-amber-300 text-[11px] bg-amber-950/30 p-1.5 rounded-lg border border-amber-900/40">
                            {log.lateReason}
                          </p>
                        ) : (
                          <span className="text-slate-400 text-[11px]">{log.remarks || 'Standard pass'}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {log.status === 'FLAGGED_LATE' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            FLAGGED LATE
                          </span>
                        )}
                        {log.status === 'APPROVED_LATE' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            APPROVED
                          </span>
                        )}
                        {log.status === 'REJECTED_LATE' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            CITATION
                          </span>
                        )}
                        {log.status === 'NORMAL' && <span className="text-slate-400 text-xs">Normal</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SHARED: Leave Requests                                */}
      {/* ======================================================== */}
      {activeTab === 'LEAVES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Leave Requests & Guardian Verification</h3>
              <p className="text-xs text-slate-400">
                Official absence requests from hall grounds with parental consent.
              </p>
            </div>
            {isStudent && (
              <button
                onClick={onOpenLeaveModal}
                className="px-3.5 py-2 bg-hall-600 hover:bg-hall-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-glow-primary transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Leave Request</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaves.map((l) => (
              <div
                key={l._id}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {l.leaveType.replace('_', ' ')}
                    </span>
                    <h4 className="font-bold text-white text-base mt-2">
                      {l.resident?.fullName || 'Resident Student'}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      {l.resident?.studentId} • {l.resident?.roomNumber}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      l.status === 'APPROVED_BY_WARDEN'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : l.status === 'REJECTED'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {l.status === 'APPROVED_BY_WARDEN' ? 'WARDEN APPROVED' : l.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-slate-400">Departure:</span>
                    <p className="font-semibold text-slate-200">
                      {new Date(l.departureDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Expected Return:</span>
                    <p className="font-semibold text-slate-200">
                      {new Date(l.expectedReturnDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-300">
                  <p className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-hall-400 shrink-0" />
                    <span>{l.destinationAddress}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-hall-400 shrink-0" />
                    <span>Guardian Contact: {l.emergencyContactPhone}</span>
                  </p>
                  {(l as any).reason && (
                    <p className="text-slate-400 italic">
                      Reason: {(l as any).reason}
                    </p>
                  )}
                </div>

                {isStudent && l.status === 'PENDING' && onCancelLeave && (
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => onCancelLeave(l._id)}
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel Application
                    </button>
                  </div>
                )}

                {(isWarden || isAdmin) && l.status === 'PENDING' && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-2">
                    <button
                      onClick={() =>
                        onUpdateLeaveStatus(
                          l._id,
                          'APPROVED_BY_WARDEN',
                          'Official leave grant sanctioned by Warden'
                        )
                      }
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Leave</span>
                    </button>

                    <button
                      onClick={() =>
                        onUpdateLeaveStatus(
                          l._id,
                          'REJECTED',
                          'Application rejected due to academic commitment'
                        )
                      }
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. SHARED: Emergency SOS                                 */}
      {/* ======================================================== */}
      {activeTab === 'SOS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Emergency Assistance Center
                {(liveStats?.activeAlerts ?? 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
                    HIGH PRIORITY
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Direct distress signals broadcasted by resident students for immediate responder dispatch.
              </p>
            </div>
            <button
              onClick={onOpenSOS}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-glow-red animate-pulse-sos transition"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>TRIGGER NEW SOS</span>
            </button>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => {
              const isActive = alert.status === 'ACTIVE';
              return (
                <div
                  key={alert._id}
                  className={`p-5 rounded-3xl border transition-all ${
                    isActive ? 'bg-red-950/40 border-red-600 shadow-glow-red' : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-3 rounded-2xl shrink-0 ${
                          isActive ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-base text-white">
                            {alert.alertType} DISTRESS CALL
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive ? 'bg-red-600 text-white' : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          Resident: <span className="font-semibold text-white">{alert.resident?.fullName}</span>{' '}
                          ({alert.resident?.studentId}) • {alert.resident?.phoneNumber || 'No phone'}
                        </p>
                        <p className="text-xs text-red-300 font-semibold mt-1">
                          📍 Location: {alert.location}
                        </p>
                        {alert.notes && <p className="text-xs text-slate-400 mt-1 italic">"{alert.notes}"</p>}
                      </div>
                    </div>

                    {!isStudent && (isActive || alert.status === 'ACKNOWLEDGED') && (
                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        {isActive && onAcknowledgeSOS && (
                          <button
                            onClick={() => onAcknowledgeSOS(alert._id)}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition shadow-md"
                          >
                            Acknowledge & Dispatch
                          </button>
                        )}
                        <button
                          onClick={() =>
                            onResolveSOS(
                              alert._id,
                              'RESOLVED',
                              'Security guard and responder attended; resident confirmed safe.'
                            )
                          }
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. WARDEN ONLY: Late Review Desk                        */}
      {/* ======================================================== */}
      {activeTab === 'LATE_REVIEW' && isWarden && (
        <div className="space-y-6">
          {/* Section A: Advance Late Entry Requests Queue */}
          <div className="space-y-4">
            <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-white text-lg">Advance Late Entry Requests</h3>
                <p className="text-xs text-slate-400">
                  Pre-departure permissions submitted by resident students for late arrival approval.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
                {lateEntries.filter((l) => l.status === 'PENDING').length} Pending Review
              </span>
            </div>

            {lateEntries.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                No advance late entry requests found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lateEntries.map((req) => (
                  <div key={req._id} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{req.resident?.fullName}</h4>
                        <p className="text-xs text-slate-400 font-mono">{req.resident?.studentId} • Room {req.resident?.roomNumber || 'N/A'}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : req.status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : req.status === 'CANCELLED'
                          ? 'bg-slate-700 text-slate-400'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs space-y-1">
                      <p className="text-slate-300">
                        Date: <span className="text-white font-mono font-bold">{new Date(req.targetDate).toLocaleDateString()}</span> • Expected Arrival: <span className="text-amber-300 font-mono font-bold">{req.expectedArrivalTime}</span>
                      </p>
                      <p className="text-slate-400">
                        Reason: <span className="text-slate-200">{req.reason}</span>
                      </p>
                      {req.wardenDecisionNote && (
                        <p className="text-purple-300 text-[11px]">Decision Note: {req.wardenDecisionNote}</p>
                      )}
                    </div>

                    {req.status === 'PENDING' && onReviewLateEntryRequest && (
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => onReviewLateEntryRequest(req._id, 'APPROVE', 'Late entry authorized by Warden')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
                        >
                          Approve Permission
                        </button>
                        <button
                          onClick={() => onReviewLateEntryRequest(req._id, 'REJECT', 'Reason insufficient for late pass')}
                          className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-xl text-xs font-semibold transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Logged Curfew Access Violations */}
          <div className="space-y-4">
            <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-white text-lg">Curfew Violation Access Logs</h3>
                <p className="text-xs text-slate-400">
                  Entries physically recorded past 8:00 PM curfew threshold requiring Warden citation or pass approval.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                {liveStats?.flaggedLateCurfews ?? 0} Flagged Entries
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logs
                .filter((l) => l.isLate)
                .map((log) => (
                  <div key={log._id} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{log.resident?.fullName}</h4>
                        <p className="text-xs text-slate-400 font-mono">{log.resident?.studentId} • {log.resident?.roomNumber}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        log.status === 'FLAGGED_LATE' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
                      <p className="text-slate-400">Arrival: <span className="text-white font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span></p>
                      {log.lateReason && <p className="text-amber-300 mt-1"><span className="font-semibold">Reason:</span> {log.lateReason}</p>}
                    </div>
                    {log.status === 'FLAGGED_LATE' && (
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => onReviewLateEntry(log._id, 'APPROVED_LATE', 'Approved by Warden')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                        >
                          Approve Pass
                        </button>
                        <button
                          onClick={() => onReviewLateEntry(log._id, 'REJECTED_LATE', 'Citation logged')}
                          className="px-3 py-1.5 bg-red-950/60 text-red-300 border border-red-800 rounded-lg text-xs font-semibold"
                        >
                          Issue Citation
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
