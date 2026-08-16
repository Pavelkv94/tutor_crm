# AI working notes for this repository

Entry point for AI agents working on **English Stars** (tutoring-school management app).
Everything here describes the repository **as it actually is today**. It is not a wish list
and not a style guide — where the codebase is inconsistent, the inconsistency is documented,
not resolved.

## Prime directive

**Discover and follow an existing pattern instead of designing a new one.**
Existing behaviour, contracts, naming and abstractions are constraints. See `../../CLAUDE.md`.

## Read in this order

| Doc | When you need it |
|---|---|
| [repository-map.md](repository-map.md) | "Where does X live?" — paths, responsibilities, entry points |
| [backend.md](backend.md) | Touching NestJS: modules, layers, guards, DI, schedulers, config |
| [frontend.md](frontend.md) | Touching React: pages, dialogs, react-query, api modules, auth |
| [conventions.md](conventions.md) | "How do I add an endpoint / form / query / mutation / test?" — pattern catalog with canonical examples |
| [domain-map.md](domain-map.md) | Money, balance, lessons, access control — non-obvious invariants you can silently break |
| [generated-code.md](generated-code.md) | What must never be hand-edited, what must be regenerated |
| [testing.md](testing.md) | Exact verification commands and their known quirks |
| [AI_READINESS_AUDIT.md](AI_READINESS_AUDIT.md) | Regression risks, ambiguities, hidden conventions, recommendations deliberately not implemented |

## 60-second orientation

Two apps in one repo, wired by `docker-compose.yml`:

- `backend/` — NestJS 11, Prisma 7 (driver adapter `@prisma/adapter-pg`), PostgreSQL 17,
  Telegraf bot, Stripe, Cloudflare R2, OpenTelemetry → Jaeger, Prometheus. Package manager **yarn**.
- `frontend-vite/` — React 19, Vite 7, TailwindCSS 3, shadcn/Radix, `@tanstack/react-query`,
  axios, react-router-dom v6. Package manager **npm**.

There is **no shared package and no code generation between them**. The frontend's
`src/types/index.ts` is a hand-maintained mirror of backend DTOs. Changing a backend DTO
does not change the frontend — you must edit both sides.

UI strings, error messages, code comments and commit messages are largely in **Russian**.
Write new user-facing strings in Russian to match.

## The four things most likely to bite you

1. **Money.** `BalanceService` (`backend/src/modules/balance/application/balance.service.ts`)
   is the *only* place allowed to change `student.balance`, `student.balance_currency`,
   `LessonPayment` rows, and paid/unpaid lesson statuses. Three invariants are enforced there
   and by hand-written SQL constraints. See [domain-map.md](domain-map.md).
2. **Lint scope.** `cd backend && yarn lint` (Biome) only checks ~41 files — `biome.json`
   restricts `files.includes` to the payments/balance/stripe slice. It is **not** a whole-project check.
3. **Frontend lint is red on `main`.** `cd frontend-vite && npm run lint` currently reports
   19 pre-existing errors. Compare before/after; do not "fix" unrelated ones.
4. **Two different `ValidationPipe` configurations.** Production (`backend/src/main.ts`) uses
   `new ValidationPipe()` — **no** `transform`, **no** `whitelist`. The e2e test harness
   (`backend/test/helpers/test-utils.ts`) uses `{ transform: true, whitelist: true }`.
   A DTO that relies on `@Type(() => Number)` will work in e2e and silently pass strings in
   production. See [AI_READINESS_AUDIT.md](AI_READINESS_AUDIT.md#regression-risks).

## Verify before you claim done

```bash
cd backend      && yarn build          # tsc via nest build
cd backend      && yarn test:unit      # ~11 min, 50 suites / 579 tests
cd frontend-vite && npx tsc -b         # typecheck (clean today)
```

Full details, targeted commands and known flakes: [testing.md](testing.md).
