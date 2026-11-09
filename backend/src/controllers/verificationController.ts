import { Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { VerificationSession } from '../models/VerificationSession';
import { EnrolledDevice } from '../models/EnrolledDevice';
import { User } from '../models/User';
import { AccessLog } from '../models/AccessLog';
import { Gate } from '../models/Gate';
import { AuthenticatedRequest } from '../types';
import { getDatabaseStatus } from '../config/db';
import { config } from '../config/env';
import {
  emitToStudent,
  emitToGateStaff,
  emitToAll,
} from '../services/socketService';

// Validation Schemas
const initiateSessionSchema = z.object({
  studentIdentifier: z.string().min(1, 'Student identifier is required').trim(),
  requestedMovement: z.enum(['ENTRY', 'EXIT']),
  gateId: z.string().optional(),
  remarks: z.string().optional(),
});

const approveSessionSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required').trim(),
  signature: z.string().min(1, 'Cryptographic challenge signature is required').trim(),
  lateReason: z.string().optional(),
});

const denySessionSchema = z.object({
  reason: z.string().optional(),
});

/**
 * Verify ECDSA signature against challenge using device public key.
 * Supports both IEEE P1363 (WebCrypto default) and DER ASN.1 (OpenSSL/Node default).
 */
export function verifyEcdsaSignature(
  publicKeyPem: string,
  challenge: string,
  signatureStr: string
): boolean {
  try {
    // Handle hex, base64, or raw buffer
    let sigBuf: Buffer;
    if (/^[0-9a-fA-F]+$/.test(signatureStr) && signatureStr.length % 2 === 0) {
      sigBuf = Buffer.from(signatureStr, 'hex');
    } else {
      sigBuf = Buffer.from(signatureStr, 'base64');
    }

    const challengeBuf = Buffer.from(challenge, 'utf8');

    // 1. Try IEEE P1363 format (native WebCrypto standard for P-256: 64 bytes)
    try {
      if (
        crypto.verify(
          'SHA256',
          challengeBuf,
          { key: publicKeyPem, dsaEncoding: 'ieee-p1363' },
          sigBuf
        )
      ) {
        return true;
      }
    } catch {
      // Fall through to standard DER check
    }

    // 2. Try standard DER format
    try {
      if (crypto.verify('SHA256', challengeBuf, publicKeyPem, sigBuf)) {
        return true;
      }
    } catch {
      // Fall through
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 1. Gate Staff initiates short-lived verification session
 */
export const initiateVerificationSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const parse = initiateSessionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data.',
        errors: parse.error.errors,
      });
      return;
    }

    const { studentIdentifier, requestedMovement, gateId, remarks } = parse.data;
    const staffId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(201).json({
        success: true,
        message: 'Verification session initiated (Demo store).',
        session: {
          sessionToken: 'VS-DEMO-' + Date.now(),
          requestedMovement,
          status: 'PENDING',
          challenge: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 90000),
        },
      });
      return;
    }

    // 1. Find the target Student
    const student = await User.findOne({
      $or: [
        { studentId: studentIdentifier.toUpperCase() },
        { email: studentIdentifier.toLowerCase() },
        ...(studentIdentifier.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: studentIdentifier }] : []),
      ],
      role: 'STUDENT',
    });

    if (!student) {
      res.status(404).json({
        success: false,
        message: `Student '${studentIdentifier}' not found.`,
      });
      return;
    }

    if (!student.isActive) {
      res.status(403).json({
        success: false,
        message: 'Student account is suspended or deactivated. Gate passage denied.',
      });
      return;
    }

    // 2. State Transition Check: prevent invalid movement sequences
    if (requestedMovement === 'ENTRY' && student.currentStatus === 'INSIDE') {
      res.status(400).json({
        success: false,
        message: `Invalid movement: Student '${student.fullName}' is already recorded as INSIDE the hall. Cannot record ENTRY.`,
      });
      return;
    }

    if (requestedMovement === 'EXIT' && student.currentStatus === 'OUTSIDE') {
      res.status(400).json({
        success: false,
        message: `Invalid movement: Student '${student.fullName}' is already recorded as OUTSIDE the hall. Cannot record EXIT.`,
      });
      return;
    }

    // 3. Verify Enrolled Device: Student must have at least one active trusted device
    const activeDeviceCount = await EnrolledDevice.countDocuments({
      resident: student._id,
      status: 'ACTIVE',
    });

    if (activeDeviceCount === 0) {
      res.status(400).json({
        success: false,
        message: `Student '${student.fullName}' has not enrolled any verified devices. A trusted device is required for gate authorization.`,
      });
      return;
    }

    // 4. Concurrency & Duplicate Request Defense: Prevent multiple active pending requests
    const existingPending = await VerificationSession.findOne({
      student: student._id,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      res.status(409).json({
        success: false,
        message: 'A verification session is already pending for this student. Please await resident response or expiration.',
        existingSessionToken: existingPending.sessionToken,
      });
      return;
    }

    // 5. Curfew calculation if ENTRY
    let isLate = false;
    if (requestedMovement === 'ENTRY') {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const [curfewHour, curfewMin] = (config.curfewTime || '20:00').split(':').map(Number);
      const gracePeriod = config.lateGraceMinutes || 15;

      const curfewTotalMins = curfewHour * 60 + curfewMin + gracePeriod;
      const currentTotalMins = currentHours * 60 + currentMinutes;

      if (currentTotalMins > curfewTotalMins) {
        isLate = true;
      }
    }

    // 6. Generate Cryptographic Challenge & Single-Use Session Token
    const challenge = crypto.randomBytes(32).toString('hex');
    const sessionToken = `VS-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 90 * 1000); // 90 seconds lifetime

    let gateDoc: any = null;
    if (gateId && gateId.match(/^[0-9a-fA-F]{24}$/)) {
      gateDoc = await Gate.findById(gateId);
    }

    const session = await VerificationSession.create({
      sessionToken,
      student: student._id,
      initiatedBy: staffId,
      gate: gateDoc ? gateDoc._id : undefined,
      requestedMovement,
      challenge,
      status: 'PENDING',
      expiresAt,
      isLate,
      auditLog: [
        {
          action: 'INITIATED',
          timestamp: new Date(),
          performedBy: staffId,
          details: `Initiated ${requestedMovement} gate request by staff. Remarks: ${remarks || 'None'}`,
          ipAddress: req.ip,
        },
      ],
    });

    // 7. Emit Real-time WebSocket Event to the Student's PWA
    emitToStudent(student._id.toString(), 'verification:requested', {
      sessionId: session._id,
      sessionToken: session.sessionToken,
      requestedMovement,
      isLate,
      expiresAt: session.expiresAt,
      challenge: session.challenge,
      gateName: gateDoc ? gateDoc.name : 'Main Security Terminal',
      initiatedByName: req.user?.fullName || 'Gate Officer',
    });

    // Notify Gate Staff room
    emitToGateStaff('verification:session_created', {
      sessionId: session._id,
      sessionToken: session.sessionToken,
      studentId: student.studentId,
      studentName: student.fullName,
      requestedMovement,
      expiresAt: session.expiresAt,
    });

    res.status(201).json({
      success: true,
      message: `Verification session initiated. Awaiting resident cryptographic approval on enrolled device.`,
      session: {
        _id: session._id,
        sessionToken: session.sessionToken,
        studentId: student.studentId,
        studentName: student.fullName,
        requestedMovement: session.requestedMovement,
        isLate: session.isLate,
        expiresAt: session.expiresAt,
        challenge: session.challenge,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Student Approves Verification Request using Enrolled Device Cryptographic Signature
 */
export const approveVerificationSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const parse = approveSessionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid approval data.',
        errors: parse.error.errors,
      });
      return;
    }

    const { deviceId, signature, lateReason } = parse.data;
    const studentUserId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({
        success: true,
        message: 'Session approved (Demo store).',
      });
      return;
    }

    const session = await VerificationSession.findById(id).populate('student');
    if (!session) {
      res.status(404).json({ success: false, message: 'Verification session not found.' });
      return;
    }

    // 1. Authorization: Only the target student can approve their own verification request
    if (session.student._id.toString() !== studentUserId) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized approval attempt. You are not the target resident of this verification session.',
      });
      return;
    }

    // 2. Expiration Check
    const now = new Date();
    if (session.expiresAt <= now) {
      if (session.status === 'PENDING') {
        session.status = 'EXPIRED';
        session.auditLog.push({
          action: 'EXPIRED',
          timestamp: now,
          performedBy: studentUserId as any,
          details: 'Session expired before resident signature was submitted.',
        });
        await session.save();
        emitToGateStaff('verification:completed', {
          sessionId: session._id,
          status: 'EXPIRED',
          reason: 'Verification request timed out.',
        });
      }
      res.status(400).json({
        success: false,
        message: 'Verification session has expired. Please ask gate staff to initiate a new scan.',
      });
      return;
    }

    // 3. Replay Protection: Must be in PENDING status
    if (session.status !== 'PENDING') {
      res.status(409).json({
        success: false,
        message: `Replay attack prevented: Verification session has already been resolved as '${session.status}'.`,
      });
      return;
    }

    // 4. Validate Enrolled Device Credential
    const device = await EnrolledDevice.findOne({
      deviceId,
      resident: session.student._id,
    });

    if (!device) {
      res.status(403).json({
        success: false,
        message: 'Device credential not found or not registered to this resident.',
      });
      return;
    }

    if (device.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        message: 'This device has been REVOKED and cannot be used for gate approvals.',
      });
      return;
    }

    // 5. Verify Cryptographic Challenge Signature
    const isSignatureValid = verifyEcdsaSignature(
      device.publicKey,
      session.challenge,
      signature
    );

    if (!isSignatureValid) {
      session.auditLog.push({
        action: 'SIGNATURE_FAILED',
        timestamp: now,
        performedBy: studentUserId as any,
        details: `Cryptographic challenge verification failed for device ${device.deviceId}`,
      });
      await session.save();

      res.status(401).json({
        success: false,
        message: 'Cryptographic signature verification failed. Untrusted or tampered approval signature.',
      });
      return;
    }

    // 6. Atomic Session Transition from PENDING to APPROVED
    const updatedSession = await VerificationSession.findOneAndUpdate(
      { _id: session._id, status: 'PENDING', expiresAt: { $gt: now } },
      {
        status: 'APPROVED',
        approvedAt: now,
        approvedDevice: device._id,
        signature,
        lateReason: lateReason || session.lateReason,
        $push: {
          auditLog: {
            action: 'APPROVED',
            timestamp: now,
            performedBy: studentUserId,
            details: `Cryptographically verified and approved via device '${device.deviceName}' (${device.deviceId}).`,
            ipAddress: req.ip,
          },
        },
      },
      { new: true }
    );

    if (!updatedSession) {
      res.status(409).json({
        success: false,
        message: 'Concurrent conflict or session expired during approval.',
      });
      return;
    }

    // 7. Atomic Student Current Status Update & Movement Log Creation
    const targetStatus = session.requestedMovement === 'ENTRY' ? 'INSIDE' : 'OUTSIDE';

    await User.findByIdAndUpdate(session.student._id, {
      currentStatus: targetStatus,
    });

    // Update device last used timestamp
    await EnrolledDevice.findByIdAndUpdate(device._id, {
      lastUsedAt: now,
    });

    // Create official Access Movement Log
    const accessLog = await AccessLog.create({
      resident: session.student._id,
      type: session.requestedMovement,
      timestamp: now,
      scannedBy: session.initiatedBy,
      isLate: session.isLate,
      lateReason: lateReason || session.lateReason,
      status: session.isLate ? 'FLAGGED_LATE' : 'NORMAL',
      remarks: `Cryptographically verified on registered device: ${device.deviceName} (${device.deviceId})`,
    });

    updatedSession.accessLog = accessLog._id;
    await updatedSession.save();

    // 8. Real-time Socket.IO Broadcast to Gate Staff and Student
    const studentDoc: any = session.student;
    const completionPayload = {
      sessionId: session._id,
      sessionToken: session.sessionToken,
      status: 'APPROVED',
      requestedMovement: session.requestedMovement,
      currentStatus: targetStatus,
      studentId: studentDoc.studentId,
      studentName: studentDoc.fullName,
      verifiedDeviceName: device.deviceName,
      isLate: session.isLate,
      log: accessLog,
      timestamp: now.toISOString(),
    };

    emitToStudent(session.student._id.toString(), 'verification:completed', completionPayload);
    emitToGateStaff('verification:completed', completionPayload);
    emitToAll('dashboard:stats_updated', { trigger: 'movement_verified' });

    res.status(200).json({
      success: true,
      message: `Verification approved. Movement recorded as '${session.requestedMovement}' and presence updated to '${targetStatus}'.`,
      session: updatedSession,
      log: accessLog,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Student Denies Verification Request
 */
export const denyVerificationSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const parse = denySessionSchema.safeParse(req.body);
    const reason = parse.success && parse.data.reason ? parse.data.reason : 'Denied by resident';
    const studentUserId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({ success: true, message: 'Session denied (Demo store).' });
      return;
    }

    const session = await VerificationSession.findById(id).populate('student');
    if (!session) {
      res.status(404).json({ success: false, message: 'Verification session not found.' });
      return;
    }

    // Authorization
    if (session.student._id.toString() !== studentUserId) {
      res.status(403).json({ success: false, message: 'Unauthorized action.' });
      return;
    }

    if (session.status !== 'PENDING') {
      res.status(409).json({
        success: false,
        message: `Session has already been resolved as '${session.status}'.`,
      });
      return;
    }

    const now = new Date();
    const updatedSession = await VerificationSession.findOneAndUpdate(
      { _id: session._id, status: 'PENDING' },
      {
        status: 'DENIED',
        deniedAt: now,
        deniedReason: reason,
        $push: {
          auditLog: {
            action: 'DENIED',
            timestamp: now,
            performedBy: studentUserId,
            details: `Explicitly denied by resident. Reason: ${reason}`,
            ipAddress: req.ip,
          },
        },
      },
      { new: true }
    );

    if (!updatedSession) {
      res.status(409).json({ success: false, message: 'Session was already updated.' });
      return;
    }

    // Real-time broadcast
    const studentDoc: any = session.student;
    const denyPayload = {
      sessionId: session._id,
      sessionToken: session.sessionToken,
      status: 'DENIED',
      studentId: studentDoc.studentId,
      studentName: studentDoc.fullName,
      deniedReason: reason,
      timestamp: now.toISOString(),
    };

    emitToStudent(session.student._id.toString(), 'verification:completed', denyPayload);
    emitToGateStaff('verification:completed', denyPayload);

    res.status(200).json({
      success: true,
      message: 'Verification request denied. Student status remains unchanged.',
      session: updatedSession,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Get Session Status (Reliable Polling Fallback for Gate Staff & Resident)
 */
export const getSessionStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({
        success: true,
        session: {
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 60000),
        },
      });
      return;
    }

    let session = await VerificationSession.findById(id)
      .populate('student', 'studentId fullName department roomNumber hallName currentStatus')
      .populate('accessLog')
      .populate('approvedDevice', 'deviceName deviceId');

    if (!session) {
      res.status(404).json({ success: false, message: 'Verification session not found.' });
      return;
    }

    // Auto-expire if time has elapsed
    const now = new Date();
    if (session.status === 'PENDING' && session.expiresAt <= now) {
      session.status = 'EXPIRED';
      session.auditLog.push({
        action: 'EXPIRED',
        timestamp: now,
        details: 'Automatically expired upon status check.',
      });
      await session.save();

      emitToGateStaff('verification:completed', {
        sessionId: session._id,
        status: 'EXPIRED',
        reason: 'Session timed out without response.',
      });
    }

    res.status(200).json({
      success: true,
      session,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Student fetches any currently pending session (on load or reconnect)
 */
export const getPendingSessionForResident = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const studentUserId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({ success: true, pendingSession: null });
      return;
    }

    const pendingSession = await VerificationSession.findOne({
      student: studentUserId,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    })
      .populate('initiatedBy', 'fullName')
      .populate('gate', 'name location');

    res.status(200).json({
      success: true,
      pendingSession,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

