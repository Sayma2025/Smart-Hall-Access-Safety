import mongoose, { Document, Schema, Types } from 'mongoose';
import { AccessType, AccessStatus } from '../types';

export interface IAccessLog extends Document {
  resident: Types.ObjectId;
  type: AccessType;
  timestamp: Date;
  scannedBy?: Types.ObjectId;
  isLate: boolean;
  lateReason?: string;
  remarks?: string;
  status: AccessStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
}

const AccessLogSchema = new Schema<IAccessLog>(
  {
    resident: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['ENTRY', 'EXIT'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    scannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateReason: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['NORMAL', 'FLAGGED_LATE', 'APPROVED_LATE', 'REJECTED_LATE'],
      default: 'NORMAL',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AccessLogSchema.index({ resident: 1, timestamp: -1 });

export const AccessLog = mongoose.model<IAccessLog>('AccessLog', AccessLogSchema);
