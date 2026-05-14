-- AlterTable
ALTER TABLE "QuizProgress" ADD COLUMN     "questionOrder" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN     "timeLimitMinutes" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
