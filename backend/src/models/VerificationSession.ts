import mongoose, { Document, Schema, Types } from 'mongoose';
import { AccessType } from '../types';

export type VerificationSessionStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export interface IAuditLogEntry {
  action: 'INITIATED' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'SIGNATURE_FAILED' | 'REPLAY_ATTEMPT';
  timestamp: Date;
  performedBy?: Types.ObjectId;
  details?: string;
  ipAddress?: string;
}

export interface IVerificationSession extends Document {
  sessionToken: string;
  student: Types.ObjectId;
  initiatedBy: Types.ObjectId;
  gate?: Types.ObjectId;
  requestedMovement: AccessType;
  challenge: string;
  status: VerificationSessionStatus;
  expiresAt: Date;
  approvedAt?: Date;
  approvedDevice?: Types.ObjectId;
  signature?: string;
  deniedAt?: Date;
  deniedReason?: string;
  isLate: boolean;
  lateReason?: string;
  accessLog?: Types.ObjectId;
  auditLog: IAuditLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogEntrySchema = new Schema<IAuditLogEntry>(
  {
    action: {
      type: String,
      enum: ['INITIATED', 'APPROVED', 'DENIED', 'EXPIRED', 'SIGNATURE_FAILED', 'REPLAY_ATTEMPT'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    details: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
  },
  { _id: false }
);

const VerificationSessionSchema = new Schema<IVerificationSession>(
  {
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gate: {
      type: Schema.Types.ObjectId,
      ref: 'Gate',
    },
    requestedMovement: {
      type: String,
      enum: ['ENTRY', 'EXIT'],
      required: true,
    },
    challenge: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'DENIED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    approvedAt: {
      type: Date,
    },
    approvedDevice: {
      type: Schema.Types.ObjectId,
      ref: 'EnrolledDevice',
    },
    signature: {
      type: String,
    },
    deniedAt: {
      type: Date,
    },
    deniedReason: {
      type: String,
      trim: true,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateReason: {
      type: String,
      trim: true,
    },
    accessLog: {
      type: Schema.Types.ObjectId,
      ref: 'AccessLog',
    },
    auditLog: [AuditLogEntrySchema],
  },
  {
    timestamps: true,
  }
);

VerificationSessionSchema.index({ student: 1, status: 1, expiresAt: 1 });

export const VerificationSession = mongoose.model<IVerificationSession>(
  'VerificationSession',
  VerificationSessionSchema
);

