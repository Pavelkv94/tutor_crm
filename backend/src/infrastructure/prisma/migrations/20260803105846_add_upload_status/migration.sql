-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'FAILED');

-- AlterTable
ALTER TABLE "file" ADD COLUMN     "upload_status" "UploadStatus" NOT NULL DEFAULT 'UPLOADING';
