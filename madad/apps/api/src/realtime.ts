import type { Server as HttpServer } from 'http'; import { Server } from 'socket.io'; import jwt from 'jsonwebtoken'; import { env } from './config.js';
let io:Server;
export function initRealtime(server:HttpServer){io=new Server(server,{cors:{origin:env.WEB_ORIGIN}});io.use((socket,next)=>{try{const token=socket.handshake.auth?.token;if(token)socket.data.user=jwt.verify(token,env.JWT_ACCESS_SECRET);next()}catch{next(new Error('unauthorized'))}});io.on('connection',s=>{s.join('operations');if(s.data.user?.id)s.join(`user:${s.data.user.id}`)});return io;}
export function emitOps(event:string,payload:unknown){io?.to('operations').emit(event,payload)}
