/*
  Warnings:

  - Made the column `corrected_time` on table `lesson` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."lesson" ALTER COLUMN "corrected_time" SET NOT NULL;
