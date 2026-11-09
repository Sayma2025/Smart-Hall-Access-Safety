import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/db';
import { config } from './config/env';
import { initSocketIO } from './services/socketService';

const startServer = async () => {
  const app = createApp();

  // Connect to MongoDB Atlas or local MongoDB
  await connectDatabase();

  const server = http.createServer(app);

  // Initialize real-time Socket.IO on the HTTP server
  initSocketIO(server);

  server.listen(config.port, () => {
    console.log('================================================================');
    console.log(`🏛️  SHASMS Backend Server running on port: ${config.port}`);
    console.log(`🌐  Local Health Check: http://localhost:${config.port}/health`);
    console.log(`🌐  API v1 Health Check: http://localhost:${config.port}/api/v1/health`);
    console.log(`⏱️   Curfew Time: ${config.curfewTime} | Grace Period: ${config.lateGraceMinutes} mins`);
    console.log(`⚡  Socket.IO Real-Time Engine Active`);
    console.log('================================================================');
  });

  // Graceful shutdown
  const handleShutdown = () => {
    console.log('\n[SHASMS-Server] Received shutdown signal. Closing HTTP server gracefully...');
    server.close(() => {
      console.log('[SHASMS-Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);

  return server;
};

if (require.main === module) {
  startServer();
}

export default startServer;
