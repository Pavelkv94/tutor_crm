/*
  Warnings:

  - You are about to drop the column `start_date` on the `lesson` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[student_id,date,teacher_id]` on the table `lesson` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date` to the `lesson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time_hour` to the `lesson` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- DropIndex
DROP INDEX "public"."lesson_student_id_start_date_teacher_id_key";

-- AlterTable
ALTER TABLE "public"."lesson" DROP COLUMN "start_date",
ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "regular_lesson_id" INTEGER,
ADD COLUMN     "start_time_hour" TIME NOT NULL,
ALTER COLUMN "corrected_time" SET DATA TYPE TIME;

-- CreateTable
CREATE TABLE "public"."regular_lesson" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "start_time_hour" TEXT NOT NULL,
    "corrected_time" TEXT NOT NULL,
    "week_day" "public"."WeekDay" NOT NULL,
    "start_period_date" TIMESTAMP(3) NOT NULL,
    "end_period_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "regular_lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regular_lesson_student_id_start_time_hour_week_day_key" ON "public"."regular_lesson"("student_id", "start_time_hour", "week_day");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_student_id_date_teacher_id_key" ON "public"."lesson"("student_id", "date", "teacher_id");

-- AddForeignKey
ALTER TABLE "public"."regular_lesson" ADD CONSTRAINT "regular_lesson_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."regular_lesson" ADD CONSTRAINT "regular_lesson_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."regular_lesson" ADD CONSTRAINT "regular_lesson_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson" ADD CONSTRAINT "lesson_regular_lesson_id_fkey" FOREIGN KEY ("regular_lesson_id") REFERENCES "public"."regular_lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
