-- AlterEnum
ALTER TYPE "public"."LessonStatus" ADD VALUE 'MISSED';

-- AlterTable
ALTER TABLE "public"."lesson" ADD COLUMN     "corrected_time" TEXT;
