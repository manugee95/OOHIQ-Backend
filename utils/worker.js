const { Worker } = require("bullmq");
const { uploadToGCS } = require("../Helpers/gcs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

require('dotenv').config();


const auditWorker = new Worker(
  "auditQueue",
  async (job) => {
    const {
      userId,
      billboardTypeId,
      detectedAddress,
      closeShotPath,
      longShotPath,
      videoPath,
    } = job.data;

    // Upload files to Google Cloud Storage
    const [closeShotUrl, longShotUrl, videoUrl] = await Promise.all([
      uploadToGCS(closeShotPath),
      uploadToGCS(longShotPath),
      uploadToGCS(videoPath),
    ]);

    // Save task in the database
    await prisma.audit.create({
      data: {
        userId,
        billboardTypeId,
        location: detectedAddress,
        closeShotUrl,
        longShotUrl,
        videoUrl,
        status: "completed",
      },
    });

    console.log(`Audit task ${job.id} completed successfully.`);
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

// Handle errors
auditWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});
