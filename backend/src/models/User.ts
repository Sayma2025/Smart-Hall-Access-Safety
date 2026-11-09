import mongoose, { Document, Schema } from 'mongoose';
import { UserRole, StudentCurrentStatus } from '../types';

export interface IUser extends Document {
  studentId?: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department?: string;
  roomNumber?: string;
  hallName: string;
  hallId?: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  phoneNumber?: string;
  guardianName?: string;
  guardianPhone?: string;
  currentStatus: StudentCurrentStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    studentId: {
      type: String,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['STUDENT', 'GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN'],
      default: 'STUDENT',
      required: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: 'General Studies',
      index: true,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
    hallName: {
      type: String,
      default: 'Pritilata Waddedar Female Hall',
      trim: true,
    },
    hallId: {
      type: Schema.Types.ObjectId,
      ref: 'Hall',
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    guardianName: {
      type: String,
      trim: true,
    },
    guardianPhone: {
      type: String,
      trim: true,
    },
    currentStatus: {
      type: String,
      enum: ['INSIDE', 'OUTSIDE'],
      default: 'INSIDE',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound text and sorting indexes
UserSchema.index({ role: 1, currentStatus: 1 });
UserSchema.index({ fullName: 'text', studentId: 'text', department: 'text', roomNumber: 'text' });

export const User = mongoose.model<IUser>('User', UserSchema);
