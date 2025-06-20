-- AlterTable
ALTER TABLE "AuditHistory" ALTER COLUMN "advertiser" DROP NOT NULL,
ALTER COLUMN "industry" DROP NOT NULL,
ALTER COLUMN "category" DROP NOT NULL;
