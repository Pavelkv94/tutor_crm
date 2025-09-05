-- AlterTable
ALTER TABLE "public"."student" ADD COLUMN     "notifyAboutBirthday" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyAboutLessons" BOOLEAN NOT NULL DEFAULT true;
