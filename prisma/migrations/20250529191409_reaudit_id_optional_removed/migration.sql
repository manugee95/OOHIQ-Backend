/*
  Warnings:

  - Made the column `reauditId` on table `ReauditSubmission` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ReauditSubmission" ALTER COLUMN "reauditId" SET NOT NULL;
