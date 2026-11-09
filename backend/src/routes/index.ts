import { Router } from 'express';
import { getHealth } from '../controllers/healthController';
import {
  login,
  logout,
  register,
  getProfile,
  getDemoAccounts,
  adminCreateUser,
  adminGetUsers,
  adminToggleUserStatus,
} from '../controllers/authController';
import {
  scanAccess,
  getAccessLogs,
  getMyLogs,
  reviewLateEntry,
} from '../controllers/accessLogController';
import {
  submitLeave,
  getLeaves,
  getMyLeaves,
  updateLeaveStatus,
  cancelLeave,
  getAuthorizedLeavePermissions,
} from '../controllers/leaveController';
import {
  triggerSOS,
  getActiveAlerts,
  updateAlertStatus,
  acknowledgeAlert,
  getMyAlerts,
} from '../controllers/sosController';
import {
  submitLateEntry,
  getMyLateEntries,
  getLateEntries,
  reviewLateEntryRequest,
  cancelLateEntry,
  checkLatePermission,
} from '../controllers/lateEntryController';
import {
  getStudents,
  getStudentById,
  getMyStudentProfile,
} from '../controllers/studentController';
import {
  getHalls,
  createHall,
  getRooms,
  createRoom,
  getGates,
  createGate,
  updateGateStatus,
} from '../controllers/hallController';
import { getDashboardStats } from '../controllers/dashboardController';
import {
  enrollDevice,
  getMyDevices,
  revokeDevice,
} from '../controllers/deviceController';
import {
  initiateVerificationSession,
  approveVerificationSession,
  denyVerificationSession,
  getSessionStatus,
  getPendingSessionForResident,
} from '../controllers/verificationController';
import { authenticateToken, requireRoles } from '../middleware/auth';

export const apiRouter = Router();

// ==========================================
// 1. Health & System Diagnostics
// ==========================================
apiRouter.get('/health', getHealth);
apiRouter.get('/dashboard/stats', authenticateToken, getDashboardStats);

// ==========================================
// 2. Authentication & Session
// ==========================================
apiRouter.post('/auth/register', register);
apiRouter.post('/auth/login', login);
apiRouter.post('/auth/logout', logout);
apiRouter.get('/auth/demo-accounts', getDemoAccounts);
apiRouter.get('/auth/profile', authenticateToken, getProfile);
apiRouter.get('/auth/me', authenticateToken, getProfile);

// ==========================================
// 3. Administrator-Managed Users (ADMIN ONLY)
// ==========================================
apiRouter.post('/admin/users', authenticateToken, requireRoles('ADMIN'), adminCreateUser);
apiRouter.get('/admin/users', authenticateToken, requireRoles('ADMIN'), adminGetUsers);
apiRouter.patch('/admin/users/:id/status', authenticateToken, requireRoles('ADMIN'), adminToggleUserStatus);

// ==========================================
// 4. Student Management & Verification
// ==========================================
apiRouter.get('/students/my/profile', authenticateToken, requireRoles('STUDENT', 'ADMIN'), getMyStudentProfile);
apiRouter.get(
  '/students',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'),
  getStudents
);
apiRouter.get(
  '/students/:id',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'),
  getStudentById
);

// ==========================================
// 4.1 Cryptographic Device Enrollment
// ==========================================
apiRouter.post('/devices/enroll', authenticateToken, requireRoles('STUDENT', 'ADMIN'), enrollDevice);
apiRouter.get('/devices/my', authenticateToken, requireRoles('STUDENT', 'ADMIN'), getMyDevices);
apiRouter.patch('/devices/:id/revoke', authenticateToken, requireRoles('STUDENT', 'ADMIN'), revokeDevice);

// ==========================================
// 4.2 Secure Gate Entry/Exit Verification Sessions
// ==========================================
apiRouter.post(
  '/verification/sessions/initiate',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'ADMIN'),
  initiateVerificationSession
);
apiRouter.post(
  '/verification/sessions/:id/approve',
  authenticateToken,
  requireRoles('STUDENT', 'ADMIN'),
  approveVerificationSession
);
apiRouter.post(
  '/verification/sessions/:id/deny',
  authenticateToken,
  requireRoles('STUDENT', 'ADMIN'),
  denyVerificationSession
);
apiRouter.get(
  '/verification/sessions/:id/status',
  authenticateToken,
  getSessionStatus
);
apiRouter.get(
  '/verification/sessions/pending-for-me',
  authenticateToken,
  requireRoles('STUDENT', 'ADMIN'),
  getPendingSessionForResident
);

// ==========================================
// 5. Hall, Room, and Gate Configuration
// ==========================================
// Halls
apiRouter.get('/halls', authenticateToken, getHalls);
apiRouter.post('/halls', authenticateToken, requireRoles('ADMIN'), createHall);

// Rooms
apiRouter.get('/rooms', authenticateToken, getRooms);
apiRouter.post('/rooms', authenticateToken, requireRoles('ADMIN'), createRoom);

// Gates
apiRouter.get('/gates', authenticateToken, getGates);
apiRouter.post('/gates', authenticateToken, requireRoles('ADMIN'), createGate);
apiRouter.patch('/gates/:id/status', authenticateToken, requireRoles('ADMIN'), updateGateStatus);

// ==========================================
// 6. Hall Access & Curfew Logs
// ==========================================
apiRouter.post(
  '/access-logs/scan',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'ADMIN'),
  scanAccess
);

apiRouter.get(
  '/access-logs/my-logs',
  authenticateToken,
  requireRoles('STUDENT', 'ADMIN'),
  getMyLogs
);

apiRouter.get(
  '/access-logs',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'),
  getAccessLogs
);

apiRouter.patch(
  '/access-logs/:id/review',
  authenticateToken,
  requireRoles('WARDEN', 'ADMIN'),
  reviewLateEntry
);

// ==========================================
// 6.1 Late Entry Advance Permission Requests
// ==========================================
apiRouter.post('/late-entries', authenticateToken, requireRoles('STUDENT', 'ADMIN'), submitLateEntry);
apiRouter.get('/late-entries/my', authenticateToken, requireRoles('STUDENT', 'ADMIN'), getMyLateEntries);
apiRouter.get(
  '/late-entries',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'),
  getLateEntries
);
apiRouter.get(
  '/late-entries/check-permission/:studentIdentifier',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'),
  checkLatePermission
);
apiRouter.patch(
  '/late-entries/:id/review',
  authenticateToken,
  requireRoles('WARDEN', 'ADMIN'),
  reviewLateEntryRequest
);
apiRouter.patch(
  '/late-entries/:id/cancel',
  authenticateToken,
  requireRoles('STUDENT', 'ADMIN'),
  cancelLateEntry
);

// ==========================================
// 7. Leave Management
// ==========================================
apiRouter.post('/leaves', authenticateToken, requireRoles('STUDENT', 'ADMIN'), submitLeave);
apiRouter.get('/leaves/my-leaves', authenticateToken, requireRoles('STUDENT', 'ADMIN'), getMyLeaves);
apiRouter.get('/leaves', authenticateToken, requireRoles('WARDEN', 'ADMIN'), getLeaves);
apiRouter.get(
  '/leaves/authorized-permissions',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'),
  getAuthorizedLeavePermissions
);
apiRouter.patch(
  '/leaves/:id/status',
  authenticateToken,
  requireRoles('WARDEN', 'ADMIN'),
  updateLeaveStatus
);
apiRouter.patch(
  '/leaves/:id/cancel',
  authenticateToken,
  requireRoles('STUDENT', 'ADMIN'),
  cancelLeave
);

// ==========================================
// 8. Emergency SOS Assistance
// ==========================================
apiRouter.post('/sos/trigger', authenticateToken, triggerSOS);
apiRouter.get(
  '/sos/active',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'),
  getActiveAlerts
);
apiRouter.get('/sos/my-alerts', authenticateToken, requireRoles('STUDENT', 'ADMIN'), getMyAlerts);
apiRouter.patch(
  '/sos/:id/acknowledge',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'),
  acknowledgeAlert
);
apiRouter.patch(
  '/sos/:id/resolve',
  authenticateToken,
  requireRoles('GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'),
  updateAlertStatus
);
