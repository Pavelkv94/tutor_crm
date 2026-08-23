-- Сумма, фактически предъявленная к оплате, когда счёт в BYN выставлен ссылкой в евро.
--
-- Учёт остаётся в валюте занятий: amount/currency не меняются, баланс и аллокация занятий
-- по-прежнему в BYN, инварианты BalanceService не затрагиваются. Эта тройка — только
-- способ предъявления: вебхук сверяет по ней валюту и сумму сессии, а возврат считает
-- по ней пропорцию к сумме счёта.
--
-- Бэкфилл не нужен: у выставленных до этой миграции счетов конвертации не было, NULL
-- означает ровно прежнее поведение.

-- AlterTable
ALTER TABLE "payment" ADD COLUMN "charge_currency" "Currency";
ALTER TABLE "payment" ADD COLUMN "charge_amount_minor" INTEGER;
ALTER TABLE "payment" ADD COLUMN "charge_rate" INTEGER;

-- Тройка живёт целиком или не живёт вовсе: по половине данных пропорция возврата
-- не считается. Prisma CHECK выразить не умеет — констрейнт дописан руками и
-- продублирован в backend/test/setup-migrations.ts.
ALTER TABLE "payment" ADD CONSTRAINT "payment_charge_conversion_check"
  CHECK (
    ("charge_amount_minor" IS NULL AND "charge_currency" IS NULL AND "charge_rate" IS NULL)
    OR ("charge_amount_minor" > 0 AND "charge_currency" IS NOT NULL AND "charge_rate" > 0)
  );
