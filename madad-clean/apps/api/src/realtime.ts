import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config.js';
let io: Server | undefined;
export const initRealtime = (server: HttpServer) => { io = new Server(server,{ cors:{ origin: env.WEB_ORIGIN } }); io.on('connection', s=>s.join('operations')); };
export const emitOps = (event:string, payload:unknown) => io?.to('operations').emit(event,payload);
