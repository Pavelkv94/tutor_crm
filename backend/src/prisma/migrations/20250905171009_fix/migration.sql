-- AlterTable
ALTER TABLE "public"."telegram" ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "type" SET DEFAULT 'STUDENT';
