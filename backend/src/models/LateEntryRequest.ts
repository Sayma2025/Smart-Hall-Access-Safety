import mongoose, { Document, Schema, Types } from 'mongoose';

export type LateEntryStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ILateEntryAudit {
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  timestamp: Date;
  performedBy?: Types.ObjectId;
  note?: string;
}

export interface ILateEntryRequest extends Document {
  resident: Types.ObjectId;
  reason: string;
  expectedArrivalTime: string; // e.g. "22:30"
  targetDate: Date;
  status: LateEntryStatus;
  wardenDecisionNote?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  hallCutoffTime: string;
  lateGraceMinutes: number;
  auditLog: ILateEntryAudit[];
  createdAt: Date;
  updatedAt: Date;
}

const LateEntryAuditSchema = new Schema<ILateEntryAudit>(
  {
    action: {
      type: String,
      enum: ['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
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
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const LateEntryRequestSchema = new Schema<ILateEntryRequest>(
  {
    resident: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    expectedArrivalTime: {
      type: String,
      required: true,
      trim: true,
    },
    targetDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    wardenDecisionNote: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    hallCutoffTime: {
      type: String,
      default: '20:00',
    },
    lateGraceMinutes: {
      type: Number,
      default: 15,
    },
    auditLog: [LateEntryAuditSchema],
  },
  {
    timestamps: true,
  }
);

LateEntryRequestSchema.index({ resident: 1, targetDate: 1, status: 1 });

export const LateEntryRequest = mongoose.model<ILateEntryRequest>(
  'LateEntryRequest',
  LateEntryRequestSchema
);

