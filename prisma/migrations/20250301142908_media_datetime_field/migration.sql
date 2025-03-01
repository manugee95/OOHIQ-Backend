/*
  Warnings:

  - Added the required column `closeShotDate` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longShotDate` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoCaptureDate` to the `Audit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "closeShotDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "longShotDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "videoCaptureDate" TIMESTAMP(3) NOT NULL;
