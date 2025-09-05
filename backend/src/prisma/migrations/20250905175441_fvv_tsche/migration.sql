-- CreateTable
CREATE TABLE "public"."LessonNotification" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "notified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonNotification_lesson_id_key" ON "public"."LessonNotification"("lesson_id");

-- AddForeignKey
ALTER TABLE "public"."LessonNotification" ADD CONSTRAINT "LessonNotification_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
