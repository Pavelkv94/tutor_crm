# Verification

Only commands that exist in this repository today. Nothing here should be changed to make
verification "nicer" — document reality, use it as-is.

## Quickest useful check

| Change touches | Run |
|---|---|
| Backend only | `cd backend && yarn build` (~6 s, full TypeScript compile) |
| Frontend only | `cd frontend-vite && npx tsc -b` (~10 s, typecheck, `noEmit`) |
| Backend logic with unit tests | `cd backend && npx jest --config ./test/jest-unit.json test/unit/<area>` — see targeted commands below |

## Backend (`cd backend`, yarn)

| Command | What it does | Status today |
|---|---|---|
| `yarn build` | `nest build` — compiles all of `src` | passes |
| `yarn lint` | `biome check .` | passes — but see the scope warning below |
| `yarn format` | `biome format . --write` | same narrow scope; **do not run repo-wide as cleanup** |
| `yarn test:unit` | `NODE_ENV=testing jest --config ./test/jest-unit.json` | **50 suites / 579 tests, ~11 minutes**; see known flake below |
| `yarn test:e2e` | `NODE_ENV=testing jest --config ./test/jest-e2e.json` | needs a reachable Postgres (see prerequisites) |
| `yarn test:cov` | unit tests with coverage into `backend/coverage` | |
| `yarn swagger:generate` | regenerates `backend/swagger.json` | run after any API surface change |
| `yarn prisma:generate` | regenerates the git-ignored Prisma client | **required on a fresh clone** |
| `yarn prisma:migrate` | `prisma migrate dev` against `.env.development` | creates a migration |
| `yarn prisma:deploy` | applies migrations without generating | |
| `yarn start:dev` | watch-mode dev server on port 5000 | |
| `yarn test`, `yarn test:watch` | plain `jest` using the inline config in `package.json` | **finds 0 tests** — that config has `rootDir: src` and `testRegex: .*\.spec\.ts$`, but every spec lives in `backend/test/`. Use `test:unit` / `test:e2e` instead. |

### ⚠️ `yarn lint` only checks ~41 files

`backend/biome.json` sets `files.includes` to:

```
src/modules/payments/**, src/modules/balance/**, src/infrastructure/stripe/**,
src/shared/enums/**, src/shared/decorators/swagger/payments/**,
test/unit/{payments,balance,stripe}/**, apps/**, libs/**
```

(`apps/` and `libs/` do not exist in this repo.) A green `yarn lint` says nothing about
`lesson`, `student`, `material`, `tasks`, `telegram`, `reports`, or `auth`. Do **not** widen
the scope to "improve" things — Biome's formatter would then rewrite thousands of lines of
untouched code. For files outside the scope, rely on `yarn build` and matching the surrounding
style manually (tabs, double quotes, width 160 in the linted area; older files use a mix of
tabs and spaces and single quotes).

### Targeted backend tests

```bash
cd backend
yarn test:unit -t "should create plan successfully"                       # by test name
NODE_ENV=testing npx jest --config ./test/jest-unit.json test/unit/plan   # by folder
NODE_ENV=testing npx jest --config ./test/jest-unit.json test/unit/balance/balance.service.spec.ts
NODE_ENV=testing npx jest --config ./test/jest-e2e.json test/e2e/payments.e2e-spec.ts
```

`yarn test:unit <path>` also works (yarn forwards the argument). Prefer a targeted run while
iterating — the full suite is ~11 minutes.

### Known flake

`test/unit/auth/bcrypt.service.spec.ts` can exceed Jest's default 5 s timeout during a **full**
`yarn test:unit` run (50 suites competing for CPU while bcrypt burns it deliberately). The same
spec passes in ~3 s when run alone. If it is the only failure in a full run, re-run it on its
own before treating it as a regression — and do not "fix" it by lowering the bcrypt cost factor.

### Prerequisites

- `backend/.env.testing` is committed and is loaded by `test/setup-env.ts` for both suites.
- **Unit tests** need no database.
- **e2e tests** need a Postgres reachable at `POSTGRES_URI` from `.env.testing`.
  `test/globalSetup` (`test/setup-migrations.ts`) then:
  1. runs `prisma generate`;
  2. runs `prisma db push --accept-data-loss`, falling back to `--force-reset` on incompatible
     changes (the test DB is disposable);
  3. re-applies the hand-written partial unique indexes and the
     `student_balance_currency_check` CHECK constraint, which `db push` cannot know about.
- A fresh clone must run `yarn install` **and** `yarn prisma:generate` before anything compiles.

## Frontend (`cd frontend-vite`, npm)

| Command | What it does | Status today |
|---|---|---|
| `npx tsc -b` | typecheck (`noEmit`, strict, `noUnusedLocals`, `noUnusedParameters`) | **clean** |
| `npm run build` | `tsc -b && vite build` | |
| `npm run lint` | `eslint .` | **fails: 19 pre-existing errors** |
| `npm run dev` | Vite dev server on port 3000 | |

There is **no test runner** on the frontend — no vitest, no jest, no test files.

### ⚠️ `npm run lint` is red on `main`

19 errors exist before you touch anything:

| Count | Rule |
|---|---|
| 13 | `react-hooks/set-state-in-effect` ("Calling setState synchronously within an effect…") |
| 2 | `react-refresh/only-export-components` (`components/ui/button.tsx`, `contexts/AuthContext.tsx`) |
| 2 | `@typescript-eslint/no-empty-object-type` (`components/ui/input.tsx`, `components/ui/textarea.tsx`) |
| 1 | `no-useless-catch` (`contexts/AuthContext.tsx`) |
| 1 | `prefer-const` (`utils/getDaysInWeeks.ts`) |

**Capture the count before your change and compare after.** A non-zero exit is expected; your
job is not to increase it. Fixing the pre-existing ones is a separate, unrequested task
(`set-state-in-effect` fixes in particular change render behaviour).

## Full stack

```bash
docker compose up -d --build
```

Backend `:5008`, frontend `:3008`, Grafana `:3003`, Jaeger UI `:16686`, Prometheus internal.
The backend container runs `yarn prisma:deploy:prod` on start, so migrations apply on boot.
Health: `GET /metrics` on the backend (also its Docker healthcheck). Swagger UI at
`/api/swagger` when `NODE_ENV !== production`. Compose reads the root `.env`.

## Recommended sequence before declaring a task done

**Backend change**
1. `yarn build`
2. targeted `jest` run for the touched area
3. `yarn lint` **if** the files are inside the Biome scope
4. `yarn swagger:generate` if the API surface changed
5. `yarn test:unit` (full) if the change is broad or touches money/lessons

**Frontend change**
1. `npx tsc -b`
2. `npm run lint`, compared against the 19-error baseline
3. `npm run build` for anything touching routing, imports, or env usage

**Change spanning both**
Run both sequences, and re-check `frontend-vite/src/types/index.ts` against the modified backend
DTO — nothing else will catch a mismatch.
