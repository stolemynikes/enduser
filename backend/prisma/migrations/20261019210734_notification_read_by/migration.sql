-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[];
