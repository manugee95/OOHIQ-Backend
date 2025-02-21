const { Worker } = require("bullmq");
const { uploadToGCS } = require("../Helpers/gcs");
const {
  validateImages,
  validateImageLocation,
  validateVideoLocation,
} = require("../Helpers/mediaValidate");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

require("dotenv").config();

// const auditWorker = new Worker(
//   "auditQueue",
//   async (job) => {
//     const {
//       userId,
//       billboardTypeId,
//       detectedAddress,
//       closeShotPath,
//       longShotPath,
//       videoPath,
//     } = job.data;

//     // Upload files to Google Cloud Storage
//     const [closeShotUrl, longShotUrl, videoUrl] = await Promise.all([
//       uploadToGCS(closeShotPath),
//       uploadToGCS(longShotPath),
//       uploadToGCS(videoPath),
//     ]);

//     // Save task in the database
//     await prisma.audit.create({
//       data: {
//         userId,
//         billboardTypeId,
//         location: detectedAddress,
//         closeShotUrl,
//         longShotUrl,
//         videoUrl,
//         status: "completed",
//       },
//     });

//     console.log(`Audit task ${job.id} completed successfully.`);
//   },
//   {
//     connection: {
//       host: process.env.REDIS_HOST,
//       port: process.env.REDIS_PORT,
//       username: process.env.REDIS_USERNAME,
//       password: process.env.REDIS_PASSWORD,
//     },
//   }
// );

// // Handle errors
// auditWorker.on("failed", (job, err) => {
//   console.error(`Job ${job.id} failed:`, err.message);
// });

const auditWorker = new Worker(
  "auditQueue",
  async (job) => {
    try {
      const {
        userId,
        billboardTypeId,
        detectedAddress,
        closeShotPath,
        longShotPath,
        videoPath,
        latitude,
        longitude,
      } = job.data;

      console.log(`Processing audit job ${job.id}...`);

      //Validate images in worker
      const [isValidImages, isCloseShotValid, isLongShotValid, isValidVideo] =
        await Promise.all([
          validateImages(closeShotPath, longShotPath),
          validateImageLocation(closeShotPath, { latitude, longitude }, 300),
          validateImageLocation(longShotPath, { latitude, longitude }, 300),
          validateVideoLocation(videoPath, { latitude, longitude }, 300),
        ]);

      if (
        !isValidImages ||
        !isCloseShotValid ||
        !isLongShotValid ||
        !isValidVideo
      ) {
        console.error(`Job ${job.id} failed: Invalid files.`);
        throw new Error("Invalid files or location mismatch.");
      }

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
          location: detectedAddress,
          closeShotUrl,
          longShotUrl,
          videoUrl,
          status: "completed",
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
