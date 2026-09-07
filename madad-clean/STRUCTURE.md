# MADAD architecture

## Frontend
`apps/web` — Next.js UI only. Screens: login, command center, incidents + team recommendation, dispatch, teams, resources, inventory, reports.

## Backend
`apps/api` — Express API only. Domain modules are separated by responsibility:
- `auth`: login/JWT
- `incidents`: incident lifecycle
- `dispatch`: team ranking, recommendation, assignment lifecycle
- `teams`: field team state
- `resources`: operational assets
- `inventory`: stock transactions
- `operations`: command-center KPIs
- `reports`: operational metrics
- `catalog`: sites/notifications/audit

## Database
Prisma + PostgreSQL in `apps/api/prisma`.

## Team recommendation score (0–100)
For every non-offline team with remaining capacity:
- Availability: 25
- Specialization match: up to 22
- Required skill match: up to 20
- Proximity: up to 18
- Workload: up to 10
- Same site/zone: up to 5

Ties favor shorter physical distance. The result returns every ranked team, the numerical score, distance, ETA, a score breakdown, reasons, and `recommended: true` for the best candidate.

## Dispatch lifecycle
`PROPOSED → ACCEPTED → DISPATCHED → ARRIVED → COMPLETED`

The dispatcher can also manually override the recommendation, while the selected team's calculated score is still preserved for auditability.
