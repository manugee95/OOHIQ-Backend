/*
  Warnings:

  - You are about to drop the `AuditSchedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'ADDED';

-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_advertiserId_fkey";

-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_billboardTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_boardConditionId_fkey";

-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_evaluationTimeId_fkey";

-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_industryId_fkey";

-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_posterConditionId_fkey";

-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_trafficSpeedId_fkey";

-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuditSchedule" DROP CONSTRAINT "AuditSchedule_acceptedBy_fkey";

-- AlterTable
ALTER TABLE "Audit" ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "billboardTypeId" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "closeShotUrl" DROP NOT NULL,
ALTER COLUMN "longShotUrl" DROP NOT NULL,
ALTER COLUMN "videoUrl" DROP NOT NULL,
ALTER COLUMN "advertiserId" DROP NOT NULL,
ALTER COLUMN "brand" DROP NOT NULL,
ALTER COLUMN "brandIdentifier" DROP NOT NULL,
ALTER COLUMN "categoryId" DROP NOT NULL,
ALTER COLUMN "industryId" DROP NOT NULL,
ALTER COLUMN "boardConditionId" DROP NOT NULL,
ALTER COLUMN "posterConditionId" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "town" DROP NOT NULL,
ALTER COLUMN "evaluationTimeId" DROP NOT NULL,
ALTER COLUMN "trafficSpeedId" DROP NOT NULL,
ALTER COLUMN "impressionScore" DROP NOT NULL;

-- DropTable
DROP TABLE "AuditSchedule";

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_billboardTypeId_fkey" FOREIGN KEY ("billboardTypeId") REFERENCES "BillboardType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_boardConditionId_fkey" FOREIGN KEY ("boardConditionId") REFERENCES "BoardCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_posterConditionId_fkey" FOREIGN KEY ("posterConditionId") REFERENCES "PosterCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_trafficSpeedId_fkey" FOREIGN KEY ("trafficSpeedId") REFERENCES "TrafficSpeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_evaluationTimeId_fkey" FOREIGN KEY ("evaluationTimeId") REFERENCES "EvaluationTime"("id") ON DELETE SET NULL ON UPDATE CASCADE;
