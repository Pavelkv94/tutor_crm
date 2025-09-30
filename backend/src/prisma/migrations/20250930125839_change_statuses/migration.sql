-- AlterEnum
ALTER TYPE "public"."LessonStatus" ADD VALUE 'RESCHEDULED';

-- AlterTable
ALTER TABLE "public"."lesson" ADD COLUMN     "is_paid" BOOLEAN NOT NULL DEFAULT false;
