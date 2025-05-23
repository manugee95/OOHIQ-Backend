const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Queue } = require("bullmq");
const { updateUserLevel } = require("../Helpers/userLevel");
const { generateBoardCode } = require("../Helpers/boardCode");
const { subDays } = require("date-fns");

async function getDetectedAddress(latitude, longitude) {
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const response = await axios.get(geocodeUrl);

  if (response.data.status !== "OK") {
    throw new Error("Failed to detect location address.");
  }

  const address =
    response.data.results[0]?.formatted_address || "Unknown Address";
  const addressComponents = response.data.results[0]?.address_components;

  if (!addressComponents) {
    return { state: "Unknown", city: "Unknown" };
  }

  let city = "Unknown";
  let state = "Unknown";

  for (const component of addressComponents) {
    if (component.types.includes("administrative_area_level_1")) {
      state = component.long_name;
    }
    if (
      component.types.includes("locality") ||
      component.types.includes("administrative_area_level_2")
    ) {
      city = component.long_name;
    }
  }

  return { address, state, city };
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
  const {
    userId,
    billboardTypeId,
    latitude,
    longitude,
    advertiserId,
    industryId,
    categoryId,
    brand,
    brandIdentifier,
    boardConditionId,
    posterConditionId,
    trafficSpeedId,
    evaluationTimeId,
  } = req.body;
  const { closeShot, longShot, video } = req.files;

  try {
    // Validate inputs
    const requiredFields = {
      userId,
      billboardTypeId,
      latitude,
      longitude,
      advertiserId,
      industryId,
      categoryId,
      brand,
      brandIdentifier,
      boardConditionId,
      posterConditionId,
      trafficSpeedId,
      evaluationTimeId,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json(`${key} is required`);
      }
    }

    // Get Media Files
    const closeShotFile = closeShot[0];
    const longShotFile = longShot[0];
    const videoFile = video[0];

    // Get address (cache results if needed)
    const addressInfo = await getDetectedAddress(latitude, longitude);
    const detectedAddress = addressInfo.address;
    const state = addressInfo.state;
    const town = addressInfo.city;

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
      advertiserId: parseInt(advertiserId),
      industryId: parseInt(industryId),
      categoryId: parseInt(categoryId),
      boardConditionId: parseInt(boardConditionId),
      posterConditionId: parseInt(posterConditionId),
      trafficSpeedId: parseInt(trafficSpeedId),
      evaluationTimeId: parseInt(evaluationTimeId),
      brand,
      brandIdentifier,
      detectedAddress,
      state,
      town,
      closeShotPath: closeShotFile.path,
      longShotPath: longShotFile.path,
      videoPath: videoFile.path,
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

const PAYMENT_PER_LEVEL = {
  Rookie: 500,
  Challenger: 1000,
  Contender: 1500,
  Professional: 2000,
  Ultimate: 3000,
};

exports.updateAuditStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Status should be "approved" or "disapproved"

    if (!["approved", "disapproved"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Use 'approved' or 'disapproved'." });
    }

    // Find the audit
    const audit = await prisma.audit.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }, // Include user data to update stats
    });

    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }

    // Update audit status
    await prisma.audit.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    // If approved, increment user's approved audits count
    if (status === "approved") {
      const user = audit.user;
      const paymentAmount = PAYMENT_PER_LEVEL[user.level] || 0;

      // Increment user's approved audits and credit wallet
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          approvedAudits: { increment: 1 },
          walletBalance: { increment: paymentAmount },
        },
      });

      console.log(
        `User ${user.id} credited with ₦${paymentAmount} for approved audit.`
      );

      // Check if user qualifies for level upgrade or reset
      await updateUserLevel(updatedUser.id);

      //Assign Board Code If doesn't exist
      if (!audit.boardCode) {
        const boardCode = await generateBoardCode(prisma);
        await prisma.audit.update({
          where: { id: audit.id },
          data: { boardCode },
        });

        console.log(`Board code ${boardCode} assigned to Audit`);
      }
    }

    res.json({ message: `Audit ${status} successfully`, id, status });
  } catch (error) {
    console.error("Error updating audit status:", error);
    res.status(500).json({ error: "Failed to update audit status" });
  }
};

exports.getAudits = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const sevenDaysAgo = subDays(new Date(), 7);

    let whereCondition = {};

    if (role !== "ADMIN") {
      // Regular user: Only fetch audits from the last 7 days
      whereCondition = {
        userId: id,
        createdAt: { gte: sevenDaysAgo },
      };
    }

    // Fetch audits with pagination and include user information
    const [audits, total] = await Promise.all([
      prisma.audit.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          billboardType: { select: { name: true } },
          advertiser: { select: { name: true } },
          industry: { select: { name: true } },
          category: { select: { name: true } },
          boardCondition: { select: { name: true } },
          posterCondition: { select: { name: true } },
          trafficSpeed: { select: { name: true } },
          evaluationTime: { select: { name: true } },
          billboardEvaluation: {select: {ltsScore: true, siteScore: true, siteGrade: true}}
        },
      }),
      prisma.audit.count({ where: whereCondition }),
    ]);

    res.json({
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      audits,
    });
  } catch (error) {
    console.error("Error fetching audits:", error);
    res.status(500).json({ success: false, error: "Failed to fetch audits" });
  }
};

exports.getPendingAudits = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch audits where status is "PENDING"
    const whereCondition = { status: "pending" };

    const [pendingAudits, total] = await Promise.all([
      prisma.audit.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          billboardType: { select: { name: true } },
        },
      }),
      prisma.audit.count({ where: whereCondition }),
    ]);

    res.json({
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      pendingAudits,
    });
  } catch (error) {
    console.error("Error fetching pending audits:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch pending audits" });
  }
};

exports.viewAudit = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the audit including user details
    const audit = await prisma.audit.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true, // Include user details
          },
        },
        billboardType: { select: { name: true } },
        advertiser: { select: { name: true } },
        industry: { select: { name: true } },
        category: { select: { name: true } },
        boardCondition: { select: { name: true } },
        posterCondition: { select: { name: true } },
        trafficSpeed: { select: { name: true } },
        evaluationTime: { select: { name: true } },
      },
    });

    // If audit is not found
    if (!audit) {
      return res
        .status(404)
        .json({ success: false, message: "Audit not found" });
    }

    res.json({ audit });
  } catch (error) {
    console.error("Error fetching audit:", error);
    res.status(500).json({ success: false, error: "Failed to fetch audit" });
  }
};
