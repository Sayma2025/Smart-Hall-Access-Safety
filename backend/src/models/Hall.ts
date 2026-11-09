import mongoose, { Document, Schema } from 'mongoose';

export interface IHall extends Document {
  name: string;
  code: string;
  gender: 'FEMALE' | 'MALE';
  capacity: number;
  provostName?: string;
  curfewTime: string;
  lateGraceMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HallSchema = new Schema<IHall>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['FEMALE', 'MALE'],
      default: 'FEMALE',
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      default: 500,
    },
    provostName: {
      type: String,
      trim: true,
      default: 'Dr. Sultana Razia',
    },
    curfewTime: {
      type: String,
      default: '20:00',
      trim: true,
    },
    lateGraceMinutes: {
      type: Number,
      default: 15,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Hall = mongoose.model<IHall>('Hall', HallSchema);
