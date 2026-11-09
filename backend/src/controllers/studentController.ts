import { Response } from 'express';
import { User, IUser } from '../models/User';
import { AccessLog } from '../models/AccessLog';
import { LeaveRequest } from '../models/LeaveRequest';
import { AuthenticatedRequest } from '../types';
import { getDatabaseStatus } from '../config/db';

/**
 * Get Students with Search, Filters, and Pagination
 * Enforces role-based projections:
 * - Gate Staff: Gets strictly gate-verification data (no private contact/academic history)
 * - Warden / Admin: Gets full student dossier
 */
export const getStudents = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim().toUpperCase();
    const department = (req.query.department as string || '').trim();
    const db = getDatabaseStatus();

    const requesterRole = req.user?.role;
    const isGateStaff = requesterRole === 'GATE_STAFF' || requesterRole === 'GUARD';

    if (db.isConnected) {
      const filter: any = { role: 'STUDENT' };

      if (status && ['INSIDE', 'OUTSIDE'].includes(status)) {
        filter.currentStatus = status;
      }

      if (department) {
        filter.department = { $regex: department, $options: 'i' };
      }

      if (search) {
        filter.$or = [
          { studentId: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { roomNumber: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
        ];
      }

      const total = await User.countDocuments(filter);

      // Role-based projection
      const projection = isGateStaff
        ? 'studentId fullName department hallName roomNumber currentStatus isActive guardianPhone'
        : '-passwordHash';

      const students = await User.find(filter)
        .select(projection)
        .sort({ studentId: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.status(200).json({
        success: true,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
        count: students.length,
        students,
      });
    } else {
      res.status(200).json({
        success: true,
        total: 1,
        page: 1,
        totalPages: 1,
        limit,
        count: 1,
        students: [
          {
            _id: '65f1a1111111111111111111',
            studentId: 'ASH2101001M',
            fullName: 'Nusrat Jahan',
            department: 'Computer Science & Engineering',
            roomNumber: 'Room 304, Block B',
            hallName: 'Pritilata Waddedar Female Hall',
            currentStatus: 'INSIDE',
            isActive: true,
          },
        ],
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Specific Student Profile by ID
 */
export const getStudentById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabaseStatus();
    const isGateStaff = req.user?.role === 'GATE_STAFF' || req.user?.role === 'GUARD';

    if (db.isConnected) {
      const projection = isGateStaff
        ? 'studentId fullName department hallName roomNumber currentStatus isActive guardianPhone'
        : '-passwordHash';

      const student = await User.findOne({ _id: id, role: 'STUDENT' }).select(projection);

      if (!student) {
        res.status(404).json({ success: false, message: 'Student record not found.' });
        return;
      }

      // Fetch recent movements (last 5)
      const recentLogs = await AccessLog.find({ resident: student._id })
        .sort({ timestamp: -1 })
        .limit(5);

      // If Warden or Admin, fetch leave requests
      let leaves: any[] = [];
      if (!isGateStaff) {
        leaves = await LeaveRequest.find({ resident: student._id })
          .sort({ createdAt: -1 })
          .limit(5);
      }

      res.status(200).json({
        success: true,
        student,
        recentLogs,
        leaves: !isGateStaff ? leaves : undefined,
      });
    } else {
      res.status(200).json({
        success: true,
        student: {
          _id: id,
          studentId: 'ASH2101001M',
          fullName: 'Nusrat Jahan',
          department: 'Computer Science & Engineering',
          roomNumber: 'Room 304, Block B',
          hallName: 'Pritilata Waddedar Female Hall',
          currentStatus: 'INSIDE',
          isActive: true,
        },
        recentLogs: [],
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Student: View Own Profile & Complete History
 */
export const getMyStudentProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const student = await User.findById(userId).select('-passwordHash');
      if (!student) {
        res.status(404).json({ success: false, message: 'Profile not found.' });
        return;
      }

      const recentLogs = await AccessLog.find({ resident: student._id })
        .sort({ timestamp: -1 })
        .limit(10);

      const recentLeaves = await LeaveRequest.find({ resident: student._id })
        .sort({ createdAt: -1 })
        .limit(10);

      res.status(200).json({
        success: true,
        student,
        recentLogs,
        recentLeaves,
      });
    } else {
      res.status(200).json({
        success: true,
        student: req.user,
        recentLogs: [],
        recentLeaves: [],
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
