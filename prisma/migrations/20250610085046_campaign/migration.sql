/*
  Warnings:

  - The values [MODERATOR] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('FIELD_AUDITOR', 'ADMIN', 'CLIENT', 'MEDIA_OWNER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "siteList" JSONB NOT NULL,
    "totalSites" INTEGER NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AuditToCampaign" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AuditToCampaign_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AuditToCampaign_B_index" ON "_AuditToCampaign"("B");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuditToCampaign" ADD CONSTRAINT "_AuditToCampaign_A_fkey" FOREIGN KEY ("A") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuditToCampaign" ADD CONSTRAINT "_AuditToCampaign_B_fkey" FOREIGN KEY ("B") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
