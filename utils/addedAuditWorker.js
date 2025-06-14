const { Worker } = require("bullmq");
const { Redis } = require("ioredis");
const { uploadToGCS, convertToGcsUri } = require("../Helpers/gcs");
const { analyzeVideoObjects } = require("../Helpers/analyzeVideo");
const extractImageMetadata = require("../Helpers/metadata");
const { addWatermarkToImage } = require("../Helpers/watermark");
const { convertImageToJpg } = require("../Helpers/conversion");
const { impressionScore } = require("../Helpers/impressions");
const {
  sendNewAuditNotification,
} = require("../services/expoNotificationService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

require("dotenv").config();

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const addedAuditWorker = new Worker(
  "addedQueue",
  async (job) => {
    try {
      const {
        userId,
        advertiserId,
        industryId,
        categoryId,
        billboardTypeId,
        brand,
        brandIdentifier,
        detectedAddress,
        state,
        town,
        country,
        geolocation,
        boardConditionId,
        posterConditionId,
        trafficSpeedId,
        evaluationTimeId,
        closeShotPath,
        longShotPath,
        videoPath,
        auditId,
        auditScheduleId,
      } = job.data;

      console.log(`Processing added audit job ${job.id}...`);

      // //Extract metadata
      // const metadataCloseShot = await extractImageMetadata(closeShotPath);
      // const metadataLongShot = await extractImageMetadata(longShotPath);

      // //Convert Image
      // const closeJpg = await convertImageToJpg(closeShotPath);
      // const longJpg = await convertImageToJpg(longShotPath);

      // //Watermark with metadata and address
      // const watermarkedClose = await addWatermarkToImage(
      //   closeJpg,
      //   metadataCloseShot,
      //   detectedAddress
      // );
      // const watermarkedLong = await addWatermarkToImage(
      //   longJpg,
      //   metadataLongShot,
      //   detectedAddress
      // );

      //Upload files concurrently
      const rawCloseShot = await uploadToGCS(closeShotPath);
      const rawLongShot = await uploadToGCS(longShotPath);
      const rawVideoUrl = await uploadToGCS(videoPath);

      //Google cloud function to convert and watermark Images
      const convertAndWatermarkImageServiceUrl =
        "https://process-image-714918758794.us-central1.run.app/process-image";

      const res = await fetch(convertAndWatermarkImageServiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closeShotUrl: rawCloseShot,
          longShotUrl: rawLongShot,
          address: detectedAddress,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("GCF Error:", res.status, errorText);
        throw new Error("Failed to process Images via GCF");
      }

      const { closeShotProcessedUrl, longShotProcessedUrl } = await res.json();
      const closeShotUrl = closeShotProcessedUrl;
      const longShotUrl = longShotProcessedUrl;

      //Google cloud function to convert and watermark video
      const convertAndWatermarkServiceUrl =
        "https://process-video-714918758794.us-central1.run.app";

      const response = await fetch(convertAndWatermarkServiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: rawVideoUrl,
          topText: "OOHIQ by TrueNorth Media Monitoring",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GCF Error:", response.status, errorText);
        throw new Error("Failed to process video via GCF");
      }

      const { processedVideoUrl } = await response.json();
      const videoUrl = processedVideoUrl;

      // Analyze video objects
      const gcsUri = convertToGcsUri(videoUrl);
      const objectCounts = await analyzeVideoObjects(gcsUri);

      //Get Name values
      const [
        trafficSpeed,
        evaluationTime,
        advertiser,
        industry,
        category,
        boardCondition,
        posterCondition,
        billboardType,
      ] = await Promise.all([
        prisma.trafficSpeed.findUnique({
          where: { id: parseInt(trafficSpeedId) },
          select: { name: true },
        }),
        prisma.evaluationTime.findUnique({
          where: { id: parseInt(evaluationTimeId) },
          select: { name: true },
        }),
        prisma.advertiser.findUnique({
          where: { id: parseInt(advertiserId) },
          select: { name: true },
        }),
        prisma.industry.findUnique({
          where: { id: parseInt(industryId) },
          select: { name: true },
        }),
        prisma.category.findUnique({
          where: { id: parseInt(categoryId) },
          select: { name: true },
        }),
        prisma.boardCondition.findUnique({
          where: { id: parseInt(boardConditionId) },
          select: { name: true },
        }),
        prisma.posterCondition.findUnique({
          where: { id: parseInt(posterConditionId) },
          select: { name: true },
        }),
        prisma.billboardType.findUnique({
          where: { id: parseInt(billboardTypeId) },
          select: { name: true },
        }),
      ]);

      //Calculate Impressions
      const impression = impressionScore({
        trafficSpeed: trafficSpeed.name,
        evaluationTime: evaluationTime.name,
        objectCounts,
      });

      //Update Audit Table
      const newAudit = await prisma.audit.update({
        where: { id: auditId },
        data: {
          userId,
          billboardTypeId,
          advertiserId,
          industryId,
          categoryId,
          boardConditionId,
          posterConditionId,
          trafficSpeedId,
          evaluationTimeId,
          brand,
          brandIdentifier,
          location: detectedAddress,
          state,
          town,
          country,
          geolocation,
          closeShotUrl,
          longShotUrl,
          videoUrl,
          objectCounts,
          status: "PENDING",
          impressionScore: impression,
        },
      });

      //Update Audit Schedule table
      await prisma.auditSchedule.update({
        where: { id: parseInt(auditScheduleId) },
        data: {
          status: "COMPLETED",
        },
      });

      //Save snapshot in Audit History
      await prisma.auditHistory.create({
        data: {
          auditId: newAudit.id,
          billboardType: billboardType.name,
          advertiser: advertiser.name,
          industry: industry.name,
          category: category.name,
          boardCondition: boardCondition.name,
          posterCondition: posterCondition.name,
          trafficSpeed: trafficSpeed.name,
          evaluationTime: evaluationTime.name,
          location: newAudit.location,
          state: newAudit.state,
          town: newAudit.town,
          country: newAudit.country,
          geolocation: newAudit.geolocation,
          brand: newAudit.brand,
          brandIdentifier: newAudit.brandIdentifier,
          closeShotUrl: newAudit.closeShotUrl,
          longShotUrl: newAudit.longShotUrl,
          videoUrl: newAudit.videoUrl,
          objectCounts: newAudit.objectCounts,
          impressionScore: newAudit.impressionScore,
        },
      });

      //Send Billboard Evaluation Notification
      await sendNewAuditNotification();

      // Increment user's audit count
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { auditCount: { increment: 1 } },
      });

      console.log(`Job ${job.id} completed successfully.`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error.message);
      throw error;
    }
  },
  {
    connection,
    lockDuration: 300000, // 5 minutes
    concurrency: 1,
    autorun: true,
    stalledInterval: 30000, // Check for stalled jobs every 30s
    maxStalledCount: 2,
  }
);

// Handle worker errors
addedAuditWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});
