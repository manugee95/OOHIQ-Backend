/*
  Warnings:

  - Added the required column `ImpressionScore` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sovScore` to the `Audit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "ImpressionScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sovScore" DOUBLE PRECISION NOT NULL;
