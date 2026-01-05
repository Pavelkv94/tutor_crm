/*
  Warnings:

  - You are about to drop the `LessonNotification` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `type` to the `telegram_token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."TelegramType" ADD VALUE 'TEACHER';

-- DropForeignKey
ALTER TABLE "public"."LessonNotification" DROP CONSTRAINT "LessonNotification_lesson_id_fkey";

-- AlterTable
ALTER TABLE "public"."telegram" ADD COLUMN     "teacher_id" INTEGER,
ALTER COLUMN "student_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."telegram_token" ADD COLUMN     "teacher_id" INTEGER,
ADD COLUMN     "type" "public"."TelegramType" NOT NULL,
ALTER COLUMN "student_id" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."LessonNotification";

-- AddForeignKey
ALTER TABLE "public"."telegram" ADD CONSTRAINT "telegram_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."telegram_token" ADD CONSTRAINT "telegram_token_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
