-- CreateTable
CREATE TABLE "task_comment" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "commenter_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_commenter_id_fkey" FOREIGN KEY ("commenter_id") REFERENCES "teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
