-- AlterTable
ALTER TABLE "QuizResult" ADD COLUMN     "attemptId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "QuizResult_attemptId_key" ON "QuizResult"("attemptId");
