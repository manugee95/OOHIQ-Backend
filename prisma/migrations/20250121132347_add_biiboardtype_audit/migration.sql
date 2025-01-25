-- CreateTable
CREATE TABLE "BillboardType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BillboardType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "billboardTypeId" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "closeShotUrl" TEXT NOT NULL,
    "longShotUrl" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillboardType_name_key" ON "BillboardType"("name");

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_billboardTypeId_fkey" FOREIGN KEY ("billboardTypeId") REFERENCES "BillboardType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
