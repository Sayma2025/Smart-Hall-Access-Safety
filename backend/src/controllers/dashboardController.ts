import { Response } from 'express';
import { User } from '../models/User';
import { AccessLog } from '../models/AccessLog';
import { LeaveRequest } from '../models/LeaveRequest';
import { EmergencyAlert } from '../models/EmergencyAlert';
import { Hall } from '../models/Hall';
import { Room } from '../models/Room';
import { Gate } from '../models/Gate';
import { AuthenticatedRequest } from '../types';
import { getDatabaseStatus } from '../config/db';

export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        totalStudents,
        studentsInside,
        studentsOutside,
        todayMovements,
        totalMovements,
        flaggedLateCurfews,
        pendingLeaves,
        activeAlerts,
        totalHalls,
        totalRooms,
        totalGates,
        activeGates,
      ] = await Promise.all([
        User.countDocuments({ role: 'STUDENT' }),
        User.countDocuments({ role: 'STUDENT', currentStatus: 'INSIDE' }),
        User.countDocuments({ role: 'STUDENT', currentStatus: 'OUTSIDE' }),
        AccessLog.countDocuments({ timestamp: { $gte: startOfDay } }),
        AccessLog.countDocuments(),
        AccessLog.countDocuments({ status: 'FLAGGED_LATE' }),
        LeaveRequest.countDocuments({ status: 'PENDING' }),
        EmergencyAlert.countDocuments({ status: 'ACTIVE' }),
        Hall.countDocuments(),
        Room.countDocuments(),
        Gate.countDocuments(),
        Gate.countDocuments({ status: 'ACTIVE' }),
      ]);

      res.status(200).json({
        success: true,
        stats: {
          totalStudents,
          studentsInside,
          studentsOutside,
          todayMovements,
          totalMovements,
          flaggedLateCurfews,
          pendingLeaves,
          activeAlerts,
          infrastructure: {
            totalHalls,
            totalRooms,
            totalGates,
            activeGates,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      res.status(200).json({
        success: true,
        stats: {
          totalStudents: 2,
          studentsInside: 1,
          studentsOutside: 1,
          todayMovements: 3,
          totalMovements: 3,
          flaggedLateCurfews: 1,
          pendingLeaves: 1,
          activeAlerts: 1,
          infrastructure: {
            totalHalls: 1,
            totalRooms: 4,
            totalGates: 2,
            activeGates: 2,
          },
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
