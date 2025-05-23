/*
  Warnings:

  - You are about to drop the column `Phone` on the `BillboardEvaluation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BillboardEvaluation" DROP COLUMN "Phone",
ADD COLUMN     "phone" TEXT;
