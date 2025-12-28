/*
  Warnings:

  - The values [PENDING,COMPLETED] on the enum `LessonStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[student_id,start_date,teacher_id]` on the table `lesson` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `teacher_id` to the `lesson` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."LessonStatus_new" AS ENUM ('PENDING_PAID', 'PENDING_UNPAID', 'COMPLETED_PAID', 'COMPLETED_UNPAID', 'MISSED', 'RESCHEDULED', 'CANCELLED');
ALTER TABLE "public"."lesson" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."lesson" ALTER COLUMN "status" TYPE "public"."LessonStatus_new" USING ("status"::text::"public"."LessonStatus_new");
ALTER TYPE "public"."LessonStatus" RENAME TO "LessonStatus_old";
ALTER TYPE "public"."LessonStatus_new" RENAME TO "LessonStatus";
DROP TYPE "public"."LessonStatus_old";
ALTER TABLE "public"."lesson" ALTER COLUMN "status" SET DEFAULT 'PENDING_UNPAID';
COMMIT;

-- AlterTable
ALTER TABLE "public"."lesson" ADD COLUMN     "teacher_id" INTEGER NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING_UNPAID';

-- AlterTable
ALTER TABLE "public"."student" ADD COLUMN     "teacher_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "lesson_student_id_start_date_teacher_id_key" ON "public"."lesson"("student_id", "start_date", "teacher_id");

-- AddForeignKey
ALTER TABLE "public"."student" ADD CONSTRAINT "student_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson" ADD CONSTRAINT "lesson_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
