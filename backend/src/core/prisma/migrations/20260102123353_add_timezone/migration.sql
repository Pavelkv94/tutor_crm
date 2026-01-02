-- CreateEnum
CREATE TYPE "public"."Timezone" AS ENUM ('BY', 'PL');

-- AlterTable
ALTER TABLE "public"."teacher" ADD COLUMN     "timezone" "public"."Timezone";
