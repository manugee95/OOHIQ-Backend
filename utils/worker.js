const { Worker } = require("bullmq");
const { uploadToGCS } = require("../Helpers/gcs");
const {
  convertImageToJpg,
  convertVideoToMp4,
} = require("../Helpers/conversion");
const { analyzeVideoObjects } = require("../Helpers/analyzeVideo");
const extractImageMetadata = require("../Helpers/metadata");
const { addWatermarkToImage, videoWatermark } = require("../Helpers/watermark");
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
        brand,
        brandIdentifier,
        detectedAddress,
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

      //Save to database
      await prisma.audit.create({
        data: {
          userId,
          billboardTypeId,
          advertiserId,
          industryId,
          categoryId,
          brand,
          brandIdentifier,
          location: detectedAddress,
          closeShotUrl,
          longShotUrl,
          videoUrl,
          objectCounts,
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
