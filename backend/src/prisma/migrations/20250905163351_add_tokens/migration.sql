-- CreateTable
CREATE TABLE "public"."telegram_token" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_token_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."telegram_token" ADD CONSTRAINT "telegram_token_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
