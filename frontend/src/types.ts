export type UserRole = 'STUDENT' | 'GATE_STAFF' | 'GUARD' | 'WARDEN' | 'ADMIN';

export type StudentCurrentStatus = 'INSIDE' | 'OUTSIDE';

export type AccessType = 'ENTRY' | 'EXIT';

export type AccessStatus = 'NORMAL' | 'FLAGGED_LATE' | 'APPROVED_LATE' | 'REJECTED_LATE';

export type LeaveType = 'WEEKEND_HOME' | 'ACADEMIC' | 'MEDICAL' | 'EMERGENCY';

export type LeaveStatus =
  | 'PENDING'
  | 'APPROVED_BY_WARDEN'
  | 'REJECTED'
  | 'ACTIVE_OUT'
  | 'COMPLETED'
  | 'CANCELLED';

export type SOSAlertType = 'MEDICAL' | 'SECURITY' | 'HARASSMENT' | 'FIRE' | 'OTHER';

export type SOSStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM';

export type GateStatus = 'ACTIVE' | 'LOCKED' | 'MAINTENANCE';

export type RoomStatus = 'AVAILABLE' | 'FULL' | 'MAINTENANCE';

export type DeviceStatus = 'ACTIVE' | 'REVOKED';

export interface EnrolledDeviceItem {
  _id: string;
  deviceId: string;
  deviceName: string;
  fingerprint: string;
  status: DeviceStatus;
  enrolledAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  platformInfo?: string;
}

export type VerificationSessionStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export interface VerificationSessionItem {
  _id: string;
  sessionToken: string;
  student: any;
  initiatedBy?: any;
  gate?: any;
  requestedMovement: AccessType;
  challenge: string;
  status: VerificationSessionStatus;
  expiresAt: string;
  approvedAt?: string;
  approvedDevice?: any;
  deniedAt?: string;
  deniedReason?: string;
  isLate: boolean;
  lateReason?: string;
  accessLog?: any;
}

export interface User {
  id: string;
  studentId?: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  roomNumber?: string;
  hallName?: string;
  phoneNumber?: string;
  guardianName?: string;
  guardianPhone?: string;
  currentStatus?: StudentCurrentStatus;
  isActive?: boolean;
}

export interface StudentListItem {
  _id: string;
  studentId: string;
  fullName: string;
  department: string;
  roomNumber: string;
  hallName: string;
  currentStatus: StudentCurrentStatus;
  isActive: boolean;
  email?: string;
  phoneNumber?: string;
  guardianName?: string;
  guardianPhone?: string;
  createdAt?: string;
}

export interface Hall {
  _id: string;
  name: string;
  code: string;
  gender: 'FEMALE' | 'MALE';
  capacity: number;
  provostName?: string;
  curfewTime: string;
  lateGraceMinutes: number;
  isActive: boolean;
}

export interface Room {
  _id: string;
  hall: {
    _id: string;
    name: string;
    code: string;
  };
  roomNumber: string;
  block: string;
  floor: number;
  capacity: number;
  occupiedCount: number;
  status: RoomStatus;
}

export interface Gate {
  _id: string;
  name: string;
  code: string;
  hall?: {
    _id: string;
    name: string;
  };
  location: string;
  gateType: 'PEDESTRIAN' | 'VEHICULAR' | 'EMERGENCY';
  status: GateStatus;
  notes?: string;
}

export interface ManagedUser {
  _id: string;
  studentId?: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  roomNumber?: string;
  hallName: string;
  phoneNumber?: string;
  guardianName?: string;
  guardianPhone?: string;
  currentStatus?: StudentCurrentStatus;
  isActive: boolean;
  createdAt: string;
}

export interface AccessLog {
  _id: string;
  resident: {
    _id?: string;
    studentId?: string;
    fullName: string;
    department?: string;
    roomNumber?: string;
    phoneNumber?: string;
    guardianPhone?: string;
    currentStatus?: StudentCurrentStatus;
  };
  type: AccessType;
  timestamp: string;
  isLate: boolean;
  lateReason?: string;
  remarks?: string;
  status: AccessStatus;
  reviewedBy?: {
    fullName: string;
  };
}

export type LateEntryStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LateEntryRequest {
  _id: string;
  resident: {
    _id?: string;
    studentId?: string;
    fullName: string;
    department?: string;
    roomNumber?: string;
    phoneNumber?: string;
    hallName?: string;
  };
  targetDate: string;
  expectedArrivalTime: string;
  reason: string;
  status: LateEntryStatus;
  wardenDecisionNote?: string;
  reviewedBy?: {
    fullName: string;
  };
  reviewedAt?: string;
  hallCutoffTime?: string;
  lateGraceMinutes?: number;
  createdAt: string;
}

export interface LeaveRequest {
  _id: string;
  resident: {
    _id?: string;
    studentId?: string;
    fullName: string;
    roomNumber?: string;
    phoneNumber?: string;
    guardianPhone?: string;
  };
  leaveType: LeaveType;
  departureDate: string;
  expectedReturnDate: string;
  destinationAddress: string;
  emergencyContactPhone: string;
  guardianConsentVerified: boolean;
  status: LeaveStatus;
  wardenRemarks?: string;
  createdAt: string;
}

export interface EmergencyAlert {
  _id: string;
  resident: {
    _id?: string;
    studentId?: string;
    fullName: string;
    roomNumber?: string;
    phoneNumber?: string;
    guardianPhone?: string;
    hallName?: string;
  };
  alertType: SOSAlertType;
  location: string;
  notes?: string;
  status: SOSStatus;
  createdAt: string;
  acknowledgedBy?: {
    fullName: string;
    role: string;
  };
  acknowledgedAt?: string;
  resolvedBy?: {
    fullName: string;
    role: string;
  };
  resolvedAt?: string;
  resolutionNotes?: string;
  actionLog?: Array<{
    action: string;
    performedBy?: string;
    performedByName?: string;
    timestamp: string;
    notes?: string;
  }>;
}

export interface DashboardLiveStats {
  totalStudents: number;
  studentsInside: number;
  studentsOutside: number;
  todayMovements: number;
  totalMovements: number;
  flaggedLateCurfews: number;
  pendingLeaves: number;
  activeAlerts: number;
  infrastructure: {
    totalHalls: number;
    totalRooms: number;
    totalGates: number;
    activeGates: number;
  };
  timestamp: string;
}

export interface HealthStatus {
  status: 'HEALTHY' | 'DEGRADED';
  database: {
    isConnected: boolean;
    state: string;
    host?: string;
    name?: string;
  };
  hallPolicy: {
    curfewTime: string;
    lateGraceMinutes: number;
    description: string;
  };
  uptime: string;
  version: string;
  timestamp: string;
}
