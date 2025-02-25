/*
  Warnings:

  - Added the required column `advertiserId` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `brand` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `brandIdentifier` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `industryId` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Audit` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Audit_location_key";

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "advertiserId" INTEGER NOT NULL,
ADD COLUMN     "brand" TEXT NOT NULL,
ADD COLUMN     "brandIdentifier" TEXT NOT NULL,
ADD COLUMN     "categoryId" INTEGER NOT NULL,
ADD COLUMN     "industryId" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
