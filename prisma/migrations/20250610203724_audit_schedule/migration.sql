-- CreateTable
CREATE TABLE "AuditSchedule" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL,
    "acceptedBy" INTEGER,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AuditSchedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditSchedule" ADD CONSTRAINT "AuditSchedule_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
