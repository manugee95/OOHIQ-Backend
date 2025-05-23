const { Worker } = require("bullmq");
const { uploadToGCS } = require("../Helpers/gcs");
const {
  convertImageToJpg,
  convertVideoToMp4,
} = require("../Helpers/conversion");
const { analyzeVideoObjects } = require("../Helpers/analyzeVideo");
const extractImageMetadata = require("../Helpers/metadata");
const { addWatermarkToImage, videoWatermark } = require("../Helpers/watermark");
const { impressionScore } = require("../Helpers/impressions");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const auditWorker = new Worker(
  "auditQueue",
  async (job) => {
    try {
      const {
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
        detectedAddress,
        state,
        town,
        closeShotPath,
        longShotPath,
        videoPath,
      } = job.data;

      console.log(`Processing audit job ${job.id}...`);

      //Extract metadata
      const metadataCloseShot = await extractImageMetadata(closeShotPath);
      const metadataLongShot = await extractImageMetadata(longShotPath);

      //Convert Image and Video
      const [closeJpg, longJpg, videoMp4] = await Promise.all([
        convertImageToJpg(closeShotPath),
        convertImageToJpg(longShotPath),
        convertVideoToMp4(videoPath),
      ]);

      //Watermark with metadata and address
      const watermarkedClose = await addWatermarkToImage(
        closeJpg,
        metadataCloseShot,
        detectedAddress
      );
      const watermarkedLong = await addWatermarkToImage(
        longJpg,
        metadataLongShot,
        detectedAddress
      );
      const watermarkVideo = await videoWatermark(
        videoMp4,
        `OOHIQ by TrueNorth Media Monitoring`
      );

      //Upload files concurrently
      const [closeShotUrl, longShotUrl, videoUrl] = await Promise.all([
        uploadToGCS(watermarkedClose),
        uploadToGCS(watermarkedLong),
        uploadToGCS(watermarkVideo),
      ]);

      // Analyze video objects
      const objectCounts = await analyzeVideoObjects(videoMp4);

      //Get Name values
      const [
        trafficSpeed,
        evaluationTime,
        advertiser,
        industry,
        category,
        boardCondition,
        posterCondition,
        billboardType
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

      //Save to Audit Table
      const newAudit = await prisma.audit.create({
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
          closeShotUrl,
          longShotUrl,
          videoUrl,
          objectCounts,
          impressionScore: impression,
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
          state:  newAudit.state,
          town: newAudit.town,
          brand:  newAudit.brand,
          brandIdentifier: newAudit.brandIdentifier,
          closeShotUrl: newAudit.closeShotUrl,
          longShotUrl: newAudit.longShotUrl,
          videoUrl: newAudit.videoUrl,
          objectCounts: newAudit.objectCounts,
          impressionScore: newAudit.impressionScore
        },
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
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    },
  }
);

// Handle worker errors
auditWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});
