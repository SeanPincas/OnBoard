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

## Implemented operations: authenticated profile and onboarding contracts

These route handlers are implemented but require the foundation migration to be applied before database-backed requests can succeed. They use the Clerk session and forward its token to Supabase. Unauthenticated requests return HTTP 401.

### `GET /api/profile`

Returns the current actor's profile or `null` when a profile has not been created.

### `PUT /api/profile`

Validates and upserts the current actor's profile. The Clerk user ID is taken from the verified server session and cannot be supplied by the request body.

```json
{
  "role": "tenant",
  "displayName": "Demo Tenant",
  "profilePhotoUrl": null,
  "contactPhone": null,
  "permanentAddress": null,
  "age": null,
  "gender": null,
  "studentOrEmploymentStatus": "student"
}
```

### `GET /api/onboarding`

Returns the current actor's saved `onboarding_progress` and `onboarding_completed_at` values. A profile that does not exist returns an empty progress object.

### `PATCH /api/onboarding`

Saves partial onboarding progress or marks it complete for the current actor.

```json
{
  "progress": { "step": "tenant-preferences", "city": "manila_city" },
  "completed": false
}
```

Route source files are `frontend/src/app/api/profile/route.ts` and `frontend/src/app/api/onboarding/route.ts`. The shared Clerk/Supabase bridge is in `frontend/src/lib/supabase/server.ts`, with Zod validation in `frontend/src/lib/validation/profile.ts`.

## Implemented operations: Guest session boundary

These operations use an opaque HTTP-only cookie named `onboard_guest_session`. Only its SHA-256 hash is stored in `guest_sessions`. They require the server-only `SUPABASE_SECRET_KEY` and the Phase 4 migration. Guest records must be accessed through these server services, not a browser Supabase client.

- `POST /api/guest/session` creates one session with tenant and landlord demo profiles.
- `GET /api/guest/session` returns the current session and its two demo actors, or `null` after expiry.
- `PATCH /api/guest/session` accepts `{ "role": "tenant" | "landlord" }` and changes only the active demo role.
- `DELETE /api/guest/session` records a reset marker for the current session. Full template-data reset will be added when guest listing/session-owned data is introduced.

The session service is in `frontend/src/lib/guest-session.ts`. The database migration is `backend/supabase/migrations/20261109000200_guest_sessions.sql`. Guest operations have TypeScript coverage through the production build, but live database isolation has not been verified while migrations remain unapplied.

## Contract conventions to settle in Phase 1

- Success/error envelopes, field-level validation, and status codes.
- Public and private DTOs and reusable TypeScript exports.
- Pagination, sorting, filters, money representation, and date handling.
- Actor/session contracts for registered and Guest access.
- Reservation transitions, conflicts, retry/idempotency behavior, and affected views.

Expand this file with actual operation paths, inputs, response examples, source references, and checks as each backend slice is implemented. Proposals must be labeled until reconciled with running code.
