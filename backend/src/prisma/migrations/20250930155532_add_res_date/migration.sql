-- AlterTable
ALTER TABLE "public"."lesson" ADD COLUMN     "rescheduled_lesson_date" TIMESTAMP(3),
ADD COLUMN     "rescheduled_to_lesson_date" TIMESTAMP(3);
