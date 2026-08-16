-- У возврата тот же payment_intent, что у исходного платежа, а stripe_payment_intent_id объявлен
-- @unique — вторая строка упала бы по уникальности. Поэтому возвраты идентифицируются своим refund id.

-- AlterTable
ALTER TABLE "payment" ADD COLUMN "stripe_refund_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_stripe_refund_id_key" ON "payment"("stripe_refund_id");
