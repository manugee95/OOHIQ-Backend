-- CreateTable
CREATE TABLE "AuditHistory" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "evaluationId" INTEGER,
    "boardCode" TEXT,
    "billboardType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "advertiser" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "brandIdentifier" TEXT NOT NULL,
    "boardCondition" TEXT NOT NULL,
    "posterCondition" TEXT NOT NULL,
    "trafficSpeed" TEXT NOT NULL,
    "evaluationTime" TEXT NOT NULL,
    "closeShotUrl" TEXT NOT NULL,
    "longShotUrl" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "objectCounts" JSONB NOT NULL,
    "impressionScore" DOUBLE PRECISION NOT NULL,
    "sovScore" DOUBLE PRECISION,
    "ltsScore" DOUBLE PRECISION,
    "siteScore" DOUBLE PRECISION,
    "siteGrade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditHistory" ADD CONSTRAINT "AuditHistory_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditHistory" ADD CONSTRAINT "AuditHistory_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "BillboardEvaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
