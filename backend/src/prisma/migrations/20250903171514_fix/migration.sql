/*
  Warnings:

  - Added the required column `plan_name` to the `plan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."LessonStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."lesson" ADD COLUMN     "status" "public"."LessonStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."plan" ADD COLUMN     "plan_name" TEXT NOT NULL;
