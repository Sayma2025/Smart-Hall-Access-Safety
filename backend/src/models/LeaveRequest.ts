import mongoose, { Document, Schema, Types } from 'mongoose';
import { LeaveType, LeaveStatus } from '../types';

export interface ILeaveAudit {
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  timestamp: Date;
  performedBy?: Types.ObjectId;
  notes?: string;
}

export interface ILeaveRequest extends Document {
  resident: Types.ObjectId;
  leaveType: LeaveType;
  reason?: string;
  departureDate: Date;
  expectedReturnDate: Date;
  actualReturnDate?: Date;
  destinationAddress: string;
  emergencyContactPhone: string;
  guardianConsentVerified: boolean;
  status: LeaveStatus;
  wardenRemarks?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  auditLog: ILeaveAudit[];
  createdAt: Date;
  updatedAt: Date;
}

const LeaveAuditSchema = new Schema<ILeaveAudit>(
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
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    resident: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ['WEEKEND_HOME', 'ACADEMIC', 'MEDICAL', 'EMERGENCY'],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    departureDate: {
      type: Date,
      required: true,
    },
    expectedReturnDate: {
      type: Date,
      required: true,
    },
    actualReturnDate: {
      type: Date,
    },
    destinationAddress: {
      type: String,
      required: true,
      trim: true,
    },
    emergencyContactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    guardianConsentVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'APPROVED_BY_WARDEN',
        'REJECTED',
        'ACTIVE_OUT',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'PENDING',
      index: true,
    },
    wardenRemarks: {
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
    auditLog: [LeaveAuditSchema],
  },
  {
    timestamps: true,
  }
);

LeaveRequestSchema.index({ resident: 1, status: 1 });
LeaveRequestSchema.index({ status: 1, departureDate: 1, expectedReturnDate: 1 });

export const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
