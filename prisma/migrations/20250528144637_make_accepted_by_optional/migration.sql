-- DropForeignKey
ALTER TABLE "ReauditSchedule" DROP CONSTRAINT "ReauditSchedule_acceptedBy_fkey";

-- AlterTable
ALTER TABLE "ReauditSchedule" ALTER COLUMN "acceptedBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ReauditSchedule" ADD CONSTRAINT "ReauditSchedule_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
