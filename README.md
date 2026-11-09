# OnBoard

OnBoard is a planned boarding-house discovery and reservation web app focused on affordable monthly stays in the Philippines. It takes inspiration from hotel and stay-booking websites, with an emphasis on boarding houses, rooms, and individual bed spaces near a tenant's school or workplace.

## Project status

Backend Phase 1 (foundation) has started with the shared Next.js scaffold, initial dependencies, Supabase CLI configuration, environment template, and a process-liveness endpoint. Product features and hosted service integrations are not implemented yet. The agreed stack is Next.js, TypeScript, Tailwind CSS, Clerk, Supabase, and MapLibre GL JS.

## Folder structure

```text
OnBoard/
├── frontend/                         # Next.js application, UI, and server routes
│   ├── src/app/                      # App Router pages, layout, styles, and API routes
│   │   └── api/health/               # Process-liveness endpoint
│   ├── public/                       # Static frontend assets
│   ├── Dockerfile                    # Production frontend image
│   ├── .env.example                  # Safe environment-variable template
│   ├── package.json                  # Frontend dependencies and scripts
│   └── next.config.ts                # Next.js standalone container configuration
├── backend/                          # Supabase database tooling and configuration
│   ├── supabase/                     # Local CLI project, migrations, seeds, and database config
│   ├── package.json                  # Supabase CLI scripts
│   └── README.md                     # Backend tooling commands
├── context/                          # Specifications, roadmaps, and project decisions
│   ├── backend-implementation-roadmap.md
│   ├── frontend-implementation-guide.md
│   ├── backend-api-contracts.md
│   ├── service-setup-checklist.md
│   └── service-accounts.md
├── docker-compose.yml                # Production-style local app container
├── .dockerignore                     # Docker build exclusions
├── .gitignore                        # Git and local-secret exclusions
└── README.md                         # Main project context and agreed scope
```

Generated folders such as `node_modules/`, `.next/`, local environment files, and Supabase temporary state are intentionally excluded from version control.

## Product direction

- Focus on affordable boarding-house rentals in the Philippines.
- Use a polished, minimal visual design inspired by hotel reservation websites.
- Create an attractive landing page with a large hero image. Reference images and further design direction will be supplied later.
- Support both whole-room rentals and individual bed spaces. Always distinguish monthly rent per room from monthly rent per person.
- Build a believable portfolio demo using fictional users, properties, rooms, reservations, and conversations rather than depending on real clients or beta testers.

## Agreed technology stack

| Area | Technology | Responsibility |
| --- | --- | --- |
| Application framework | Next.js with App Router | Landing page, listing pages, dashboards, and server routes |
| Language | TypeScript | Typed application code |
| Styling | Tailwind CSS | Responsive layouts and custom visual styling; Sass is not needed |
| Authentication | Clerk | Registered-user sign-up, sign-in, email verification codes, and sessions |
| Database | Supabase PostgreSQL | Profiles, properties, rooms, bed spaces, reservations, and messages |
| Geographic queries | PostGIS | Coordinate storage and straight-line radius searches |
| Image storage | Supabase Storage | Listing photos and other uploaded images |
| Live messaging | Supabase Realtime | Message updates, with conversation history stored in PostgreSQL |
| Interactive maps | MapLibre GL JS | Map rendering, property markers, destination pins, and radius overlays |

### Application architecture

- Keep the Next.js application in `frontend/`, including server routes for application requests. A separate Express server is not needed for the initial build.
- Keep Supabase database migrations, seed data, and database functions in `backend/`.
- Use Clerk for identity and sessions. Store application profiles, tenant/landlord roles, permissions, preferences, and onboarding progress in PostgreSQL, linked to the Clerk user ID.
- Integrate Clerk with Supabase's supported third-party authentication mechanism. Enforce access rules on the server and through database row-level security; a UI role switch alone must not grant access to another user's records.
- Use an application-managed, isolated guest demo session with premade tenant and landlord profiles. Guest visitors do not need a Clerk account. The session persistence and reset mechanism remain to be designed.
- MapLibre is the map renderer. A map-tile provider and an address-search/geocoding provider still need to be selected.
- Use database transactions for reservation confirmation so competing requests cannot reserve the same room or bed space twice.

Technology references: [Next.js](https://nextjs.org/docs/app/getting-started), [Clerk with Supabase](https://supabase.com/docs/guides/auth/third-party/clerk), [Supabase database](https://supabase.com/docs/guides/database/overview), and [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/).

## Authentication and access

Use **Clerk** for registered-user authentication and email verification codes. Clerk supports verification-code delivery, so **Brevo is not needed for authentication**. A separate transactional email service can be considered later if reservation or other application emails are added.

Reference: [Clerk sign-up and sign-in options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options).

### Tenant

Tenants can browse listings, search locations, filter rooms, chat with landlords, request viewings, and submit reservation requests.

Suggested private profile fields include name, contact details, permanent address or hometown, age or age range, gender/sex where relevant to occupancy requirements, student or employment status, intended move-in date, and intended number of occupants. Sensitive profile information must not appear on public listings.

### Landlord

Landlords can create and manage their own properties, rooms, bed spaces, availability, reservation requests, and tenant conversations. Only landlords can publish rental listings.

Landlord profiles can include a name, photo, contact details, and public property information. Personal address details should remain private.

### Guest demo

- Add a **Guest** button to the authentication screen so viewers and potential employers can enter without registering or signing in.
- Give guests access to both the tenant and landlord demo experiences, with a clear way to switch roles.
- Back guest access with a premade demo database containing fictional records.
- Allow guests to explore the core workflows, including browsing, landlord management, reservation requests, and sample chat conversations.
- Keep guest changes isolated from other visitors' experiences; the exact session/reset approach will be decided during implementation.
- Clearly identify demo content and generated room imagery as fictional.

## First-time user onboarding

After a user's first successful authentication, guide them through a dedicated onboarding page flow before entering their main experience.

1. **Welcome and role:** Choose **Find a place (Tenant)** or **List my property (Landlord)**, with a short explanation of each experience.
2. **Basic profile:** Collect the essential profile information for the selected role. Keep optional fields clearly marked and personal details private.
3. **Role-specific setup:**
   - **Tenant:** Choose Manila City or Cebu City, a monthly budget, room or bed-space preference, intended occupancy, and move-in timing. Offer an optional school/workplace map pin and preferred search radius. Collect gender/sex information only where relevant to accommodation requirements, with the purpose explained.
   - **Landlord:** Set up the public landlord profile and primary property city. Introduce property, room, and bed-space management, including occupancy restrictions and availability. Offer to create the first listing after onboarding; publishing a listing is not required to complete onboarding.
4. **Review and finish:** Let users review their choices, then send tenants to a feed using their preferences and landlords to their management dashboard.

Show progress and Back/Next controls, preserve entered information between steps, and allow optional setup to be skipped. Save onboarding progress and completion per account: returning users resume unfinished onboarding or go directly to their main experience after completion. Profile details and preferences remain editable afterward.

Guest visitors can enter immediately with premade demo profiles and switch between tenant and landlord roles. Offer an optional, replayable onboarding walkthrough for guests so viewers can inspect the first-time experience without entering personal information.

## Browsing and location search

- Provide a scrollable feed of photo-based listing cards that tenants and landlords can view.
- Include a Feed / Map toggle.
- Search by address, city, barangay, school, workplace, or landmark.
- Let users place a pin at their school, workplace, or another destination and adjust a radius around it.
- Show listings within the selected radius, with availability filters.
- Label radius measurements as straight-line distance. Walking or travel distance is a separate future capability.
- Prioritize available listings by default, with an option to include full or unavailable properties.
- Consider a reel-style room-tour experience later; photo cards are the initial browsing direction.

## Property and inventory model

Separate properties from their rooms and optional individual bed spaces:

| Entity | Purpose | Example |
| --- | --- | --- |
| Property | Building address, coordinates, shared amenities, building photos, and house rules | A boarding house with several rooms |
| Room | Room-specific price, capacity, photos, amenities, and availability | A private room or shared room |
| Bed space | Individually rentable inventory inside a shared room | One available bed in a four-person room |

A landlord can list a single room, multiple rooms in a building, or individual bed spaces. Each listing should clearly identify the unit being rented and the price basis.

## Listing details

- Title and description.
- Full address, map coordinates, and nearby landmarks.
- Four to six relevant images showing the room, bathroom, common areas, and building exterior as appropriate. Generated fictional room images may be used for the demo.
- Monthly rent, whether charged per room or per person, security deposit, advance payment, utility charges, and estimated move-in cost.
- Private/shared room type, total capacity, available slots, and furnishings.
- Shared/private bathroom and amenities such as Wi-Fi, kitchen access, laundry area, parking, air-conditioning, or fan.
- House rules covering minimum stay, visitors, curfew, pets, and smoking.
- Occupancy restrictions, including female-only, male-only, or any-gender accommodation. Present these clearly before a tenant requests a reservation; exact profile labels and matching behavior will be finalized later.
- Available-from date and current availability status.

## Reservation and availability flow

Use reservation requests first, rather than instant booking:

1. A tenant sends an inquiry or requests a viewing.
2. The tenant and landlord discuss the listing through chat.
3. The tenant submits a reservation request.
4. The landlord confirms or declines the request.
5. A confirmed unit becomes **Reserved**; it becomes **Occupied** when the tenant moves in.

A pending reservation request must not automatically remove a room or bed space from availability. Confirmation must prevent the same inventory from being allocated twice.

Full properties remain visible when included in search, showing **FULL — 0 slots available** or an equivalent unavailable label. A property with several rooms should show remaining availability; a shared room should show available bed-space counts. Do not reveal current tenants' identities publicly.

## Messaging

- Support conversations between landlords and prospective or current tenants.
- Link each conversation to the relevant property or room so the rental context remains clear.
- Include useful actions such as asking about availability, scheduling a viewing, and requesting a reservation.
- Seed the demo with fictional conversations for both guest roles. Use Supabase Realtime for live updates and PostgreSQL for message history.

## Demo database scope

Seed two primary locations: **Manila City** and **Cebu City**, focused on their main urban areas. Manila City means the city itself, rather than all of Metro Manila; Cebu City means the city itself, rather than the whole province.

The future seed database should contain:

- Fictional landlords and tenants, with reusable guest demo identities for both roles.
- Properties with plausible city addresses and map coordinates in each city.
- Single-room listings, buildings with multiple rooms, and shared rooms with individually rentable bed spaces.
- A variety of prices, amenities, house rules, and gender occupancy restrictions.
- Available, partially occupied, reserved, and fully occupied inventory.
- Sample inquiries, viewing requests, pending/confirmed/declined reservation requests, and chat conversations.
- Four to six demo images per listing where appropriate, using generated imagery if needed.

Seed records, images, and conversations have not been generated yet. Store demo records in Supabase PostgreSQL. Counts, exact neighborhoods, and pricing assumptions will be decided during implementation. Demo data must not imply real availability or real endorsements of existing properties.

## Initial build scope

1. Landing page.
2. Authentication, first-time onboarding pages for tenants and landlords, and Guest entry with tenant/landlord role switching and an optional onboarding walkthrough.
3. Listing feed, search, filters, map, and adjustable radius search.
4. Property, room, and bed-space detail views.
5. Landlord listing and inventory management.
6. Reservation requests and availability management.
7. Tenant–landlord chat.
8. Seeded demo experiences for Manila City and Cebu City.

## Later possibilities

Payments, reviews, formal identity verification, video reels, and route-based travel distances are outside the initial scope unless agreed otherwise.

## Decisions still to make

- Map-tile and address-search/geocoding providers, hosting, and deployment configuration.
- Visual references, branding details, and responsive layouts.
- Exact seed-data size, neighborhoods, and demo-session persistence/reset behavior.
- Detailed cancellation, reservation-expiry, and move-out rules.

## Implementation roadmaps

- [Backend implementation roadmap](context/backend-implementation-roadmap.md): phases, completion checks, dependencies, and progress. Phase 1 has started.
- [Frontend implementation guide for Claude Code](context/frontend-implementation-guide.md): context-gathering instructions, phased frontend work, backend dependencies, integration tracking, and handoff rules. Claude Code owns frontend implementation; Codex owns backend implementation.
- [Service setup checklist](context/service-setup-checklist.md): owner account setup, local environment variables, and service configuration.
- [Backend API contracts](context/backend-api-contracts.md): actual implemented operations and explicit contract gaps.

## Docker

The shared Next.js application can run as a production container. Its server routes contain the current backend runtime, while Supabase local services remain managed by the Supabase CLI and Docker.

From the project root, after filling `frontend/.env.local`, run:

```powershell
docker compose up --build
```

Open `http://localhost:3000`. The compose health check calls `GET /api/health`. Stop the application with `docker compose down`. The local Supabase stack is started separately from `backend/` with `npm run db:start`.

Do not commit `frontend/.env.local` or place privileged Supabase keys in browser-visible variables. The compose file reads the local environment file into the application container for development; production hosting should use its own secret configuration.

## Service account ownership

See the [service account context](context/service-accounts.md). Full email addresses and credentials stay outside this public repository.

Update this README as project decisions are agreed upon.
