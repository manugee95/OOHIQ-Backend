-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "country" TEXT,
ADD COLUMN     "geolocation" JSONB;

-- AlterTable
ALTER TABLE "AuditHistory" ADD COLUMN     "country" TEXT,
ADD COLUMN     "geolocation" JSONB;
