# OnBoard backend tooling

Server routes live in the shared Next.js application at `../frontend/src/app/api/`. This directory contains Supabase tooling and database configuration; it is not a separate HTTP server.

Read [the roadmap](../context/backend-implementation-roadmap.md), [service setup](../context/service-setup-checklist.md), and [actual API contracts](../context/backend-api-contracts.md).

## Commands

Run from this directory:

```powershell
npm ci
npm run db:start
npm run db:status
npm run db:stop
```

Docker must be running for the local stack. `supabase/config.toml` uses the project ID `onboard`. No application schema or seed records have been implemented yet.

The root `docker-compose.yml` runs the Next.js application. Supabase services are managed separately by these CLI commands so the project follows the standard Supabase local workflow.

`npm run db:reset:local` rebuilds only the local database and destroys its development data. Do not substitute a remote reset for this command.

CLI status output can contain local credentials. Do not paste it into public logs or chat; copy needed values directly into the ignored application environment file.
