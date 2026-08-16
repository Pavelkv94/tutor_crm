# Repository map

Paths are relative to the repo root unless stated otherwise.

## Top level

| Path | Responsibility | Notes / restrictions |
|---|---|---|
| `backend/` | NestJS API + Telegram bot. Package manager **yarn**. | |
| `frontend-vite/` | React SPA (admin/teacher dashboard). Package manager **npm**. | |
| `docker-compose.yml` | Full stack: backend `:5008`, frontend `:3008`, postgres, backup, prometheus, grafana `:3003`, jaeger `:16686`, node/postgres exporters. | Deployment config — do not modify for feature work. |
| `.env.example` | Template for the root compose `.env`. | Incomplete: `R2_*` vars are required by `backend/src/config/validation/env.schema.ts` but absent here. |
| `prometheus/`, `grafana/`, `postgres/` | Monitoring + DB init scripts mounted by compose. | Infrastructure. |
| `plan.md` | ~90 KB historical implementation plan for the Stripe payments feature, with per-todo status. | Historical record of *how* payments were built and why. Not a spec of current behaviour — verify against code. |
| `PAYMENTS_FRONTEND_HANDOFF.md` | Detailed handoff describing the payments API surface and the frontend changes it required. | Same caveat: written before/while the frontend work landed. |
| `.cursor/rules/frontend-dev.mdc` | Cursor rule with frontend code style (Tailwind-only, early returns, `const` arrow fns, `handle*` handlers, a11y attributes). | Applies to `frontend-vite/`. |
| `CLAUDE.md` | Routing + safety document for AI agents. | |
| `docs/ai/` | This documentation set. | |
| `env.port`, `x-tunnel.sh` | Local tunnelling helpers, git-ignored. | Not part of the app. |

## Backend (`backend/`)

### Entry points

| Path | What it is |
|---|---|
| `src/main.ts` | Bootstrap. Imports OTel tracing **first**, creates the app with `rawBody: true` (Stripe webhook signature), `cookieParser`, global `ValidationPipe()`, global `SimpleExeptionFilter`, Swagger at `/api/swagger` when `NODE_ENV !== production`, CORS from `corsConfig`, global prefix `api` excluding `metrics`. |
| `src/app.module.ts` | Root module; registers every feature module + `ThrottlerModule.forRoot` + `ScheduleModule.forRoot()`. |
| `scripts/generate-swagger.ts` | Boots the app headlessly and writes `backend/swagger.json`. Run via `yarn swagger:generate`. |

### Feature modules — `src/modules/<feature>/`

| Module | Controllers (route prefix) | Layered? | Repository ports? |
|---|---|---|---|
| `auth` | `auth.controller.ts` (`/auth`) | `interface/` + `application/` + `dto/` (dto at module root, not under `interface/`) | no |
| `teacher` | `teacher.controller.ts` (`/teachers`) | yes | no (concrete `TeacherRepository`) |
| `student` | `student.controller.ts` (`/students`) | yes | no (concrete `StudentRepository`) |
| `plan` | `plan.controller.ts` (`/plans`) | yes | **yes** — `PlanRepositoryPort`, `PlanQueryRepositoryPort` |
| `lesson` | `lesson.controller.ts` (`/lessons`) | yes | no (concrete `LessonRepository`, `LessonRegularRepository`) |
| `tasks` | `tasks.controller.ts` (`/tasks`) | **flat** — no `interface/`/`application/`/`domain/` folders | **yes** — `TasksRepositoryPort` (in `ports/`, not `application/ports/`) |
| `material` | `material.controller.ts` (`/materials`) | yes | **yes** — `MaterialRepositoryPort`, `CourseRepositoryPort` |
| `balance` | none (service-only module) | `application/` + `domain/` + `infrastructure/` | **yes** — `BalanceRepositoryPort` |
| `payments` | `payments.controller.ts` (`/payments`), `payments-webhook.controller.ts` (`/payments/stripe`), `legacy-invoice.controller.ts` (`/telegram`) | yes (no `domain/` — entities live in `balance/domain`) | **yes** — `PaymentsRepositoryPort` |
| `reports` | `reports.controller.ts` (`/reports`) | `application/` + `interface/` + `domain/`, plus `*-excel.util.ts` at module root | no |
| `telegram` | `telegram.controller.ts` (`/telegram`) | yes | no (concrete `TelegramRepository`) |

Layer meaning (where present):
- `interface/` — controller, request/response DTOs (`dto/requests`, `dto/responses`), `mappers/`.
- `application/` — services, `ports/` (abstract-class repository contracts), `use-cases/` where present.
- `domain/` — entity types and domain enums.
- `infrastructure/` — Prisma-backed repositories.

Several `use-cases/` directories exist but are **empty** (`auth`, `lesson`, `plan`, `reports`,
`student`, `teacher`, `telegram`) — an aspiration, not a live pattern. Do not put code there
just because the folder exists.

### Cross-cutting

| Path | Responsibility |
|---|---|
| `src/config/bootstrap-env.ts` | Loads `.env.<NODE_ENV>` then `.env`, validates via `EnvSchema`, exports `env` and the `Environments` enum. Use this or a namespace config — not `process.env`. |
| `src/config/validation/env.schema.ts` | class-validator schema; **the authoritative list of required env vars**. |
| `src/config/namespaces/*.config.ts` | `auth`, `cors`, `database`, `http`, `storage`, `stripe`, `telegram` typed namespaces, injected with `@Inject(xConfig.KEY)`. |
| `src/config/app-config.module.ts` | Registers all namespaces globally (`isGlobal: true`, `ignoreEnvFile: true`). |
| `src/infrastructure/prisma/` | `schema.prisma`, `migrations/`, `prisma.service.ts` (extends generated `PrismaClient` via `PrismaPg` adapter), `generated/` (**git-ignored**, see [generated-code.md](generated-code.md)). |
| `src/infrastructure/storage/` | `R2Service` — presigned PUT/GET URLs, HEAD, delete against Cloudflare R2 (S3 API). |
| `src/infrastructure/stripe/` | `StripeService` (products/prices, payment links, webhook signature), `STRIPE_CLIENT` token, module. |
| `src/infrastructure/bcrypt/` | `BcryptService`. |
| `src/shared/guards/` | `jwt-access`, `jwt-refresh`, `credentials` (+ strategies), `admin-access.guard.ts`. |
| `src/shared/decorators/param/extract-teacher-from-request.ts` | `@ExtractTeacherFromRequest()` → `JwtPayloadDto` from `request.user`. |
| `src/shared/decorators/swagger/<feature>/*.decorator.ts` | One `applyDecorators(...)` factory per endpoint. Keeps controllers thin. No folder for `reports` — that controller has no Swagger decorators. |
| `src/shared/decorators/transform/to-utc.decorator.ts` | `@ToUTC()` class-transformer helper (luxon). |
| `src/shared/exceptions/simple-exception.ts` | Global filter: maps Prisma error codes → HTTP, unwraps `HttpException`, runs every message through `translateError`. Also exports `BadRequestErrorResponse` used in Swagger decorators. |
| `src/shared/utils/error-translations.ts` | Message translation table used by the filter. |
| `src/shared/enums/currency.enum.ts` | `Currency` = `EUR \| PLN \| BYN`. |
| `src/observability/` | `tracing/tracing.ts` (OTel SDK, imported first in `main.ts`), `metrics/` (Prometheus interceptor, `/metrics`), config/constants. |

### Tests

| Path | What |
|---|---|
| `test/unit/**/*.spec.ts` | Jest unit tests, config `test/jest-unit.json`. Mirror `src/` by feature folder. |
| `test/e2e/*.e2e-spec.ts` | Supertest e2e against a real Postgres, config `test/jest-e2e.json`. |
| `test/helpers/test-utils.ts` | `createTestApp()`, token generators, `closeTestApp()`. **Canonical e2e bootstrap.** |
| `test/helpers/telegram-test.module.ts` | Telegram module override so tests never talk to Telegram. |
| `test/setup-env.ts` | Loads `backend/.env.testing` (this file **is** committed). |
| `test/setup-migrations.ts` | e2e global setup: `prisma generate` → `db push` (with `--force-reset` fallback) → applies hand-written partial indexes and CHECK constraints. |

## Frontend (`frontend-vite/`)

### Entry points

| Path | What it is |
|---|---|
| `src/main.tsx` | React root. |
| `src/App.tsx` | `QueryClientProvider` (`refetchOnWindowFocus: false`, `retry: 1`) → `BrowserRouter` → `AuthProvider` → `Routes` → `<Toaster />`. **All routes are declared here.** |
| `index.html`, `vite.config.ts` | Vite entry, dev port 3000, alias `@` → `src`. |
| `nginx.conf`, `Dockerfile` | Production static serving (SPA fallback), `VITE_API_URL` baked in at build time. |

### Source layout

| Path | Responsibility | Notes |
|---|---|---|
| `src/api/<resource>.ts` | One object literal per resource (`auth`, `lessons`, `materials`, `payments`, `plans`, `students`, `tasks`, `teachers`, `telegram`) wrapping `apiClient`. | The only place URLs are written. |
| `src/lib/api-client.ts` | Axios instance: attaches bearer token, transparent 401 refresh with request queueing, redirect to `/login` on refresh failure, error toast for non-401. | Central; changing it affects every request. |
| `src/lib/token-utils.ts` | Access-token storage + `jwt-decode` payload reader. |
| `src/lib/toast.ts` | `showErrorToast` / `showSuccessToast` / `showInfoToast` over `sonner`. |
| `src/lib/invalidate-money.ts` | `invalidateMoneyQueries(queryClient, studentId?)` — call after **any** mutation that can move money or lesson payment status. |
| `src/lib/lesson-currency.ts`, `src/lib/utils.ts` | Lesson currency helpers; `cn()` class merge. |
| `src/contexts/AuthContext.tsx` | `useAuth()` → `{ user, isLoading, login, logout, isAuthenticated, isAdmin }`. |
| `src/components/ProtectedRoute.tsx` | Route guard; `adminOnly` prop. |
| `src/pages/*.tsx` | One component per route: `Home`, `Login`, `Students`, `Plans`, `Teachers`, `Schedule`, `Tasks`, `Payments`, `Materials`, `CourseMaterials`, `MaterialViewerPage`. |
| `src/components/<domain>/` | Feature components grouped by domain: `lessons`, `materials`, `payments`, `plans`, `schedule`, `students`, `tasks`, `teachers`, `shared`, `layout`. |
| `src/components/ui/` | shadcn primitives (`button`, `card`, `checkbox`, `dialog`, `input`, `label`, `select`, `sonner`, `table`, `textarea`, `tooltip`). Generated by the shadcn CLI (`components.json`). |
| `src/constants/` | `currency.ts` (`formatMoney`, symbols/flags), `payments.ts` (status/type labels + option lists), `regions.ts`, `student-class.ts`, `navigation.ts`. |
| `src/hooks/` | `useStudentsDirectory.ts` (lazily-loaded student dropdown data), `useTasksPendingCountStream.ts` (SSE with its own 401-refresh loop). |
| `src/types/index.ts` | **Hand-written** mirror of backend DTOs. No codegen. |
| `src/utils/getDaysInWeeks.ts` | Schedule grid helper. |
| `@/components/ui/sonner.tsx` (literal `@` directory at project root) | Stray file created by a mis-resolved shadcn CLI path. Not imported — the real one is `src/components/ui/sonner.tsx`. Leave it alone. |

There is **no test runner configured for the frontend** (no vitest/jest, no test files).
