const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { updateUserLevel } = require("../Helpers/userLevel");
const { auditQueue } = require("../Helpers/queue");
const { generateBoardCode } = require("../Helpers/boardCode");
const { subDays } = require("date-fns");
const { getDetectedAddress } = require("../Helpers/detectAddress");
const {uploadToGCS} = require("../Helpers/gcs")

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

  let geolocation = [];
  geolocation.push({ latitude, longitude });

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

    //Upload File to GCS
    // const closeShotGcsUrl = await uploadToGCS(closeShotFile.path);
    // const longShotGcsUrl = await uploadToGCS(longShotFile.path);
    // const videoGcsUrl = await uploadToGCS(videoFile.path);

    // Get address (cache results if needed)
    const addressInfo = await getDetectedAddress(latitude, longitude);
    const detectedAddress = addressInfo.address;
    const state = addressInfo.state;
    const town = addressInfo.city;
    const country = addressInfo.country;

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
      country,
      geolocation,
      closeShotPath: closeShotFile.path,
      longShotPath: longShotFile.path,
      videoPath: videoFile.path
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
    const { status } = req.body; // Status should be "APPROVED" or "DISAPPROVED"

    if (!["APPROVED", "DISAPPROVED"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Use 'APPROVED' or 'DISAPPROVED'." });
    }

    // Find the audit
    const audit = await prisma.audit.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }, // Include user data to update stats
    });

    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }

    //If disapproved, delete audit history and audit record
    if (status === "disapproved") {
      await prisma.auditHistory.deleteMany({
        where: { id: parseInt(id) },
      });

      await prisma.audit.delete({
        where: { id: parseInt(id) },
      });

      return res.json({ message: "Audit disapproved and removed", id });
    }

    // Update audit status
    await prisma.audit.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    // If approved, increment user's approved audits count
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
      const boardCode = await generateBoardCode(prisma, id);
      await prisma.audit.update({
        where: { id: audit.id },
        data: { boardCode },
      });

      console.log(`Board code ${boardCode} assigned to Audit`);
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
    const { page = 1, limit = 10, country = "Nigeria" } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const sevenDaysAgo = subDays(new Date(), 7);

    let whereCondition = {};

    if (role === "ADMIN") {
      //Admins filter: By selected country
      whereCondition = {
        country: { equals: country, mode: "insensitive" },
      };
    } else {
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
          billboardEvaluation: {
            include: {
              roadType: { select: { name: true } },
              vehicularTraffic: { select: { name: true } },
              pedestrianTraffic: { select: { name: true } },
              distanceOfVisibility: { select: { name: true } },
              boardPositioning: { select: { name: true } },
              boardLevel: { select: { name: true } },
              visibilityPoints: { select: { name: true } },
              specialFeatures: { select: { name: true } },
              noOfBoardsInView: { select: { name: true } },
              noOfCompetitiveBoards: { select: { name: true } },
              noOfLargerBoards: { select: { name: true } },
            },
          },
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
    const { page = 1, limit = 10, country = "Nigeria" } = req.query;
    const { role } = req.user;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch audits where status is "PENDING"
    const whereCondition = { status: "PENDING" };

    if (role === "ADMIN") {
      whereCondition.country = { equals: country, mode: "insensitive" };
    }

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
          billboardEvaluation: {
            include: {
              roadType: { select: { name: true } },
              vehicularTraffic: { select: { name: true } },
              pedestrianTraffic: { select: { name: true } },
              distanceOfVisibility: { select: { name: true } },
              boardPositioning: { select: { name: true } },
              boardLevel: { select: { name: true } },
              visibilityPoints: { select: { name: true } },
              specialFeatures: { select: { name: true } },
              noOfBoardsInView: { select: { name: true } },
              noOfCompetitiveBoards: { select: { name: true } },
              noOfLargerBoards: { select: { name: true } },
            },
          },
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
        billboardEvaluation: {
          include: {
            roadType: true,
            vehicularTraffic: true,
            pedestrianTraffic: true,
            distanceOfVisibility: true,
            boardPositioning: true,
            boardLevel: true,
            visibilityPoints: true,
            specialFeatures: true,
            noOfBoardsInView: true,
            noOfCompetitiveBoards: true,
            noOfLargerBoards: true,
          },
        },
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

exports.getAllBoards = async (req, res) => {
  try {
    const { country, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const whereCondition = { status: "APPROVED", country: country };

    const [boards, total] = await Promise.all([
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
          billboardEvaluation: {
            include: {
              roadType: { select: { name: true } },
              vehicularTraffic: { select: { name: true } },
              pedestrianTraffic: { select: { name: true } },
              distanceOfVisibility: { select: { name: true } },
              boardPositioning: { select: { name: true } },
              boardLevel: { select: { name: true } },
              visibilityPoints: { select: { name: true } },
              specialFeatures: { select: { name: true } },
              noOfBoardsInView: { select: { name: true } },
              noOfCompetitiveBoards: { select: { name: true } },
              noOfLargerBoards: { select: { name: true } },
            },
          },
        },
      }),

      prisma.audit.count({ where: whereCondition }),
    ]);

    res.json({
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      boards,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
