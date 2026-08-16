-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('STRIPE_PAYMENT', 'STRIPE_REFUND', 'MANUAL_ADJUSTMENT', 'LEGACY_OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'CANCELED', 'FAILED');

-- AlterTable
ALTER TABLE "plan" ADD COLUMN "stripe_product_id" TEXT,
ADD COLUMN "stripe_price_id" TEXT;

-- CreateTable
CREATE TABLE "payment" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "lessons_count" INTEGER,
    "comment" TEXT,
    "created_by_id" INTEGER,
    "stripe_payment_link_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_payment" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "payment_id" INTEGER,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reverted_at" TIMESTAMP(3),

    CONSTRAINT "lesson_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "stripe_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_stripe_product_id_key" ON "plan"("stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_stripe_price_id_key" ON "plan"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_stripe_payment_link_id_key" ON "payment"("stripe_payment_link_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_stripe_checkout_session_id_key" ON "payment"("stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_stripe_payment_intent_id_key" ON "payment"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payment_student_id_created_at_idx" ON "payment"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "lesson_payment_student_id_reverted_at_idx" ON "lesson_payment"("student_id", "reverted_at");

-- CreateIndex
CREATE INDEX "lesson_payment_lesson_id_idx" ON "lesson_payment"("lesson_id");

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_payment" ADD CONSTRAINT "lesson_payment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_payment" ADD CONSTRAINT "lesson_payment_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_payment" ADD CONSTRAINT "lesson_payment_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index: at most one active (non-reverted) allocation per lesson.
-- Prisma cannot express partial indexes in the schema, so this is hand-written.
CREATE UNIQUE INDEX "lesson_payment_active_lesson_key"
  ON "lesson_payment" ("lesson_id") WHERE "reverted_at" IS NULL;

-- Partial unique index: at most one PENDING Stripe invoice per student per billing period.
CREATE UNIQUE INDEX "payment_pending_period_key"
  ON "payment" ("student_id", "period_start", "period_end")
  WHERE "status" = 'PENDING' AND "type" = 'STRIPE_PAYMENT';

-- Backfill: create LessonPayment allocations for lessons that are already paid,
-- so the balance invariant (balance = sum(payments) - sum(active lesson_payments)) holds historically.
INSERT INTO "lesson_payment" ("student_id", "lesson_id", "payment_id", "amount", "currency", "created_at")
SELECT l."student_id", l."id", NULL, p."plan_price", p."plan_currency", l."created_at"
FROM "lesson" l
JOIN "plan" p ON p."id" = l."plan_id"
WHERE l."status" IN ('PENDING_PAID', 'COMPLETED_PAID')
  AND l."is_free" = false
  AND l."is_trial" = false
  AND p."plan_price" > 0;

-- Backfill: one opening-balance Payment per student covering the existing `student.balance`
-- plus everything just allocated above, so the invariant holds from this migration forward.
INSERT INTO "payment" ("student_id", "type", "status", "amount", "currency", "comment", "paid_at", "created_at", "updated_at")
SELECT
  s."id",
  'LEGACY_OPENING_BALANCE',
  'SUCCEEDED',
  s."balance" + COALESCE((
    SELECT SUM(lp."amount")
    FROM "lesson_payment" lp
    WHERE lp."student_id" = s."id" AND lp."reverted_at" IS NULL
  ), 0),
  s."payment_currency",
  'Historical opening balance backfilled by migration 20260806191500_add_payments',
  now(),
  now(),
  now()
FROM "student" s
WHERE s."balance" + COALESCE((
    SELECT SUM(lp."amount")
    FROM "lesson_payment" lp
    WHERE lp."student_id" = s."id" AND lp."reverted_at" IS NULL
  ), 0) != 0;
