/*
  Warnings:

  - You are about to drop the column `telegram_id` on the `teacher` table. All the data in the column will be lost.
  - You are about to drop the column `telegram_link` on the `teacher` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."teacher" DROP COLUMN "telegram_id",
DROP COLUMN "telegram_link";
