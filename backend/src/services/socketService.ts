import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthUserPayload } from '../types';

let ioInstance: Server | null = null;

export const initSocketIO = (httpServer: HttpServer): Server => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  // Socket.IO Authentication Middleware
  ioInstance.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
        socket.data.user = decoded;
      } catch {
        // Allow unauthenticated connection for public broadcasts, but without elevated socket.data
      }
    }
    next();
  });

  ioInstance.on('connection', (socket: Socket) => {
    const authenticatedUser: AuthUserPayload | undefined = socket.data.user;

    // Auto-join personal and role rooms if authenticated
    if (authenticatedUser) {
      socket.join(`user:${authenticatedUser.id}`);
      socket.join(`student:${authenticatedUser.id}`);
      socket.join(`role:${authenticatedUser.role}`);
      if (authenticatedUser.role === 'GATE_STAFF' || authenticatedUser.role === 'GUARD' || authenticatedUser.role === 'ADMIN') {
        socket.join('gate:terminal');
      }
    }

    // Role-authorized room joining
    socket.on('join', (data: { room?: string; userId?: string; role?: string }) => {
      // Prevent privilege escalation via socket room spoofing
      if (data.role && data.role !== authenticatedUser?.role && authenticatedUser?.role !== 'ADMIN') {
        return; // Deny unauthorized role room joining
      }

      if (data.userId && data.userId !== authenticatedUser?.id && authenticatedUser?.role !== 'ADMIN') {
        return; // Deny snooping on other students' rooms
      }

      if (data.userId) {
        socket.join(`user:${data.userId}`);
        socket.join(`student:${data.userId}`);
      }
      if (data.role) {
        socket.join(`role:${data.role}`);
      }
      if (data.room) {
        // Protect staff-only rooms
        if (['gate:terminal', 'warden:desk', 'admin:control'].includes(data.room)) {
          if (!authenticatedUser || authenticatedUser.role === 'STUDENT') {
            return;
          }
        }
        socket.join(data.room);
      }
    });

    socket.on('leave', (data: { room?: string; userId?: string }) => {
      if (data.userId) {
        socket.leave(`user:${data.userId}`);
        socket.leave(`student:${data.userId}`);
      }
      if (data.room) {
        socket.leave(data.room);
      }
    });
  });

  return ioInstance;
};

export const getSocketIO = (): Server | null => {
  return ioInstance;
};

export const emitToStudent = (studentId: string, event: string, data: any): void => {
  if (ioInstance) {
    ioInstance.to(`student:${studentId}`).to(`user:${studentId}`).emit(event, data);
  }
};

export const emitToGateStaff = (event: string, data: any): void => {
  if (ioInstance) {
    ioInstance.to('role:GATE_STAFF').to('role:GUARD').to('role:ADMIN').to('gate:terminal').emit(event, data);
  }
};

export const emitToAll = (event: string, data: any): void => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};
