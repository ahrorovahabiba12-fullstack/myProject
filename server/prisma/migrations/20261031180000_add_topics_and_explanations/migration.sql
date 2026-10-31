-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "code" TEXT,
ADD COLUMN     "explanation" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "explanationRu" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "QuizResult" ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "maxGrade" INTEGER NOT NULL DEFAULT 11,
ADD COLUMN     "minGrade" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_code_key" ON "Topic"("code");

-- CreateIndex
CREATE INDEX "Topic_subjectId_grade_sortOrder_idx" ON "Topic"("subjectId", "grade", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Question_code_key" ON "Question"("code");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

