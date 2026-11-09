import mongoose, { Document, Schema, Types } from 'mongoose';
import { RoomStatus } from '../types';

export interface IRoom extends Document {
  hall: Types.ObjectId;
  roomNumber: string;
  block: string;
  floor: number;
  capacity: number;
  occupiedCount: number;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    hall: {
      type: Schema.Types.ObjectId,
      ref: 'Hall',
      required: true,
      index: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    block: {
      type: String,
      required: true,
      trim: true,
      default: 'Block B',
    },
    floor: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      default: 4,
    },
    occupiedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'FULL', 'MAINTENANCE'],
      default: 'AVAILABLE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate rooms in the same hall and block
RoomSchema.index({ hall: 1, block: 1, roomNumber: 1 }, { unique: true });

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
