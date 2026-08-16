-- DropForeignKey
ALTER TABLE "file_access" DROP CONSTRAINT "file_access_file_id_fkey";

-- AddForeignKey
ALTER TABLE "file_access" ADD CONSTRAINT "file_access_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE CASCADE ON UPDATE CASCADE;
