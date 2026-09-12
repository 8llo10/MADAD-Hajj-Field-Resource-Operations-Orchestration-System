import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { initRealtime } from './realtime.js';
import { startAutoAssignmentScheduler } from './modules/dispatch/assignment.scheduler.js';
import { ensureFieldDemo } from './bootstrap/field-demo.js';

const app = createApp();
const server = http.createServer(app);
initRealtime(server);

try {
  await ensureFieldDemo();
} catch (error) {
  console.error('Field demo bootstrap failed', error);
}

const assignmentTimer = startAutoAssignmentScheduler();
server.listen(env.PORT, '0.0.0.0', () => console.log(`MADAD API listening on :${env.PORT}`));

async function shutdown() {
  clearInterval(assignmentTimer);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
