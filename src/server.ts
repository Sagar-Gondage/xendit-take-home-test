// src/server.ts
import http from 'http';
import app from './app';
import { environment } from './config/environment';
import { notificationService } from './services/notification.service';
import { startScheduledJobs } from './jobs/scheduler';

const PORT = environment.port;

const server = http.createServer(app);

// Initialize Socket.IO for real-time notifications
notificationService.initialize(server);

// Start cron jobs for scheduled orders & loyalty point expiration
startScheduledJobs();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${environment.nodeEnv} mode`);
  console.log(`WebSocket server initialized`);
});

export default server;
