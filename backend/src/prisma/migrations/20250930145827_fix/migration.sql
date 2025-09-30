-- AlterTable
ALTER TABLE "public"."lesson" ADD COLUMN     "is_free" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_regular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rescheduled_lesson_id" INTEGER,
ADD COLUMN     "rescheduled_to_lesson_id" INTEGER;
