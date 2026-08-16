-- Платёж получен, но не применён к балансу из-за конфликта валют
-- (на балансе лежит остаток в другой валюте). В инвариант баланса не входит.

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REQUIRES_ATTENTION';
