/*
  Warnings:

  - The primary key for the `Advertiser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Advertiser` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Category` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Category` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Industry` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Industry` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `industryId` on the `Category` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_industryId_fkey";

-- AlterTable
ALTER TABLE "Advertiser" DROP CONSTRAINT "Advertiser_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Advertiser_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Category" DROP CONSTRAINT "Category_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "industryId",
ADD COLUMN     "industryId" INTEGER NOT NULL,
ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Industry" DROP CONSTRAINT "Industry_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Industry_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
