import mongoose, { Document, Schema, Types } from 'mongoose';
import { GateStatus } from '../types';

export interface IGate extends Document {
  name: string;
  code: string;
  hall?: Types.ObjectId;
  location: string;
  gateType: 'PEDESTRIAN' | 'VEHICULAR' | 'EMERGENCY';
  status: GateStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GateSchema = new Schema<IGate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    hall: {
      type: Schema.Types.ObjectId,
      ref: 'Hall',
    },
    location: {
      type: String,
      required: true,
      trim: true,
      default: 'Main Campus East Entrance',
    },
    gateType: {
      type: String,
      enum: ['PEDESTRIAN', 'VEHICULAR', 'EMERGENCY'],
      default: 'PEDESTRIAN',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'LOCKED', 'MAINTENANCE'],
      default: 'ACTIVE',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Gate = mongoose.model<IGate>('Gate', GateSchema);
