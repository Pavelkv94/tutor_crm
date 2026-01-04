/*
  Warnings:

  - You are about to drop the column `is_paid` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `payment_status` on the `lesson` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."PlanType" ADD VALUE 'TRIAL';

-- DropIndex
DROP INDEX "public"."lesson_student_id_date_teacher_id_key";

-- AlterTable
ALTER TABLE "public"."lesson" DROP COLUMN "is_paid",
DROP COLUMN "payment_status";
