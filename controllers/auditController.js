const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Queue } = require("bullmq");

async function getDetectedAddress(latitude, longitude) {
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const response = await axios.get(geocodeUrl);

  if (response.data.status !== "OK") {
    throw new Error("Failed to detect location address.");
  }

  return response.data.results[0]?.formatted_address || "Unknown Address";
}

const auditQueue = new Queue("auditQueue", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  },
});

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
        message: "All fields are required.",
      });
    }

    const closeShotFile = closeShot[0];
    const longShotFile = longShot[0];
    const videoFile = video[0];

    // Get address (cache results if needed)
    const detectedAddress = await getDetectedAddress(latitude, longitude);

    // Check if location already exists
    const existingAudit = await prisma.audit.findFirst({
      where: { location: detectedAddress },
    });

    if (existingAudit) {
      return res.status(400).json({
        message: "An audit already exists for this location.",
      });
    }

    //IMMEDIATE RESPONSE TO CLIENT
    const job = await auditQueue.add("processAudit", {
      userId: parseInt(userId),
      billboardTypeId: parseInt(billboardTypeId),
      detectedAddress,
      closeShotPath: closeShotFile.path,
      longShotPath: longShotFile.path,
      videoPath: videoFile.path,
      latitude,
      longitude,
    });

    return res.status(201).json({
      message: "Task submitted for processing.",
      jobId: job.id,
      location: detectedAddress,
    });
  } catch (error) {
    console.error("Error in startAuditProcess:", error);
    res.status(500).json({
      message: "An error occurred.",
      error: error.message || "Unknown error",
    });
  }
};
