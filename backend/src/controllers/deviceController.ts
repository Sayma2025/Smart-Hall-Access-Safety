import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { EnrolledDevice } from '../models/EnrolledDevice';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../types';
import { getDatabaseStatus } from '../config/db';

const enrollDeviceSchema = z.object({
  deviceName: z.string().min(2, 'Device name must be at least 2 characters').trim(),
  publicKey: z.string().min(10, 'Public key must be provided').trim(),
  password: z.string().min(1, 'Account password is required for enrollment re-authentication'),
  platformInfo: z.string().optional(),
});

/**
 * Enroll a new Trusted Device for the Authenticated Resident
 * Enforces mandatory password re-authentication and cryptographic public key validation
 */
export const enrollDevice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const parse = enrollDeviceSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid device enrollment data.',
        errors: parse.error.errors,
      });
      return;
    }

    const { deviceName, publicKey, password, platformInfo } = parse.data;
    const userId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({
        success: true,
        message: 'Device enrolled (Demo store).',
        device: {
          deviceId: 'DEV-DEMO-' + Date.now(),
          deviceName,
          status: 'ACTIVE',
        },
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    // 1. Mandatory Re-authentication Check: Student must verify password before enrolling a cryptographic credential
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Re-authentication failed. Incorrect password.',
      });
      return;
    }

    // 2. Format and Validate Cryptographic Public Key (ECDSA P-256 or RSA SPKI)
    let formattedPublicKey = publicKey;
    if (!formattedPublicKey.includes('BEGIN PUBLIC KEY')) {
      formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }

    try {
      crypto.createPublicKey(formattedPublicKey);
    } catch (keyErr: any) {
      res.status(400).json({
        success: false,
        message: 'Invalid cryptographic public key format.',
        details: keyErr.message,
      });
      return;
    }

    // 3. Compute Public Key SHA-256 Fingerprint
    const fingerprint = crypto
      .createHash('sha256')
      .update(formattedPublicKey)
      .digest('hex');

    // 4. Generate Unique Device ID
    const deviceId = `DEV-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // 5. Create Enrolled Device Record
    const device = await EnrolledDevice.create({
      resident: user._id,
      deviceId,
      deviceName,
      publicKey: formattedPublicKey,
      algorithm: 'ECDSA-P256',
      fingerprint,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      platformInfo: platformInfo || req.headers['user-agent'] || 'Unknown Platform',
    });

    res.status(201).json({
      success: true,
      message: `Device '${deviceName}' enrolled successfully with secure cryptographic keys.`,
      device: {
        _id: device._id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        fingerprint: device.fingerprint,
        status: device.status,
        enrolledAt: device.enrolledAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Enrolled Devices for Current Resident
 */
export const getMyDevices = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({
        success: true,
        count: 1,
        devices: [
          {
            _id: 'mock_dev_1',
            deviceId: 'DEV-DEMO-001',
            deviceName: "Resident's Primary Phone",
            status: 'ACTIVE',
            enrolledAt: new Date(),
          },
        ],
      });
      return;
    }

    const devices = await EnrolledDevice.find({ resident: userId })
      .select('-publicKey')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: devices.length,
      devices,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Revoke an Enrolled Device (Student or Admin)
 */
export const revokeDevice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN';
    const db = getDatabaseStatus();

    if (!db.isConnected) {
      res.status(200).json({
        success: true,
        message: 'Device revoked (Demo).',
      });
      return;
    }

    const filter: any = { _id: id };
    if (!isAdmin) {
      filter.resident = userId;
    }

    const device = await EnrolledDevice.findOne(filter);
    if (!device) {
      res.status(404).json({ success: false, message: 'Enrolled device not found or access denied.' });
      return;
    }

    if (device.status === 'REVOKED') {
      res.status(400).json({ success: false, message: 'Device is already revoked.' });
      return;
    }

    device.status = 'REVOKED';
    device.revokedAt = new Date();
    await device.save();

    res.status(200).json({
      success: true,
      message: `Device '${device.deviceName}' (${device.deviceId}) has been revoked and can no longer be used for verification.`,
      device: {
        _id: device._id,
        deviceId: device.deviceId,
        status: device.status,
        revokedAt: device.revokedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

