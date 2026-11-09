import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User, IUser } from '../models/User';
import { config } from '../config/env';
import { AuthenticatedRequest, AuthUserPayload, UserRole } from '../types';
import { getDatabaseStatus } from '../config/db';

// Validation schemas
// Public registration: role is NEVER trusted from client; forced to 'STUDENT'
const publicRegisterSchema = z.object({
  studentId: z.string().min(3, 'Student ID must be at least 3 characters').trim().toUpperCase(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
  email: z.string().email('Please provide a valid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roomNumber: z.string().min(1, 'Room number is required').trim(),
  hallName: z.string().optional().default('Pritilata Waddedar Female Hall'),
  phoneNumber: z.string().min(6, 'Phone number must be at least 6 characters').trim(),
  guardianName: z.string().min(2, 'Guardian name is required').trim(),
  guardianPhone: z.string().min(6, 'Guardian phone number is required').trim(),
});

// Admin-managed account creation: Admin can assign any role
const adminCreateUserSchema = z.object({
  studentId: z.string().trim().toUpperCase().optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
  email: z.string().email('Valid email address required').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'GATE_STAFF', 'GUARD', 'WARDEN', 'ADMIN']),
  roomNumber: z.string().trim().optional(),
  hallName: z.string().trim().optional().default('Pritilata Waddedar Female Hall'),
  phoneNumber: z.string().trim().optional(),
  guardianName: z.string().trim().optional(),
  guardianPhone: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address format').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// In-memory demo fallback accounts
export const mockUsers: any[] = [
  {
    _id: '65f1a1111111111111111111',
    studentId: 'ASH2101001M',
    fullName: 'Nusrat Jahan (Student)',
    email: 'student@hall.edu',
    passwordHash: bcrypt.hashSync('student123', 10),
    role: 'STUDENT',
    roomNumber: 'Room 304, Block B',
    hallName: 'Pritilata Waddedar Female Hall',
    phoneNumber: '+8801711000001',
    guardianName: 'Md. Rafiqul Islam',
    guardianPhone: '+8801711999999',
    isActive: true,
  },
  {
    _id: '65f1a2222222222222222222',
    fullName: 'Kamal Gate Officer (Gate Staff)',
    email: 'gatestaff@hall.edu',
    passwordHash: bcrypt.hashSync('gatestaff123', 10),
    role: 'GATE_STAFF',
    hallName: 'Pritilata Waddedar Female Hall Gate 1',
    phoneNumber: '+8801811000002',
    isActive: true,
  },
  {
    _id: '65f1a2222222222222222223',
    fullName: 'Guard Terminal Operator',
    email: 'guard@hall.edu',
    passwordHash: bcrypt.hashSync('guard123', 10),
    role: 'GATE_STAFF',
    hallName: 'Pritilata Waddedar Female Hall Gate 1',
    phoneNumber: '+8801811000002',
    isActive: true,
  },
  {
    _id: '65f1a3333333333333333333',
    fullName: 'Dr. Sultana Razia (Hall Provost / Warden)',
    email: 'warden@hall.edu',
    passwordHash: bcrypt.hashSync('warden123', 10),
    role: 'WARDEN',
    hallName: 'Pritilata Waddedar Female Hall',
    phoneNumber: '+8801911000003',
    isActive: true,
  },
  {
    _id: '65f1a4444444444444444444',
    fullName: 'System Administrator',
    email: 'admin@hall.edu',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'ADMIN',
    hallName: 'University Central Administration',
    phoneNumber: '+8801511000004',
    isActive: true,
  },
];

/**
 * Public Student Registration
 * SECURITY POLICY: Server enforces role = 'STUDENT'. Client cannot escalate privileges.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = publicRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed: Please check your input fields.',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const {
      studentId,
      fullName,
      email,
      password,
      roomNumber,
      hallName,
      phoneNumber,
      guardianName,
      guardianPhone,
    } = parseResult.data;

    const db = getDatabaseStatus();

    // Check if user already exists
    if (db.isConnected) {
      const existingUser = await User.findOne({
        $or: [{ email }, { studentId }],
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'Email address' : 'Student ID';
        res.status(409).json({
          success: false,
          message: `${field} is already registered. Please log in or contact hall administration.`,
        });
        return;
      }

      // Hash password with bcrypt - Never store plaintext!
      const passwordHash = await bcrypt.hash(password, 10);

      // Enforce STUDENT role strictly on public registration
      const newUser = await User.create({
        studentId,
        fullName,
        email,
        passwordHash,
        role: 'STUDENT',
        roomNumber,
        hallName: hallName || 'Pritilata Waddedar Female Hall',
        phoneNumber,
        guardianName,
        guardianPhone,
        isActive: true,
      });

      res.status(201).json({
        success: true,
        message: 'Student resident account created successfully. You can now log in.',
        user: {
          id: newUser._id,
          studentId: newUser.studentId,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
          roomNumber: newUser.roomNumber,
        },
      });
    } else {
      // Offline / In-memory fallback
      const exists = mockUsers.find(
        (u) => u.email === email || (u.studentId && u.studentId === studentId)
      );

      if (exists) {
        res.status(409).json({
          success: false,
          message: 'Account with this email or Student ID already exists.',
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = {
        _id: 'mock_' + Date.now(),
        studentId,
        fullName,
        email,
        passwordHash,
        role: 'STUDENT' as UserRole,
        roomNumber,
        hallName: hallName || 'Pritilata Waddedar Female Hall',
        phoneNumber,
        guardianName,
        guardianPhone,
        isActive: true,
      };
      mockUsers.push(newUser);

      res.status(201).json({
        success: true,
        message: 'Student account registered (Demo Store). You can now log in.',
        user: {
          id: newUser._id,
          studentId: newUser.studentId,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
          roomNumber: newUser.roomNumber,
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Administrator-Managed Account Creation
 * SECURITY POLICY: Only callable by authenticated ADMIN.
 */
export const adminCreateUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const parseResult = adminCreateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed for user creation.',
        errors: parseResult.error.errors,
      });
      return;
    }

    const {
      studentId,
      fullName,
      email,
      password,
      role,
      roomNumber,
      hallName,
      phoneNumber,
      guardianName,
      guardianPhone,
    } = parseResult.data;

    const normalizedRole: UserRole = role === 'GUARD' ? 'GATE_STAFF' : (role as UserRole);
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const existing = await User.findOne({ email });
      if (existing) {
        res.status(409).json({ success: false, message: 'Email address is already in use.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        studentId: normalizedRole === 'STUDENT' ? studentId : undefined,
        fullName,
        email,
        passwordHash,
        role: normalizedRole,
        roomNumber,
        hallName: hallName || 'Pritilata Waddedar Female Hall',
        phoneNumber,
        guardianName,
        guardianPhone,
        isActive: true,
      });

      res.status(201).json({
        success: true,
        message: `Account for '${fullName}' with role '${normalizedRole}' created successfully.`,
        user: {
          id: user._id,
          studentId: user.studentId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = {
        _id: 'mock_admin_' + Date.now(),
        studentId: normalizedRole === 'STUDENT' ? studentId : undefined,
        fullName,
        email,
        passwordHash,
        role: normalizedRole,
        roomNumber,
        hallName: hallName || 'Pritilata Waddedar Female Hall',
        phoneNumber,
        guardianName,
        guardianPhone,
        isActive: true,
      };
      mockUsers.push(user);

      res.status(201).json({
        success: true,
        message: `Account created in demo store with role '${normalizedRole}'.`,
        user: {
          id: user._id,
          studentId: user.studentId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Administrator: List all users
 */
export const adminGetUsers = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const db = getDatabaseStatus();

    if (db.isConnected) {
      const users = await User.find({})
        .select('-passwordHash')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: users.length,
        users,
      });
    } else {
      const sanitized = mockUsers.map(({ passwordHash, ...rest }) => rest);
      res.status(200).json({
        success: true,
        count: sanitized.length,
        users: sanitized,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Administrator: Toggle user activation status
 */
export const adminToggleUserStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, message: 'Field isActive must be a boolean.' });
      return;
    }

    const db = getDatabaseStatus();

    if (db.isConnected) {
      const user = await User.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      ).select('-passwordHash');

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: `User '${user.fullName}' status changed to ${isActive ? 'Active' : 'Deactivated'}.`,
        user,
      });
    } else {
      const user = mockUsers.find((u) => u._id === id);
      if (user) {
        user.isActive = isActive;
      }
      res.status(200).json({
        success: true,
        message: `User status changed to ${isActive ? 'Active' : 'Deactivated'} (Demo).`,
        user,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * User Login
 * Validates credentials, checks active status, and issues signed JWT.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid credentials format',
        errors: parseResult.error.errors,
      });
      return;
    }

    const { email, password } = parseResult.data;
    const db = getDatabaseStatus();

    let user: any = null;

    if (db.isConnected) {
      user = await User.findOne({ email });
    }

    // Fallback to mock accounts if not in DB or DB disconnected
    if (!user) {
      user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials. No account found with that email address.',
      });
      return;
    }

    // Check account status
    if (user.isActive === false) {
      res.status(403).json({
        success: false,
        message: 'Account suspended: Your access has been deactivated by the hall administrator.',
      });
      return;
    }

    // Compare bcrypt password hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials. The password entered is incorrect.',
      });
      return;
    }

    // Canonicalize role
    const canonicalRole: UserRole =
      user.role === 'GUARD' ? 'GATE_STAFF' : (user.role as UserRole);

    const payload: AuthUserPayload = {
      id: user._id.toString(),
      studentId: user.studentId,
      fullName: user.fullName,
      email: user.email,
      role: canonicalRole,
      roomNumber: user.roomNumber,
      hallName: user.hallName,
    };

    const token = (jwt.sign as any)(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.fullName}! Login successful as ${canonicalRole}.`,
      token,
      user: payload,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * User Logout
 */
export const logout = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'User logged out successfully. Session terminated.',
  });
};

/**
 * Get Current User Profile (Token Verification)
 */
export const getProfile = (req: AuthenticatedRequest, res: Response): void => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

/**
 * Demo Accounts for Quick Evaluation
 */
export const getDemoAccounts = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'SHASMS Development Demo Credentials for all 4 roles',
    accounts: [
      {
        role: 'STUDENT',
        email: 'student@hall.edu',
        password: 'student123',
        name: 'Nusrat Jahan',
        description: 'Resident Student (Room 304, Block B)',
      },
      {
        role: 'GATE_STAFF',
        email: 'gatestaff@hall.edu',
        password: 'gatestaff123',
        name: 'Kamal Gate Officer',
        description: 'Security Gate Staff (Terminal 1)',
      },
      {
        role: 'WARDEN',
        email: 'warden@hall.edu',
        password: 'warden123',
        name: 'Dr. Sultana Razia',
        description: 'Hall Provost & Warden',
      },
      {
        role: 'ADMIN',
        email: 'admin@hall.edu',
        password: 'admin123',
        name: 'System Administrator',
        description: 'Central Hall System Administrator',
      },
    ],
  });
};
