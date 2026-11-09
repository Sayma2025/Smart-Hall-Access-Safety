import { Response } from 'express';
import { z } from 'zod';
import { LateEntryRequest } from '../models/LateEntryRequest';
import { User } from '../models/User';
import { Hall } from '../models/Hall';
import { AuthenticatedRequest } from '../types';
import { getDatabaseStatus } from '../config/db';
import { config } from '../config/env';
import { emitToStudent, emitToGateStaff, emitToAll } from '../services/socketService';

const submitLateEntrySchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters').trim(),
  expectedArrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Arrival time must be in HH:mm format (e.g. 22:30)'),
  targetDate: z.string().optional(),
});

const reviewLateEntrySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  wardenDecisionNote: z.string().optional(),
});

/**
 * 1. Student submits advance Late Entry request with expected arrival time & reason
 */
export const submitLateEntry = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const parse = submitLateEntrySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid late entry submission.',
        errors: parse.error.errors,
      });
      return;
    }

    const { reason, expectedArrivalTime, targetDate } = parse.data;
    const studentUserId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(201).json({
        success: true,
        message: 'Late entry request submitted (Demo store).',
        lateEntry: {
          _id: 'late_mock_' + Date.now(),
          reason,
          expectedArrivalTime,
          status: 'PENDING',
        },
      });
      return;
    }

    const student = await User.findById(studentUserId);
    if (!student || !student.isActive) {
      res.status(403).json({ success: false, message: 'Active resident account required.' });
      return;
    }

    // Determine target date (default to today)
    const effectiveDate = targetDate ? new Date(targetDate) : new Date();
    effectiveDate.setHours(0, 0, 0, 0);

    const endOfTargetDate = new Date(effectiveDate);
    endOfTargetDate.setHours(23, 59, 59, 999);

    // Concurrency / Duplicate check: prevent multiple pending late requests for the same date
    const existingPending = await LateEntryRequest.findOne({
      resident: student._id,
      targetDate: { $gte: effectiveDate, $lte: endOfTargetDate },
      status: 'PENDING',
    });

    if (existingPending) {
      res.status(409).json({
        success: false,
        message: 'You already have a pending late entry request for this date.',
      });
      return;
    }

    // Get configurable curfew cutoff time & grace period from Hall
    let cutoffTime = config.curfewTime || '20:00';
    let graceMinutes = config.lateGraceMinutes || 15;

    if (student.hallId) {
      const hall = await Hall.findById(student.hallId);
      if (hall) {
        cutoffTime = hall.curfewTime || cutoffTime;
        graceMinutes = hall.lateGraceMinutes ?? graceMinutes;
      }
    }

    const lateEntry = await LateEntryRequest.create({
      resident: student._id,
      reason,
      expectedArrivalTime,
      targetDate: effectiveDate,
      status: 'PENDING',
      hallCutoffTime: cutoffTime,
      lateGraceMinutes: graceMinutes,
      auditLog: [
        {
          action: 'SUBMITTED',
          timestamp: new Date(),
          performedBy: student._id,
          note: `Requested expected arrival at ${expectedArrivalTime}`,
        },
      ],
    });

    const populated = await lateEntry.populate('resident', 'fullName studentId roomNumber department phoneNumber');

    // Real-time broadcast to Wardens and Gate Staff
    emitToGateStaff('late-entry:created', {
      lateEntryId: lateEntry._id,
      studentName: student.fullName,
      studentId: student.studentId,
      expectedArrivalTime,
      reason,
    });
    emitToAll('dashboard:stats_updated', { trigger: 'late_entry_submitted' });

    res.status(201).json({
      success: true,
      message: 'Late entry permission request submitted for Warden review.',
      lateEntry: populated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Student views their own Late Entry requests
 */
export const getMyLateEntries = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const studentUserId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({ success: true, count: 0, lateEntries: [] });
      return;
    }

    const lateEntries = await LateEntryRequest.find({ resident: studentUserId })
      .populate('reviewedBy', 'fullName role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: lateEntries.length,
      lateEntries,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Wardens, Staff, and Admins list Late Entry requests
 */
export const getLateEntries = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, studentId } = req.query;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({ success: true, count: 0, lateEntries: [] });
      return;
    }

    const filter: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status as string)) {
      filter.status = status;
    }

    if (studentId) {
      const student = await User.findOne({ studentId: (studentId as string).toUpperCase() });
      if (student) {
        filter.resident = student._id;
      }
    }

    const lateEntries = await LateEntryRequest.find(filter)
      .populate('resident', 'fullName studentId roomNumber department phoneNumber guardianPhone')
      .populate('reviewedBy', 'fullName role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: lateEntries.length,
      lateEntries,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Warden reviews (approves/rejects) Late Entry request
 * Note: An approved request does NOT itself create an entry record; normal gate verification is still required.
 */
export const reviewLateEntryRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const parse = reviewLateEntrySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid review action.',
        errors: parse.error.errors,
      });
      return;
    }

    const { status, wardenDecisionNote } = parse.data;
    const reviewerId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({ success: true, message: `Late entry marked as ${status} (Demo).` });
      return;
    }

    const lateEntry = await LateEntryRequest.findById(id).populate('resident');
    if (!lateEntry) {
      res.status(404).json({ success: false, message: 'Late entry request not found.' });
      return;
    }

    // Status transition validation
    if (lateEntry.status === 'CANCELLED') {
      res.status(400).json({
        success: false,
        message: 'Cannot review a request that was cancelled by the student.',
      });
      return;
    }

    const now = new Date();
    lateEntry.status = status;
    lateEntry.wardenDecisionNote = wardenDecisionNote;
    lateEntry.reviewedBy = reviewerId as any;
    lateEntry.reviewedAt = now;
    lateEntry.auditLog.push({
      action: status,
      timestamp: now,
      performedBy: reviewerId as any,
      note: wardenDecisionNote || `Decision: ${status}`,
    });

    await lateEntry.save();

    // Real-time notification to the student and gate staff
    const residentDoc: any = lateEntry.resident;
    emitToStudent(residentDoc._id.toString(), 'late-entry:reviewed', {
      lateEntryId: lateEntry._id,
      status,
      decisionNote: wardenDecisionNote,
      expectedArrivalTime: lateEntry.expectedArrivalTime,
    });

    emitToGateStaff('late-entry:reviewed', {
      lateEntryId: lateEntry._id,
      studentId: residentDoc.studentId,
      studentName: residentDoc.fullName,
      status,
      expectedArrivalTime: lateEntry.expectedArrivalTime,
    });

    res.status(200).json({
      success: true,
      message: `Late entry request marked as ${status}. Normal gate verification is still required upon arrival.`,
      lateEntry,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Student cancels their own pending Late Entry request
 */
export const cancelLateEntry = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const studentUserId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({ success: true, message: 'Late entry cancelled (Demo).' });
      return;
    }

    const lateEntry = await LateEntryRequest.findOne({ _id: id, resident: studentUserId });
    if (!lateEntry) {
      res.status(404).json({ success: false, message: 'Late entry request not found or unauthorized.' });
      return;
    }

    if (lateEntry.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel request. Status is already '${lateEntry.status}'.`,
      });
      return;
    }

    const now = new Date();
    lateEntry.status = 'CANCELLED';
    lateEntry.auditLog.push({
      action: 'CANCELLED',
      timestamp: now,
      performedBy: studentUserId as any,
      note: 'Cancelled by resident student.',
    });
    await lateEntry.save();

    res.status(200).json({
      success: true,
      message: 'Late entry request cancelled successfully.',
      lateEntry,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Gate Staff checks active approved late entry permission for a student
 */
export const checkLatePermission = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { studentIdentifier } = req.params;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({ success: true, hasApprovedPermission: false, permission: null });
      return;
    }

    const student = await User.findOne({
      $or: [
        { studentId: studentIdentifier.toUpperCase() },
        { email: studentIdentifier.toLowerCase() },
        ...(studentIdentifier.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: studentIdentifier }] : []),
      ],
      role: 'STUDENT',
    });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found.' });
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const approvedPermission = await LateEntryRequest.findOne({
      resident: student._id,
      targetDate: { $gte: todayStart, $lte: todayEnd },
      status: 'APPROVED',
    }).populate('reviewedBy', 'fullName role');

    res.status(200).json({
      success: true,
      hasApprovedPermission: !!approvedPermission,
      permission: approvedPermission,
      hallCutoffTime: approvedPermission?.hallCutoffTime || config.curfewTime || '20:00',
      lateGraceMinutes: approvedPermission?.lateGraceMinutes || config.lateGraceMinutes || 15,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

