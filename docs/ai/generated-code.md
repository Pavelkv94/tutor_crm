# Generated code, artifacts, and edit boundaries

## Never hand-edit

| Path | What it is | How it is produced | Tracked in git? |
|---|---|---|---|
| `backend/src/infrastructure/prisma/generated/**` | Prisma client (`PrismaClient`, model types, enums) | `yarn prisma:generate` (or `prisma:generate:prod`) from `schema.prisma` | **No** — git-ignored via `backend/.gitignore` (`src/infrastructure/prisma/generated`). A fresh clone must run `yarn prisma:generate` before building or testing. |
| `backend/dist/**` | `nest build` output | `yarn build` | No |
| `frontend-vite/dist/**` | Vite build output | `npm run build` | No |
| `backend/coverage/**` | Jest coverage | `yarn test:cov` | No |
| `node_modules/**` (both apps) | dependencies | `yarn install` / `npm install` | No |
| `backend/yarn.lock`, `frontend-vite/package-lock.json` | lockfiles | the package managers | Yes — never edit by hand; never regenerate as a side effect of unrelated work |

> The generated Prisma client is imported directly:
> `import { Prisma, Lesson } from '@/infrastructure/prisma/generated/client'`.
> **Never import `@prisma/client`** — that path is not what the app uses.

## Regenerate, don't edit — but do commit

| Path | Source of truth | Command |
|---|---|---|
| `backend/swagger.json` | the controllers + `src/shared/decorators/swagger/**` + DTOs | `cd backend && yarn swagger:generate` |
| `frontend-vite/src/components/ui/*.tsx` | shadcn/ui registry, configured by `frontend-vite/components.json` | shadcn CLI. These files are checked in and *are* sometimes locally adjusted; treat them as vendored — change them only when the task is about that primitive. |

`swagger.json` is the API reference the frontend work is done against. Regenerate it whenever
you change a route, DTO, or Swagger decorator, and commit the result with the change.

## Migrations — append only

`backend/src/infrastructure/prisma/migrations/<timestamp>_<name>/migration.sql`

- Created by `yarn prisma:migrate` (`prisma migrate dev`, loads `.env.development`).
- **An applied migration is immutable.** To change something, add a new migration. This rule is
  already recorded in `plan.md` (the `add_payment_refund_id` entry exists precisely because
  `add_payments` had already been applied).
- Some migrations contain **hand-written SQL that Prisma cannot express** — partial unique
  indexes and CHECK constraints, plus one historical data backfill. See
  [domain-map.md](domain-map.md#database-constraints-prisma-cannot-express).
- Anything hand-written in a migration must also be mirrored in
  `backend/test/setup-migrations.ts`, because e2e provisions its database with `prisma db push`,
  which reads only `schema.prisma` and ignores migration files.
- `prisma.config.ts` at `backend/` points Prisma at the schema location.

## Hand-maintained mirrors (look generated, are not)

| Path | Mirrors | Consequence |
|---|---|---|
| `frontend-vite/src/types/index.ts` | backend request/response DTOs | Nothing generates or checks this. A backend field rename compiles fine on both sides and breaks at runtime. Update it by hand and grep `frontend-vite/src/api/` for affected payloads. |
| `frontend-vite/src/constants/currency.ts`, `constants/payments.ts` | `Currency`, `PaymentStatus`, `PaymentType` enums in the backend | Same — keep the string unions in sync with the Prisma enums. |

## Config files that change tool behaviour — out of scope for feature work

`backend/tsconfig.json`, `backend/tsconfig.build.json`, `backend/nest-cli.json`,
`backend/biome.json`, `backend/prisma.config.ts`, `frontend-vite/tsconfig*.json`,
`frontend-vite/eslint.config.js`, `frontend-vite/vite.config.ts`,
`frontend-vite/tailwind.config.js`, `frontend-vite/postcss.config.js`,
`frontend-vite/components.json`, `frontend-vite/nginx.conf`, both `Dockerfile`s,
`docker-compose.yml`, `prometheus/`, `grafana/`, `postgres/`.

Changing any of these alters build, lint, formatting, or deployment behaviour for the whole
project. Do not touch them unless the task is explicitly about tooling.

## Secrets

`.env`, `backend/.env.development`, `frontend-vite/.env`, `env.port`, `x-tunnel.sh` are
git-ignored and must never be read, echoed, or transmitted.

`backend/.env.testing` **is** tracked in git (it holds the local test-database connection).
`.env.example` and `frontend-vite/.env.example` are templates — `.env.example` is currently
missing the `R2_*` variables that `backend/src/config/validation/env.schema.ts` marks as required.

## Odd artifacts (leave alone)

- `frontend-vite/@/components/ui/sonner.tsx` — a stray directory literally named `@`, created
  by a mis-resolved shadcn CLI path. It is tracked in git but unused: the alias `@/` resolves to
  `frontend-vite/src/`, so `import { Toaster } from '@/components/ui/sonner'` loads
  `src/components/ui/sonner.tsx`. Deleting it is a cleanup, not part of any feature.
- Seven empty `application/use-cases/` directories under `backend/src/modules/`.
- A `.DS_Store` file is tracked at the repo root (the ones inside `backend/` and
  `frontend-vite/` are ignored).
