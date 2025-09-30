/*
  Warnings:

  - The `corrected_time` column on the `lesson` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."lesson" DROP COLUMN "corrected_time",
ADD COLUMN     "corrected_time" TIMESTAMP(3);
