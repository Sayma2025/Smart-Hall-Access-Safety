import { Response } from 'express';
import { z } from 'zod';
import { LeaveRequest } from '../models/LeaveRequest';
import { User } from '../models/User';
import { AuthenticatedRequest, LeaveStatus } from '../types';
import { getDatabaseStatus } from '../config/db';
import { emitToStudent, emitToGateStaff, emitToAll } from '../services/socketService';

const leaveSubmissionSchema = z.object({
  leaveType: z.enum(['WEEKEND_HOME', 'ACADEMIC', 'MEDICAL', 'EMERGENCY']).default('WEEKEND_HOME'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').trim().optional(),
  departureDate: z.string().min(1, 'Departure date is required'),
  expectedReturnDate: z.string().min(1, 'Expected return date is required'),
  destinationAddress: z.string().min(5, 'Full destination address is required'),
  emergencyContactPhone: z.string().min(6, 'Emergency contact phone is required'),
  guardianConsentVerified: z.boolean().default(false),
});

const reviewLeaveSchema = z.object({
  status: z.enum(['APPROVED_BY_WARDEN', 'REJECTED']),
  wardenRemarks: z.string().optional(),
});

/**
 * 1. Student submits multi-day leave request
 */
export const submitLeave = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = leaveSubmissionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: 'Invalid input', errors: parse.error.errors });
      return;
    }

    const {
      leaveType,
      reason,
      departureDate,
      expectedReturnDate,
      destinationAddress,
      emergencyContactPhone,
      guardianConsentVerified,
    } = parse.data;

    const depDate = new Date(departureDate);
    const retDate = new Date(expectedReturnDate);

    if (retDate <= depDate) {
      res.status(400).json({
        success: false,
        message: 'Expected return date must be strictly after the departure date.',
      });
      return;
    }

    const db = getDatabaseStatus();
    const studentUserId = req.user?.id;

    if (db.isConnected) {
      const student = await User.findById(studentUserId);
      if (!student || !student.isActive) {
        res.status(403).json({ success: false, message: 'Active resident account required.' });
        return;
      }

      // Concurrency check: prevent multiple pending leave requests
      const existingPending = await LeaveRequest.findOne({
        resident: student._id,
        status: 'PENDING',
      });

      if (existingPending) {
        res.status(409).json({
          success: false,
          message: 'You already have an active pending leave application awaiting Warden review.',
        });
        return;
      }

      const newLeave = await LeaveRequest.create({
        resident: student._id,
        leaveType,
        reason: reason || 'Not specified',
        departureDate: depDate,
        expectedReturnDate: retDate,
        destinationAddress,
        emergencyContactPhone,
        guardianConsentVerified,
        status: 'PENDING',
        auditLog: [
          {
            action: 'SUBMITTED',
            timestamp: new Date(),
            performedBy: student._id,
            notes: `Leave application submitted for ${leaveType}`,
          },
        ],
      });

      const populated = await newLeave.populate('resident', 'fullName studentId roomNumber phoneNumber department');

      // Real-time broadcast to Wardens and Gate Staff
      emitToGateStaff('leave:created', {
        leaveId: newLeave._id,
        studentName: student.fullName,
        studentId: student.studentId,
        departureDate: depDate,
        expectedReturnDate: retDate,
        destinationAddress,
      });
      emitToAll('dashboard:stats_updated', { trigger: 'leave_submitted' });

      res.status(201).json({
        success: true,
        message: 'Leave application submitted for Warden approval.',
        leave: populated,
      });
    } else {
      res.status(201).json({
        success: true,
        message: 'Leave request submitted (Demo Mode).',
        leave: {
          _id: 'leave_mock_' + Date.now(),
          resident: req.user,
          leaveType,
          reason,
          departureDate,
          expectedReturnDate,
          destinationAddress,
          status: 'PENDING',
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Leaves List (Wardens, Gate Staff, Admins)
 */
export const getLeaves = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabaseStatus();
    const { status, studentId } = req.query;

    if (db.isConnected) {
      const filter: any = {};
      if (status) filter.status = status;

      if (studentId) {
        const student = await User.findOne({ studentId: (studentId as string).toUpperCase() });
        if (student) filter.resident = student._id;
      }

      const leaves = await LeaveRequest.find(filter)
        .populate('resident', 'fullName studentId roomNumber department phoneNumber guardianPhone')
        .populate('reviewedBy', 'fullName role')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, count: leaves.length, leaves });
    } else {
      res.status(200).json({ success: true, count: 0, leaves: [] });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Student views and tracks their own Leave Requests & Status Updates
 */
export const getMyLeaves = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabaseStatus();
    const studentId = req.user?.id;

    if (db.isConnected) {
      const leaves = await LeaveRequest.find({ resident: studentId })
        .populate('reviewedBy', 'fullName role')
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, count: leaves.length, leaves });
    } else {
      res.status(200).json({ success: true, count: 0, leaves: [] });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Warden approves or rejects Leave Request
 * Note: An approved leave request is NOT proof of actual departure.
 */
export const updateLeaveStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parse = reviewLeaveSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be APPROVED_BY_WARDEN or REJECTED.',
        errors: parse.error.errors,
      });
      return;
    }

    const { status, wardenRemarks } = parse.data;
    const db = getDatabaseStatus();
    const reviewerId = req.user?.id;

    if (db.isConnected) {
      const leave = await LeaveRequest.findById(id).populate('resident');
      if (!leave) {
        res.status(404).json({ success: false, message: 'Leave request not found.' });
        return;
      }

      // Status transition validation
      if (leave.status === 'CANCELLED') {
        res.status(400).json({
          success: false,
          message: 'Cannot review a leave application that has been cancelled by the student.',
        });
        return;
      }

      const now = new Date();
      leave.status = status;
      leave.wardenRemarks = wardenRemarks;
      leave.reviewedBy = reviewerId as any;
      leave.reviewedAt = now;
      leave.auditLog.push({
        action: status === 'APPROVED_BY_WARDEN' ? 'APPROVED' : 'REJECTED',
        timestamp: now,
        performedBy: reviewerId as any,
        notes: wardenRemarks || `Decision: ${status}`,
      });

      await leave.save();

      // Real-time broadcast to student and gate staff
      const residentDoc: any = leave.resident;
      emitToStudent(residentDoc._id.toString(), 'leave:reviewed', {
        leaveId: leave._id,
        status,
        wardenRemarks,
        departureDate: leave.departureDate,
        expectedReturnDate: leave.expectedReturnDate,
      });

      emitToGateStaff('leave:reviewed', {
        leaveId: leave._id,
        studentId: residentDoc.studentId,
        studentName: residentDoc.fullName,
        status,
      });
      emitToAll('dashboard:stats_updated', { trigger: 'leave_status_updated' });

      res.status(200).json({
        success: true,
        message: `Leave request marked as ${status}. Actual departure must still be recorded at the gate.`,
        leave,
      });
    } else {
      res.status(200).json({ success: true, message: `Leave updated to ${status} (Demo).` });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Student cancels their pending Leave Application
 */
export const cancelLeave = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentUserId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({ success: true, message: 'Leave cancelled (Demo).' });
      return;
    }

    const leave = await LeaveRequest.findOne({ _id: id, resident: studentUserId });
    if (!leave) {
      res.status(404).json({ success: false, message: 'Leave request not found or unauthorized.' });
      return;
    }

    if (leave.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel leave. Current status is already '${leave.status}'.`,
      });
      return;
    }

    const now = new Date();
    leave.status = 'CANCELLED';
    leave.auditLog.push({
      action: 'CANCELLED',
      timestamp: now,
      performedBy: studentUserId as any,
      notes: 'Application cancelled by student.',
    });
    await leave.save();

    res.status(200).json({
      success: true,
      message: 'Leave application cancelled successfully.',
      leave,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Gate Staff views relevant authorized leave permissions
 */
export const getAuthorizedLeavePermissions = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const db = getDatabaseStatus();
    if (!db.isConnected) {
      res.status(200).json({ success: true, count: 0, authorizedLeaves: [] });
      return;
    }

    const now = new Date();
    // Authorized leaves active today or upcoming
    const authorizedLeaves = await LeaveRequest.find({
      status: { $in: ['APPROVED_BY_WARDEN', 'ACTIVE_OUT'] },
      expectedReturnDate: { $gte: new Date(now.getTime() - 86400000) },
    })
      .populate('resident', 'fullName studentId roomNumber department phoneNumber guardianPhone currentStatus')
      .populate('reviewedBy', 'fullName role')
      .sort({ departureDate: 1 });

    res.status(200).json({
      success: true,
      count: authorizedLeaves.length,
      authorizedLeaves,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
