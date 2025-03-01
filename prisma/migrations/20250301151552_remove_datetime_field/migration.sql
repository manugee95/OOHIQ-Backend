/*
  Warnings:

  - You are about to drop the column `closeShotDate` on the `Audit` table. All the data in the column will be lost.
  - You are about to drop the column `longShotDate` on the `Audit` table. All the data in the column will be lost.
  - You are about to drop the column `videoCaptureDate` on the `Audit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Audit" DROP COLUMN "closeShotDate",
DROP COLUMN "longShotDate",
DROP COLUMN "videoCaptureDate";
