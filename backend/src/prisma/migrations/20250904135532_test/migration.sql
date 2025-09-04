/*
  Warnings:

  - You are about to drop the column `duration` on the `lesson` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."lesson" DROP COLUMN "duration";

-- AlterTable
ALTER TABLE "public"."student" ADD COLUMN     "bookUntilCancellation" BOOLEAN NOT NULL DEFAULT false;
