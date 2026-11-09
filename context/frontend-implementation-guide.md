# OnBoard frontend implementation guide for Claude Code

Status: frontend feature work has not started. Backend Phase 1 has introduced a shared Next.js scaffold and process-liveness endpoint. Product APIs are still planned. Read [actual API contracts](backend-api-contracts.md) and [service setup](service-setup-checklist.md) before binding features. Never report a feature as integrated solely because it matches a roadmap.

## Assignment and required starting context

Claude Code implements the frontend. Codex implements backend services, database logic, permissions, and contracts. Both work within one Next.js application; directory location does not determine ownership of server code.

Before writing code, perform Phase 0 below. Before each later phase, reread the relevant backend phase and inspect what actually exists. The frontend must reflect the backend's data model, permissions, validation, availability rules, and supported operations.

### Context sources and discrepancies

Read these sources together:

1. Applicable repository instructions, including any future `AGENTS.md` or `CLAUDE.md` files.
2. [README](../README.md): agreed product scope and stack.
3. [Backend implementation roadmap](backend-implementation-roadmap.md): domain rules, dependencies, and backend milestones.
4. This frontend guide, including the integration matrix and progress log.
5. Actual package manifests, lockfiles, migrations, database functions, server routes, validation schemas, shared types, seed records, and implemented checks when they exist.
6. Supplied design references and assets in `context/` or other documented locations.

User decisions define intended behavior. Executable code and verified contracts establish what is currently available. If code and documentation disagree, document the specific discrepancy and coordinate a correction; do not silently copy a bug or invent a new rule. Never assume a proposed file or route already exists.

## Shared workspace and implementation boundaries

| Claude Code owns | Codex owns | Coordinate together |
| --- | --- | --- |
| Page layouts, visual components, Tailwind styles, accessibility, responsive behavior | Database migrations, constraints, row-level security, server authorization | Root layout/provider composition and initial Next.js scaffold |
| Frontend forms and display formatting | Authoritative validation, inventory transactions, session handling | Shared DTOs, validation exports, API contracts, package manifests/lockfiles |
| Browser data adapters and supported authenticated subscriptions/uploads | Server routes/actions, database functions, Storage/Realtime policies | Environment examples, integration checks, contract changes |
| UI loading/error/conflict states and route navigation | Guest workspace isolation, lifecycle, and cleanup | Seed asset manifests, feature readiness, deployment handoff |

- Keep UI under `frontend/`. Backend server routes also live there: inspect existing files before editing, and do not replace server logic to make a screen easier to build.
- Do not create a second Next.js app, Express backend, authentication system, database schema, or duplicate business-rule layer.
- If a backend change is needed, record a concrete change request with the affected UI, missing operation/field, and expected behavior. Leave an explicit integration dependency while continuing independent UI work.
- Do not overwrite another implementer's changes, recreate their files, or independently regenerate shared lockfiles without checking the current state.
- Ordinary UI choices can proceed using the agreed direction. Unresolved product rules remain recorded as unresolved rather than being silently decided by a form implementation.

## Backend connection rules

### Contracts before bindings

For each feature, identify the actual operation before connecting the UI. Record:

- Exact server route/action/function or authorized SDK operation and source file.
- Request fields, response fields, enums, nullable values, IDs, and validation limits.
- Required actor/session, ownership, and onboarding state.
- Pagination/sorting, money/date units, geographic coordinate order, and radius units.
- Error semantics, retry/idempotency requirements, and resulting cache refreshes.

Reuse exported application contracts where available. Database-generated types can help, but a database row is not automatically a safe public API response. Do not copy private columns into client components or serialize secrets through server-rendered props.

### Data access and UI state

- Centralize feature data access in typed adapters/hooks consistent with the established application. Avoid scattered, speculative endpoint strings in components.
- Prefer the implemented server operations for business mutations. Use direct browser Supabase access only where the backend explicitly supports it with verified policies, such as a defined upload or subscription flow.
- Use Clerk's supported session integration; Guest entry uses the backend's guest session. A `localStorage` role flag is not authorization or a replacement for a session.
- Clear actor-scoped state and subscriptions on sign-out, Guest reset/expiry, and tenant/landlord demo switching. Do not flash the previous actor's private data while fetching the next profile.
- Keep unsaved form inputs and UI state locally. Persist profiles, reservations, availability, listings, and messages through the backend.
- Handle loading, empty, validation failure, unauthenticated, forbidden, missing-record, conflict, network failure, and retry states as relevant.
- Do not announce reservation confirmation, publication, upload completion, or message delivery until the server acknowledges the operation. Reconcile optimistic UI with the authoritative response.
- Refresh/invalidate all affected views after a mutation: a confirmation can affect the listing detail, feed, map, requests, and landlord inventory.

### Mocks versus the actual Guest demo

Development mocks are temporary frontend fixtures. The Guest experience is a real backend-backed isolated demo session; it is not the mock mode.

- Use typed fixtures matching an agreed contract only when an operation is unavailable. Keep them behind an explicit development-only adapter, separate from live code.
- Label mock-backed work as **Mocked** in the integration matrix. Never silently fall back to mocks on an API error or failed configuration.
- If no contract exists, record a proposed interface for Codex to reconcile; do not present it as an implemented API.
- Mocked views may be designed and reviewed, but cannot be marked **Verified** or shipped as supposedly connected features.
- Once the real operation exists, replace the mock binding and verify persistence, authorization, errors, and refresh behavior against the database-backed workflow.

## Dependencies and scaffold coordination

- Reuse the Next.js App Router, TypeScript, Tailwind, Clerk, Supabase, Zod, and test tooling described in the backend roadmap. Install into the existing `frontend/` package, not a duplicate package inside a feature directory.
- If no app exists, coordinate one scaffold with Codex using the backend roadmap's installation instructions. Record which implementer performed it.
- Add `maplibre-gl` when implementing the map. Choose a compatible wrapper only if needed; a React wrapper is not automatically required.
- Use native `fetch`, existing React/Next.js tools, and project utilities first. Form libraries, query caches, icon libraries, class utilities, and UI kits are optional additions with a concrete purpose, not assumed dependencies.
- Coordinate browser end-to-end tooling, such as Playwright, for critical integrated flows; reuse the existing runner where available rather than adding overlapping tools.
- Check current official documentation and installed versions before writing SDK-specific code. Record dependency changes and commit the lockfile. Do not paste examples for a different Tailwind/Clerk/Next.js version into the project.
- Never install Brevo for authentication or expose Clerk secrets, database connection strings, or privileged Supabase keys in client code or public environment variables.

## Phase 0 — Gather context and establish backend readiness

### 0.1 Repository discovery

- [ ] Read the context sources above, list existing files, and inspect the current package/scripts and working changes.
- [ ] Identify the current Next.js scaffold, shared UI conventions, server-only modules, data adapters, and tests; record missing pieces.
- [ ] Read supplied visual references. Record that final visual references are pending if none exist; use the agreed minimal design with a large hero image as the starting direction.

### 0.2 Integration inventory

- [ ] Inspect real backend operations and compare them to the backend phase status; do not infer readiness from phase headings.
- [ ] Populate the integration matrix below with actual source references or explicit missing dependencies.
- [ ] Record schema/contract mismatches and any backend change requests under the handoff section.
- [ ] Identify safe independent UI work and which features need contracts or external configuration.

**Completion:** a short context/readiness report names existing implementation, missing contracts, open decisions, and the next coherent frontend slice. Inspect the shared scaffold before creating anything; product feature APIs remain planned.

## Phase 1 — Shared app foundation and design system

### 1.1 Application structure

- [ ] Reuse or coordinate the single application scaffold. Define routes for landing/auth, onboarding, discovery, property details, landlord management, requests, chat, and profile settings; treat route names as proposals until the app conventions are established.
- [ ] Integrate providers/layouts with Codex without replacing session checks or server boundaries. Keep browser-only map/subscription code isolated appropriately.
- [ ] Create typed data adapters against available contracts and an explicit development fixture adapter for unavailable ones.

### 1.2 Visual foundations

- [ ] Establish reusable Tailwind tokens/conventions for colors, type, spacing, surfaces, focus states, and breakpoints.
- [ ] Build buttons, fields, validation messages, cards, badges, dialogs, navigation, skeletons, and empty/error states.
- [ ] Support keyboard navigation, visible focus, labels, readable contrast, and reduced motion. Do not communicate availability using color alone.

**Backend dependency:** Phase 1 contracts for data bindings; static primitives can proceed independently.

**Completion:** a responsive application shell and reusable primitives exist without duplicated backend logic.

## Phase 2 — Landing page and entry paths

### 2.1 Landing page

- [ ] Build the minimal landing page with a large hero image, clear boarding-house purpose, city/search entry, and tenant/landlord calls to action.
- [ ] Use supplied assets or clearly identified placeholders while references are pending. Keep fictional listings and illustrative imagery identifiable as demo content.
- [ ] Use real published listing data for dynamic sections when available; do not present made-up live inventory totals or reviews as facts.

### 2.2 Navigation and authentication entry

- [ ] Provide sign-up, sign-in, and **Guest** entry, and retain intended navigation through authentication where supported.
- [ ] Route Guest entry through backend session creation when available. A temporary disabled/development preview must not masquerade as functioning Guest access.

**Backend dependencies:** Phases 3–4 for functioning entry; Phase 6 for dynamic listing sections.

**Completion:** public navigation works responsively, and entry paths have accurate integration status.

## Phase 3 — Clerk authentication and first-time onboarding

### 3.1 Identity and route state

- [ ] Connect Clerk sign-up/sign-in and email verification using the configured integration. Avoid a separate OTP store or fake verification flow.
- [ ] Fetch the application profile/session state and distinguish public visitor, registered tenant, registered landlord, Guest tenant, and Guest landlord.
- [ ] Route new registered users into onboarding, resume unfinished onboarding, and send completed users to their supported main experience. UI route guards supplement server authorization.

### 3.2 Onboarding pages

- [ ] Implement Welcome/role, Basic profile, Role-specific setup, and Review/finish with progress and Back/Next controls.
- [ ] Bind partial saves and completion to backend operations; show save failures and avoid advancing as though completion succeeded.
- [ ] For tenants, collect the agreed city, budget, room/bed preference, intended occupancy, move-in timing, and optional destination/radius.
- [ ] For landlords, collect profile/primary city and introduce inventory management; do not require publication to finish.
- [ ] Clearly label optional and private information, including relevant gender/sex fields; do not infer it from names or display private details publicly.
- [ ] Offer guests a replayable walkthrough using demo values without requiring registration or personal information.

**Backend dependencies:** Phase 3 profile/onboarding operations; Phase 4 Guest state; Phase 6 lookup where used.

**Completion:** real onboarding survives reload, completion is recognized after signing in again, and guests can bypass the walkthrough.

## Phase 4 — Guest demo shell and actor switching

### 4.1 Demo controls

- [ ] Display a clear demo indicator, current tenant/landlord role, and a role-switch control backed by the guest session operation.
- [ ] Implement reset and expired-session handling according to backend policy; explain that reset clears the visitor's demo changes.
- [ ] Refresh actor-scoped navigation, data, subscriptions, and pending forms after a successful role switch or reset.

### 4.2 Isolation verification

- [ ] Exercise two independent browser sessions and confirm each sees its own mutations.
- [ ] Verify Guest changes persist for the documented session lifetime and do not modify shared seed templates.

**Backend dependency:** Phase 4. Do not substitute a client role toggle for the session implementation.

**Completion:** Guest entry, switching, reset, and expiry work against the isolated backend session.

## Phase 5 — Feed, property details, filters, and maps

### 5.1 Discovery and details

- [ ] Connect paginated feed and detail operations. Represent property → room → optional bed-space structure accurately.
- [ ] Show PHP monthly price with its per-room/per-person basis, move-in costs, available slots, available-from date, house rules, gender occupancy restrictions, amenities, and photos.
- [ ] Implement address/city search and supported filters, including an explicit include-full option. Encode shareable non-sensitive filters in the URL where practical; avoid putting private destination details into public URLs by default.
- [ ] Keep full properties viewable with text status such as **FULL — 0 slots available**, without revealing occupants' identities.

### 5.2 Map and radius controls

- [ ] Integrate MapLibre with the selected tile provider and required attribution. MapLibre is a renderer, not the geocoding service.
- [ ] Add destination pin placement, optional landmark/address lookup, adjustable radius, Feed/Map toggle, and corresponding listing markers.
- [ ] Convert UI radius units to the backend's contract and draw the radius geographically rather than as a fixed pixel circle.
- [ ] Query the backend for radius membership and availability. Avoid a competing frontend distance/filter implementation as the source of search truth.
- [ ] Keep results consistent across feed/map views; respect pagination/truncation and do not show a page count as the total map count.
- [ ] Debounce requests, ignore stale search responses, and handle empty results, failed map loading, denied optional geolocation, and manual-pin fallback.

**Backend dependency:** Phase 6 and published data from Phase 5; selected tile/geocoding configuration for provider-specific behavior.

**Completion:** a Manila or Cebu destination/radius produces backend-consistent listings and usable detail pages, including full and empty states.

## Phase 6 — Landlord dashboard, listing forms, and inventory

### 6.1 Property and room management

- [ ] Bind dashboard counts and lists to owner-scoped backend results.
- [ ] Build draft/edit/publish/archive forms for properties, rooms, and bed spaces using actual validation contracts.
- [ ] Separate publication state from availability and whole-room rental from per-bed rental. Do not expose conflicting inventory options prohibited by the backend.
- [ ] Include all agreed prices, address/pin, capacity, amenities, rules, gender restrictions, and availability fields. Explain the estimated move-in cost using the backend's components.

### 6.2 Photos and safe editing

- [ ] Use the supported upload flow, preserving image order and enforcing the backend's size/type/count limits. Support 4–6 images for publication while allowing incomplete drafts.
- [ ] Show progress, failed-upload recovery, previews, and removal behavior without treating a local preview as a persisted upload.
- [ ] Surface conflicts when active reservations/occupancies block an inventory change. Preserve input on validation/server failures.

**Backend dependency:** Phase 5, with Phase 7 integration for reservation-related edit restrictions.

**Completion:** a landlord publishes a listing through real persistence and can reload it; unrelated owners cannot edit it, including through a directly visited management URL.

## Phase 7 — Viewing requests, reservations, and occupancy UI

### 7.1 Tenant requests

- [ ] Submit viewing/reservation requests for the exact room/bed inventory with intended move-in date and occupant count.
- [ ] Make request-based booking explicit. A submitted request is pending, not confirmed, paid, or occupied.
- [ ] Display request history and available actions from backend permissions and statuses. Do not invent cancellation/expiry options before the policy exists.

### 7.2 Landlord decisions and status refresh

- [ ] Connect review, confirm, decline, and move-in actions as supported. Use the agreed labels for reservation versus inventory state.
- [ ] Prevent accidental repeated clicks while requests are pending and use any contract-defined idempotency mechanism.
- [ ] Handle last-slot conflict responses, refetch authoritative availability, and show a clear explanation when another request takes the slot.
- [ ] Refresh feed/detail/map/dashboard views after inventory changes; pending requests must not locally decrement slots.

**Backend dependency:** Phase 7, including confirmed status transitions and policies.

**Completion:** tenant request → landlord confirmation → occupied status can be demonstrated with persisted data, accurate counts, and honest conflict states.

## Phase 8 — Conversations and message delivery

### 8.1 Chat screens

- [ ] Build conversation list/history/composer and show the relevant property/room context.
- [ ] Connect participant-only history, pagination, send/retry, and viewing/reservation links. Render text safely.
- [ ] Distinguish sending, server-accepted, and failed messages. Do not invent delivery/read receipts without backend support.

### 8.2 Updates and lifecycle

- [ ] Use the supported authenticated Realtime path for registered users and the documented Guest transport, including server polling if selected.
- [ ] Deduplicate by stable server IDs, fetch missed history on reconnect, and unsubscribe when the actor/conversation changes.
- [ ] Handle deleted/unavailable listing context and forbidden conversations without leaking message history.

**Backend dependencies:** Phase 8 and Phase 4's Guest transport decisions.

**Completion:** authorized participants exchange persisted messages across reload/reconnect, while another actor cannot access the conversation.

## Phase 9 — Two-city demo polish and integration verification

### 9.1 Demo consistency

- [ ] Consume the seed dataset and image manifests supplied by Codex; remove development fixtures from live bindings.
- [ ] Verify both Manila City and Cebu City have useful scenarios: private rooms, bed spaces, partially full buildings, reserved units, and full properties.
- [ ] Check that photos, prices, names, geography, map results, and availability agree with backend data.
- [ ] Review responsive layouts for small phones, tablets, and desktop, including gallery, map controls, forms, and chat.

### 9.2 Meaningful verification

- [ ] Run the configured type checks, lint, and production build. Add focused UI tests for complex behavior rather than duplicating every presentational component.
- [ ] Run critical browser journeys with the real backend: registered onboarding, Guest entry/switch/reset, radius search, publish/edit listing, request/confirm/move-in, and chat.
- [ ] Exercise validation, empty data, service failure, expired session, ownership denial, last-slot conflict, failed upload, and reconnect behavior.
- [ ] Inspect browser console/network failures and keyboard/screen-reader basics. Record live-provider checks that could not be run.
- [ ] Confirm browser bundles and serialized responses contain no server secrets or private fields beyond the current actor's authorized access.

### 9.3 Final handoff

- [ ] Update the integration matrix with actual operation source paths, checks, and remaining gaps; no critical workflow may remain Mocked while reported as integrated.
- [ ] Record setup commands, environment variable names, assets, and provider configuration without secrets.
- [ ] Hand unresolved backend issues to Codex with reproduction steps, expected/actual behavior, and relevant request/response details stripped of sensitive data.

**Backend dependencies:** Phases 9–10 and all earlier integrated operations.

**Completion:** the agreed frontend workflows are database-backed and verified, the design works across target viewports, and remaining limitations are explicit. Deployment is only verified after checking the deployed application.

## Integration matrix — keep current

Use **Planned**, **Mocked**, **Connected**, **Verified**, or **Blocked**. Connected means a real operation is wired; Verified means its relevant workflow has actually passed checks. Record a blocker reason when blocked. None of the operation paths have been defined yet.

| Capability | Backend phase | Current status | Actual operation / contract source | Verification evidence or next dependency |
| --- | --- | --- | --- | --- |
| Application identity and private profile | 3 | Connected | `frontend/src/app/api/profile/route.ts` | TypeScript passed; database migration still unapplied |
| Onboarding save/resume/complete | 3 | Connected | `frontend/src/app/api/onboarding/route.ts` | TypeScript passed; database migration still unapplied |
| Guest entry/switch/reset/expiry | 4 | Connected | `frontend/src/app/api/guest/session/route.ts` | TypeScript passed; `SUPABASE_SECRET_KEY` and migration required for live verification |
| Property/room/bed management | 5 | Connected | `frontend/src/app/api/landlord/properties` | TypeScript/build passed; database migration still unapplied |
| Images and publication | 5 | Connected | `frontend/src/app/api/landlord/properties/[propertyId]/photos` | Metadata/publication checks added; storage upload still pending |
| Feed and listing detail | 6 | Connected | `frontend/src/app/api/listings/route.ts` | TypeScript/build passed; listing migration still unapplied |
| Address/landmark and radius search | 6 | Connected | `frontend/src/app/api/listings/route.ts` | PostGIS radius contract added; geocoding provider remains undecided |
| Viewings and reservations | 7 | Planned | Not implemented | Transition/actions/error contract |
| Occupancy and available counts | 7 | Planned | Not implemented | Authoritative availability response |
| Chat history/send/updates | 8 | Planned | Not implemented | Participant and transport contract |
| Two-city demo records and images | 9 | Planned | Not generated | Seed IDs and asset manifest |

## Handoff notes and backend change requests

For each future request, record:

```text
Feature / frontend phase:
Relevant backend phase and source files:
Missing operation, field, or mismatch:
Required behavior and reason:
Proposed contract (proposal only until reconciled):
UI work that can continue independently:
Resolution / verification evidence:
```

No open change requests have been recorded yet. Pending product decisions remain those listed in the README and backend roadmap, including visual references, Guest lifecycle, map providers, and reservation policy details.

## Frontend progress log

| Phase | Status | Evidence / next dependency |
| --- | --- | --- |
| 0. Context and readiness | Not started | Guide written; Claude must inspect the current repository |
| 1. Foundation | Not started | Coordinate one application scaffold |
| 2. Landing and entry | Not started | Visual references and entry contracts |
| 3. Authentication and onboarding | Not started | Backend Phase 3 |
| 4. Guest experience | Not started | Backend Phase 4 |
| 5. Discovery and maps | Not started | Backend Phases 5–6 |
| 6. Landlord management | Not started | Backend Phase 5 |
| 7. Requests and occupancy | Not started | Backend Phase 7 |
| 8. Chat | Not started | Backend Phase 8 |
| 9. Demo integration and handoff | Not started | Backend Phases 9–10 |

## Starting instruction for Claude Code

> Implement OnBoard's frontend using `context/frontend-implementation-guide.md`. Begin with Phase 0: read `README.md`, the backend roadmap, applicable repository instructions, and actual existing code. Report backend readiness and contract gaps before binding features. Reuse the single Next.js/TypeScript/Tailwind application, preserve Codex-owned server logic, and implement the next coherent frontend slice against real shared contracts. Explicitly distinguish Planned, Mocked, Connected, and Verified work. Keep the integration matrix and progress log current, and record concrete backend change requests instead of inventing APIs or replacing backend behavior with local state.
