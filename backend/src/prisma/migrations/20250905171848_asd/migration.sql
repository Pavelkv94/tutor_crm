/*
  Warnings:

  - A unique constraint covering the columns `[telegram_id]` on the table `telegram` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."telegram" ALTER COLUMN "telegram_id" SET DATA TYPE BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "telegram_telegram_id_key" ON "public"."telegram"("telegram_id");
