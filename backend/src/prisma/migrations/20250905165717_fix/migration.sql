/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `telegram_token` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "telegram_token_token_key" ON "public"."telegram_token"("token");
