const { Worker } = require("bullmq");
const { uploadToGCS } = require("../Helpers/gcs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

require("dotenv").config();

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
        videoPath
      } = job.data;

      console.log(`Processing audit job ${job.id}...`);

      //Upload files concurrently
      const [closeShotUrl, longShotUrl, videoUrl] = await Promise.all([
        uploadToGCS(closeShotPath),
        uploadToGCS(longShotPath),
        uploadToGCS(videoPath),
      ]);

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
        },
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
