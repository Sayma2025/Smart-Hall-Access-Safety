import { Request, Response } from 'express';
import { z } from 'zod';
import { Hall } from '../models/Hall';
import { Room } from '../models/Room';
import { Gate } from '../models/Gate';
import { AuthenticatedRequest } from '../types';
import { getDatabaseStatus } from '../config/db';

// Validation Schemas
const createHallSchema = z.object({
  name: z.string().min(3, 'Hall name must be at least 3 characters').trim(),
  code: z.string().min(2, 'Hall code must be at least 2 characters').trim().toUpperCase(),
  gender: z.enum(['FEMALE', 'MALE']).default('FEMALE'),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  provostName: z.string().optional(),
  curfewTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Curfew time must be in HH:mm format').default('20:00'),
  lateGraceMinutes: z.number().int().min(0).default(15),
});

const createRoomSchema = z.object({
  hallId: z.string().min(1, 'Hall ID is required'),
  roomNumber: z.string().min(1, 'Room number is required').trim(),
  block: z.string().min(1, 'Block is required').trim(),
  floor: z.number().int().min(0).default(1),
  capacity: z.number().int().positive().default(4),
});

const createGateSchema = z.object({
  name: z.string().min(3, 'Gate name is required').trim(),
  code: z.string().min(2, 'Gate code is required').trim().toUpperCase(),
  hallId: z.string().optional(),
  location: z.string().min(3, 'Location description is required').trim(),
  gateType: z.enum(['PEDESTRIAN', 'VEHICULAR', 'EMERGENCY']).default('PEDESTRIAN'),
  status: z.enum(['ACTIVE', 'LOCKED', 'MAINTENANCE']).default('ACTIVE'),
  notes: z.string().optional(),
});

// ==========================================
// 1. Hall Management
// ==========================================
export const getHalls = async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabaseStatus();
    if (db.isConnected) {
      const halls = await Hall.find().sort({ name: 1 });
      res.status(200).json({ success: true, count: halls.length, halls });
    } else {
      res.status(200).json({
        success: true,
        count: 1,
        halls: [
          {
            _id: 'mock_hall_1',
            name: 'Pritilata Waddedar Female Residential Hall',
            code: 'PWH',
            gender: 'FEMALE',
            capacity: 500,
            curfewTime: '20:00',
            isActive: true,
          },
        ],
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = createHallSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid hall input data.',
        errors: parse.error.errors,
      });
      return;
    }

    const { name, code, gender, capacity, provostName, curfewTime, lateGraceMinutes } = parse.data;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const existing = await Hall.findOne({ $or: [{ name }, { code }] });
      if (existing) {
        res.status(409).json({ success: false, message: 'Hall with this name or code already exists.' });
        return;
      }

      const hall = await Hall.create({
        name,
        code,
        gender,
        capacity,
        provostName,
        curfewTime,
        lateGraceMinutes,
      });

      res.status(201).json({ success: true, message: 'Hall created successfully.', hall });
    } else {
      res.status(201).json({
        success: true,
        message: 'Hall created in demo store.',
        hall: { _id: 'mock_' + Date.now(), name, code, capacity },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. Room Management
// ==========================================
export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hallId, block, status } = req.query;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const filter: any = {};
      if (hallId) filter.hall = hallId;
      if (block) filter.block = block;
      if (status) filter.status = status;

      const rooms = await Room.find(filter).populate('hall', 'name code').sort({ roomNumber: 1 });
      res.status(200).json({ success: true, count: rooms.length, rooms });
    } else {
      res.status(200).json({
        success: true,
        count: 2,
        rooms: [
          { _id: 'mock_room_1', roomNumber: '304', block: 'Block B', floor: 3, capacity: 4, occupiedCount: 3, status: 'AVAILABLE' },
          { _id: 'mock_room_2', roomNumber: '210', block: 'Block A', floor: 2, capacity: 4, occupiedCount: 4, status: 'FULL' },
        ],
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = createRoomSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: 'Invalid room input data.', errors: parse.error.errors });
      return;
    }

    const { hallId, roomNumber, block, floor, capacity } = parse.data;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const existing = await Room.findOne({ hall: hallId, block, roomNumber });
      if (existing) {
        res.status(409).json({ success: false, message: `Room ${roomNumber} in ${block} already exists.` });
        return;
      }

      const room = await Room.create({
        hall: hallId,
        roomNumber,
        block,
        floor,
        capacity,
      });

      res.status(201).json({ success: true, message: 'Room created successfully.', room });
    } else {
      res.status(201).json({
        success: true,
        message: 'Room created (Demo).',
        room: { _id: 'mock_room_' + Date.now(), roomNumber, block, capacity },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. Gate Configuration
// ==========================================
export const getGates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabaseStatus();
    if (db.isConnected) {
      const gates = await Gate.find().populate('hall', 'name code').sort({ code: 1 });
      res.status(200).json({ success: true, count: gates.length, gates });
    } else {
      res.status(200).json({
        success: true,
        count: 2,
        gates: [
          { _id: 'gate_1', name: 'Main East Gate Terminal 1', code: 'GATE-01', location: 'East Perimeter', status: 'ACTIVE' },
          { _id: 'gate_2', name: 'West Vehicular Gate 2', code: 'GATE-02', location: 'West Perimeter', status: 'ACTIVE' },
        ],
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = createGateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: 'Invalid gate input data.', errors: parse.error.errors });
      return;
    }

    const { name, code, hallId, location, gateType, status, notes } = parse.data;
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const existing = await Gate.findOne({ code });
      if (existing) {
        res.status(409).json({ success: false, message: `Gate with code '${code}' already exists.` });
        return;
      }

      const gate = await Gate.create({
        name,
        code,
        hall: hallId || undefined,
        location,
        gateType,
        status,
        notes,
      });

      res.status(201).json({ success: true, message: 'Gate configured successfully.', gate });
    } else {
      res.status(201).json({
        success: true,
        message: 'Gate configured in demo store.',
        gate: { _id: 'gate_mock_' + Date.now(), name, code, location, status },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'LOCKED', 'MAINTENANCE'].includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be ACTIVE, LOCKED, or MAINTENANCE' });
      return;
    }

    const db = getDatabaseStatus();
    if (db.isConnected) {
      const gate = await Gate.findByIdAndUpdate(id, { status }, { new: true });
      if (!gate) {
        res.status(404).json({ success: false, message: 'Gate not found' });
        return;
      }
      res.status(200).json({ success: true, message: `Gate status updated to ${status}`, gate });
    } else {
      res.status(200).json({ success: true, message: `Gate status updated to ${status} (Demo)` });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
