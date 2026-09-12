import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';
import incidentRoutes from './modules/incidents/incidents.routes.js';
import incidentDetailsRoutes from './modules/incidents/incident-details.routes.js';
import dispatchRoutes from './modules/dispatch/dispatch.routes.js';
import teamRoutes from './modules/teams/teams.routes.js';
import resourceRoutes from './modules/resources/resources.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import operationsRoutes from './modules/operations/operations.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import fieldRoutes from './modules/field/field.routes.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));
  app.get('/api/v1/health', (_req, res) => res.json({ ok: true, service: 'MADAD API', version: '3.1.0' }));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/incidents', incidentRoutes);
  app.use('/api/v1/incidents', incidentDetailsRoutes);
  app.use('/api/v1/dispatch', dispatchRoutes);
  app.use('/api/v1/teams', teamRoutes);
  app.use('/api/v1/resources', resourceRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/operations', operationsRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/field', fieldRoutes);
  app.use(errorHandler);
  return app;
}
