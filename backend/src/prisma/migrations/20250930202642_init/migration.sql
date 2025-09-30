-- CreateEnum
CREATE TYPE "public"."TelegramType" AS ENUM ('STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "public"."PlanType" AS ENUM ('INDIVIDUAL', 'PAIR');

-- CreateEnum
CREATE TYPE "public"."PlanCurrency" AS ENUM ('USD', 'EUR', 'PLN', 'BYN');

-- CreateEnum
CREATE TYPE "public"."LessonStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED', 'RESCHEDULED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."admin" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "telegram_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "class" INTEGER NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "notifyAboutBirthday" BOOLEAN NOT NULL DEFAULT true,
    "notifyAboutLessons" BOOLEAN NOT NULL DEFAULT true,
    "bookUntilCancellation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."telegram" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "telegram_id" TEXT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "type" "public"."TelegramType" NOT NULL DEFAULT 'STUDENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LessonNotification" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "notified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."telegram_token" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lesson" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."LessonStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "payment_status" BOOLEAN NOT NULL DEFAULT false,
    "corrected_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "is_regular" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "rescheduled_lesson_id" INTEGER,
    "rescheduled_lesson_date" TIMESTAMP(3),
    "rescheduled_to_lesson_id" INTEGER,
    "rescheduled_to_lesson_date" TIMESTAMP(3),

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

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_telegram_id_key" ON "public"."telegram"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "LessonNotification_lesson_id_key" ON "public"."LessonNotification"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_token_token_key" ON "public"."telegram_token"("token");

-- AddForeignKey
ALTER TABLE "public"."telegram" ADD CONSTRAINT "telegram_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonNotification" ADD CONSTRAINT "LessonNotification_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."telegram_token" ADD CONSTRAINT "telegram_token_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson" ADD CONSTRAINT "lesson_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson" ADD CONSTRAINT "lesson_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
