/*
  Warnings:

  - Added the required column `siteGrade` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `siteScore` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BillboardEvaluation" ADD COLUMN     "siteGrade" TEXT NOT NULL,
ADD COLUMN     "siteScore" DOUBLE PRECISION NOT NULL;
