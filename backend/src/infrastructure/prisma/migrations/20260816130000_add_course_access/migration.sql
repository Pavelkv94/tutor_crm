-- CreateEnum
CREATE TYPE "FileAccessType" AS ENUM ('ALLOW', 'DENY');

-- AlterTable
ALTER TABLE "file_access" ADD COLUMN "type" "FileAccessType" NOT NULL DEFAULT 'ALLOW';

-- CreateTable
CREATE TABLE "course_access" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_access_teacher_id_course_id_key" ON "course_access"("teacher_id", "course_id");

-- AddForeignKey
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "file_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
