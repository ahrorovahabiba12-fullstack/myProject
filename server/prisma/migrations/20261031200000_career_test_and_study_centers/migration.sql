-- AlterTable
ALTER TABLE "Career" ADD COLUMN     "examSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "extraExam" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "riasec" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CareerTestResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "topTypes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyCenter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjects" TEXT[],
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "city" TEXT NOT NULL DEFAULT '',
    "cityRu" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudyCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareerTestResult_studentId_createdAt_idx" ON "CareerTestResult"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudyCenter_code_key" ON "StudyCenter"("code");

-- AddForeignKey
ALTER TABLE "CareerTestResult" ADD CONSTRAINT "CareerTestResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

