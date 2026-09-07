import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
let io: Server | null = null;
export function initRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: env.WEB_ORIGIN, credentials: true } });
  io.on('connection', socket => socket.emit('ops.connected', { ok: true, at: new Date().toISOString() }));
}
export function emitOps(event: string, payload: unknown) { io?.emit(event, payload); }
