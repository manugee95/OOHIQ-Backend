/*
  Warnings:

  - A unique constraint covering the columns `[boardCode]` on the table `Audit` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Audit" ALTER COLUMN "boardCode" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Audit_boardCode_key" ON "Audit"("boardCode");
