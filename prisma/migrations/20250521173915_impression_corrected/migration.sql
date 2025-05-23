/*
  Warnings:

  - You are about to drop the column `ImpressionScore` on the `Audit` table. All the data in the column will be lost.
  - Added the required column `impressionScore` to the `Audit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Audit" DROP COLUMN "ImpressionScore",
ADD COLUMN     "impressionScore" DOUBLE PRECISION NOT NULL;
