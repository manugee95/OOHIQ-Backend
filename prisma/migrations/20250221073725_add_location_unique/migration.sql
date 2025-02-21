/*
  Warnings:

  - A unique constraint covering the columns `[location]` on the table `Audit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Audit_location_key" ON "Audit"("location");
