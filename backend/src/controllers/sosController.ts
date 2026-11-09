import { Response } from 'express';
import { z } from 'zod';
import { EmergencyAlert } from '../models/EmergencyAlert';
import { User } from '../models/User';
import { AuthenticatedRequest, SOSStatus, SOSAlertType } from '../types';
import { getDatabaseStatus } from '../config/db';
import { emitToStudent, emitToGateStaff, emitToAll } from '../services/socketService';

const triggerSOSSchema = z.object({
  alertType: z.enum(['MEDICAL', 'SECURITY', 'HARASSMENT', 'FIRE', 'OTHER']).default('SECURITY'),
  location: z.string().min(2, 'Location is required').trim(),
  coordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  notes: z.string().optional(),
});

const acknowledgeAlertSchema = z.object({
  notes: z.string().optional(),
});

const resolveAlertSchema = z.object({
  status: z.enum(['RESOLVED', 'FALSE_ALARM']),
  resolutionNotes: z.string().min(2, 'Resolution notes are required').trim(),
});

/**
 * 1. Student triggers Emergency Assistance SOS
 */
export const triggerSOS = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = triggerSOSSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: 'Invalid SOS parameters', errors: parse.error.errors });
      return;
    }

    const { alertType, location, coordinates, notes } = parse.data;
    const studentUserId = req.user?.id;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const student = await User.findById(studentUserId);
      if (!student) {
        res.status(404).json({ success: false, message: 'Resident record not found.' });
        return;
      }

      const alert = await EmergencyAlert.create({
        resident: student._id,
        alertType: alertType as SOSAlertType,
        location,
        coordinates,
        notes: notes || 'Immediate responder assistance requested',
        status: 'ACTIVE',
        actionLog: [
          {
            action: 'TRIGGERED',
            timestamp: new Date(),
            performedBy: student._id,
            notes: notes || 'Emergency SOS initiated by resident',
          },
        ],
      });

      const populated = await alert.populate(
        'resident',
        'fullName studentId roomNumber department phoneNumber guardianPhone guardianName hallName'
      );

      // Real-time high-priority broadcast to all security personnel, gate staff, and warden desks
      emitToGateStaff('sos:broadcast', {
        alertId: alert._id,
        alertType: alert.alertType,
        location: alert.location,
        notes: alert.notes,
        studentName: student.fullName,
        studentId: student.studentId,
        roomNumber: student.roomNumber,
        department: student.department,
        phoneNumber: student.phoneNumber,
        timestamp: alert.createdAt,
      });

      emitToAll('dashboard:stats_updated', { trigger: 'sos_triggered' });

      res.status(201).json({
        success: true,
        message: 'EMERGENCY SOS BROADCASTED. Gate officers, guards, and warden alerted immediately!',
        alert: populated,
      });
    } else {
      res.status(201).json({
        success: true,
        message: 'EMERGENCY SOS ACTIVATED in demo store.',
        alert: {
          _id: 'sos_mock_' + Date.now(),
          resident: req.user,
          alertType,
          location,
          notes,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Active Emergency Alerts (Authorized Staff Only)
 * Restricts sensitive details strictly to verified institutional roles
 */
export const getActiveAlerts = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const alerts = await EmergencyAlert.find({ status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } })
        .populate('resident', 'fullName studentId roomNumber department phoneNumber guardianPhone guardianName hallName')
        .populate('acknowledgedBy', 'fullName role')
        .populate('resolvedBy', 'fullName role')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, count: alerts.length, alerts });
    } else {
      res.status(200).json({ success: true, count: 0, alerts: [] });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Authorized Staff acknowledges the emergency alert
 */
export const acknowledgeAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parse = acknowledgeAlertSchema.safeParse(req.body);
    const notes = parse.success && parse.data.notes ? parse.data.notes : 'First responder dispatched to location';
    const staffId = req.user?.id;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const alert = await EmergencyAlert.findById(id).populate('resident');
      if (!alert) {
        res.status(404).json({ success: false, message: 'Emergency alert not found.' });
        return;
      }

      if (alert.status !== 'ACTIVE') {
        res.status(400).json({
          success: false,
          message: `Cannot acknowledge alert. Current status is already '${alert.status}'.`,
        });
        return;
      }

      const now = new Date();
      alert.status = 'ACKNOWLEDGED';
      alert.acknowledgedBy = staffId as any;
      alert.acknowledgedAt = now;
      alert.actionLog.push({
        action: 'ACKNOWLEDGED',
        timestamp: now,
        performedBy: staffId as any,
        notes,
      });

      await alert.save();

      // Real-time broadcast
      const residentDoc: any = alert.resident;
      emitToStudent(residentDoc._id.toString(), 'sos:updated', {
        alertId: alert._id,
        status: 'ACKNOWLEDGED',
        responderName: req.user?.fullName || 'Security Officer',
        notes,
      });

      emitToGateStaff('sos:updated', {
        alertId: alert._id,
        status: 'ACKNOWLEDGED',
        acknowledgedBy: req.user?.fullName,
        notes,
      });

      res.status(200).json({
        success: true,
        message: 'Emergency alert acknowledged. Responders registered on-site.',
        alert,
      });
    } else {
      res.status(200).json({ success: true, message: 'Alert acknowledged (Demo).' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Authorized Staff handles and resolves the emergency alert
 */
export const updateAlertStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parse = resolveAlertSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid resolution payload.',
        errors: parse.error.errors,
      });
      return;
    }

    const { status, resolutionNotes } = parse.data;
    const staffId = req.user?.id;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const alert = await EmergencyAlert.findById(id).populate('resident');
      if (!alert) {
        res.status(404).json({ success: false, message: 'Emergency alert not found.' });
        return;
      }

      if (alert.status === 'RESOLVED' || alert.status === 'FALSE_ALARM') {
        res.status(400).json({
          success: false,
          message: `Alert has already been closed as '${alert.status}'.`,
        });
        return;
      }

      const now = new Date();
      alert.status = status;
      alert.resolutionNotes = resolutionNotes;
      alert.resolvedBy = staffId as any;
      alert.resolvedAt = now;
      alert.actionLog.push({
        action: status,
        timestamp: now,
        performedBy: staffId as any,
        notes: resolutionNotes,
      });

      await alert.save();

      // Real-time broadcast
      const residentDoc: any = alert.resident;
      emitToStudent(residentDoc._id.toString(), 'sos:updated', {
        alertId: alert._id,
        status,
        resolvedBy: req.user?.fullName,
        resolutionNotes,
      });

      emitToGateStaff('sos:updated', {
        alertId: alert._id,
        status,
        resolvedBy: req.user?.fullName,
        resolutionNotes,
      });

      emitToAll('dashboard:stats_updated', { trigger: 'sos_resolved' });

      res.status(200).json({
        success: true,
        message: `Emergency alert successfully marked as ${status}.`,
        alert,
      });
    } else {
      res.status(200).json({ success: true, message: `Alert updated to ${status} (Demo).` });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Student views history of their own triggered emergency alerts
 */
export const getMyAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentUserId = req.user?.id;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const alerts = await EmergencyAlert.find({ resident: studentUserId })
        .populate('acknowledgedBy', 'fullName role')
        .populate('resolvedBy', 'fullName role')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, count: alerts.length, alerts });
    } else {
      res.status(200).json({ success: true, count: 0, alerts: [] });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
