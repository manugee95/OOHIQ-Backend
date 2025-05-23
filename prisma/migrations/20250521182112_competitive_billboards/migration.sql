-- CreateTable
CREATE TABLE "CompetitiveBoardType" (
    "id" SERIAL NOT NULL,
    "billboardEvaluationId" INTEGER NOT NULL,
    "billboardTypeId" INTEGER NOT NULL,

    CONSTRAINT "CompetitiveBoardType_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompetitiveBoardType" ADD CONSTRAINT "CompetitiveBoardType_billboardEvaluationId_fkey" FOREIGN KEY ("billboardEvaluationId") REFERENCES "BillboardEvaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveBoardType" ADD CONSTRAINT "CompetitiveBoardType_billboardTypeId_fkey" FOREIGN KEY ("billboardTypeId") REFERENCES "BillboardType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
