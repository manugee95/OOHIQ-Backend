const { Worker } = require("bullmq");
const { Redis } = require("ioredis");
const { uploadToGCS, convertToGcsUri } = require("../Helpers/gcs");
const { analyzeVideoObjects } = require("../Helpers/analyzeVideo");
const { impressionScore } = require("../Helpers/impressions");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

require("dotenv").config();

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const reauditWorker = new Worker(
  "reauditQueue",
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
        boardConditionId,
        posterConditionId,
        trafficSpeedId,
        evaluationTimeId,
        closeShotPath,
        longShotPath,
        videoPath,
        reauditId,
      } = job.data;

      console.log(`Processing reaudit job ${job.id}...`);

      //Fetch Reauditschedule and linked audit
      const reauditSchedule = await prisma.reauditSchedule.findUnique({
        where: { id: parseInt(reauditId) },
        include: { audit: true },
      });

      if (!reauditSchedule) {
        return res.status(404).json({ error: "Reaudit schedule not found" });
      }

      const existingAuditId = reauditSchedule.audit.id;

      const clientAudit = await prisma.audit.findUnique({
        where: { id: parseInt(existingAuditId) },
        include: { billboardType: true, billboardEvaluation: true },
      });

      const detectedAddress = clientAudit.location;

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
      const [trafficSpeed, evaluationTime] = await Promise.all([
        prisma.trafficSpeed.findUnique({
          where: { id: parseInt(trafficSpeedId) },
          select: { name: true },
        }),
        prisma.evaluationTime.findUnique({
          where: { id: parseInt(evaluationTimeId) },
          select: { name: true },
        }),
      ]);

      //Calculate Impressions
      const impression = impressionScore({
        trafficSpeed: trafficSpeed.name,
        evaluationTime: evaluationTime.name,
        objectCounts,
      });

      //Save in ReauditSubmission table
      await prisma.reauditSubmission.create({
        data: {
          reauditId: parseInt(reauditId),
          userId: parseInt(userId),
          auditId: parseInt(existingAuditId),
          data: {
            advertiserId,
            industryId,
            categoryId,
            billboardTypeId,
            boardConditionId,
            posterConditionId,
            trafficSpeedId,
            evaluationTimeId,
            brand,
            brandIdentifier,
            closeShotUrl,
            longShotUrl,
            videoUrl,
            objectCounts,
            impressionScore: impression,
          },
        },
      });

      //Update re-audit status
      await prisma.reauditSchedule.update({
        where: { id: parseInt(reauditId) },
        data: { status: "COMPLETED" },
      });

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
reauditWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});
