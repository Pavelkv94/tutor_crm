-- Unify PlanCurrency and PaymentCurrency into a single Currency enum (EUR, PLN, BYN).
-- USD/RUB are dropped: verified no existing `plan` rows use them.

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'PLN', 'BYN');

-- AlterTable: plan.plan_currency (no default, not nullable)
ALTER TABLE "plan" ALTER COLUMN "plan_currency" TYPE "Currency" USING ("plan_currency"::text::"Currency");

-- AlterTable: student.payment_currency (has DEFAULT 'BYN', must drop/recreate around the type change)
ALTER TABLE "student" ALTER COLUMN "payment_currency" DROP DEFAULT;
ALTER TABLE "student" ALTER COLUMN "payment_currency" TYPE "Currency" USING ("payment_currency"::text::"Currency");
ALTER TABLE "student" ALTER COLUMN "payment_currency" SET DEFAULT 'BYN';

-- DropEnum
DROP TYPE "PlanCurrency";
DROP TYPE "PaymentCurrency";
