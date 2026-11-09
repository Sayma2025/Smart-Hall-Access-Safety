import { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/db';
import { config } from '../config/env';

export const getHealth = (_req: Request, res: Response): void => {
  const dbStatus = getDatabaseStatus();
  const uptimeSeconds = Math.floor(process.uptime());

  const responsePayload = {
    success: true,
    status: dbStatus.isConnected ? 'HEALTHY' : 'DEGRADED',
    message: dbStatus.isConnected
      ? 'SHASMS API is operational and connected to MongoDB'
      : 'SHASMS API is operational; MongoDB is connecting or offline',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`,
    environment: config.nodeEnv,
    version: '1.0.0',
    database: dbStatus,
    hallPolicy: {
      curfewTime: config.curfewTime,
      lateGraceMinutes: config.lateGraceMinutes,
      description: `Residents entering past ${config.curfewTime} are flagged for warden late-entry review`,
    },
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
    },
  };

  res.status(200).json(responsePayload);
};
