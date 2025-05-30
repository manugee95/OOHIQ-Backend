/*
  Warnings:

  - You are about to drop the column `cycle` on the `ReauditSchedule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ReauditSchedule" DROP COLUMN "cycle";

-- DropEnum
DROP TYPE "AuditCycle";
