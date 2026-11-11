# Environments (website)

One file per environment. The real files (`.env.dev`, `.env.uat`, `.env.preprod`, `.env.prod`) are private and never
committed. The `.example` files are the templates and are committed.

| Environment | Used for | Develop | Build | Serve the build |
|---|---|---|---|---|
| dev | your own computer | `npm run dev:dev` | `npm run build:dev` | `npm run start:dev` |
| uat | testing with the team | `npm run dev:uat` | `npm run build:uat` | `npm run start:uat` |
| preprod | final check before live | `npm run dev:preprod` | `npm run build:preprod` | `npm run start:preprod` |
| prod | live | `npm run dev:prod` | `npm run build:prod` | `npm run start:prod` |

The `NEXT_PUBLIC_*` values are baked into the build, so build and serve with the **same** environment.
On a host like Vercel, set the same values in its environment settings instead.

The runner refuses a file that contains `SUPABASE_SERVICE_ROLE_KEY` (the website must never have it), and refuses a
live environment that points at localhost or a non-https API.

Missing file? `copy env\.env.uat.example env\.env.uat`, then fill it in.
