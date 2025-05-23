-- CreateTable
CREATE TABLE "BillboardEvaluation" (
    "id" SERIAL NOT NULL,
    "state" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "boardNo" INTEGER,
    "contractorName" TEXT,
    "boardSize" INTEGER NOT NULL,
    "campaign" JSONB NOT NULL,
    "boardCondition" TEXT NOT NULL,
    "posterCondition" TEXT NOT NULL,
    "roadType" TEXT NOT NULL,
    "vehicularTraffic" TEXT NOT NULL,
    "pedestrianTraffic" TEXT NOT NULL,
    "trafficSpeed" TEXT NOT NULL,
    "evaluationTime" TEXT NOT NULL,
    "distanceOfVisibility" TEXT NOT NULL,
    "boardPositioning" TEXT NOT NULL,
    "boardLevel" TEXT NOT NULL,
    "visibilityPoints" TEXT NOT NULL,
    "specialFeatures" TEXT NOT NULL,
    "noOfBoardsInView" TEXT NOT NULL,
    "noOfCompetitiveBoards" TEXT NOT NULL,
    "noOfLargerBoards" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillboardEvaluation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillboardEvaluation" ADD CONSTRAINT "BillboardEvaluation_boardSize_fkey" FOREIGN KEY ("boardSize") REFERENCES "BillboardType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
