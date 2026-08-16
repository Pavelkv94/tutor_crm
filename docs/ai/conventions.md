# Pattern catalog

Each entry describes a pattern **that exists in this repository**, with a canonical file to
copy from. Where two patterns coexist, both are listed and the ambiguity is flagged — do not
pick one and standardise on it.

---

## Adding a backend endpoint to an existing module

**Purpose:** expose new behaviour over HTTP.

**Existing convention:**
1. Request DTO in `interface/dto/requests/*.dto.ts` — a class with `class-validator` decorators
   and `@ApiProperty` on every field.
2. Response DTO in `interface/dto/responses/*.dto.ts`; if the domain entity differs from the
   wire shape, add a pure function in `interface/mappers/*-response.mapper.ts`.
3. A Swagger factory in `src/shared/decorators/swagger/<feature>/<action>-swagger.decorator.ts`
   returning `applyDecorators(ApiOperation(...), Api<Status>Response(...), ..., ApiBearerAuth())`.
4. Controller method: Swagger decorator first, then the HTTP verb, then `@HttpCode(HttpStatus.X)`,
   then `@UseGuards(...)`. Body/param/query decorators on the arguments; `@ExtractTeacherFromRequest()`
   for the caller.
5. Business logic in the service; data access in the repository. Controllers stay thin — the
   only logic they carry is response mapping and, in a few list endpoints, the admin-vs-teacher
   `teacher_id` override.

**Canonical example:** `backend/src/modules/payments/interface/payments.controller.ts` +
`src/shared/decorators/swagger/payments/create-invoice-swagger.decorator.ts` +
`interface/dto/requests/adjust-balance.dto.ts` + `interface/mappers/payment-response.mapper.ts`.
A smaller one: `backend/src/modules/plan/interface/plan.controller.ts`.

**Constraints:**
- Global prefix is `/api`; do not repeat it in `@Controller()`.
- The global `ValidationPipe` has **no** `transform`. If your DTO needs `@Type(...)`, add a
  route-local `@Query(new ValidationPipe({ transform: true }))` as `payments.controller.ts:list` does.
- Path parameters are usually converted with `+id` (`plan`, `lesson`, `material`, `tasks`);
  `payments.controller.ts` uses `ParseIntPipe` instead. Both exist — match the module.
- Regenerate `backend/swagger.json` with `yarn swagger:generate` when the public surface changes.

---

## Adding a backend module

**Purpose:** a new feature area.

**Existing convention:** `src/modules/<feature>/` with `interface/`, `application/`, `domain/`,
`infrastructure/` and `<feature>.module.ts`; register it in `src/app.module.ts`.
Export the service if other modules need it; import owning modules rather than reaching into
their repositories.

**Canonical example:** `backend/src/modules/material/` (full four layers, ports, mappers) or
`backend/src/modules/plan/` (smaller).

**Ambiguity — repository ports:** `balance`, `material`, `payments`, `plan`, `tasks` define
abstract `*.repository.port.ts` classes and bind them with
`{ provide: XPort, useClass: XRepository }`. `lesson`, `student`, `teacher`, `telegram` inject
the concrete repository class directly. Both are current. For a brand-new module, the ports
style matches the four most recently written modules; for edits, match the module you are in.

**Ambiguity — layout:** `tasks` is flat (no `interface/`/`application/` folders) and puts its
port in `ports/`. `auth` puts DTOs at `auth/dto/`. Neither is a mistake to "fix".

**Constraints:** keep the module graph acyclic; the reasoning for the current payments/telegram/
balance edges is documented in comments in `payments.module.ts` and `legacy-invoice.controller.ts`.

---

## Data access

**Purpose:** read/write Postgres.

**Existing convention:** a repository class injecting `PrismaService`, returning **domain
entities**, with a private `map<X>ToEntity(row)` translating Prisma rows. Prisma types are
imported from `@/infrastructure/prisma/generated/client`.

**Canonical examples:** `plan/infrastructure/plan.repository.ts` (simple),
`balance/infrastructure/balance.repository.ts` (transactional + advisory lock),
`material/infrastructure/material.repository.ts` (multi-statement `$transaction([...])`).

**Constraints:**
- Never import `@prisma/client`.
- Soft-deleted rows (`deleted_at`) must be filtered explicitly — there is no global middleware.
- Anything touching student money must go through `BalanceService`, never direct writes.

---

## Transactions

**Existing convention — two patterns:**

1. **Optional `tx` parameter.** `type TxClient = Prisma.TransactionClient` plus a private
   `client(tx?)` helper; every write method accepts `tx?`.
   *Canonical:* `lesson/infrastructure/lesson.repository.ts`.
2. **Advisory-locked student transaction.** `BalanceService.withStudentTransaction(studentId, fn)`
   wraps `pg_advisory_xact_lock(1001, studentId)` in a Prisma transaction; callers pass `tx`
   into repositories and use `reconcileInTx` / `releaseLessonInTx` / `transferAllocationInTx`.
   *Canonical:* `LessonService.cancelLesson`, `LessonService.updateLessonsPlanForPeriod`.

**Constraint:** the money path must use pattern 2. Mixing a non-locked write of
`student.balance` into pattern 1 breaks the ledger invariants.

---

## Authorization

**Purpose:** restrict who may call what.

**Existing convention — two levels, both in use:**
- Route level: `@UseGuards(JwtAccessGuard)` for authenticated, `@UseGuards(JwtAccessGuard, AdminAccessGuard)`
  for admin-only. Applied on the controller class and/or the handler (several controllers repeat
  it on both).
- Service level: ownership checks comparing `teacher.role !== TeacherRoleEnum.ADMIN` with
  `student.teacher_id !== +teacher.id`, throwing `BadRequestException` with a Russian message.

**Canonical examples:** guards — `plan.controller.ts`, `payments.controller.ts`;
ownership — `LessonService.findLessonsForPeriodAndStudent`, `LessonService.cancelLesson`;
role-based data scoping — `lesson.controller.ts:findLessonsForPeriod`.

**Constraints:** `AdminAccessGuard` throws **401**, not 403 — the frontend's axios interceptor
treats 401 as "refresh the token", so changing this changes client behaviour.
`MaterialController` applies guards per handler because the same controller mixes teacher-readable
and admin-only routes.

---

## Validation

**Purpose:** reject bad input.

**Existing convention:** `class-validator` decorators on request DTO classes, enforced by the
global `ValidationPipe`. Business rules that need database context are validated in the service
with explicit `throw new BadRequestException('…')`.

**Canonical example:** `payments/interface/dto/requests/adjust-balance.dto.ts`
(`@IsInt`, `@NotEquals(0)`, `@IsEnum`, `@IsOptional`, `@MinLength`, `@MaxLength` + `@ApiProperty`).

**Constraints:** no `transform`/`whitelist` globally (see [backend.md](backend.md)). Date-string
normalisation uses the local `@ToUTC()` decorator (`shared/decorators/transform/to-utc.decorator.ts`).

---

## Error handling

**Existing convention:** throw Nest HTTP exceptions with Russian messages; let
`SimpleExeptionFilter` shape the response. For "an admin must look at this" situations in
background/webhook code, log at `error` and notify via `TelegramService.sendMessageToAdmin`,
wrapped in try/catch so notification failure never breaks the operation.

**Canonical examples:** `PaymentsService.notifyAdmin`, `StripeWebhookService.handleEvent`
(`WebhookBusinessError` vs. transient throw), `PlanService.remove` (best-effort Stripe archive).

**Constraint:** never let a secondary concern (Telegram, Stripe archive, balance
redistribution) roll back a primary operation that already succeeded — the existing code is
explicit about this in comments.

---

## Background jobs

**Existing convention — two placements:** a dedicated `*.scheduler.ts` class in the module
(`payments-invoice.scheduler.ts`, `currency-audit.scheduler.ts`, `tasks-cleanup.scheduler.ts`)
or a `@Cron` method on the feature service (`LessonService.updateLessonsStatus`,
`StudentService.updateStudentClass`, `TelegramService.birthdayRemind`).

**Canonical example (newer style):** `payments/application/payments-invoice.scheduler.ts` —
dedicated class, try/catch around the whole run, explicit `{ timeZone: "Europe/Minsk" }`.

**Constraint:** containers run UTC. Any wall-clock-sensitive schedule needs an explicit
`timeZone`.

---

## Backend unit test

**Purpose:** test a service/controller/repository in isolation.

**Existing convention:** `Test.createTestingModule({ providers: [...] })` with every dependency
replaced by an object of `jest.fn()`s, keyed by the same token the module uses (the **port
class** where one exists, the concrete class otherwise). Tests live in
`backend/test/unit/<feature>/<file>.spec.ts` and import via **relative paths** (`../../../src/...`),
not the `@/` alias. Structure: `describe('<Class>')` → `it('should be defined')` →
one `describe` per method.

**Canonical example:** `backend/test/unit/plan/plan.service.spec.ts`.
For the money engine: `backend/test/unit/balance/balance.service.spec.ts`.

---

## Backend e2e test

**Purpose:** exercise real HTTP + real Postgres.

**Existing convention:** `createTestApp()` from `test/helpers/test-utils.ts` builds the whole
`AppModule` with `ThrottlerGuard` stubbed to allow, `TelegramModule` replaced, and optionally
`StripeService` overridden. Auth via `generateTestAccessToken` / `generateTestAdminToken`.
Tests seed and clean their own data through `PrismaService`. Always `closeTestApp(app)` in
`afterAll`.

**Canonical example:** `backend/test/e2e/payments.e2e-spec.ts` — also shows how to keep Stripe
signature verification real while stubbing the network, by supplying a `constructWebhookEvent`
that calls `stripe.webhooks.constructEvent`.

**Constraints:**
- Request paths carry **no `/api` prefix** — `createTestApp` does not call `setGlobalPrefix`.
- The e2e app uses `ValidationPipe({ transform: true, whitelist: true })`, unlike production.
- e2e needs a reachable Postgres from `backend/.env.testing`; `test/setup-migrations.ts` pushes
  the schema and re-applies the hand-written indexes/CHECK constraints.

---

## Frontend: calling the API

**Existing convention:** add a function to `frontend-vite/src/api/<resource>.ts`, typed with
input/output interfaces from `@/types`. Components never import axios.

**Canonical example:** `frontend-vite/src/api/payments.ts`.

**Constraints:** paths are relative to `VITE_API_URL` (which already ends in `/api`).
Only R2 uploads (`materialsApi.uploadToR2`) and the SSE hook bypass `apiClient`, for documented
reasons.

---

## Frontend: fetching data

**Existing convention:** `useQuery({ queryKey: [...], queryFn: () => xApi.y(...) })` directly in
the page or component, with a hierarchical inline key. Lazily-loaded pickers use
`enabled: <flag>`.

**Canonical examples:** `frontend-vite/src/pages/Payments.tsx` (filters → key → query),
`frontend-vite/src/hooks/useStudentsDirectory.ts` (`useQueries` fan-out + `enabled`).

**Constraint:** there is no query-key factory; reuse the existing prefix for the resource so
invalidation elsewhere still matches.

---

## Frontend: mutations

**Existing convention:** `useMutation({ mutationFn, onSuccess })`. `onSuccess` invalidates,
shows a success toast where useful, and closes/resets the dialog. **No `onError`** — the axios
interceptor already toasts.

**Canonical examples:** `frontend-vite/src/pages/Payments.tsx` (`cancelMutation`, `applyMutation`),
`frontend-vite/src/components/students/CreateStudentDialog.tsx` (`createMutation`).

**Constraint:** if the mutation can move money or change lesson payment status, call
`invalidateMoneyQueries(queryClient, studentId)` instead of invalidating a single key.

---

## Frontend: forms and dialogs

**Existing convention:** controlled `useState` per field, derived `isFormValid`, `<form onSubmit={handleSubmit}>`
with `e.preventDefault()`, shadcn `Dialog*` primitives, `open`/`onOpenChange` owned by the parent
page, pending-aware submit button. **No react-hook-form, no zod** — those dependencies are not
installed.

**Canonical example:** `frontend-vite/src/components/students/CreateStudentDialog.tsx`.
A larger one with server-derived state: `frontend-vite/src/components/payments/BalanceAdjustDialog.tsx`.

---

## Frontend: adding a page/route

**Existing convention:** component in `src/pages/`, exported as a named `const` arrow function;
route added to `src/App.tsx` wrapped in `<ProtectedRoute>` (+ `adminOnly` if needed) and
`<MainLayout>`; navigation entry in `src/constants/navigation.ts` if it should appear in the sidebar.

**Canonical example:** the `/payments` route in `src/App.tsx` + `src/pages/Payments.tsx`.

---

## Adding a database field or model

**Existing convention:**
1. edit `backend/src/infrastructure/prisma/schema.prisma` (snake_case columns, `@@map` for the
   table, `deleted_at` if the entity is soft-deleted);
2. `yarn prisma:migrate` to create + apply the migration;
3. `yarn prisma:generate` to refresh the git-ignored client;
4. update the repository mapper, the domain entity, DTOs and Swagger decorators;
5. update `frontend-vite/src/types/index.ts` **by hand** and any `src/api/` payloads;
6. `yarn swagger:generate`.

**Canonical example:** `migrations/20260816150000_add_student_consents/` together with
`Student.marketing_consent_at` / `terms_accepted_at` and their frontend counterparts.

**Constraints:** constraints Prisma cannot express (partial unique indexes, CHECK) are written
by hand into the migration SQL **and** mirrored in `backend/test/setup-migrations.ts`, because
e2e uses `prisma db push`, which ignores migration files. Applied migrations are immutable —
add a new one rather than editing an old one (`plan.md` records this rule being applied for
`add_payment_refund_id`).

---

## Logging

**Existing convention:** `private readonly logger = new Logger(<Class>.name)`; Russian messages;
the balance engine logs machine-greppable `key=value` lines (`reconcile student=… reason=… delta=…`).
Sensitive payloads are never logged — the webhook controller explicitly refuses to log body or
signature.
