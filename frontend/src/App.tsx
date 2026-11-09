import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { HealthModal } from './components/HealthModal';
import { SosModal } from './components/SosModal';
import { GateScannerModal } from './components/GateScannerModal';
import { LeaveModal } from './components/LeaveModal';
import { LateEntryModal } from './components/LateEntryModal';
import { AdminUserModal } from './components/AdminUserModal';
import { InfrastructureModal } from './components/InfrastructureModal';
import { StudentVerificationModal } from './components/StudentVerificationModal';
import { DeviceManagementModal } from './components/DeviceManagementModal';
import { StudentPendingVerificationModal } from './components/StudentPendingVerificationModal';
import { api, getCurrentUser, getAuthToken } from './services/api';
import { initSocket, disconnectSocket } from './services/socket';
import {
  AccessLog,
  DashboardLiveStats,
  EmergencyAlert,
  EnrolledDeviceItem,
  Gate,
  Hall,
  HealthStatus,
  LateEntryRequest,
  LeaveRequest,
  ManagedUser,
  Room,
  StudentListItem,
  User,
} from './types';
import { ShieldCheck, Info } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [token, setToken] = useState<string | null>(getAuthToken());

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [liveStats, setLiveStats] = useState<DashboardLiveStats | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [lateEntries, setLateEntries] = useState<LateEntryRequest[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);

  // Students & Verification
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsTotalPages, setStudentsTotalPages] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  // Cryptographic Devices & Pending Verifications
  const [devices, setDevices] = useState<EnrolledDeviceItem[]>([]);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<any | null>(null);

  // Infrastructure
  const [halls, setHalls] = useState<Hall[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [isInfrastructureModalOpen, setIsInfrastructureModalOpen] = useState(false);

  // Modals state
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLateEntryModalOpen, setIsLateEntryModalOpen] = useState(false);
  const [isAdminUserModalOpen, setIsAdminUserModalOpen] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const loadStudents = async (params: { page?: number; search?: string; status?: string; department?: string } = {}) => {
    try {
      const data = await api.getStudents({
        page: params.page ?? studentsPage,
        search: params.search,
        status: params.status,
        department: params.department,
      });
      setStudents(data.students || []);
      setStudentsTotal(data.total || 0);
      setStudentsTotalPages(data.totalPages || 1);
      if (params.page) setStudentsPage(params.page);
    } catch (err: any) {
      console.warn('Student list fetch notice:', err.message);
    }
  };

  const loadDevices = async () => {
    try {
      const devs = await api.getMyDevices();
      setDevices(devs);
    } catch (err: any) {
      console.warn('Device fetch notice:', err.message);
    }
  };

  const checkPendingVerification = async () => {
    try {
      const res = await api.getPendingVerificationForMe();
      if (res.pendingSession) {
        setPendingVerification({
          sessionId: res.pendingSession._id,
          sessionToken: res.pendingSession.sessionToken,
          requestedMovement: res.pendingSession.requestedMovement,
          isLate: res.pendingSession.isLate,
          expiresAt: res.pendingSession.expiresAt,
          challenge: res.pendingSession.challenge,
          gateName: res.pendingSession.gate?.name,
          initiatedByName: res.pendingSession.initiatedBy?.fullName,
        });
      }
    } catch (err: any) {
      console.warn('Pending verification check notice:', err.message);
    }
  };

  const loadData = async () => {
    try {
      const [healthData, statsData] = await Promise.all([
        api.getHealth(),
        api.getDashboardStats().catch(() => null),
      ]);
      setHealth(healthData);
      if (statsData) setLiveStats(statsData);

      if (user && token) {
        const [logsData, leavesData, alertsData] = await Promise.all([
          api.getAccessLogs().catch(() => []),
          api.getLeaves().catch(() => []),
          api.getActiveAlerts().catch(() => []),
        ]);
        setLogs(logsData);
        setLeaves(leavesData);
        setAlerts(alertsData);

        if (user.role === 'STUDENT') {
          await Promise.all([
            loadDevices(),
            checkPendingVerification(),
            api.getMyLateEntries().then(setLateEntries).catch(() => []),
          ]);
        }

        if (user.role === 'WARDEN' || user.role === 'ADMIN') {
          api.getLateEntries().then(setLateEntries).catch(() => []);
        }

        if (user.role === 'ADMIN' || user.role === 'WARDEN' || user.role === 'GATE_STAFF' || user.role === 'GUARD') {
          const [hallsData, roomsData, gatesData] = await Promise.all([
            api.getHalls().catch(() => []),
            api.getRooms().catch(() => []),
            api.getGates().catch(() => []),
          ]);
          setHalls(hallsData);
          setRooms(roomsData);
          setGates(gatesData);
        }

        if (user.role === 'ADMIN') {
          const usersData = await api.adminGetUsers().catch(() => []);
          setManagedUsers(usersData);
        }

        if (user.role !== 'STUDENT') {
          await loadStudents();
        }
      }
    } catch (err: any) {
      console.warn('Data sync notice:', err.message);
    }
  };

  // Socket.IO real-time connection and notification listeners
  useEffect(() => {
    const socket = initSocket(user);

    if (socket) {
      const handleVerificationRequested = (data: any) => {
        setPendingVerification(data);
        showNotification('🚨 Gate Verification Request Received! Please approve with your registered device passkey.');
      };

      const handleStatsUpdated = () => {
        loadData();
      };

      socket.on('verification:requested', handleVerificationRequested);
      socket.on('dashboard:stats_updated', handleStatsUpdated);

      return () => {
        socket.off('verification:requested', handleVerificationRequested);
        socket.off('dashboard:stats_updated', handleStatsUpdated);
        disconnectSocket();
      };
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);

    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
      showNotification('Your session has expired. Please log in again.');
    };

    window.addEventListener('shasms:session_expired', handleSessionExpired);

    return () => {
      clearInterval(interval);
      window.removeEventListener('shasms:session_expired', handleSessionExpired);
    };
  }, [user?.role, token]);

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setToken(getAuthToken());
    showNotification(`Welcome, ${authenticatedUser.fullName}! Logged in as ${authenticatedUser.role}.`);
  };

  const handleLogout = async () => {
    await api.logout();
    disconnectSocket();
    setUser(null);
    setToken(null);
    showNotification('You have logged out successfully.');
  };

  // Actions
  const handleScanAccess = async (data: any) => {
    try {
      const newLog = await api.scanAccess(data);
      setLogs((prev) => [newLog, ...prev]);
      showNotification(
        `${data.type} recorded for ${data.studentIdentifier}.${
          newLog.isLate ? ' ⚠️ Late Entry Flagged (8:00 PM Curfew).' : ''
        }`
      );
      loadData();
    } catch (err: any) {
      showNotification(`Scan failed: ${err.message}`);
    }
  };

  const handleReviewLate = async (
    id: string,
    status: 'APPROVED_LATE' | 'REJECTED_LATE',
    remarks?: string
  ) => {
    try {
      await api.reviewLateEntry(id, status, remarks);
      setLogs((prev) =>
        prev.map((l) => (l._id === id ? { ...l, status, remarks } : l))
      );
      showNotification(`Late pass record marked as ${status}.`);
      loadData();
    } catch (err: any) {
      showNotification(`Action failed: ${err.message}`);
    }
  };

  const handleSubmitLateEntry = async (payload: { targetDate: string; expectedArrivalTime: string; reason: string }) => {
    try {
      const res = await api.submitLateEntry(payload);
      if (res.request) setLateEntries((prev) => [res.request, ...prev]);         showNotification('Advance late entry request submitted for Warden review.');
      loadData();
    } catch (err: any) {
      showNotification(`Submission failed: ${err.message}`);
      throw err;
    }
  };

  const handleReviewLateEntryRequest = async (id: string, action: 'APPROVE' | 'REJECT', note?: string) => {
    try {
      await api.reviewLateEntryRequest(id, action, note);
      showNotification(`Late entry permission request ${action === 'APPROVE' ? 'approved' : 'rejected'}.`);
      loadData();
    } catch (err: any) {
      showNotification(`Action failed: ${err.message}`);
    }
  };

  const handleCancelLateEntry = async (id: string) => {
    try {
      await api.cancelLateEntry(id);
      showNotification('Late entry request cancelled.');
      loadData();
    } catch (err: any) {
      showNotification(`Cancellation failed: ${err.message}`);
    }
  };

  const handleSubmitLeave = async (leaveData: any) => {
    try {
      const newLeave = await api.submitLeave(leaveData);
      setLeaves((prev) => [newLeave, ...prev]);
      showNotification('Leave application submitted for Warden approval.');
      loadData();
    } catch (err: any) {
      showNotification(`Leave submission failed: ${err.message}`);
    }
  };

  const handleCancelLeave = async (id: string) => {
    try {
      await api.cancelLeave(id);
      showNotification('Leave application cancelled.');
      loadData();
    } catch (err: any) {
      showNotification(`Cancellation failed: ${err.message}`);
    }
  };

  const handleUpdateLeave = async (id: string, status: string, remarks?: string) => {
    try {
      await api.updateLeaveStatus(id, status, remarks);
      setLeaves((prev) =>
        prev.map((l) =>
          l._id === id ? { ...l, status: status as any, wardenRemarks: remarks } : l
        )
      );
      showNotification(`Leave request marked as ${status}.`);
      loadData();
    } catch (err: any) {
      showNotification(`Action failed: ${err.message}`);
    }
  };

  const handleTriggerSOS = async (alertData: any) => {
    try {
      const newAlert = await api.triggerSOS(alertData);
      setAlerts((prev) => [newAlert, ...prev]);
      showNotification('🚨 EMERGENCY SOS BROADCASTED TO ON-DUTY GUARDS & WARDEN!');
      loadData();
    } catch (err: any) {
      showNotification(`SOS trigger failed: ${err.message}`);
    }
  };

  const handleAcknowledgeSOS = async (id: string) => {
    try {
      await api.acknowledgeSOS(id, 'Responder dispatched to room');
      showNotification('🚨 SOS Alert Acknowledged! Responder marked en route.');
      loadData();
    } catch (err: any) {
      showNotification(`Acknowledgment failed: ${err.message}`);
    }
  };

  const handleResolveSOS = async (id: string, status: string, notes?: string) => {
    try {
      await api.resolveSOS(id, status, notes);
      setAlerts((prev) =>
        prev.map((a) =>
          a._id === id ? { ...a, status: status as any, resolutionNotes: notes } : a
        )
      );
      showNotification(`Emergency alert marked as ${status}.`);
      loadData();
    } catch (err: any) {
      showNotification(`Action failed: ${err.message}`);
    }
  };

  const handleAdminCreateUser = async (userData: any) => {
    try {
      await api.adminCreateUser(userData);
      showNotification(`Account for ${userData.fullName} (${userData.role}) created successfully.`);
      const updatedList = await api.adminGetUsers();
      setManagedUsers(updatedList);
      loadData();
    } catch (err: any) {
      showNotification(`Account creation failed: ${err.message}`);
      throw err;
    }
  };

  const handleToggleUserStatus = async (id: string, isActive: boolean) => {
    try {
      await api.adminToggleUserStatus(id, isActive);
      setManagedUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isActive } : u))
      );
      showNotification(`User account status updated.`);
      loadData();
    } catch (err: any) {
      showNotification(`Failed to update status: ${err.message}`);
    }
  };

  const handleCreateHall = async (hallData: any) => {
    const newHall = await api.createHall(hallData);
    setHalls((prev) => [...prev, newHall]);
    showNotification(`Residential Hall '${newHall.name}' created successfully.`);
    loadData();
  };

  const handleCreateRoom = async (roomData: any) => {
    const newRoom = await api.createRoom(roomData);
    setRooms((prev) => [...prev, newRoom]);
    showNotification(`Room ${newRoom.roomNumber} in ${newRoom.block} added.`);
    loadData();
  };

  const handleCreateGate = async (gateData: any) => {
    const newGate = await api.createGate(gateData);
    setGates((prev) => [...prev, newGate]);
    showNotification(`Access Gate '${newGate.name}' configured.`);
    loadData();
  };

  const handleToggleGateStatus = async (id: string, status: string) => {
    try {
      const updated = await api.updateGateStatus(id, status);
      setGates((prev) => prev.map((g) => (g._id === id ? updated : g)));
      showNotification(`Gate status changed to ${status}.`);
      loadData();
    } catch (err: any) {
      showNotification(`Failed to update gate status: ${err.message}`);
    }
  };

  const handleRevokeDevice = async (id: string) => {
    try {
      await api.revokeDevice(id);
      showNotification('Device credential revoked.');
      await loadDevices();
    } catch (err: any) {
      showNotification(`Failed to revoke device: ${err.message}`);
    }
  };

  // If not logged in, show Login & Registration Page
  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const activeSosCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-hall-500 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 border border-slate-700 p-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-5 duration-300">
          <Info className="w-5 h-5 text-hall-400 shrink-0" />
          <span className="text-xs text-slate-200">{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenSOS={() => setIsSosOpen(true)}
        onOpenHealth={() => setIsHealthOpen(true)}
        health={health}
        activeSosCount={activeSosCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Dashboard
          user={user}
          liveStats={liveStats}
          logs={logs}
          leaves={leaves}
          alerts={alerts}
          lateEntries={lateEntries}
          managedUsers={managedUsers}
          students={students}
          studentsTotal={studentsTotal}
          studentsPage={studentsPage}
          studentsTotalPages={studentsTotalPages}
          halls={halls}
          rooms={rooms}
          gates={gates}
          onSearchStudents={loadStudents}
          onSelectStudent={(st) => {
            setSelectedStudent(st);
            setIsStudentModalOpen(true);
          }}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
          onOpenLateEntryModal={() => setIsLateEntryModalOpen(true)}
          onOpenSOS={() => setIsSosOpen(true)}
          onOpenAdminUserModal={() => setIsAdminUserModalOpen(true)}
          onOpenInfrastructureModal={() => setIsInfrastructureModalOpen(true)}
          onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
          onReviewLateEntry={handleReviewLate}
          onReviewLateEntryRequest={handleReviewLateEntryRequest}
          onCancelLateEntry={handleCancelLateEntry}
          onCancelLeave={handleCancelLeave}
          onUpdateLeaveStatus={handleUpdateLeave}
          onResolveSOS={handleResolveSOS}
          onAcknowledgeSOS={handleAcknowledgeSOS}
          onToggleUserStatus={handleToggleUserStatus}
          onToggleGateStatus={handleToggleGateStatus}
        />
      </main>

      {/* Modals */}
      <HealthModal
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
        health={health}
        onRefresh={loadData}
      />

      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onSubmit={handleTriggerSOS}
        user={user}
      />

      <GateScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanAccess}
      />

      <LeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSubmit={handleSubmitLeave}
        user={user}
      />

      <LateEntryModal
        isOpen={isLateEntryModalOpen}
        onClose={() => setIsLateEntryModalOpen(false)}
        onSubmit={handleSubmitLateEntry}
        user={user}
      />

      <AdminUserModal
        isOpen={isAdminUserModalOpen}
        onClose={() => setIsAdminUserModalOpen(false)}
        onSubmit={handleAdminCreateUser}
      />

      <InfrastructureModal
        isOpen={isInfrastructureModalOpen}
        onClose={() => setIsInfrastructureModalOpen(false)}
        halls={halls}
        onCreateHall={handleCreateHall}
        onCreateRoom={handleCreateRoom}
        onCreateGate={handleCreateGate}
      />

      <StudentVerificationModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        student={selectedStudent}
        viewerRole={user.role}
        onMovementCompleted={() => {
          loadData();
          showNotification('Movement verification complete. Dashboard synchronized.');
        }}
      />

      <DeviceManagementModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        devices={devices}
        onRefreshDevices={loadDevices}
        onRevokeDevice={handleRevokeDevice}
      />

      <StudentPendingVerificationModal
        session={pendingVerification}
        onClose={() => setPendingVerification(null)}
        onResolved={(status) => {
          setPendingVerification(null);
          showNotification(`Movement request ${status}. Recorded presence synchronized.`);
          loadData();
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-hall-400" />
            <span>Smart Hall Access & Safety Management System (SHASMS) • University Edition</span>
          </p>
          <p className="text-[11px] text-slate-500">
            Node.js • Express • TypeScript • MongoDB Atlas • Socket.IO • React 19 • Vite • Tailwind • WebCrypto PWA
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
