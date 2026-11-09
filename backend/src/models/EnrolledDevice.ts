import mongoose, { Document, Schema, Types } from 'mongoose';

export type DeviceStatus = 'ACTIVE' | 'REVOKED';

export interface IEnrolledDevice extends Document {
  resident: Types.ObjectId;
  deviceId: string;
  deviceName: string;
  publicKey: string; // PEM or SPKI base64 format
  algorithm: string;
  fingerprint: string;
  status: DeviceStatus;
  enrolledAt: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  platformInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnrolledDeviceSchema = new Schema<IEnrolledDevice>(
  {
    resident: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    deviceName: {
      type: String,
      required: true,
      trim: true,
      default: 'Authorized Resident Device',
    },
    publicKey: {
      type: String,
      required: true,
      trim: true,
    },
    algorithm: {
      type: String,
      default: 'ECDSA-P256',
      trim: true,
    },
    fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    platformInfo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

EnrolledDeviceSchema.index({ resident: 1, status: 1 });

export const EnrolledDevice = mongoose.model<IEnrolledDevice>(
  'EnrolledDevice',
  EnrolledDeviceSchema
);

