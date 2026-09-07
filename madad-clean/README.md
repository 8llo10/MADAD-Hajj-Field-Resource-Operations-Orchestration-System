# MADAD | Field Resource & Operations Orchestration Platform

Clean monorepo with a Next.js frontend and Express/Prisma/PostgreSQL API.

## Core workflow
1. Create an incident.
2. MADAD scores all eligible teams using availability, specialization, skills, proximity, workload, site/zone fit, and ETA.
3. The API returns a ranked list plus a recommended team and human-readable score breakdown.
4. Dispatcher can auto-propose the best team or manually select another.
5. Dispatch progresses through proposed → accepted → dispatched → arrived → completed.
6. Team/resource state, incident state, audit history, and operations dashboard update along the way.

## Local setup
```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
docker compose up -d
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

API: http://localhost:4000/api/v1/health
Web: http://localhost:3000

## Demo accounts
- admin@madad.sa / Madad@123
- commander@madad.sa / Madad@123
- dispatcher@madad.sa / Madad@123

## Render backend
Root directory: `apps/api`
Build command: `npm install && npx prisma generate && npm run build`
Start command: `npm start`

Run `npx prisma db push && npm run db:seed` only once for the first database initialization. Do not run the seed on every deploy because it resets demo data.
