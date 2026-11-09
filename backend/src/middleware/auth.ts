import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthenticatedRequest, AuthUserPayload, UserRole } from '../types';
import { User } from '../models/User';
import { getDatabaseStatus } from '../config/db';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided. Please log in.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;

    // Server-side active verification if MongoDB is connected
    const db = getDatabaseStatus();
    if (db.isConnected) {
      const userDoc = await User.findById(decoded.id);
      if (!userDoc) {
        res.status(401).json({
          success: false,
          message: 'Authentication failed. User account no longer exists.',
        });
        return;
      }

      if (!userDoc.isActive) {
        res.status(403).json({
          success: false,
          message: 'Account suspended: Your access has been deactivated by the administrator.',
        });
        return;
      }

      // Always enforce the current database role, never trust stale client tokens
      decoded.role = userDoc.role;
      decoded.fullName = userDoc.fullName;
      decoded.studentId = userDoc.studentId;
      decoded.roomNumber = userDoc.roomNumber;
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        error: 'TokenExpiredError',
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid authorization token. Authentication failed.',
      error: error.message,
    });
  }
};

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to access this resource.',
      });
      return;
    }

    const userRole = req.user.role;

    // Map GATE_STAFF and GUARD as equivalent aliases
    const effectiveRoles: UserRole[] = [...allowedRoles];
    if (allowedRoles.includes('GATE_STAFF') && !allowedRoles.includes('GUARD')) {
      effectiveRoles.push('GUARD');
    }
    if (allowedRoles.includes('GUARD') && !allowedRoles.includes('GATE_STAFF')) {
      effectiveRoles.push('GATE_STAFF');
    }

    const hasAccess = effectiveRoles.includes(userRole);

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Server-enforced role check failed. Required role(s): [${allowedRoles.join(
          ', '
        )}]. Your account role is '${userRole}'.`,
      });
      return;
    }

    next();
  };
};
