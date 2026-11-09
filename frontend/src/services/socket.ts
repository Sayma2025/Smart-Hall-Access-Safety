import { io, Socket } from 'socket.io-client';
import { User } from '../types';

let socket: Socket | null = null;

const getSocketBaseUrl = (): string => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
  try {
    const url = new URL(apiBase);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'http://localhost:5000';
  }
};

export const initSocket = (user: User | null): Socket | null => {
  if (!user) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket && socket.connected) {
    // Re-register if user changed
    socket.emit('join', {
      userId: user.id,
      role: user.role,
      room: user.role === 'GATE_STAFF' || user.role === 'GUARD' ? 'gate:terminal' : undefined,
    });
    return socket;
  }

  const serverUrl = getSocketBaseUrl();
  socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    socket?.emit('join', {
      userId: user.id,
      role: user.role,
      room: user.role === 'GATE_STAFF' || user.role === 'GUARD' ? 'gate:terminal' : undefined,
    });
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

