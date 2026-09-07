import http from 'http'; import { createApp } from './app.js'; import { env } from './config.js'; import { prisma } from './db.js'; import { initRealtime } from './realtime.js';
const app=createApp();const server=http.createServer(app);initRealtime(server);server.listen(env.PORT,()=>console.log(`MADAD API on :${env.PORT}`));
const stop=async()=>{await prisma.$disconnect();server.close(()=>process.exit(0))};process.on('SIGTERM',stop);process.on('SIGINT',stop);
