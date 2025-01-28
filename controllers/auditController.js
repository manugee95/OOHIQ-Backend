const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Queue } = require("bullmq");
const {
  validateImages,
  validateImageLocation,
  validateVideoLocation,
} = require("../Helpers/mediaValidate");

async function getDetectedAddress(latitude, longitude) {
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const response = await axios.get(geocodeUrl);

  if (response.data.status !== "OK") {
    throw new Error("Failed to detect location address.");
  }

  return response.data.results[0]?.formatted_address || "Unknown Address";
}

function validateFilePath(file, fileType) {
  if (!file || !file.path) {
    throw new Error(`${fileType} file is missing or invalid.`);
  }
}

const auditQueue = new Queue("auditQueue", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD
  },
});

// function createFilePath(dir, prefix, extension) {
//   return path.join(dir, `${prefix}-${Date.now()}.${extension}`);
// }

// exports.startAuditProcess = async (req, res) => {
//   const { userId, billboardTypeId, latitude, longitude } = req.body;
//   const { closeShot, longShot, video } = req.files;

//   try {
//     // Validate inputs
//     if (
//       !userId ||
//       !billboardTypeId ||
//       !latitude ||
//       !longitude ||
//       !closeShot ||
//       !longShot ||
//       !video
//     ) {
//       return res.status(400).json({
//         message:
//           "All fields are required: userId, billboardTypeId, latitude, longitude, closeShot, longShot, video.",
//       });
//     }

//     const closeShotFile = closeShot[0];
//     const longShotFile = longShot[0];
//     const videoFile = video[0];

//     // Validate file paths
//     validateFilePath(closeShotFile, "Close shot");
//     validateFilePath(longShotFile, "Long shot");
//     validateFilePath(videoFile, "Video");

//     const detectedAddress = await getDetectedAddress(latitude, longitude);

//     // Check if location already exists in the database
//     const existingAudit = await prisma.audit.findFirst({
//       where: { location: detectedAddress },
//     });

//     if (existingAudit) {
//       return res.status(400).json({
//         message: "An audit already exists for this location.",
//       });
//     }

//     // Validate images and their locations concurrently
//     const [isValidImages, isCloseShotValid, isLongShotValid, isValidVideo] =
//       await Promise.all([
//         validateImages(closeShotFile.path, longShotFile.path),
//         validateImageLocation(closeShotFile.path, { latitude, longitude }, 300),
//         validateImageLocation(longShotFile.path, { latitude, longitude }, 300),
//         validateVideoLocation(videoFile.path, { latitude, longitude }, 300),
//       ]);

//     if (!isValidImages) {
//       return res
//         .status(400)
//         .json({ message: "Invalid close shot or long shot image." });
//     }

//     if (!isCloseShotValid || !isLongShotValid) {
//       return res.status(400).json({
//         message:
//           "Image location exceeds 300 meters from the detected location.",
//       });
//     }

//     if (!isValidVideo) {
//       return res.status(400).json({
//         message:
//           "Video location exceeds 300 meters from the detected location.",
//       });
//     }

//     // Handle offline storage if no internet
//     if (!(await isOnline())) {
//       const tempDir = path.join(__dirname, "../offline_uploads/");
//       await fs.mkdir(tempDir, { recursive: true }); // Create directory if not exists

//       const closeShotPath = createFilePath(tempDir, "close-shot", "jpg");
//       const longShotPath = createFilePath(tempDir, "long-shot", "jpg");
//       const videoPath = createFilePath(tempDir, "video", "mp4");

//       await Promise.all([
//         fs.copyFile(closeShotFile.path, closeShotPath),
//         fs.copyFile(longShotFile.path, longShotPath),
//         fs.copyFile(videoFile.path, videoPath),
//       ]);

//       const metadataPath = path.join(tempDir, "task_metadata.json");
//       let taskMetadata = [];

//       try {
//         const metadata = await fs.readFile(metadataPath, "utf8");
//         taskMetadata = JSON.parse(metadata);
//       } catch {
//         // File doesn't exist, continue with an empty array
//       }

//       taskMetadata.push({
//         userId,
//         billboardTypeId,
//         location: detectedAddress,
//         closeShotPath,
//         longShotPath,
//         videoPath,
//         timestamp: new Date().toISOString(),
//       });

//       await fs.writeFile(
//         metadataPath,
//         JSON.stringify(taskMetadata, null, 2),
//         "utf8"
//       );

//       return res.status(201).json({
//         message:
//           "Task saved offline. It will be uploaded when internet access is restored.",
//         location: detectedAddress,
//       });
//     }

//     // Upload files to Google Cloud Storage in parallel
//     const [closeShotUrl, longShotUrl, videoUrl] = await Promise.all([
//       uploadToGCS(closeShotFile.path),
//       uploadToGCS(longShotFile.path),
//       uploadToGCS(videoFile.path),
//     ]);

//     // Save task in the database
//     await prisma.audit.create({
//       data: {
//         userId: parseInt(userId),
//         billboardTypeId: parseInt(billboardTypeId),
//         location: detectedAddress,
//         closeShotUrl,
//         longShotUrl,
//         videoUrl,
//         status: "completed",
//       },
//     });

//     res.status(201).json({
//       message: "Task uploaded successfully.",
//       location: detectedAddress,
//     });
//   } catch (error) {
//     console.error("Error in startAuditProcess:", error);

//     // Gracefully handle errors
//     res.status(500).json({
//       message: "An error occurred while processing the task.",
//       error: error.message || "Unknown error",
//     });
//   }
// };

exports.startAuditProcess = async (req, res) => {
  const { userId, billboardTypeId, latitude, longitude } = req.body;
  const { closeShot, longShot, video } = req.files;

  try {
    // Validate inputs
    if (
      !userId ||
      !billboardTypeId ||
      !latitude ||
      !longitude ||
      !closeShot ||
      !longShot ||
      !video
    ) {
      return res.status(400).json({
        message:
          "All fields are required: userId, billboardTypeId, latitude, longitude, closeShot, longShot, video.",
      });
    }

    const closeShotFile = closeShot[0];
    const longShotFile = longShot[0];
    const videoFile = video[0];

    // Validate file paths
    validateFilePath(closeShotFile, "Close shot");
    validateFilePath(longShotFile, "Long shot");
    validateFilePath(videoFile, "Video");

    const detectedAddress = await getDetectedAddress(latitude, longitude);

    // Check if location already exists in the database
    const existingAudit = await prisma.audit.findFirst({
      where: { location: detectedAddress },
    });

    if (existingAudit) {
      return res.status(400).json({
        message: "An audit already exists for this location.",
      });
    }

    // Validate images and their locations concurrently
    const [isValidImages, isCloseShotValid, isLongShotValid, isValidVideo] =
      await Promise.all([
        validateImages(closeShotFile.path, longShotFile.path),
        validateImageLocation(closeShotFile.path, { latitude, longitude }, 300),
        validateImageLocation(longShotFile.path, { latitude, longitude }, 300),
        validateVideoLocation(videoFile.path, { latitude, longitude }, 300),
      ]);

    if (!isValidImages) {
      return res.status(400).json({
        message: "Invalid close shot or long shot image.",
      });
    }

    if (!isCloseShotValid || !isLongShotValid) {
      return res.status(400).json({
        message:
          "Image location exceeds 300 meters from the detected location.",
      });
    }

    if (!isValidVideo) {
      return res.status(400).json({
        message:
          "Video location exceeds 300 meters from the detected location.",
      });
    }

    // Add the task to the BullMQ queue for processing
    const job = await auditQueue.add("processAudit", {
      userId: parseInt(userId),
      billboardTypeId: parseInt(billboardTypeId),
      detectedAddress,
      closeShotPath: closeShotFile.path,
      longShotPath: longShotFile.path,
      videoPath: videoFile.path,
    });

    res.status(201).json({
      message: "Task has been submitted for processing.",
      jobId: job.id,
      location: detectedAddress,
    });
  } catch (error) {
    console.error("Error in startAuditProcess:", error);

    // Gracefully handle errors
    res.status(500).json({
      message: "An error occurred while processing the task.",
      error: error.message || "Unknown error",
    });
  }
};
