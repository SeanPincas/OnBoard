# OnBoard backend API contracts

## Readiness

Phases 1 through 7 are in progress. The HTTP operations below are implemented against versioned contracts, but database-backed requests require the migrations to be applied first. Claude Code must use these route paths and must not treat a successful build as proof of database readiness.

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

## Implemented operations: landlord inventory foundation

These routes require an authenticated Clerk user whose application profile has the `landlord` role. They are owner-scoped through Supabase RLS.

- `GET /api/landlord/properties` lists the current landlord's properties.
- `POST /api/landlord/properties` creates a draft property and converts latitude/longitude to a PostGIS point through `create_property`.
- `PATCH /api/landlord/properties/:propertyId` changes draft, published, or archived state. Publishing requires at least one room and four property photos.
- `GET /api/landlord/properties/:propertyId/rooms` lists rooms owned through the property.
- `POST /api/landlord/properties/:propertyId/rooms` creates a private or shared room with an enforced rental basis.
- `POST /api/landlord/rooms/:roomId/bed-spaces` creates a bed space in an owned room.
- `POST /api/landlord/properties/:propertyId/photos` records an owned listing photo and enforces a six-photo maximum. Upload/signing and storage-bucket setup are a later slice.

Validation is in `frontend/src/lib/validation/inventory.ts`, landlord authorization context is in `frontend/src/lib/supabase/landlord.ts`, and the PostGIS creation function is in `backend/supabase/migrations/20261109000300_inventory_functions.sql`. Live checks still await applying migrations.

## Implemented operation: public listing search

`GET /api/listings` is the shared feed and map search contract. It is publicly readable and returns only published listing data.

Supported query parameters include `city`, `search`, `minRent`, `maxRent`, `roomType`, `includeUnavailable`, `latitude`, `longitude`, `radiusMeters`, `limit`, and `offset`. Latitude, longitude, and radius must be supplied together. Rent values are monthly PHP amounts, and radius is in meters.

The response is `{ "data": [...], "meta": { "limit": number, "offset": number } }`. Each result includes property/room IDs, titles, city, address, coordinates, rental basis, monthly rent, capacity, available count, photo metadata, and `distance_meters` when a center point is supplied.

The PostGIS function is `public.search_listings` in `backend/supabase/migrations/20261109000400_listing_search.sql`. The route is `frontend/src/app/api/listings/route.ts`, with query validation in `frontend/src/lib/validation/listings.ts`. Address/geocoding lookup is still provider-independent and manual pinning is supported by the contract.

## Implemented operations: reservation and occupancy workflow

These routes use Clerk authentication and Supabase RLS. State-changing actions execute transactional database functions so confirmation performs a fresh availability check and creates exactly one reservation allocation. Pending requests do not consume inventory; confirmed allocations are reserved; move-in changes them to occupied.

- `GET /api/reservations` lists reservations visible to the current tenant or landlord.
- `POST /api/reservations` accepts a tenant request with `propertyId`, `roomId`, optional `bedSpaceId`, `requestedOccupants`, `intendedMoveIn`, and an optional message. It calls `create_reservation_request` and snapshots the current monthly rent.
- `PATCH /api/reservations/:reservationId` accepts `{ "action": "confirm" | "decline" | "cancel" | "move_in" }`. Tenant cancellation and landlord review are actor-checked in the database. Confirmation returns a conflict when capacity or bed availability has changed.

The route sources are `frontend/src/app/api/reservations/route.ts` and `frontend/src/app/api/reservations/[reservationId]/route.ts`. Validation is in `frontend/src/lib/validation/reservations.ts`. The authoritative functions, transition rules, and allocation constraints are in `backend/supabase/migrations/20261109000500_reservation_workflow.sql`.

Live RLS, locking, and concurrent-confirmation behavior remain pending because the project migrations have intentionally not yet been applied to hosted Supabase.

## Contract conventions to settle in Phase 1

- Success/error envelopes, field-level validation, and status codes.
- Public and private DTOs and reusable TypeScript exports.
- Pagination, sorting, filters, money representation, and date handling.
- Actor/session contracts for registered and Guest access.
- Reservation transitions, conflicts, retry/idempotency behavior, and affected views.

Expand this file with actual operation paths, inputs, response examples, source references, and checks as each backend slice is implemented. Proposals must be labeled until reconciled with running code.
