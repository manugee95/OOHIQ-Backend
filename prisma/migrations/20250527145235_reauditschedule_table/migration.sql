-- CreateEnum
CREATE TYPE "AuditCycle" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ReauditSchedule" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "cycle" "AuditCycle" NOT NULL,
    "status" "ScheduleStatus" NOT NULL,
    "acceptedBy" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ReauditSchedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReauditSchedule" ADD CONSTRAINT "ReauditSchedule_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReauditSchedule" ADD CONSTRAINT "ReauditSchedule_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
