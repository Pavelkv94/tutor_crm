# AI readiness audit

State of this repository as a working environment for AI agents, as of the audit
(branch `main`, HEAD `50cfbc1`). Findings are observations, not change requests. Nothing in
here was "fixed" in application code.

---

## Current strengths

- **Consistent backend layering in most modules.** `interface/ → application/ → domain/ →
  infrastructure/` is followed by 9 of 11 feature modules, so file location is predictable
  from a route name.
- **Excellent WHY-comments in the newest code.** `balance.service.ts`, `payments.service.ts`,
  `stripe-webhook.service.ts`, `payments.module.ts`, `legacy-invoice.controller.ts`,
  `setup-migrations.ts` and several migrations explain *why* the design is what it is —
  including invariants, ordering requirements, and rejected alternatives. This is the single
  biggest asset for an agent working on money.
- **Explicit invariants.** The balance engine states its three invariants in a doc comment and
  ships `assertInvariant()` plus database-level enforcement.
- **Strong backend test coverage where it matters.** 579 unit tests across 50 suites, plus 9
  e2e suites, including a payments e2e that verifies real Stripe webhook signatures.
- **Centralised HTTP concerns on both sides.** One error filter on the backend, one axios
  interceptor on the frontend — error shape and 401 handling are in exactly one place each.
- **Swagger decorators keep controllers readable** and give a machine-readable API surface
  (`swagger.json`) for the frontend.
- **Prisma schema carries doc comments** (`///`) on the subtle columns (`marketing_consent_at`,
  `balance_currency`, `stripe_refund_id`), so the data model partly documents itself.

---

## Sources of ambiguity

Documented, deliberately not resolved.

1. **Repository ports vs. concrete repositories.** `balance`, `material`, `payments`, `plan`,
   `tasks` use abstract port classes as DI tokens; `lesson`, `student`, `teacher`, `telegram`
   inject concrete repositories. Both are live. An agent asked to "add a repository" has no
   single right answer — [conventions.md](conventions.md) says: match the module you are in.
2. **Module layout.** `tasks` is flat; `auth` puts DTOs at module root; `payments` has no
   `domain/` (it borrows `balance/domain`); `reports` keeps utils at module root.
3. **Path-param parsing.** `ParseIntPipe` in `payments`, bare `+id` everywhere else.
4. **Scheduler placement.** Dedicated `*.scheduler.ts` classes (payments, tasks) vs. `@Cron`
   methods on feature services (lesson, student, telegram).
5. **Empty `application/use-cases/` folders** in seven modules suggest a use-case layer that
   was never adopted.
6. **Two "invoice" routes** with identical behaviour: the canonical
   `POST /api/payments/invoices` and the frozen legacy `POST /api/telegram/send-lessons-cost-to-admin`.
   The frontend still calls the legacy one.
7. **Formatting.** Biome (tabs, double quotes, width 160) governs only the payments/balance/
   stripe slice. Older files mix tabs and spaces and use single quotes. There is no single
   project-wide formatting truth.
8. **Auth failures return 401 for authorization problems.** `AdminAccessGuard` throws
   `UnauthorizedException`; several service-level ownership checks throw `BadRequestException`
   rather than `ForbiddenException`. So the HTTP status does not reliably distinguish
   "not logged in" from "not allowed".

---

## Regression risks

Where AI-generated changes are most likely to break working behaviour.

### 1. Money — highest risk
`BalanceService` is the only writer of `student.balance`, `student.balance_currency`,
`LessonPayment`, and paid/unpaid lesson statuses. A plausible-looking direct write from
`LessonService`, `StudentService`, or a repository silently violates invariant 1 and is only
caught later by `assertInvariant` or the daily currency audit. Allocation order
(ascending date, stop on first shortfall) and revert order (latest first) are behavioural
contracts covered by tests — "optimising" them changes which lessons are marked paid.

### 2. Deleting a lesson without releasing its allocation
`lesson_payment` has `ON DELETE CASCADE`. `LessonService.deleteLesson` releases first, on
purpose. Any new deletion path that skips this loses ledger rows and corrupts the balance.

### 3. The `ValidationPipe` mismatch
Production has no `transform`/`whitelist`; the e2e harness has both. A new DTO using
`@Type(() => Number)` will pass e2e and receive strings in production, which then reach Prisma.
The existing workaround is a route-local pipe in `payments.controller.ts`. Changing the global
pipe to match the tests would silently alter validation for every existing endpoint.

### 4. Frontend/backend contract drift
No codegen, no shared package. Renaming a backend DTO field compiles cleanly on both sides and
fails at runtime, because responses are cast (`apiClient.get<T>`). `frontend-vite/src/types/index.ts`
must be edited by hand.

### 5. Migrations vs. `prisma db push`
e2e provisions its schema with `db push`, which reads only `schema.prisma`. Any partial index,
CHECK constraint, or trigger added in migration SQL must be mirrored in
`backend/test/setup-migrations.ts`, or e2e will pass while production enforces a rule the tests
never see.

### 6. Biome scope
Running `yarn format` after widening `biome.json` would reformat thousands of untouched lines
across the whole backend — a huge, meaningless diff that buries the real change.

### 7. Stripe webhook response codes
`400` / `200` / `500` map to distinct Stripe retry behaviours. Turning a `WebhookBusinessError`
into a thrown 500, or catching a transient error and answering 200, changes redelivery semantics
and can lose or duplicate payments.

### 8. Reschedule/cancel/missed money semantics
`CANCELLED` refunds to balance, `MISSED` burns the allocation, `RESCHEDULED` holds it for
transfer. These three are easy to "unify" and each unification is a money bug.

### 9. Timezone handling
Regular-lesson date generation is pure UTC arithmetic; `RegularLesson.start_time` is a string;
payment crons pin `Europe/Minsk` explicitly because containers run UTC. Introducing
`date-fns-tz` or local-time helpers here would shift real schedules.

### 10. The axios 401 interceptor
It performs a global redirect to `/login` and queues concurrent requests. `AdminAccessGuard`
returning 401 means an authorization failure currently triggers a token refresh attempt. Changing
either side without the other produces refresh loops or lost sessions.

---

## Hidden conventions (discoverable only by reading source)

Now written down in this doc set; listed here because they are invisible from file names:

- `Course` (Prisma model) → table **`file_category`**.
- All money is in **whole currency units**; only the Stripe boundary divides by 100.
- **BYN is never charged through Stripe** — invoices exist without a payment link.
- Personal `FileAccess` always overrides `CourseAccess`; granting course access **deletes**
  per-file rows.
- Material upload is a 3-step presigned protocol; only `UPLOADED` files are listed; view URLs
  live 60 seconds.
- e2e request paths omit the `/api` prefix because `createTestApp` skips `setGlobalPrefix`.
- Throttling applies **only** to `AuthController`, despite `ThrottlerModule` being registered
  globally.
- `yarn test` / `yarn test:watch` match zero tests (wrong `rootDir` in the inline jest config).
- `backend/.env.testing` is committed; `.env.example` is missing the required `R2_*` variables.
- `invalidateMoneyQueries` must be called after lesson/payment mutations because the server
  silently redistributes balance across lessons.
- `SimpleExeptionFilter` — the typo is load-bearing (referenced in `main.ts` and tests).

---

## Pattern inconsistencies (documented, not fixed)

| Inconsistency | Where |
|---|---|
| Ports vs. concrete repositories | see "Sources of ambiguity" #1 |
| Flat vs. layered module | `tasks` vs. everything else |
| `ParseIntPipe` vs. `+id` | `payments` vs. others |
| Scheduler class vs. `@Cron` on service | payments/tasks vs. lesson/student/telegram |
| Guards on controller class vs. per handler (often both) | `plan.controller.ts` declares class-level guards **and** repeats them on `create`/`remove` |
| Quotes/indentation | Biome-covered files vs. the rest |
| `BadRequestException` vs. `ForbiddenException` for ownership failures | `LessonService` vs. `MaterialService` |
| Empty `use-cases/` dirs | seven modules |
| Commented-out dead code | `StudentService.getTelegramLink`, `TelegramService.sendReport` / `sendNotificationAboutLesson` |
| Root-level planning docs (`plan.md`, `PAYMENTS_FRONTEND_HANDOFF.md`) not under `docs/` | repo root |

---

## Documentation gaps addressed by this doc set

- Root `CLAUDE.md` was factually stale: it claimed the generated Prisma client is **committed**
  (it is git-ignored), described throttling as global (it is `AuthController`-only), and listed
  the module set before `balance`, `material`, and `payments` existed. Corrected.
- No prior documentation of the balance/allocation invariants outside source comments.
- No prior documentation of the narrow Biome scope, the red frontend lint baseline, the
  ValidationPipe mismatch, the `/api`-less e2e paths, or the `yarn test` no-op.
- No prior map of which module uses ports and which does not.
- No prior statement that `frontend-vite/src/types/index.ts` is hand-maintained.

## Documentation gaps that remain

- **Telegram bot flows** (account linking via `TelegramToken`, `/start` handling, notification
  copy in `telegram.messages.ts`) are described only at a high level here. A future agent
  working on the bot should read `telegram.service.ts` end to end first.
- **Reports** (Excel via `exceljs`, PDF via `pdfkit`/`puppeteer`) have no Swagger decorators and
  no documented column contract; behaviour must be read from `schedule-excel.util.ts` /
  `students-excel.util.ts`.
- **`Schedule.tsx` (603 lines)** is the most complex frontend component and has no walkthrough
  here.
- **Deployment/runbook** (how `english-stars.duckdns.org` is updated, backup restore procedure)
  is not documented anywhere in the repo.

---

## Recommendations NOT implemented

Every item below would improve AI ergonomics but requires changing working code, tooling, tests,
or configuration. None were made.

### R1 — Align the production `ValidationPipe` with the test harness
- **Impact:** removes the highest-leverage silent-divergence trap; DTO transformation would work
  as written.
- **Risk:** **High.** `whitelist: true` starts stripping unknown properties and `transform: true`
  starts coercing types on *every* existing endpoint. Could change validation outcomes and
  break clients that send extra fields.
- **Affected files:** `backend/src/main.ts` (plus a full regression pass over every controller).
- **Reason not implemented:** changes runtime validation behaviour project-wide.

### R2 — Widen the Biome `files.includes` scope
- **Impact:** one lint/format standard for the whole backend.
- **Risk:** **High.** `yarn format` would rewrite most of `backend/src`, destroying blame and
  making every future diff noisy; `yarn lint` would surface hundreds of pre-existing violations.
- **Affected files:** `backend/biome.json` and, transitively, most of `backend/src`.
- **Reason not implemented:** mass reformatting is explicitly out of scope.

### R3 — Fix the 19 pre-existing frontend ESLint errors
- **Impact:** a green `npm run lint` becomes a usable signal.
- **Risk:** **Medium–High.** The 13 `react-hooks/set-state-in-effect` errors are the project's
  standard "seed dialog form state when `open` flips true / when server data arrives" pattern
  (`Edit*Dialog`, `*AccessDialog`, `SalaryReportDialog`, `UploadMaterialDialog`,
  `AssignRegularLessonsDialog`). Rewriting them changes when fields reset.
- **Affected files:** 13 files under `frontend-vite/src`, incl. `contexts/AuthContext.tsx`,
  `components/ui/{button,input,textarea}.tsx`, `utils/getDaysInWeeks.ts`.
- **Reason not implemented:** modifies working UI behaviour for a lint metric.

### R4 — Point `yarn test` / `yarn test:watch` at `test/`
- **Impact:** the most obvious command would actually run tests.
- **Risk:** **Low–Medium**, but it is a tooling change; `yarn test:watch` is currently a no-op
  that some workflow may rely on.
- **Affected files:** `backend/package.json` (`jest` block).
- **Reason not implemented:** modifies build/test configuration.

### R5 — Generate frontend types from `swagger.json`
- **Impact:** eliminates the largest class of cross-stack drift.
- **Risk:** **High.** Introduces a codegen step, a new dependency, and would rewrite
  `frontend-vite/src/types/index.ts` — losing the hand-written comments that currently encode
  backend constraints (e.g. why `balance_currency` is absent from `CreateStudentInput`).
- **Affected files:** `frontend-vite/package.json`, `src/types/index.ts`, every `src/api/` module.
- **Reason not implemented:** new architectural pattern + dependency change.

### R6 — Add a frontend test runner
- **Impact:** frontend changes could be verified beyond typecheck.
- **Risk:** **Medium.** New dependencies and config; no existing tests to model on.
- **Affected files:** `frontend-vite/package.json`, new config + test files.
- **Reason not implemented:** dependency and tooling change.

### R7 — Raise the Jest timeout for `bcrypt.service.spec.ts`
- **Impact:** removes the full-suite flake.
- **Risk:** **Low**, but it edits a test file.
- **Affected files:** `backend/test/unit/auth/bcrypt.service.spec.ts` (or a shared jest config).
- **Reason not implemented:** tests are out of scope; documented in
  [testing.md](testing.md#known-flake) instead.

### R8 — Add the missing `R2_*` variables to `.env.example`
- **Impact:** a fresh checkout could boot the backend without reading `env.schema.ts`.
- **Risk:** **Low**, but `.env.example` is environment configuration.
- **Affected files:** `.env.example`.
- **Reason not implemented:** environment configuration is explicitly out of scope. Documented
  in [repository-map.md](repository-map.md) and [generated-code.md](generated-code.md).

### R9 — Retire the legacy `POST /api/telegram/send-lessons-cost-to-admin` route
- **Impact:** one invoice entry point instead of two.
- **Risk:** **High.** The frontend still calls it; removing it breaks invoicing until both sides
  ship together.
- **Affected files:** `backend/src/modules/payments/interface/legacy-invoice.controller.ts`,
  `frontend-vite/src/api/telegram.ts` (and callers).
- **Reason not implemented:** API contract change.

### R10 — Delete dead artifacts (`frontend-vite/@/`, empty `use-cases/` dirs, commented-out code, tracked `.DS_Store`)
- **Impact:** less noise while exploring.
- **Risk:** **Low**, but it is unrequested cleanup and touches file layout.
- **Affected files:** `frontend-vite/@/components/ui/sonner.tsx`, seven empty directories,
  `student.service.ts`, `telegram.service.ts`, root `.DS_Store`.
- **Reason not implemented:** out of scope; documented instead.

### R11 — Move `plan.md` and `PAYMENTS_FRONTEND_HANDOFF.md` under `docs/`
- **Impact:** a tidier root and a clearer split between historical and current docs.
- **Risk:** **Low**, but it renames/moves existing files, which the task forbids.
- **Affected files:** the two root markdown files.
- **Reason not implemented:** file moves are out of scope.

---

## WHY-comments worth adding later (source **not** modified)

Locations where a short comment would protect against a future regression. Listed only —
no application file was touched.

| File | Why a comment would help |
|---|---|
| `backend/src/main.ts` (`useGlobalPipes(new ValidationPipe())`) | Record that the absence of `transform`/`whitelist` is load-bearing and that the e2e harness differs, so nobody "aligns" them casually. |
| `backend/src/shared/guards/admin-access.guard.ts` | Record that it intentionally throws 401 (not 403) and that the frontend interceptor keys off 401. |
| `backend/src/modules/lesson/lesson.module.ts` | Record why `lesson` injects concrete repositories while neighbouring modules use ports (or that it simply predates them). |
| `backend/src/infrastructure/prisma/schema.prisma` (`model Course`) | Record that `@@map("file_category")` is a historical table name that raw SQL must use. |
| `backend/biome.json` | Record that `files.includes` is intentionally narrow and why widening it is expensive. |
| `backend/package.json` (`jest` block) | Record that this config is unused by the real test scripts. |
| `backend/src/modules/lesson/application/lesson.service.ts` (slot-conflict block) | The five booking rules are duplicated across `createSingleLessonByAdmin`, `createRescheduledLesson`, `createRegularLessons` and `changeTeacher` with subtle differences; a note on which differences are intentional would prevent a lossy de-duplication. |
