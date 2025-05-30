-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'DISAPPROVED');

-- CreateTable
CREATE TABLE "ReauditSubmission" (
    "id" SERIAL NOT NULL,
    "reauditId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "auditId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ReauditSubmission_pkey" PRIMARY KEY ("id")
);
