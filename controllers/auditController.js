const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { isOnline } = require("../Helpers/internet");
const { uploadToGCS } = require("../Helpers/gcs");
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

function createFilePath(dir, prefix, extension) {
  return path.join(dir, `${prefix}-${Date.now()}.${extension}`);
}

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

    // Validate images and their locations
    const isValidImages = await validateImages(
      closeShotFile.path,
      longShotFile.path
    );
    if (!isValidImages) {
      return res
        .status(400)
        .json({ message: "Invalid close shot or long shot image." });
    }

    const isCloseShotValid = await validateImageLocation(
      closeShotFile.path,
      { latitude, longitude },
      300
    );
    const isLongShotValid = await validateImageLocation(
      longShotFile.path,
      { latitude, longitude },
      300
    );

    if (!isCloseShotValid || !isLongShotValid) {
      return res.status(400).json({
        message:
          "Image location exceeds 300 meters from the detected location.",
      });
    }

    // Validate video location
    const isValidVideo = await validateVideoLocation(
      videoFile.path,
      { latitude, longitude },
      300
    );
    if (!isValidVideo) {
      return res.status(400).json({
        message:
          "Video location exceeds 300 meters from the detected location.",
      });
    }

    // Handle offline storage if no internet
    if (!(await isOnline())) {
      const tempDir = path.join(__dirname, "../offline_uploads/");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const closeShotPath = createFilePath(tempDir, "close-shot", "jpg");
      const longShotPath = createFilePath(tempDir, "long-shot", "jpg");
      const videoPath = createFilePath(tempDir, "video", "mp4");

      fs.copyFileSync(closeShotFile.path, closeShotPath);
      fs.copyFileSync(longShotFile.path, longShotPath);
      fs.copyFileSync(videoFile.path, videoPath);

      const metadataPath = path.join(tempDir, "task_metadata.json");
      const taskMetadata = fs.existsSync(metadataPath)
        ? JSON.parse(fs.readFileSync(metadataPath))
        : [];

      taskMetadata.push({
        userId,
        billboardTypeId,
        location: detectedAddress,
        closeShotPath,
        longShotPath,
        videoPath,
        timestamp: new Date().toISOString(),
      });

      fs.writeFileSync(metadataPath, JSON.stringify(taskMetadata, null, 2));

      return res.status(201).json({
        message:
          "Task saved offline. It will be uploaded when internet access is restored.",
        location: detectedAddress,
      });
    }

    // Upload to Google Cloud Storage
    const closeShotUrl = await uploadToGCS(closeShotFile.path);
    const longShotUrl = await uploadToGCS(longShotFile.path);
    const videoUrl = await uploadToGCS(videoFile.path);

    // Save task in the database
    await prisma.audit.create({
      data: {
        userId: parseInt(userId),
        billboardTypeId: parseInt(billboardTypeId),
        location: detectedAddress,
        closeShotUrl,
        longShotUrl,
        videoUrl,
        status: "completed",
      },
    });

    res.status(201).json({
      message: "Task uploaded successfully.",
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

exports.syncOfflineTasks = async () => {
  const tempDir = path.join(__dirname, "../offline_uploads/");
  const metadataPath = path.join(tempDir, "task_metadata.json");

  if (!fs.existsSync(metadataPath)) return;

  const taskMetadata = JSON.parse(fs.readFileSync(metadataPath));

  for (const task of taskMetadata) {
    try {
      if (!(await isOnline())) break;

      // Verify file paths
      if (
        !fs.existsSync(task.closeShotPath) ||
        !fs.existsSync(task.longShotPath) ||
        !fs.existsSync(task.videoPath)
      ) {
        console.error("Invalid file path in task metadata:", task);
        continue; // Skip this task
      }

      // Upload to GCS
      const closeShotUrl = await uploadToGCS(task.closeShotPath);
      const longShotUrl = await uploadToGCS(task.longShotPath);
      const videoUrl = await uploadToGCS(task.videoPath);

      // Save the task in the database
      await prisma.audit.create({
        data: {
          userId: parseInt(task.userId),
          billboardTypeId: parseInt(task.billboardTypeId),
          location: task.location,
          closeShotUrl,
          longShotUrl,
          videoUrl,
          status: "completed",
        },
      });

      // Delete the local files after successful upload
      fs.unlinkSync(task.closeShotPath);
      fs.unlinkSync(task.longShotPath);
      fs.unlinkSync(task.videoPath);
    } catch (error) {
      console.error("Error syncing offline task:", error);
    }
  }

  // Delete the metadata file after syncing all tasks
  fs.unlinkSync(metadataPath);
};

// Periodically check for offline tasks to sync
setInterval(exports.syncOfflineTasks, 5 * 60 * 1000);
