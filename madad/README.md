# مَدَد | MADAD

**Hajj Field Resource & Operations Orchestration Platform** — enterprise-style command platform for field incidents, dispatch, teams, resources, inventory, real-time status, operational analytics and AI-assisted prioritization.

## Architecture

```text
apps/web     Next.js command-center UI
apps/api     TypeScript + Express + Prisma modular backend
PostgreSQL   system of record
Socket.IO    real-time operational events
AI Engine    local explainable scoring + optional provider adapter
```

### Backend modules
- Auth + refresh tokens + RBAC
- Users
- Sites / zones
- Incidents and lifecycle
- Teams + members + availability
- Resources/assets
- Inventory / spare parts
- Dispatch engine (scored assignment)
- AI insights (risk, SLA breach probability, ETA, recommendations)
- Notifications
- Audit trail
- Dashboard / operational KPIs
- Real-time Socket.IO events
- Swagger `/docs`

## Quick start

1. `cp .env.example apps/api/.env`
2. Create `apps/web/.env.local` with the two `NEXT_PUBLIC_*` variables from `.env.example`.
3. `docker compose up db -d`
4. `npm install`
5. `npm run db:generate`
6. `npm run db:push`
7. `npm run db:seed`
8. `npm run dev`

Open `http://localhost:3000` and API docs at `http://localhost:4000/docs`.

### Demo accounts
- `admin@madad.sa` / `Madad@123`
- `commander@madad.sa` / `Madad@123`
- `dispatcher@madad.sa` / `Madad@123`

## Dispatch score
The dispatch engine ranks available teams using weighted distance, skill fit, current load, zone coverage and resource readiness. Every score contains an explanation so the assignment is auditable.

## AI behavior
The repository includes a lightweight logistic ML training pipeline in `apps/api/ml/train_model.py`. It trains on deterministic synthetic operations data and writes an embedded model used by the API for risk/SLA probabilities and ETA features. This makes the demo fully offline and reproducible. **The synthetic model is a portfolio prototype, not a production safety model or a model trained on real Hajj operational data.**

## Security notes
Demo secrets must be replaced before deployment. The API includes Helmet, CORS, rate limiting, password hashing, JWT access/refresh flow, input validation, RBAC and audit logging. Production should add secret management, HTTPS, external log aggregation, backups, WAF and managed identity/SSO.
