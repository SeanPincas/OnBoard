# OnBoard service setup

## Current readiness

Node.js v22.20.0, npm 10.9.3, Git 2.51.0, and Docker engine 29.8.0 were detected during the initial setup. Packages and service configuration must still be checked against the current repository state. This document contains no credentials.

The application is shared by Codex (server/database) and Claude Code (UI). Clerk and Supabase account setup is separate from application installation.

Initial verification: the production build and a localhost production-server `GET /api/health` check passed. Supabase CLI initialization passed. The local database stack has not been started, and Clerk/hosted Supabase are not configured yet. The scaffold requested an unavailable Next.js patch; installation uses published Next.js 16.4.4 with its matching ESLint configuration and a lockfile. Tailwind uses the standard PostCSS integration after the generated loader failed. Font downloads were removed from the foundation so building does not depend on Google Fonts.

Docker support is now defined in the root `docker-compose.yml` and `frontend/Dockerfile`. The application image reads local runtime variables from `frontend/.env.local`. Supabase remains a separate CLI-managed local stack.

Dependency follow-up: installation reported 16 moderate audit findings; a runtime-only audit reported zero vulnerabilities. Development dependency remediation remains open. Do not apply a forced major-version audit update without reviewing framework/tool compatibility.

## What the project owner needs to do

### 1. Create the Clerk development application

1. Sign in to [Clerk Dashboard](https://dashboard.clerk.com/) and create an application named OnBoard.
2. Configure email/password sign-up with email verification codes as the initial authentication method. Social sign-in can be decided later.
3. Obtain the development publishable key and secret key from the application's API keys settings.
4. Copy `frontend/.env.example` to `frontend/.env.local` if the local file does not already exist. Fill in `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` locally.
5. Do not create separate Clerk applications for tenants and landlords. Their application profiles/roles belong in our database.

Clerk handles the verification emails. Brevo is not required. A development instance is sufficient for initial integration; production domain configuration comes later.

### 2. Create the Supabase project

1. Sign in to [Supabase Dashboard](https://supabase.com/dashboard) and create an OnBoard development project in an appropriate nearby region.
2. Save its database password in your own password manager. It does not belong in a browser environment variable.
3. Copy the base project URL and publishable API key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env.local`.
4. Leave `SUPABASE_SECRET_KEY` empty initially. Provide a server-only secret key locally when privileged Guest/session operations are implemented and need it. Never put it in a `NEXT_PUBLIC_` variable.
5. Do not manually create tables or copy sample RLS policies into this project. Codex will supply version-controlled migrations for OnBoard's actual schema.

Local Supabase development does not require a hosted project. Use local URL/keys for a local database or hosted URL/keys for the hosted project; do not mix keys from one with the other's URL.

### 3. Connect Clerk to the hosted Supabase project

1. Activate the Supabase integration in the Clerk application's integration settings and copy the Clerk instance domain.
2. In Supabase Authentication's provider settings, add Clerk as a third-party provider and paste that domain.
3. Confirm the integration is enabled. Codex will implement and verify row-level security and token propagation in code.

Use the current native third-party integration, not the deprecated Clerk Supabase JWT template. Integration does not automatically synchronize application profile records; that is backend work.

Reference: [official Clerk/Supabase integration guide](https://clerk.com/docs/guides/development/integrations/databases/supabase).

### 4. Tell Codex when configuration is ready

Report only that the local environment file has been filled and the provider connection enabled. Do not paste secret values into chat. Codex can check which required variable names are configured without displaying their values.

If account setup requires sign-in, MFA, billing selection, or acceptance of service terms, the project owner completes those steps. No paid plan is assumed by this setup.

## Environment variables

| Name | Scope | When needed |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public base URL | Local development; initially `http://localhost:3000` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk configuration | Phase 3 authentication |
| `CLERK_SECRET_KEY` | Server only | Phase 3 authentication |
| `NEXT_PUBLIC_SUPABASE_URL` | Public project/local URL | Database integration |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public API key, subject to access policies | Database integration |
| `SUPABASE_SECRET_KEY` | Privileged server only | Guest/session administration in Phase 4; leave blank until the Guest service is ready to verify |

The `NEXT_PUBLIC_` prefix means a value may be included in browser code. Public keys still require correctly implemented access policies; a public key is not landlord authorization.

Webhook signing secrets, CLI account tokens, direct database connection strings, and map-provider configuration will be introduced only if the corresponding implementation needs them. Never place a personal Supabase CLI access token in a public application variable.

## What Codex handles

- Install project dependencies and initialize database tooling.
- Prepare ignored environment templates and document configuration.
- Write contracts, migrations, PostGIS queries, RLS, and validation.
- Implement profiles, onboarding, Guest isolation, listings, reservations, and messaging in their roadmap phases.
- Verify local behavior, then verify hosted integration once account configuration is available.
- Coordinate actual operation/type exports with Claude's frontend guide.

## Local development

From `frontend/`, use the package scripts to run development, lint, type checks, and production build. From `backend/`, use `npm run db:start` for local Supabase after Docker is available.

The first local database start downloads container images and may take time. If Docker access is blocked by the execution sandbox, Codex should request the narrow execution permission rather than asking the owner to reinstall Docker.

`npm run db:reset:local` is a destructive reset of the local development database only. Never apply remote resets as a routine setup step.

## Later owner decisions

- Map-tile and geocoding provider, and any required provider account/key: search/map implementation.
- Guest session lifetime/reset policy and cancellation/expiry/move-out rules: relevant business-rule phases.
- Hosting account, production domain, and production service configuration: deployment preparation.

These do not block foundation, schema design, or local fixture work.
