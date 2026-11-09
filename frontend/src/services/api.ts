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
  VerificationSessionItem,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const TOKEN_KEY = 'shasms_jwt_token';
const USER_KEY = 'shasms_active_user';

let currentToken: string | null = localStorage.getItem(TOKEN_KEY);
let currentUser: User | null = (() => {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
})();

export const getCurrentUser = (): User | null => currentUser;
export const getAuthToken = (): string | null => currentToken;

export const setSession = (token: string, user: User) => {
  currentToken = token;
  currentUser = user;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Generic fetch wrapper with Bearer token injection
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/auth/login') {
      clearSession();
      window.dispatchEvent(new Event('shasms:session_expired'));
    }

    const message =
      data.message || (data.errors && data.errors[0]?.message) || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // ==========================================
  // Health & Dynamic Dashboard Live Statistics
  // ==========================================
  getHealth: async (): Promise<HealthStatus> => {
    try {
      const data: any = await request('/health');
      return data;
    } catch {
      return {
        status: 'DEGRADED',
        database: {
          isConnected: false,
          state: 'Connecting / Standalone',
        },
        hallPolicy: {
          curfewTime: '20:00',
          lateGraceMinutes: 15,
          description: 'Residents entering after 8:00 PM are flagged for approval',
        },
        uptime: 'Demo Mode Active',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      };
    }
  },

  getDashboardStats: async (): Promise<DashboardLiveStats> => {
    try {
      const data: any = await request('/dashboard/stats');
      return data.stats;
    } catch {
      return {
        totalStudents: 3,
        studentsInside: 2,
        studentsOutside: 1,
        todayMovements: 3,
        totalMovements: 3,
        flaggedLateCurfews: 1,
        pendingLeaves: 1,
        activeAlerts: 1,
        infrastructure: {
          totalHalls: 1,
          totalRooms: 3,
          totalGates: 2,
          activeGates: 2,
        },
        timestamp: new Date().toISOString(),
      };
    }
  },

  // ==========================================
  // Authentication & Session
  // ==========================================
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const data: any = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token && data.user) {
      setSession(data.token, data.user);
    }
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
    }
  },

  registerStudent: async (studentData: any): Promise<any> => {
    return await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  },

  getProfile: async (): Promise<User> => {
    const data: any = await request('/auth/profile');
    if (data.user) {
      currentUser = data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return data.user;
  },

  // ==========================================
  // Student Search, Profiles & Verification
  // ==========================================
  getStudents: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    department?: string;
  } = {}): Promise<{ students: StudentListItem[]; total: number; totalPages: number }> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.department) query.set('department', params.department);

    const data: any = await request(`/students?${query.toString()}`);
    return data;
  },

  getStudentById: async (id: string): Promise<{ student: StudentListItem; recentLogs: AccessLog[]; leaves?: LeaveRequest[] }> => {
    return await request(`/students/${id}`);
  },

  getMyStudentProfile: async (): Promise<{ student: User; recentLogs: AccessLog[]; recentLeaves: LeaveRequest[] }> => {
    return await request('/students/my/profile');
  },

  // ==========================================
  // Hall, Room & Gate Infrastructure Management
  // ==========================================
  getHalls: async (): Promise<Hall[]> => {
    const data: any = await request('/halls');
    return data.halls || [];
  },

  createHall: async (hallData: any): Promise<Hall> => {
    const data: any = await request('/halls', {
      method: 'POST',
      body: JSON.stringify(hallData),
    });
    return data.hall;
  },

  getRooms: async (params: { hallId?: string; block?: string; status?: string } = {}): Promise<Room[]> => {
    const query = new URLSearchParams();
    if (params.hallId) query.set('hallId', params.hallId);
    if (params.block) query.set('block', params.block);
    if (params.status) query.set('status', params.status);

    const data: any = await request(`/rooms?${query.toString()}`);
    return data.rooms || [];
  },

  createRoom: async (roomData: any): Promise<Room> => {
    const data: any = await request('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
    return data.room;
  },

  getGates: async (): Promise<Gate[]> => {
    const data: any = await request('/gates');
    return data.gates || [];
  },

  createGate: async (gateData: any): Promise<Gate> => {
    const data: any = await request('/gates', {
      method: 'POST',
      body: JSON.stringify(gateData),
    });
    return data.gate;
  },

  updateGateStatus: async (id: string, status: string): Promise<Gate> => {
    const data: any = await request(`/gates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return data.gate;
  },

  // ==========================================
  // Administrator User Management (ADMIN ONLY)
  // ==========================================
  adminCreateUser: async (userData: any): Promise<any> => {
    return await request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  adminGetUsers: async (): Promise<ManagedUser[]> => {
    const data: any = await request('/admin/users');
    return data.users || [];
  },

  adminToggleUserStatus: async (id: string, isActive: boolean): Promise<any> => {
    return await request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  // ==========================================
  // Gate Movements & Access Logs
  // ==========================================
  getAccessLogs: async (lateOnly = false): Promise<AccessLog[]> => {
    const endpoint = currentUser?.role === 'STUDENT'
      ? '/access-logs/my-logs'
      : `/access-logs${lateOnly ? '?lateOnly=true' : ''}`;
    const data: any = await request(endpoint);
    return data.logs || [];
  },

  scanAccess: async (payload: {
    studentIdentifier: string;
    type: 'ENTRY' | 'EXIT';
    lateReason?: string;
    remarks?: string;
  }): Promise<AccessLog> => {
    const data: any = await request('/access-logs/scan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.log;
  },

  reviewLateEntry: async (id: string, status: 'APPROVED_LATE' | 'REJECTED_LATE', remarks?: string) => {
    return await request(`/access-logs/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
  },

  // ==========================================
  // Late Entry Advance Permission Requests
  // ==========================================
    submitLateEntry: async (payload: {
    targetDate: string;
    expectedArrivalTime: string;
    reason: string;
  }): Promise<{ message: string; request: LateEntryRequest }> => {
    const data: any = await request('/late-entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // Backend `lateEntry` naame pathay
    return { message: data.message, request: data.lateEntry || data.request };
  },

  getMyLateEntries: async (): Promise<LateEntryRequest[]> => {
    const data: any = await request('/late-entries/my');
    return data.lateEntries || [];
  },

  getLateEntries: async (params: { status?: string } = {}): Promise<LateEntryRequest[]> => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    const data: any = await request(`/late-entries?${query.toString()}`);
    return data.lateEntries || [];
  },

  checkLatePermission: async (studentIdentifier: string): Promise<{ hasPermission: boolean; permission: LateEntryRequest | null; message: string }> => {
    return await request(`/late-entries/check-permission/${encodeURIComponent(studentIdentifier)}`);
  },

  reviewLateEntryRequest: async (
    id: string,
    action: 'APPROVE' | 'REJECT',
    wardenDecisionNote?: string
  ): Promise<{ message: string; lateEntry: LateEntryRequest }> => {
    return await request(`/late-entries/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action, wardenDecisionNote }),
    });
  },

  cancelLateEntry: async (id: string): Promise<{ message: string; lateEntry: LateEntryRequest }> => {
    return await request(`/late-entries/${id}/cancel`, {
      method: 'PATCH',
    });
  },

  // ==========================================
  // Leaves
  // ==========================================
  getLeaves: async (): Promise<LeaveRequest[]> => {
    const endpoint = currentUser?.role === 'STUDENT' ? '/leaves/my-leaves' : '/leaves';
    const data: any = await request(endpoint);
    return data.leaves || [];
  },

  getAuthorizedLeavePermissions: async (): Promise<LeaveRequest[]> => {
    const data: any = await request('/leaves/authorized-permissions');
    return data.leaves || [];
  },

  submitLeave: async (leaveData: any): Promise<LeaveRequest> => {
    const data: any = await request('/leaves', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
    return data.leave;
  },

  cancelLeave: async (id: string): Promise<{ message: string; leave: LeaveRequest }> => {
    return await request(`/leaves/${id}/cancel`, {
      method: 'PATCH',
    });
  },

  updateLeaveStatus: async (id: string, status: string, remarks?: string) => {
    return await request(`/leaves/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, wardenRemarks: remarks }),
    });
  },

  // ==========================================
  // Emergency SOS
  // ==========================================
  triggerSOS: async (alertData: any): Promise<EmergencyAlert> => {
    const data: any = await request('/sos/trigger', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
    return data.alert;
  },

  getActiveAlerts: async (): Promise<EmergencyAlert[]> => {
    try {
      const data: any = await request('/sos/active');
      return data.alerts || [];
    } catch {
      return [];
    }
  },

  getMySOSAlerts: async (): Promise<EmergencyAlert[]> => {
    try {
      const data: any = await request('/sos/my-alerts');
      return data.alerts || [];
    } catch {
      return [];
    }
  },

  acknowledgeSOS: async (id: string, notes?: string): Promise<{ message: string; alert: EmergencyAlert }> => {
    return await request(`/sos/${id}/acknowledge`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  },

  resolveSOS: async (id: string, status: string, notes?: string) => {
    return await request(`/sos/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNotes: notes }),
    });
  },

  // ==========================================
  // Cryptographic Trusted Devices
  // ==========================================
  enrollDevice: async (payload: {
    deviceName: string;
    publicKey: string;
    password: string;
    platformInfo?: string;
  }): Promise<any> => {
    return await request('/devices/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMyDevices: async (): Promise<EnrolledDeviceItem[]> => {
    const data: any = await request('/devices/my');
    return data.devices || [];
  },

  revokeDevice: async (id: string): Promise<any> => {
    return await request(`/devices/${id}/revoke`, {
      method: 'PATCH',
    });
  },

  // ==========================================
  // Secure Verification Sessions
  // ==========================================
  initiateVerification: async (payload: {
    studentIdentifier: string;
    requestedMovement: 'ENTRY' | 'EXIT';
    gateId?: string;
    remarks?: string;
  }): Promise<{ session: VerificationSessionItem }> => {
    return await request('/verification/sessions/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  approveVerification: async (
    sessionId: string,
    payload: { deviceId: string; signature: string; lateReason?: string }
  ): Promise<any> => {
    return await request(`/verification/sessions/${sessionId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  denyVerification: async (sessionId: string, reason?: string): Promise<any> => {
    return await request(`/verification/sessions/${sessionId}/deny`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  getVerificationStatus: async (sessionId: string): Promise<{ session: VerificationSessionItem }> => {
    return await request(`/verification/sessions/${sessionId}/status`);
  },

  getPendingVerificationForMe: async (): Promise<{ pendingSession: VerificationSessionItem | null }> => {
    return await request('/verification/sessions/pending-for-me');
  },
};
