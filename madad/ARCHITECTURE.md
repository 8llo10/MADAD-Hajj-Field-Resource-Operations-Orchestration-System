# MADAD Architecture

MADAD keeps domain workflows out of UI components and centralizes operational rules in backend application services. HTTP routes authenticate, authorize and validate input; services own assignment/resolution rules; Prisma is the persistence adapter; Socket.IO and audit logging are cross-cutting outputs.

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
  ├─ Routes / input validation / RBAC
  │          │
  │          ▼
  │   Application & domain services
  │   ├─ Assignment lifecycle
  │   ├─ Team ranking
  │   ├─ Incident lifecycle
  │   └─ Notifications
  │          │
  │          ▼
  ├──────── Prisma persistence adapter
  │
  ├──────── Audit log
  └──────── Realtime events
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
   ├─ config/        # environment + database adapter
   ├─ lib/           # reusable cross-cutting utilities
   ├─ middleware/    # authentication, authorization and errors
   ├─ modules/
   │  ├─ auth/
   │  ├─ incidents/  # incident HTTP boundary and lifecycle commands
   │  ├─ dispatch/
   │  │  ├─ dispatch.routes.ts       # HTTP boundary only
   │  │  ├─ dispatch.service.ts      # explainable team ranking
   │  │  ├─ assignment.service.ts    # assignment/reassignment rules
   │  │  └─ assignment.scheduler.ts  # timeout fallback orchestration
   │  ├─ notifications/
   │  │  └─ notification.service.ts  # team notification application service
   │  ├─ teams/
   │  ├─ resources/
   │  ├─ inventory/
   │  ├─ operations/
   │  └─ reports/
   ├─ realtime.ts
   ├─ app.ts
   └─ server.ts
```

This is intentionally a pragmatic Clean Architecture rather than a framework-heavy rewrite. Business workflows are separated from Express routes without replacing the existing modular structure.

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

The frontend renders state and issues commands. It must not decide whether an assignment, reassignment or resolution is valid; the API enforces those invariants.

## Assignment lifecycle

1. A new incident is created with category, required skills, severity, location, SLA and an optional auto-assignment deadline.
2. `rankTeamsForIncident` calculates availability, specialization, skill fit, proximity, workload and location fit.
3. Operations can choose one of three assignment modes:
   - `MANUAL`: dispatcher selects a specific ranked team.
   - `AI`: ranking engine selects and immediately assigns the best suitable team.
   - `AUTO_TIMEOUT`: scheduler assigns the best suitable team when the human-assignment deadline expires.
4. `assignment.service.ts` rechecks team capacity at commit time to protect against stale UI/ranking data.
5. A committed assignment changes the incident to `ASSIGNED`, marks the team `BUSY`, increments workload and writes an `IncidentStatusEvent`.
6. Every active member of the assigned team receives an `URGENT` notification linked to the incident.
7. `DISPATCHED` changes the incident to `EN_ROUTE`.
8. `ARRIVED` changes the incident to `ON_SITE`.
9. Only the assigned team's authorized member (or an operations authority) can complete the dispatch.
10. Completion records both `resolvedByUserId` and `resolvedByTeamId`, releases resources, updates team workload and sets the incident to `RESOLVED`.

## Reassignment

Reassignment never overwrites history.

1. The current active Dispatch record is cancelled.
2. Attached resources are released.
3. The previous team's workload is decremented.
4. A new Dispatch record is created and committed for the replacement team.
5. The new team receives an urgent notification.
6. Audit and realtime events retain a trace of the change.

This lets reports answer not only “who owns the incident now?” but also “which teams were assigned previously and who changed the assignment?”.

## Reopen lifecycle

Resolved or closed incidents may be reopened through the dedicated reopen command.

- `reopenCount` increments every time.
- `lastReopenedAt` records the latest reopen time.
- the previous resolver remains visible in historical dispatch/status/audit records while current resolution fields are reset for the new cycle.
- a fresh auto-assignment deadline is scheduled when automatic assignment is enabled.
- status becomes `REOPENED` and enters the assignment lifecycle again.

## Invariants enforced by the API

- Resolved/closed incidents cannot be assigned.
- An incident cannot have two committed active dispatches.
- A team is rechecked for availability/capacity when assignment is committed.
- Assignment-managed statuses cannot be forced through the generic incident status endpoint.
- A technician/supervisor cannot operate on another team's dispatch.
- Resolution must pass through the assigned Dispatch, so the resolver identity is always captured.
- Reopening must use the dedicated command so the reopen counter cannot be skipped.
- Reassignment preserves old Dispatch records rather than mutating history.

## Realtime events

Operational pages can subscribe to events such as:

```text
incident.created
incident.updated
incident.reopened
dispatch.proposed
dispatch.assigned
dispatch.reassigned
dispatch.auto-assigned
dispatch.completed
notification.created
team.created
team.member.updated
team.member.removed
```

## Deployment/data lifecycle

The API generates the Prisma client during install/build and applies the current Prisma schema before starting. Schema changes therefore deploy together with the code that consumes the new fields and enums.
