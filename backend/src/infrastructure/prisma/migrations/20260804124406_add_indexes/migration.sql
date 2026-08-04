/*
  Warnings:

  - A unique constraint covering the columns `[teacher_id,file_id]` on the table `file_access` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "file" DROP CONSTRAINT "file_course_id_fkey";

-- CreateIndex
CREATE INDEX "file_course_id_upload_status_idx" ON "file"("course_id", "upload_status");

-- CreateIndex
CREATE UNIQUE INDEX "file_access_teacher_id_file_id_key" ON "file_access"("teacher_id", "file_id");

-- CreateIndex
CREATE INDEX "lesson_teacher_id_date_idx" ON "lesson"("teacher_id", "date");

-- CreateIndex
CREATE INDEX "lesson_student_id_date_idx" ON "lesson"("student_id", "date");

-- CreateIndex
CREATE INDEX "lesson_status_date_idx" ON "lesson"("status", "date");

-- CreateIndex
CREATE INDEX "student_teacher_id_deleted_at_idx" ON "student"("teacher_id", "deleted_at");

-- CreateIndex
CREATE INDEX "task_teacher_id_status_idx" ON "task"("teacher_id", "status");

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "file_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
