import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { initRealtime } from './realtime.js';
import { startAutoAssignmentScheduler } from './modules/dispatch/assignment.scheduler.js';

const app = createApp();
const server = http.createServer(app);
initRealtime(server);
const assignmentTimer = startAutoAssignmentScheduler();
server.listen(env.PORT, '0.0.0.0', () => console.log(`MADAD API listening on :${env.PORT}`));

async function shutdown() {
  clearInterval(assignmentTimer);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
