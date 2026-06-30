-- CreateEnum
CREATE TYPE "PaymentCurrency" AS ENUM ('EUR', 'PLN', 'BYN');

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payment_currency" "PaymentCurrency" NOT NULL DEFAULT 'BYN';
