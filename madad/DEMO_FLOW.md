# MADAD Demo Flow

1. Sign in as `dispatcher@madad.sa` / `Madad@123`.
2. Open **Incidents** and create a HIGH or CRITICAL incident.
3. The backend immediately stores an AI risk score, SLA-breach probability, estimated resolution time and explanation.
4. Open **Dispatch**, select the new incident and inspect ranked field teams.
5. Auto-propose the best team or call the manual-dispatch API for an operator override.
6. Accept the dispatch with optional resource IDs. This transaction changes the incident to ASSIGNED, increments team workload and reserves resources.
7. Move the dispatch through DISPATCHED -> ARRIVED -> COMPLETED.
8. Inspect **Teams**, **Resources**, **Inventory**, **Audit** and the command-center KPIs.
9. Call `GET /api/v1/reports/operations` for seven-day operational performance.
