-- DropForeignKey
ALTER TABLE "QuizResponse" DROP CONSTRAINT "QuizResponse_userId_fkey";

-- AlterTable
ALTER TABLE "QuizResponse" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isHR" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
