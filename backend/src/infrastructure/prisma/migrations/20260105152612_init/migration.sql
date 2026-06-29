-- CreateEnum
CREATE TYPE "public"."TelegramType" AS ENUM ('TEACHER', 'STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "public"."PlanType" AS ENUM ('INDIVIDUAL', 'PAIR');

-- CreateEnum
CREATE TYPE "public"."PlanCurrency" AS ENUM ('USD', 'EUR', 'PLN', 'BYN');

-- CreateEnum
CREATE TYPE "public"."LessonStatus" AS ENUM ('PENDING_PAID', 'PENDING_UNPAID', 'COMPLETED_PAID', 'COMPLETED_UNPAID', 'MISSED', 'RESCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TeacherRole" AS ENUM ('TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Timezone" AS ENUM ('BY', 'PL');

-- CreateEnum
CREATE TYPE "public"."WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "public"."teacher" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."TeacherRole" NOT NULL DEFAULT 'TEACHER',
    "timezone" "public"."Timezone",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "class" INTEGER NOT NULL,
    "birth_date" TIMESTAMP(3),
    "balance" INTEGER NOT NULL DEFAULT 0,
    "notifyAboutBirthday" BOOLEAN NOT NULL DEFAULT true,
    "notifyAboutLessons" BOOLEAN NOT NULL DEFAULT true,
    "bookUntilCancellation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacher_id" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."regular_lesson" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "week_day" "public"."WeekDay" NOT NULL,
    "start_period_date" TIMESTAMP(3) NOT NULL,
    "end_period_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "regular_lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lesson" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" "public"."LessonStatus" NOT NULL DEFAULT 'PENDING_UNPAID',
    "comment" TEXT,
    "date" TIMESTAMPTZ NOT NULL,
    "is_regular" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "rescheduled_lesson_id" INTEGER,
    "rescheduled_lesson_date" TIMESTAMP(3),
    "rescheduled_to_lesson_id" INTEGER,
    "rescheduled_to_lesson_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regular_lesson_id" INTEGER,

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plan" (
    "id" SERIAL NOT NULL,
    "plan_type" "public"."PlanType" NOT NULL,
    "plan_currency" "public"."PlanCurrency" NOT NULL,
    "plan_name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "plan_price" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."telegram" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER,
    "teacher_id" INTEGER,
    "telegram_id" TEXT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "type" "public"."TelegramType" NOT NULL DEFAULT 'STUDENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."telegram_token" (
    "id" SERIAL NOT NULL,
    "type" "public"."TelegramType" NOT NULL,
    "student_id" INTEGER,
    "teacher_id" INTEGER,
    "token" TEXT NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_login_key" ON "public"."teacher"("login");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_telegram_id_key" ON "public"."telegram"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_token_token_key" ON "public"."telegram_token"("token");

-- AddForeignKey
ALTER TABLE "public"."student" ADD CONSTRAINT "student_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."regular_lesson" ADD CONSTRAINT "regular_lesson_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."regular_lesson" ADD CONSTRAINT "regular_lesson_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."regular_lesson" ADD CONSTRAINT "regular_lesson_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson" ADD CONSTRAINT "lesson_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson" ADD CONSTRAINT "lesson_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson" ADD CONSTRAINT "lesson_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson" ADD CONSTRAINT "lesson_regular_lesson_id_fkey" FOREIGN KEY ("regular_lesson_id") REFERENCES "public"."regular_lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."telegram" ADD CONSTRAINT "telegram_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."telegram" ADD CONSTRAINT "telegram_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."telegram_token" ADD CONSTRAINT "telegram_token_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."telegram_token" ADD CONSTRAINT "telegram_token_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
