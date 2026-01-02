/*
  Warnings:

  - You are about to drop the column `corrected_time` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `start_time_hour` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `corrected_time` on the `regular_lesson` table. All the data in the column will be lost.
  - You are about to drop the column `start_time_hour` on the `regular_lesson` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[student_id,start_time,week_day]` on the table `regular_lesson` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `start_time` to the `lesson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `regular_lesson` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."regular_lesson_student_id_start_time_hour_week_day_key";

-- AlterTable
ALTER TABLE "public"."lesson" DROP COLUMN "corrected_time",
DROP COLUMN "start_time_hour",
ADD COLUMN     "start_time" TIME NOT NULL;

-- AlterTable
ALTER TABLE "public"."regular_lesson" DROP COLUMN "corrected_time",
DROP COLUMN "start_time_hour",
ADD COLUMN     "start_time" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "regular_lesson_student_id_start_time_week_day_key" ON "public"."regular_lesson"("student_id", "start_time", "week_day");
