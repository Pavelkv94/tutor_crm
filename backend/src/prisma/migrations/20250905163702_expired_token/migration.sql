/*
  Warnings:

  - Added the required column `expired_at` to the `telegram_token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."telegram_token" ADD COLUMN     "expired_at" TIMESTAMP(3) NOT NULL;
