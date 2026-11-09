import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shasms_db',
  jwtSecret: process.env.JWT_SECRET || 'shasms_university_super_secret_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  curfewTime: process.env.HALL_CURFEW_TIME || '20:00', // 8:00 PM
  lateGraceMinutes: parseInt(process.env.LATE_GRACE_PERIOD_MINUTES || '15', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
