# Domain map — non-obvious invariants

Every statement here is backed by the cited source or test. Nothing is inferred from intent.
These are the rules an AI change is most likely to break silently.

## Entities

`Teacher` (role `TEACHER | ADMIN`) → owns `Student`s → who have `Lesson`s priced by a `Plan`.
`RegularLesson` is a recurring template that materialises `Lesson` rows.
`Payment` + `LessonPayment` form the money ledger. `Course`/`File` + `CourseAccess`/`FileAccess`
are teaching materials and their permissions. `Telegram`/`TelegramToken` link chat accounts.
`Task`/`TaskComment` are the internal to-do board.

Schema: `backend/src/infrastructure/prisma/schema.prisma`.

> Model `Course` maps to the table **`file_category`** (`@@map("file_category")`) — a
> historical name. Raw SQL and migrations must use `file_category`.

---

## Money and balance

### The single writer

`BalanceService` (`backend/src/modules/balance/application/balance.service.ts`) is the **only**
component allowed to change `student.balance`, `student.balance_currency`, `LessonPayment`
rows, and lesson paid/unpaid statuses. Its own doc comment states the three invariants:

1. `balance = Σ payment.amount (status = SUCCEEDED) − Σ lesson_payment.amount (reverted_at IS NULL)`
2. `(balance = 0 ∧ balance_currency IS NULL) ∨ (balance ≠ 0 ∧ balance_currency IS NOT NULL)`
3. every active allocation of a student is in `balance_currency`

Invariant 1 is checkable at runtime: `BalanceService.assertInvariant(studentId)`.
Invariant 2 is additionally enforced by a database CHECK constraint (below).

Never write `student.balance`, `student.balance_currency` or `LessonPayment` from another
service or repository. `StudentService.update` explicitly strips currency —
see the comment at `student.service.ts` (`buildConsentPatch` region).

### Units

All money is stored and transported in **minor units**: `4000` means 40,00 PLN
(`MONEY_MINOR_UNITS`, `backend/src/shared/utils/money.util.ts`). The same unit is used by
Stripe, so the webhook credits `amount_total` as-is. Print backend amounts with
`formatMoneyMinor` (always two decimals, comma separator); on the frontend, `formatMoney` /
`formatMoneyValue` divide by 100 and `parseMoney` turns «34,50» back into `3450`
(`frontend-vite/src/constants/currency.ts`).

Not affected by the unit: `school_settings.eur_rate` and `payment.charge_rate` are hundredths
of a rate, `student.discount` is a percent.

### Allocation semantics

`BalanceService.reconcile` / `reconcileInTx`:

- runs under `pg_advisory_xact_lock(1001, studentId)` inside a Prisma transaction with
  `timeout: 15_000, maxWait: 10_000` (`balance.repository.ts`);
- **allocates** to unpaid lessons in **ascending date order**, and stops at the first lesson it
  cannot fully cover — it does not skip ahead to a cheaper later lesson;
- **reverts** from the **latest** allocations first when the balance must shrink;
- skips lessons with `plan_price <= 0`, `is_free`, `is_trial`, and lessons whose plan currency
  differs from the balance currency (logged as a warning);
- only `PENDING_UNPAID`/`COMPLETED_UNPAID` are allocatable; only `PENDING_PAID`/`COMPLETED_PAID`
  can be reverted (maps `PAID_FOR_UNPAID` / `UNPAID_FOR_PAID`);
- default allocation window starts at `startOfMonth(new Date())` unless `allocateFrom` is passed.

### Lesson lifecycle vs. money

| Event | Money behaviour | Where |
|---|---|---|
| Lesson created / regular lessons created | `settleFromBalance` — leftover balance may immediately pay for it | `LessonService.createSingleLessonByAdmin`, `createRegularLessons` |
| Lesson **CANCELLED** | allocation released, money returns to balance and is redistributed | `LessonService.cancelLesson` |
| Lesson **MISSED** | allocation **kept** — the money is burned with the lesson | same |
| Lesson **RESCHEDULED** | allocation **kept**, waiting to move to the replacement lesson | same |
| Reschedule created | allocation transferred from the original to the new lesson inside one transaction; the new lesson is created `PENDING_PAID` iff the original had an active allocation | `LessonService.createRescheduledLesson` |
| Lesson deleted | allocation must be released **before** the delete, because `lesson_payment` has `ON DELETE CASCADE` and the ledger row would vanish, breaking invariant 1 | `LessonService.deleteLesson` |
| Lesson marked free | allocation released — a free lesson must not hold money | `LessonService.manageFreeLessonStatus` |
| Plan changed for a period | allocations released with `redistribute: false`, then prices updated, then `reconcileInTx` — all in one transaction/lock, so money never lands on a stale price | `LessonService.updateLessonsPlanForPeriod` |

`settleFromBalance` deliberately swallows its errors: a balance-redistribution failure must not
roll back the lesson operation that already succeeded.

Paid/unpaid status is **not** the source of truth for "was this lesson paid" once a lesson has
been rescheduled — the code checks for an **active allocation** instead, because the original
lesson is already `RESCHEDULED` by then (`createRescheduledLesson`).

### Currency rules

- A student's `balance_currency` belongs to the **balance**, not to the student. `NULL` means
  "balance is 0, currency released" — the student may move to another currency.
- The billing currency is derived from the **plans of the lessons**, never chosen by hand.
- `BalanceService.assertLessonCurrencyAllowed` blocks assigning a lesson whose plan currency
  conflicts with (a) a non-zero balance in another currency, or (b) other paid-or-unpaid
  billable lessons **in the same calendar month**, including already-paid ones. Past months
  are not checked. Free/trial/zero-price lessons are exempt.
- Incoming money in a conflicting currency is **not rejected and not merged**: the payment is
  parked as `PaymentStatus.REQUIRES_ATTENTION`, an admin is alerted in Telegram, and it is
  applied later through `POST /api/payments/:id/apply`
  (`BalanceService.parkOnCurrencyConflict`, `PaymentsService.applyParkedPayment`).
- Internal redistribution (`payment: { kind: "none" }`) is **never** parked — parking it would
  leave the allocation removed and the balance not raised, breaking invariant 1.
- `CurrencyAuditScheduler` (daily 07:00 Europe/Minsk) reports students whose month mixes
  currencies or disagrees with `balance_currency`, because back-dated edits and direct DB
  changes bypass the write-time checks.

### Refunds

Handled on `refund.created`, **not** `charge.refunded` — the latter carries a cumulative
`amount_refunded`, so a second partial refund would be double-counted
(`stripe-webhook.service.ts`). Refunds pass `allowNegativeBalance: true`: the money already
left Stripe, so if there is nothing to revert the balance legitimately goes negative and an
admin is alerted. `Payment.stripe_refund_id` is a separate `@unique` column because a refund
shares the original `payment_intent`.

### Invoicing

`PaymentsService.createInvoice`:
1. pre-reconciles with `delta: 0` so existing balance is spent first (otherwise the student
   pays twice for lessons the balance already covers);
2. selects billable lessons for the period, dropping `is_free` and `plan_price <= 0`;
3. derives a single currency from the plans — **mixed currencies abort the invoice** with an
   admin alert;
4. re-reads the student, because step 1 may have changed balance and currency;
5. cancels any previous `PENDING` invoice for the same period, then creates the new one;
6. builds a Stripe Payment Link for `PLN`/`EUR` only. **`BYN` is paid outside the system** —
   the invoice exists without a link (`STRIPE_CURRENCIES` in both `payments.service.ts` and
   `plan.service.ts`);
7. Stripe line items are grouped by plan (one item per plan with a quantity), capped at
   `MAX_LINE_ITEMS = 20` — Stripe's limit;
8. plans created before payments existed get their Stripe product/price created on the fly via
   `PlanService.ensureStripeIds` (idempotent).

A Stripe failure here is **not** fatal: the Telegram report is sent anyway, without a link.

The monthly cron (`0 10 1 * *`, Europe/Minsk) iterates students sequentially and swallows
per-student errors. Manual invoicing passes `throwOnSkip: true` so the caller sees the problem
instead of a silent `null` (`payments.controller.ts`).

### Plans and Stripe

`PlanService.create` creates a Stripe product + price for `PLN`/`EUR` plans with `plan_price > 0`.
If Stripe fails, the plan is **rolled back** (archived product + soft-deleted plan) because a
plan without a Stripe price cannot be billed. Conversely, `PlanService.remove` soft-deletes
first and only then tries to archive in Stripe — an archive failure is logged, never rolled back.

### Stripe webhooks

`POST /api/payments/stripe/webhook` (`payments-webhook.controller.ts`) — **no guards**; the
signature is the authentication. Response codes are load-bearing:

| Code | Meaning to Stripe |
|---|---|
| `400` | signature invalid / empty body — nothing to retry |
| `200` | accepted, including "a human must look at this" (`business_error`) — do **not** retry |
| `500` | transient failure — **do** retry |

Idempotency: `claimWebhookEvent(event.id, event.type)` inserts into `StripeWebhookEvent` and
returns false if already claimed. `processed_at` is only stamped on success or on a
`WebhookBusinessError`; a transient throw leaves it `NULL` so Stripe redelivers.

Ordering inside `settleCheckoutSession` is deliberate: consents are recorded **before** the
early return on an already-`SUCCEEDED` payment and before `reconcile`, so a retry cannot lose
the parent's answer.

`checkout.session.completed` with `payment_status !== 'paid'` is ignored — deferred methods
(BLIK, P24) confirm later via `checkout.session.async_payment_succeeded`.

### Consents

- `Student.marketing_consent` holds the answer; `marketing_consent_at` records **that** an
  answer exists. `NULL` timestamp ⇒ never asked ⇒ the Stripe checkout page shows the dropdown.
  A refusal is a recorded answer, same as consent.
- `Student.terms_accepted_at` `NULL` ⇒ terms not accepted (Stripe only reports "accepted").
- First answer wins: `StudentService.recordConsentsFromCheckout` will not overwrite an existing
  value on webhook redelivery.
- Admin edits only move the timestamp when the value actually changed — otherwise merely
  opening and saving the edit form would permanently suppress the checkout question
  (`StudentService.buildConsentPatch`).

---

## Lessons and scheduling

Slot rules enforced in `LessonService` when creating single, regular, or rescheduled lessons,
or changing a lesson's teacher — all raise `BadRequestException` with Russian text:

- at most **2** lessons in one teacher/time slot;
- an existing `INDIVIDUAL` lesson blocks the slot entirely;
- the same student cannot be booked twice in one slot;
- a second lesson in a slot must use the **same plan**;
- a rescheduled ("отработка") lesson cannot share a slot with a normal lesson;
- a trial lesson (`is_trial`) can be neither rescheduled nor toggled free;
- a lesson already `CANCELLED`/`MISSED`/`RESCHEDULED` cannot be cancelled again;
- an already-rescheduled lesson cannot be rescheduled a second time — the existing reschedule
  must be cancelled first (`lesson.repository.ts:cancelLesson`);
- only an **admin** may use the `CANCELLED` status; teachers may only mark `MISSED`/`RESCHEDULED`,
  and only for their own students.

`Lesson.date` is `@db.Timestamptz`. Regular-lesson date generation works entirely in **UTC**
(`getDatesForWeekDay`, `Date.UTC(...)`); `RegularLesson.start_time` is stored as a **string**.
`Student.timezone` / `Teacher.timezone` are a `Timezone` enum of regions (`BY, PL, KZ, GE, RU, EU`),
used for display, not for storage conversion.

A midnight cron promotes past `PENDING_UNPAID → COMPLETED_UNPAID` and
`PENDING_PAID → COMPLETED_PAID`, excluding free and trial lessons
(`LessonRepository.updatePendingLessonsStatus`).

`Lesson` has **no** `deleted_at`: deletion is a hard delete. `Teacher`, `Student`, `Plan` and
`RegularLesson` are soft-deleted via `deleted_at`, and services reject operations on
already-deleted rows with "уже удален".

---

## Materials access control

Two permission layers, resolved in `MaterialRepository.hasAccess`:

1. a per-file `FileAccess` row (`ALLOW` | `DENY`) — **always wins**;
2. otherwise, a `CourseAccess` row for the file's course grants access.

Consequences encoded in `MaterialService`:
- granting access to a teacher who already has course access **deletes** the personal row
  rather than adding an `ALLOW`;
- revoking from a teacher with course access writes an explicit `DENY`; revoking from one
  without it deletes the row;
- granting **course** access wipes all personal `FileAccess` rows for that course's files
  (course access supersedes them).

Admins (`role === ADMIN`) bypass all of this in `getCourseMaterials`, `getViewUrl` and
`renameMaterial`.

### Upload protocol (3 steps, presigned)

1. `POST /api/materials/upload/init` — server builds `storageKey = "<courseId>/<uuid>-<fileName>"`,
   returns a presigned PUT URL (5 min) and creates the `File` row with `upload_status = UPLOADING`;
2. client PUTs the bytes **directly to R2** (`materialsApi.uploadToR2`, raw `fetch`);
3. `POST /api/materials/upload/:id/complete` — server HEADs the object and rejects if it is
   missing or if `contentLength !== sizeBytes`, then flips to `UPLOADED`.

Only `UPLOADED` files are listed or viewable. View URLs are presigned GETs valid for **60 s**
with `ResponseContentDisposition: inline`.

Deletion order is deliberate: DB row first, R2 object second — a storage failure must not leave
a dangling DB record pointing at nothing (`MaterialService.deleteMaterial`).

---

## Database constraints Prisma cannot express

These live only in hand-written SQL and are re-applied for e2e by
`backend/test/setup-migrations.ts`. If you change related logic, they are what will fail first.

| Constraint | Meaning | Defined in |
|---|---|---|
| `lesson_payment_active_lesson_key` — unique partial index on `lesson_id WHERE reverted_at IS NULL` | at most one active allocation per lesson (double-payment guard) | `migrations/20260806191500_add_payments/migration.sql` |
| `payment_pending_period_key` — unique partial index on `(student_id, period_start, period_end) WHERE status='PENDING' AND type='STRIPE_PAYMENT'` | at most one open invoice per student per period | same |
| `student_balance_currency_check` — CHECK `(balance = 0 AND balance_currency IS NULL) OR (balance <> 0 AND balance_currency IS NOT NULL)` | invariant 2 | `migrations/20260807100200_rename_payment_currency_to_balance_currency/migration.sql` |

A consequence visible to the frontend: `CreateStudentInput` must **not** send
`balance_currency` — a new student's balance is 0, so any non-null currency violates the CHECK
(comment in `frontend-vite/src/types/index.ts`).

Migration `20260806191500_add_payments` also **backfilled** history: it created `LessonPayment`
rows for lessons that were already paid and one `LEGACY_OPENING_BALANCE` payment per student,
so invariant 1 holds retroactively. Do not write a migration that re-runs that backfill.

---

## Frozen API contracts

- `POST /api/telegram/send-lessons-cost-to-admin` — legacy invoice route still called by the
  frontend. Body, guards and `204 No Content` are frozen. Implemented by
  `payments/interface/legacy-invoice.controller.ts`; the canonical route is
  `POST /api/payments/invoices`.
- Everything the frontend consumes is contract-coupled by hand: there is no codegen, so
  renaming a DTO field silently breaks the SPA at runtime. Grep `frontend-vite/src/types/index.ts`
  and `frontend-vite/src/api/` before changing any response shape.
