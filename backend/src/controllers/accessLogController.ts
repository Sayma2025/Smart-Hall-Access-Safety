import { Response } from 'express';
import { z } from 'zod';
import { AccessLog } from '../models/AccessLog';
import { User } from '../models/User';
import { AuthenticatedRequest, AccessType } from '../types';
import { config } from '../config/env';
import { getDatabaseStatus } from '../config/db';

const scanSchema = z.object({
  studentIdentifier: z.string().min(1, 'Student ID or Email is required'),
  type: z.enum(['ENTRY', 'EXIT']),
  lateReason: z.string().optional(),
  remarks: z.string().optional(),
});

// Helper to determine if current time is after curfew
export const isPastCurfew = (date: Date = new Date()): boolean => {
  const [curfewHour, curfewMin] = config.curfewTime.split(':').map(Number);
  const currentHour = date.getHours();
  const currentMin = date.getMinutes();

  if (currentHour > curfewHour) return true;
  if (currentHour === curfewHour && currentMin >= curfewMin) return true;
  return false;
};

// Local mock logs
const mockAccessLogs: any[] = [
  {
    _id: 'log_mock_1',
    resident: {
      _id: '65f1a1111111111111111111',
      studentId: 'ASH2101001M',
      fullName: 'Nusrat Jahan',
      roomNumber: 'Room 304, Block B',
      phoneNumber: '+8801711000001',
    },
    type: 'EXIT',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    isLate: false,
    status: 'NORMAL',
    remarks: 'Library visit',
  },
  {
    _id: 'log_mock_2',
    resident: {
      _id: '65f1a1111111111111111111',
      studentId: 'ASH2101001M',
      fullName: 'Nusrat Jahan',
      roomNumber: 'Room 304, Block B',
      phoneNumber: '+8801711000001',
    },
    type: 'ENTRY',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    isLate: true,
    lateReason: 'Delayed lab work at Computer Science department',
    status: 'FLAGGED_LATE',
    remarks: 'Late Entry after 8:00 PM',
  },
];

export const scanAccess = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = scanSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.errors });
      return;
    }

    const { studentIdentifier, type, lateReason, remarks } = parse.data;
    const db = getDatabaseStatus();
    const now = new Date();
    const isLate = type === 'ENTRY' && isPastCurfew(now);
    const initialStatus = isLate ? 'FLAGGED_LATE' : 'NORMAL';

    if (db.isConnected) {
      const student = await User.findOne({
        $or: [
          { studentId: studentIdentifier.toUpperCase() },
          { email: studentIdentifier.toLowerCase() },
        ],
      });

      if (!student) {
        res.status(404).json({ success: false, message: 'Student resident not found.' });
        return;
      }

      // Update student's recorded INSIDE / OUTSIDE status in real-time
      student.currentStatus = type === 'ENTRY' ? 'INSIDE' : 'OUTSIDE';
      await student.save();

      const log = await AccessLog.create({
        resident: student._id,
        type: type as AccessType,
        timestamp: now,
        scannedBy: req.user ? req.user.id : undefined,
        isLate,
        lateReason: isLate ? lateReason || 'No reason specified' : undefined,
        remarks,
        status: initialStatus,
      });

      const populatedLog = await log.populate(
        'resident',
        'fullName studentId roomNumber phoneNumber department currentStatus'
      );

      res.status(201).json({
        success: true,
        message: `${type} recorded successfully. Student is now marked as ${student.currentStatus}.${
          isLate ? ' Notice: Entry is past curfew (8:00 PM) and flagged for review.' : ''
        }`,
        log: populatedLog,
      });
    } else {
      // Mock store fallback
      const log = {
        _id: 'log_mock_' + Date.now(),
        resident: {
          _id: '65f1a1111111111111111111',
          studentId: studentIdentifier.toUpperCase(),
          fullName: 'Nusrat Jahan',
          roomNumber: 'Room 304, Block B',
          phoneNumber: '+8801711000001',
          currentStatus: type === 'ENTRY' ? 'INSIDE' : 'OUTSIDE',
        },
        type,
        timestamp: now.toISOString(),
        scannedBy: req.user?.id,
        isLate,
        lateReason: isLate ? lateReason || 'Curfew threshold exceeded' : undefined,
        remarks,
        status: initialStatus,
      };
      mockAccessLogs.unshift(log);

      res.status(201).json({
        success: true,
        message: `${type} recorded in demonstration store.${isLate ? ' Flagged for late approval.' : ''}`,
        log,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAccessLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabaseStatus();
    const { lateOnly, type } = req.query;

    if (db.isConnected) {
      const filter: any = {};
      if (lateOnly === 'true') filter.isLate = true;
      if (type) filter.type = type;

      const logs = await AccessLog.find(filter)
        .populate('resident', 'fullName studentId roomNumber phoneNumber guardianPhone')
        .populate('scannedBy', 'fullName role')
        .populate('reviewedBy', 'fullName role')
        .sort({ timestamp: -1 })
        .limit(100);

      res.status(200).json({ success: true, count: logs.length, logs });
    } else {
      let logs = [...mockAccessLogs];
      if (lateOnly === 'true') logs = logs.filter((l) => l.isLate);
      if (type) logs = logs.filter((l) => l.type === type);
      res.status(200).json({ success: true, count: logs.length, logs });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const logs = await AccessLog.find({ resident: studentId })
        .populate('reviewedBy', 'fullName')
        .sort({ timestamp: -1 })
        .limit(50);
      res.status(200).json({ success: true, logs });
    } else {
      res.status(200).json({ success: true, logs: mockAccessLogs });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reviewLateEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // 'APPROVED_LATE' | 'REJECTED_LATE'

    if (!['APPROVED_LATE', 'REJECTED_LATE'].includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be APPROVED_LATE or REJECTED_LATE' });
      return;
    }

    const db = getDatabaseStatus();

    if (db.isConnected) {
      const log = await AccessLog.findByIdAndUpdate(
        id,
        {
          status,
          reviewedBy: req.user?.id,
          reviewedAt: new Date(),
          remarks: remarks || undefined,
        },
        { new: true }
      ).populate('resident', 'fullName studentId');

      if (!log) {
        res.status(404).json({ success: false, message: 'Log record not found' });
        return;
      }

      res.status(200).json({ success: true, message: `Late entry marked as ${status}`, log });
    } else {
      const item = mockAccessLogs.find((l) => l._id === id);
      if (item) {
        item.status = status;
        item.remarks = remarks;
      }
      res.status(200).json({ success: true, message: `Late entry marked as ${status} (Demo)`, log: item });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
