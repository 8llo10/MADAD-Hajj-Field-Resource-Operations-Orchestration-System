# MADAD Architecture

## Domain boundaries

- **Identity & Access** — users, passwords, JWT access/refresh, roles.
- **Incident Management** — operational issue lifecycle and status history.
- **Dispatch Orchestration** — candidate ranking, operator proposal, acceptance, movement and completion.
- **Field Workforce** — teams, members, skills, availability, active load.
- **Resource Management** — vehicles/equipment, capability tags, inspection state.
- **Inventory** — stock, reorder thresholds and immutable movement transactions.
- **Operational Intelligence** — explainable incident risk, SLA risk, ETA and recommendations.
- **Command Center** — KPIs and seven-day performance reports.
- **Governance** — audit trail and user notifications.
- **Realtime** — Socket.IO operational event bus.

## Key backend flow

```text
POST incident
  -> validate request
  -> resolve site/zone context
  -> run risk model
  -> persist incident + status event
  -> append audit event
  -> publish realtime event

Dispatch
  -> fetch all AVAILABLE teams
  -> calculate geodesic distance
  -> calculate skill fit
  -> calculate current-load capacity
  -> apply site + zone coverage weights
  -> return ranked candidates + explanation
  -> operator accepts proposal
  -> atomically mark team busy, reserve resources, update incident
  -> write status event + audit event + realtime event
```

## Dispatch weights

| Signal | Weight |
|---|---:|
| Skill fit | 32% |
| Distance | 28% |
| Current capacity | 18% |
| Same site coverage | 14% |
| Same zone coverage | 8% |

The score is intentionally explainable. Operators can override the recommendation through manual dispatch while preserving an auditable record.

## Suggested production evolution

Use Redis for distributed Socket.IO/pub-sub and hot operational caches, a message broker for durable async jobs, object storage for incident attachments, an observability stack for traces/metrics/logs, SSO/OIDC, and a managed geospatial service if route-aware ETA replaces the current Haversine approximation.
