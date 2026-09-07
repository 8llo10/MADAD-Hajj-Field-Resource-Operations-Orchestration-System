# MADAD Architecture

```text
Browser
  │
  ▼
Next.js Web (apps/web)
  │ REST + JWT                  Socket.IO
  ├──────────────────────────────┐
  ▼                              ▼
Express API (apps/api)      Realtime gateway
  │
  ├─ Auth / RBAC
  ├─ Incident Management
  ├─ Dispatch Engine
  ├─ Teams
  ├─ Resources
  ├─ Inventory
  ├─ Operations Command Center
  ├─ Reports
  └─ Audit Logs
  │
  ▼
Prisma ORM
  │
  ▼
PostgreSQL
```

## Backend structure
```text
apps/api/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
└─ src/
   ├─ config/        # env + database
   ├─ lib/           # reusable utilities
   ├─ middleware/    # auth + errors
   ├─ modules/
   │  ├─ auth/
   │  ├─ incidents/
   │  ├─ dispatch/   # isolated ranking/business logic
   │  ├─ teams/
   │  ├─ resources/
   │  ├─ inventory/
   │  ├─ operations/
   │  └─ reports/
   ├─ realtime.ts
   ├─ app.ts
   └─ server.ts
```

## Frontend structure
```text
apps/web/
├─ app/
│  ├─ login/
│  ├─ dashboard/
│  ├─ incidents/
│  ├─ dispatch/
│  ├─ teams/
│  ├─ resources/
│  ├─ inventory/
│  └─ reports/
├─ components/
└─ lib/
```

## Core operational flow
1. Dispatcher creates an incident with category, required skills, severity, location and SLA.
2. `/dispatch/rank/:incidentId` evaluates every team.
3. UI displays every team's score, distance, ETA, breakdown and reasons.
4. The highest suitable team is marked `recommended`.
5. Auto or manual proposal creates a Dispatch record.
6. Accepting a dispatch reserves selected resources, marks team BUSY, and incident ASSIGNED.
7. DISPATCHED -> incident EN_ROUTE.
8. ARRIVED -> incident ON_SITE.
9. COMPLETED -> incident RESOLVED, resources released, team AVAILABLE.
10. All important actions emit realtime events and/or audit records.
