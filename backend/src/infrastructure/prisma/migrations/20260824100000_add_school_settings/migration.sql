-- Глобальные настройки школы: пока единственная — внутренний курс евро.
--
-- Таблица-синглтон, а не generic key-value: значение типизировано, на него можно повесить
-- CHECK, и вызывающему не нужно парсить строку. Прецедент узкой отдельной таблицы вместо
-- колонок в основной сущности уже есть — teacher_billing_details.
--
-- Курс хранится в сотых долях BYN за евро (500 = 1 € = 5.00 BYN). Целое, потому что
-- плавающая точка в денежных расчётах в проекте не используется нигде.

-- CreateTable
CREATE TABLE "school_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "eur_rate" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id")
);

-- Строка ровно одна. Prisma такое выразить не умеет, поэтому констрейнт дописан руками
-- и продублирован в backend/test/setup-migrations.ts.
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_singleton_check"
  CHECK ("id" = 1);

-- Отрицательный курс сломал бы конвертацию. Верхняя граница — бизнес-правило, она живёт
-- в валидации DTO и не должна требовать миграции при изменении.
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_eur_rate_check"
  CHECK ("eur_rate" >= 0);

-- Сид: приложение не должно заниматься ленивым созданием строки на чтении.
INSERT INTO "school_settings" ("id", "eur_rate", "updated_at")
  VALUES (1, 0, NOW())
  ON CONFLICT ("id") DO NOTHING;
