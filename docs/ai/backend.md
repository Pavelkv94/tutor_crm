# Backend (`backend/`)

NestJS 11 · Prisma 7 (`@prisma/adapter-pg`) · PostgreSQL 17 · Telegraf · Stripe · Cloudflare R2 ·
OpenTelemetry · Prometheus. Package manager **yarn**. Path alias `@/` → `backend/src/`.

## Request lifecycle

```
HTTP → CORS (corsConfig.allowedOrigins, credentials: true)
     → global prefix /api  (exception: /metrics)
     → cookieParser
     → guards on the controller/handler (see "Auth")
     → global ValidationPipe()      ← no transform, no whitelist
     → controller (interface layer)
     → service (application layer)
     → repository (infrastructure layer) → PrismaService
     ← SimpleExeptionFilter formats every error
```

`main.ts` creates the app with `rawBody: true` because the Stripe webhook verifies the
signature over the raw body. `src/observability/tracing/tracing.ts` is imported on the **first
line** of `main.ts`, before any Nest module — keep it there.

### ValidationPipe — the discrepancy that matters

- Production (`src/main.ts`): `app.useGlobalPipes(new ValidationPipe())` — **no `transform`,
  no `whitelist`**. `@Type(() => Number)` / `@Type(() => Date)` on a DTO therefore has **no
  effect** on handler arguments; query and body values arrive as strings, and unknown
  properties are not stripped.
- e2e harness (`test/helpers/test-utils.ts`): `new ValidationPipe({ transform: true, whitelist: true })`.

Consequence: a DTO relying on transformation passes e2e and misbehaves in production.
The existing workaround is a **route-local pipe**, see
`src/modules/payments/interface/payments.controller.ts` (`list`):

```ts
async list(@Query(new ValidationPipe({ transform: true })) query: PaymentsFilterQueryDto)
```

Follow that workaround for new routes that need transformation. Do **not** change the global
pipe — it would alter validation behaviour across every existing endpoint.

## Module structure

Feature modules live in `src/modules/<feature>/`. The dominant (but not universal) shape:

```
<feature>/
  interface/           controller, dto/requests, dto/responses, mappers/
  application/         service(s), ports/ (abstract classes)
  domain/              entity types, domain enums
  infrastructure/      Prisma repositories implementing the ports
  <feature>.module.ts
```

Deviations that exist on purpose and must not be "harmonised":

- `tasks/` is **flat**: `tasks.controller.ts`, `tasks.service.ts`, `tasks.repository.ts`,
  `dto/`, `ports/`, `constants/` directly under the module.
- `auth/` keeps DTOs at `auth/dto/`, not `auth/interface/dto/`.
- `balance/` has no controller — it is a service-only module consumed by `lesson` and `payments`.
- `payments/` has no `domain/`; the payment entity and enums live in `balance/domain/`.
- `reports/` keeps `schedule-excel.util.ts` / `students-excel.util.ts` at the module root.
- Empty `application/use-cases/` folders exist in seven modules. Nothing uses them.

### Repository ports — an inconsistent convention

Ports are abstract classes used as DI tokens:

```ts
// application/ports/plan.repository.port.ts
export abstract class PlanRepositoryPort { abstract getPlanById(id: number): Promise<PlanEntity | null>; /* ... */ }

// plan.module.ts
providers: [{ provide: PlanRepositoryPort, useClass: PlanRepository }]
```

| Uses ports | Injects the concrete repository class |
|---|---|
| `balance`, `material` (×2), `payments`, `plan` (×2), `tasks` | `lesson`, `student`, `teacher`, `telegram` |

Both are live conventions. **Match the module you are editing.** Introducing a port into
`lesson`/`student`/`teacher`/`telegram`, or removing one from the others, is a refactor —
out of scope unless explicitly requested.

### Module wiring

Cross-module dependencies are expressed by importing the owning module and consuming its
exported service. The dependency graph is deliberately acyclic; two comments in the code
record the reasoning and should be respected:

- `payments.module.ts`: `Payments → Telegram`, `Payments → Balance`, `Payments → Student`.
  Payments queries billable lessons through its **own** repository rather than `LessonModule`,
  because `LessonModule` already depends on `BalanceModule`.
- `legacy-invoice.controller.ts`: the legacy `POST /telegram/send-lessons-cost-to-admin` route
  lives in `PaymentsModule` (not `TelegramModule`) for the same reason. Its contract — body,
  guards, 204-no-content — is frozen because the frontend still calls it. The canonical route
  is `POST /api/payments/invoices`.

## Auth

JWT access token in the `Authorization` header + refresh token in an **httpOnly cookie**
(`refreshToken`, `sameSite: lax`, `secure` only in production).

| Guard | File | Purpose |
|---|---|---|
| `JwtAccessGuard` | `shared/guards/jwt-access.guard.ts` | Standard authenticated route |
| `JwtRefreshAuthGuard` | `shared/guards/jwt-refresh.guard.ts` | `POST /auth/refresh-token` only |
| `CredentialsAuthGuard` | `shared/guards/credentials-auth.guard.ts` | `POST /auth/login` (passport-local) |
| `AdminAccessGuard` | `shared/guards/admin-access.guard.ts` | Requires `user.role === ADMIN`; throws `UnauthorizedException` (401, **not** 403) |

Guards are applied **per controller or per handler** with `@UseGuards(...)` — there is no
`APP_GUARD`. Admin-only routes use `@UseGuards(JwtAccessGuard, AdminAccessGuard)`.

Inside a handler, the authenticated teacher is read with `@ExtractTeacherFromRequest()`,
which returns `JwtPayloadDto` (`{ id: string, login, name, role }`). Note `id` is a **string** —
existing code writes `+teacher.id` / `Number(teacher.id)`.

Two authorization styles coexist:
- **Guard-level**: `AdminAccessGuard` on admin-only routes.
- **Handler/service-level ownership checks**: e.g. `LessonService.findLessonsForPeriodAndStudent`
  and `cancelLesson` throw `BadRequestException('Вы не можете …')` when
  `teacher.role !== ADMIN && student.teacher_id !== +teacher.id`. Several list endpoints also
  branch on role to decide whether a `teacher_id` query param may override the caller
  (`lesson.controller.ts`, `reports.controller.ts`, `student.controller.ts`).

Admin registration (`POST /auth/register-admin`) is gated by `ADMIN_REGISTRATION_SECRET_KEY`.

**Throttling is not global.** `ThrottlerModule.forRoot([{ ttl: 10000, limit: 5 }])` is
registered in `app.module.ts`, but `ThrottlerGuard` is only bound on `AuthController`
(`@UseGuards(ThrottlerGuard)`). No other route is rate-limited.

The Stripe webhook controller has **no guards at all** — the signature is the authentication.
See [domain-map.md](domain-map.md#stripe-webhooks).

## Errors

Throw standard Nest exceptions (`NotFoundException`, `BadRequestException`,
`ForbiddenException`, `UnauthorizedException`) with **Russian** messages. Everything is
normalised by `SimpleExeptionFilter` (`src/shared/exceptions/simple-exception.ts`) into:

```json
{ "statusCode": 400, "path": "/api/…", "message": "…" | ["…"] }
```

The filter also maps Prisma codes: `P2002` → 400 "A record with this … already exists",
`P2003` → 400, `P2025` → 404, anything else `P*` → 500. Messages pass through
`translateError` (`src/shared/utils/error-translations.ts`).

Class-name typo `SimpleExeptionFilter` is intentional-by-inertia — it is referenced in
`main.ts` and in tests. Do not rename it.

## Database access

- `PrismaService` extends the **generated** `PrismaClient` and is constructed with a
  `PrismaPg` adapter built from `databaseConfig`.
- Import Prisma types from `@/infrastructure/prisma/generated/client`, **never** from
  `@prisma/client`.
- Tables/columns are `snake_case` via `@@map`/field names; models are PascalCase.
  Watch out: model `Course` maps to table **`file_category`**.
- Soft delete via `deleted_at` on `Teacher`, `Student`, `Plan`, `RegularLesson`.
  `Lesson` has **no** `deleted_at` — `deleteLesson` is a hard delete.
- Repositories map Prisma rows to domain entities with a private `map…ToEntity` method
  (see `plan.repository.ts`, `balance.repository.ts`).

### Transactions

Two patterns exist:

1. **Optional transaction client threaded through a repository** — `lesson.repository.ts`
   defines `type TxClient = Prisma.TransactionClient` and a private `client(tx?)` helper;
   every write method takes an optional `tx`.
2. **Advisory-locked student transaction** — the money path. `BalanceRepository.withStudentLock`
   opens `prisma.$transaction` with `{ timeout: 15_000, maxWait: 10_000 }` and takes
   `pg_advisory_xact_lock(1001, studentId)`. Anything that touches a student's money must run
   inside it, via `BalanceService.withStudentTransaction(...)` /
   `BalanceService.reconcile(...)` / `reconcileInTx(tx, ...)`.

`material.repository.ts` also uses plain `prisma.$transaction([...])` array form for
access-list rewrites.

## Scheduled jobs

`ScheduleModule.forRoot()` is registered globally. Jobs live in different places — no single
convention:

| Job | Location | Cron |
|---|---|---|
| Promote past lessons `PENDING_* → COMPLETED_*` | `LessonService.updateLessonsStatus` (inside the service) | `EVERY_DAY_AT_MIDNIGHT` |
| Bump student class each year | `StudentService.updateStudentClass` (inside the service) | `0 15 30 8 *` |
| Monthly invoices | `payments/application/payments-invoice.scheduler.ts` (dedicated class) | `0 10 1 * *`, `timeZone: "Europe/Minsk"` |
| Daily currency mismatch audit | `payments/application/currency-audit.scheduler.ts` | `0 7 * * *`, `timeZone: "Europe/Minsk"` |
| Delete old completed tasks | `tasks/tasks-cleanup.scheduler.ts` (dedicated class) | `EVERY_DAY_AT_MIDNIGHT` |
| Birthday reminders | `telegram/application/telegram.service.ts` (`birthdayRemind`) | `EVERY_DAY_AT_6AM` |

Newer jobs (payments) use an explicit `timeZone` because the container runs UTC. Dedicated
`*.scheduler.ts` classes are the newer style; prefer them for new jobs, but do not move
existing `@Cron` methods out of their services.

## Configuration

- Never read `process.env` directly in feature code. Use `@/config/bootstrap-env` (`env`,
  `Environments`) or inject a namespace: `@Inject(stripeConfig.KEY) private readonly config: StripeConfig`.
  (`main.ts` and `auth.controller.ts` read `process.env.NODE_ENV` directly — pre-existing.)
- Adding an env var means touching **all** of: `src/config/validation/env.schema.ts`,
  the relevant `src/config/namespaces/*.config.ts`, `.env.example`, `docker-compose.yml`
  (`tutor_backend.environment`), `backend/.env.development` (local, untracked) and
  `backend/.env.testing` (**tracked**). Missing vars fail the app at boot.

## Swagger

Swagger UI at `/api/swagger` in non-production. `backend/swagger.json` is a committed artifact,
regenerated with `yarn swagger:generate`.

Endpoint documentation lives in `src/shared/decorators/swagger/<feature>/<action>-swagger.decorator.ts`
as an `applyDecorators(...)` factory; the controller applies it as a single decorator.
`reports` has no such folder and its controller carries no Swagger decorators — that gap is
pre-existing.

## Observability

- Tracing: OTel SDK in `src/observability/tracing/tracing.ts`, OTLP HTTP exporter → Jaeger.
- Metrics: `@willsoto/nestjs-prometheus`; HTTP interceptor in `observability/metrics/`;
  scrape endpoint `/metrics` (excluded from the `/api` prefix, also used as the Docker healthcheck).
- Domain counters are declared per module — see `payments/application/payments.metrics.ts`
  (`payments_total`, `stripe_webhook_events_total` with `makeCounterProvider`).

## Logging

`private readonly logger = new Logger(<ClassName>.name)` on services that need it; log lines
are Russian, structured as `key=value` in the money path (`BalanceService.reconcile`) so that
allocations can be traced after the fact. Keep that format when touching those logs.
