/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Advertiser` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Advertiser` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `boardCondition` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `boardLevel` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `boardPositioning` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `boardSize` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `campaign` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `distanceOfVisibility` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `evaluationTime` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `noOfBoardsInView` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `noOfCompetitiveBoards` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `noOfLargerBoards` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `pedestrianTraffic` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `posterCondition` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `roadType` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `specialFeatures` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `town` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `trafficSpeed` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `vehicularTraffic` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `visibilityPoints` on the `BillboardEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Industry` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Industry` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[auditId]` on the table `BillboardEvaluation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `boardConditionId` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `posterConditionId` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `town` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `auditId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `boardLevelId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `boardPositioningId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `distanceOfVisibilityId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evaluationTimeId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noOfBoardsInViewId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noOfCompetitiveBoardsId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noOfLargerBoardsId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pedestrianTrafficId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roadTypeId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specialFeaturesId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trafficSpeedId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicularTrafficId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visibilityPointsId` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BillboardEvaluation" DROP CONSTRAINT "BillboardEvaluation_boardSize_fkey";

-- AlterTable
ALTER TABLE "Advertiser" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "boardConditionId" INTEGER NOT NULL,
ADD COLUMN     "posterConditionId" INTEGER NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "town" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BillboardEvaluation" DROP COLUMN "address",
DROP COLUMN "boardCondition",
DROP COLUMN "boardLevel",
DROP COLUMN "boardPositioning",
DROP COLUMN "boardSize",
DROP COLUMN "campaign",
DROP COLUMN "distanceOfVisibility",
DROP COLUMN "evaluationTime",
DROP COLUMN "noOfBoardsInView",
DROP COLUMN "noOfCompetitiveBoards",
DROP COLUMN "noOfLargerBoards",
DROP COLUMN "pedestrianTraffic",
DROP COLUMN "phone",
DROP COLUMN "posterCondition",
DROP COLUMN "roadType",
DROP COLUMN "specialFeatures",
DROP COLUMN "state",
DROP COLUMN "town",
DROP COLUMN "trafficSpeed",
DROP COLUMN "vehicularTraffic",
DROP COLUMN "visibilityPoints",
ADD COLUMN     "auditId" INTEGER NOT NULL,
ADD COLUMN     "boardLevelId" INTEGER NOT NULL,
ADD COLUMN     "boardPositioningId" INTEGER NOT NULL,
ADD COLUMN     "distanceOfVisibilityId" INTEGER NOT NULL,
ADD COLUMN     "evaluationTimeId" INTEGER NOT NULL,
ADD COLUMN     "noOfBoardsInViewId" INTEGER NOT NULL,
ADD COLUMN     "noOfCompetitiveBoardsId" INTEGER NOT NULL,
ADD COLUMN     "noOfLargerBoardsId" INTEGER NOT NULL,
ADD COLUMN     "pedestrianTrafficId" INTEGER NOT NULL,
ADD COLUMN     "roadTypeId" INTEGER NOT NULL,
ADD COLUMN     "specialFeaturesId" INTEGER NOT NULL,
ADD COLUMN     "trafficSpeedId" INTEGER NOT NULL,
ADD COLUMN     "vehicularTrafficId" INTEGER NOT NULL,
ADD COLUMN     "visibilityPointsId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Industry" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- CreateTable
CREATE TABLE "BoardCondition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BoardCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosterCondition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PosterCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "RoadType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicularTraffic" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VehicularTraffic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedestrianTraffic" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PedestrianTraffic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficSpeed" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TrafficSpeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationTime" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EvaluationTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistanceOfVisibility" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DistanceOfVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardPositioning" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BoardPositioning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardLevel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BoardLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisibilityPoints" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VisibilityPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialFeatures" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SpecialFeatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoOfBoardsInView" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "NoOfBoardsInView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoOfCompetitiveBoards" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "NoOfCompetitiveBoards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoOfLargerBoards" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "NoOfLargerBoards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillboardEvaluation_auditId_key" ON "BillboardEvaluation"("auditId");

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_boardConditionId_fkey" FOREIGN KEY ("boardConditionId") REFERENCES "BoardCondition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_posterConditionId_fkey" FOREIGN KEY ("posterConditionId") REFERENCES "PosterCondition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_roadTypeId_fkey" FOREIGN KEY ("roadTypeId") REFERENCES "RoadType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_vehicularTrafficId_fkey" FOREIGN KEY ("vehicularTrafficId") REFERENCES "VehicularTraffic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_pedestrianTrafficId_fkey" FOREIGN KEY ("pedestrianTrafficId") REFERENCES "PedestrianTraffic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_trafficSpeedId_fkey" FOREIGN KEY ("trafficSpeedId") REFERENCES "TrafficSpeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_evaluationTimeId_fkey" FOREIGN KEY ("evaluationTimeId") REFERENCES "EvaluationTime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_distanceOfVisibilityId_fkey" FOREIGN KEY ("distanceOfVisibilityId") REFERENCES "DistanceOfVisibility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_boardPositioningId_fkey" FOREIGN KEY ("boardPositioningId") REFERENCES "BoardPositioning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_boardLevelId_fkey" FOREIGN KEY ("boardLevelId") REFERENCES "BoardLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_visibilityPointsId_fkey" FOREIGN KEY ("visibilityPointsId") REFERENCES "VisibilityPoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_specialFeaturesId_fkey" FOREIGN KEY ("specialFeaturesId") REFERENCES "SpecialFeatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_noOfBoardsInViewId_fkey" FOREIGN KEY ("noOfBoardsInViewId") REFERENCES "NoOfBoardsInView"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_noOfCompetitiveBoardsId_fkey" FOREIGN KEY ("noOfCompetitiveBoardsId") REFERENCES "NoOfCompetitiveBoards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_noOfLargerBoardsId_fkey" FOREIGN KEY ("noOfLargerBoardsId") REFERENCES "NoOfLargerBoards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
