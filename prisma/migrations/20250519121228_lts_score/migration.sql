/*
  Warnings:

  - Added the required column `ltsScore` to the `BillboardEvaluation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BillboardEvaluation" ADD COLUMN     "ltsScore" DOUBLE PRECISION NOT NULL;
