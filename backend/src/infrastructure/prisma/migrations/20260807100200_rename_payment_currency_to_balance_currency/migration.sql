-- Валюта принадлежит балансу, а не ученику: поле переименовывается в balance_currency и
-- становится nullable. NULL означает «на балансе 0, валюта отпущена» — ученик может перейти
-- на любую другую валюту. Валюта расчётов выводится из планов назначенных занятий.
--
-- Текущее значение 'BYN' у всех учеников — артефакт DEFAULT из миграции
-- 20260630073647_add_marketing_consist, которая никогда не бэкфилилась, и информации не несёт.
-- Балансы у всех равны 0, поэтому UPDATE ниже обнуляет поле у всех без потери данных.

-- AlterTable
ALTER TABLE "student" ALTER COLUMN "payment_currency" DROP DEFAULT;
ALTER TABLE "student" RENAME COLUMN "payment_currency" TO "balance_currency";
ALTER TABLE "student" ALTER COLUMN "balance_currency" DROP NOT NULL;

UPDATE "student" SET "balance_currency" = NULL WHERE "balance" = 0;

-- Инвариант: валюта задана тогда и только тогда, когда на балансе есть деньги.
-- Prisma не умеет выражать CHECK в схеме, поэтому констрейнт дописан руками.
ALTER TABLE "student" ADD CONSTRAINT "student_balance_currency_check"
  CHECK (
    ("balance" = 0 AND "balance_currency" IS NULL)
    OR ("balance" <> 0 AND "balance_currency" IS NOT NULL)
  );
