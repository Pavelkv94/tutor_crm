-- Платёжные реквизиты преподавателя для счёта (rachunek), который он выставляет школе.
--
-- Отдельная таблица, а не колонки в teacher: полей много, все опциональные и читаются
-- только при формировании счёта. Связь 1:1 закреплена UNIQUE на teacher_id.
--
-- Бэкфилл не нужен: у существующих преподавателей реквизитов нет, формирование счёта
-- само сообщит администратору, каких полей не хватает.

-- CreateTable
CREATE TABLE "teacher_billing_details" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "full_name_latin" TEXT,
    "address" TEXT,
    "passport" TEXT,
    "email" TEXT,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_billing_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_billing_details_teacher_id_key" ON "teacher_billing_details"("teacher_id");

-- AddForeignKey
ALTER TABLE "teacher_billing_details" ADD CONSTRAINT "teacher_billing_details_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
