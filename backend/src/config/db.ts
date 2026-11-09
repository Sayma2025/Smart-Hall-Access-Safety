import mongoose from 'mongoose';
import { config } from './env';

export interface DBStatus {
  isConnected: boolean;
  state: string;
  host?: string;
  name?: string;
  error?: string;
}

const stateNames: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const connectDatabase = async (): Promise<boolean> => {
  try {
    mongoose.set('strictQuery', true);
    console.log(`[SHASMS-DB] Connecting to MongoDB at: ${config.mongodbUri.replace(/:([^:@]+)@/, ':****@')}`);
    
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if offline
    });

    console.log(`[SHASMS-DB] Successfully connected to MongoDB: ${mongoose.connection.name || 'default'}`);
    return true;
  } catch (err: any) {
    console.warn(`[SHASMS-DB] Warning: MongoDB connection failed: ${err.message}`);
    console.warn(`[SHASMS-DB] The server will still run and serve the Health Check endpoint & Mock services.`);
    return false;
  }
};

export const getDatabaseStatus = (): DBStatus => {
  const readyState = mongoose.connection.readyState;
  return {
    isConnected: readyState === 1,
    state: stateNames[readyState] || 'unknown',
    host: mongoose.connection.host || undefined,
    name: mongoose.connection.name || undefined,
  };
};
