/*
  Warnings:

  - You are about to drop the column `evaluationTimeId` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `trafficSpeedId` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - Added the required column `boardCode` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evaluationTimeId` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trafficSpeedId` to the `Audit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BillboardEvaluation" DROP CONSTRAINT "BillboardEvaluation_evaluationTimeId_fkey";

-- DropForeignKey
ALTER TABLE "BillboardEvaluation" DROP CONSTRAINT "BillboardEvaluation_trafficSpeedId_fkey";

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "boardCode" TEXT NOT NULL,
ADD COLUMN     "evaluationTimeId" INTEGER NOT NULL,
ADD COLUMN     "trafficSpeedId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "BillboardEvaluation" DROP COLUMN "evaluationTimeId",
DROP COLUMN "trafficSpeedId";

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_trafficSpeedId_fkey" FOREIGN KEY ("trafficSpeedId") REFERENCES "TrafficSpeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_evaluationTimeId_fkey" FOREIGN KEY ("evaluationTimeId") REFERENCES "EvaluationTime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
