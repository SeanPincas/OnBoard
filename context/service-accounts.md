# OnBoard service account context

This file records the service ownership used by the project. It is committed to a public repository, so it contains account labels only. Full email addresses, passwords, API keys, tokens, and other credentials stay private.

| Service | Public account label | Responsibility |
| --- | --- | --- |
| Clerk | `seanpincas28` | Authentication, email verification, and sessions |
| Supabase | `seandev28` | PostgreSQL, PostGIS, Storage, Realtime, and database configuration |

Clerk and Supabase are connected through Clerk's Supabase third-party authentication integration. This context does not contain any credential values.
