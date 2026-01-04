/*
  Warnings:

  - The values [TRIAL] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PlanType_new" AS ENUM ('INDIVIDUAL', 'PAIR');
ALTER TABLE "public"."plan" ALTER COLUMN "plan_type" TYPE "public"."PlanType_new" USING ("plan_type"::text::"public"."PlanType_new");
ALTER TYPE "public"."PlanType" RENAME TO "PlanType_old";
ALTER TYPE "public"."PlanType_new" RENAME TO "PlanType";
DROP TYPE "public"."PlanType_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."lesson" ADD COLUMN     "is_trial" BOOLEAN NOT NULL DEFAULT false;
