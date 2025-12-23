/*
  Warnings:

  - You are about to drop the `admin` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TeacherRole" AS ENUM ('TEACHER', 'ADMIN');

-- DropTable
DROP TABLE "public"."admin";

-- CreateTable
CREATE TABLE "public"."teacher" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "telegram_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "public"."TeacherRole" NOT NULL DEFAULT 'TEACHER',

    CONSTRAINT "teacher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_login_key" ON "public"."teacher"("login");
