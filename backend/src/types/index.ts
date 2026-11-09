import { Request } from 'express';

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

export interface AuthUserPayload {
  id: string;
  studentId?: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  roomNumber?: string;
  hallName?: string;
  currentStatus?: StudentCurrentStatus;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
  hall?: string;
}
