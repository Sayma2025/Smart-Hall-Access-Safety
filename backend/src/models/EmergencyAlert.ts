import mongoose, { Document, Schema, Types } from 'mongoose';
import { SOSAlertType, SOSStatus } from '../types';

export interface IEmergencyAction {
  action: 'TRIGGERED' | 'ACKNOWLEDGED' | 'HANDLING' | 'RESOLVED' | 'FALSE_ALARM';
  timestamp: Date;
  performedBy?: Types.ObjectId;
  notes?: string;
}

export interface IEmergencyAlert extends Document {
  resident: Types.ObjectId;
  alertType: SOSAlertType;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  status: SOSStatus;
  acknowledgedBy?: Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  resolutionNotes?: string;
  actionLog: IEmergencyAction[];
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyActionSchema = new Schema<IEmergencyAction>(
  {
    action: {
      type: String,
      enum: ['TRIGGERED', 'ACKNOWLEDGED', 'HANDLING', 'RESOLVED', 'FALSE_ALARM'],
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

const EmergencyAlertSchema = new Schema<IEmergencyAlert>(
  {
    resident: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    alertType: {
      type: String,
      enum: ['MEDICAL', 'SECURITY', 'HARASSMENT', 'FIRE', 'OTHER'],
      default: 'SECURITY',
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'],
      default: 'ACTIVE',
      index: true,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    actionLog: [EmergencyActionSchema],
  },
  {
    timestamps: true,
  }
);

EmergencyAlertSchema.index({ status: 1, createdAt: -1 });

export const EmergencyAlert = mongoose.model<IEmergencyAlert>(
  'EmergencyAlert',
  EmergencyAlertSchema
);
