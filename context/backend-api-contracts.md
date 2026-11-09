# OnBoard backend API contracts

## Readiness

Phase 1 and the first Phase 2 database migration are in progress. Only the process-liveness operation below is implemented as an HTTP endpoint. Auth, onboarding, Guest sessions, listings, search, reservations, and chat operations are planned, not callable APIs yet. Claude Code must not guess their route paths or treat the health endpoint as proof of database readiness.

The initial schema migration is at `backend/supabase/migrations/20261109000100_onboard_foundation.sql`. It establishes the domain tables, PostGIS location type, constraints, indexes, and initial RLS policies. It has not been applied to local or hosted Supabase yet.

## Implemented operation: process liveness

- Method/path: `GET /api/health`
- Source: `frontend/src/app/api/health/route.ts`
- Authentication: public.
- Success: HTTP 200 with `application/json`.

```json
{
  "data": {
    "service": "onboard",
    "status": "ok"
  }
}
```

This checks the application process only. It does not access or report Clerk, PostgreSQL, Storage, Realtime, or configuration secrets.

Verification: production build passed and a temporary localhost production server returned the documented JSON from `GET /api/health`. The test server was stopped afterward. Database startup and hosted-provider readiness have not been verified.

## Contract conventions to settle in Phase 1

- Success/error envelopes, field-level validation, and status codes.
- Public and private DTOs and reusable TypeScript exports.
- Pagination, sorting, filters, money representation, and date handling.
- Actor/session contracts for registered and Guest access.
- Reservation transitions, conflicts, retry/idempotency behavior, and affected views.

Expand this file with actual operation paths, inputs, response examples, source references, and checks as each backend slice is implemented. Proposals must be labeled until reconciled with running code.
