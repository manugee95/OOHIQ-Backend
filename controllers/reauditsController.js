const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { set } = require("date-fns");
const { reauditQueue } = require("../Helpers/queue");
const { haversineDistance } = require("../Helpers/haversineDistance");
const { calculateSovScore } = require("../Helpers/sov");
const { gradeSite } = require("../Helpers/siteGrade");
const { updateUserLevel } = require("../Helpers/userLevel");

exports.getAvailableReaudits = async (req, res) => {
  try {
    const { lat, lng, range = 5, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing location coordinates" });
    }

    const availableReaudits = await prisma.reauditSchedule.findMany({
      where: {
        status: "PENDING",
      },
      skip,
      take: limitNumber,
      include: {
        audit: true,
      },
    });

    const nearby = availableReaudits.filter(({ audit }) => {
      const geoArray = audit.geolocation;

      if (!geoArray || !geoArray.length) return false;

      const geo = geoArray[0];

      console.log(geo);

      const dist = haversineDistance(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(geo.latitude),
        parseFloat(geo.longitude)
      );

      return dist <= parseFloat(range);
    });

    const total = nearby.length;
    const paginated = nearby.slice(skip, skip + limitNumber);

    res.json({
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      reaudits: paginated,
    });
  } catch (error) {
    console.error("Error in getAvailableReaudits:", error);
    res.status(500).json({ message: error.stack });
  }
};

exports.acceptReaudit = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id: reauditId } = req.params;

    if (role !== "FIELD_AUDITOR") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const existingActiveReaudit = await prisma.reauditSchedule.findFirst({
      where: {
        acceptedBy: userId,
        status: "IN_PROGRESS",
      },
    });

    if (existingActiveReaudit) {
      return res
        .status(400)
        .json({ error: "You can only accept one audit at a time" });
    }

    const now = new Date();

    const schedule = await prisma.reauditSchedule.findFirst({
      where: {
        id: parseInt(reauditId),
        status: "PENDING",
      },
    });

    if (!schedule) {
      return res
        .status(404)
        .json({ error: "Audit schedule not found or available" });
    }

    //Set expiresAt to 6pm of the scheduled day
    const expiresAt = set(now, {
      hours: 22,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    if (now >= expiresAt) {
      return res.status(400).json({ error: "Audit expired for today" });
    }

    const updated = await prisma.reauditSchedule.update({
      where: { id: parseInt(reauditId) },
      data: {
        status: "IN_PROGRESS",
        acceptedBy: userId,
        acceptedAt: now,
        expiresAt,
      },
    });

    res.json({ reaudit: updated });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
    console.error(error.message);
  }
};

exports.completeReaudit = async (req, res) => {
  try {
    const {
      userId,
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
    const { id: reauditId } = req.params;

    // Validate inputs
    const requiredFields = {
      userId,
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

    //Fetch Reauditschedule and linked audit
    const reauditSchedule = await prisma.reauditSchedule.findUnique({
      where: { id: parseInt(reauditId) },
      include: { audit: true },
    });

    if (!reauditSchedule) {
      return res.status(404).json({ error: "Reaudit schedule not found" });
    }

    const existingAudit = reauditSchedule.audit;

    //Extract stored coordinates from audit geolocations
    const storedGeoArray = existingAudit.geolocation;
    const storedGeo = storedGeoArray[0];

    const storedLat = parseFloat(storedGeo.latitude);
    const storedLng = parseFloat(storedGeo.longitude);
    const submittedLat = parseFloat(latitude);
    const submittedLng = parseFloat(longitude);

    //Validate coordinates match within tolerance
    const delta = 0.0005; //55m tolerance
    const isLatClose = Math.abs(storedLat - submittedLat) <= delta;
    const isLngClose = Math.abs(storedLng - submittedLng) <= delta;

    if (!isLatClose || !isLngClose) {
      return res.status(400).json({
        error:
          "Location mismatch, ensure you are at the correct billboard location",
      });
    }

    // Get Media Files
    const closeShotFile = closeShot[0];
    const longShotFile = longShot[0];
    const videoFile = video[0];

    //IMMEDIATE RESPONSE TO CLIENT
    const job = await reauditQueue.add("processReaudit", {
      userId: parseInt(userId),
      advertiserId: parseInt(advertiserId),
      industryId: parseInt(industryId),
      categoryId: parseInt(categoryId),
      boardConditionId: parseInt(boardConditionId),
      posterConditionId: parseInt(posterConditionId),
      trafficSpeedId: parseInt(trafficSpeedId),
      evaluationTimeId: parseInt(evaluationTimeId),
      brand,
      brandIdentifier,
      closeShotPath: closeShotFile.path,
      longShotPath: longShotFile.path,
      videoPath: videoFile.path,
      reauditId: parseInt(reauditId),
    });

    return res.status(201).json({
      message: "Task submitted for processing.",
      jobId: job.id,
    });
  } catch (error) {
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

exports.updateReauditStatus = async (req, res) => {
  try {
    const { id: reauditId } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "DISAPPROVED"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Use 'APPROVED' or 'DISAPPROVED'." });
    }

    // Find the re-audit
    const reaudit = await prisma.reauditSubmission.findUnique({
      where: { id: parseInt(reauditId) },
    });

    if (!reaudit) {
      return res.status(404).json({ error: "Audit not found" });
    }

    //If disapproved, delete re-audit record
    if (status === "DISAPPROVED") {
      await prisma.reauditSubmission.delete({
        where: { id: parseInt(reauditId) },
      });

      return res.json({ message: "Re-audit disapproved and removed", id });
    }

    // Update audit status
    await prisma.reauditSubmission.update({
      where: { id: parseInt(reauditId) },
      data: { status },
    });

    //Update Audit Table
    await prisma.audit.update({
      where: { id: parseInt(reaudit.auditId) },
      data: {
        userId: reaudit.userId,
        advertiserId: reaudit.data.advertiserId,
        industryId: reaudit.data.industryId,
        categoryId: reaudit.data.categoryId,
        boardConditionId: reaudit.data.boardConditionId,
        posterConditionId: reaudit.data.posterConditionId,
        trafficSpeedId: reaudit.data.trafficSpeedId,
        evaluationTimeId: reaudit.data.evaluationTimeId,
        brand: reaudit.data.brand,
        brandIdentifier: reaudit.data.brandIdentifier,
        closeShotUrl: reaudit.data.closeShotUrl,
        longShotUrl: reaudit.data.longShotUrl,
        videoUrl: reaudit.data.videoUrl,
        objectCounts: reaudit.data.objectCounts,
        impressionScore: reaudit.data.impressionScore,
      },
    });

    //Re-calculate Site Score and Site grade
    const audit = await prisma.audit.findUnique({
      where: { id: parseInt(reaudit.auditId) },
      include: { billboardType: true, billboardEvaluation: true, user: true },
    });

    const clientBoard = audit.billboardType.name;

    if (!clientBoard) {
      return res.status(404).json("Client Board Type not found");
    }

    const competitiveBoards = await prisma.competitiveBoardType.findMany({
      where: { billboardEvaluationId: audit.billboardEvaluation.id },
      select: { billboardTypeId: true },
    });

    const competitorTypeIds = competitiveBoards.map((b) => b.billboardTypeId);
    const competitorBoardTypes = await prisma.billboardType.findMany({
      where: {
        id: { in: competitorTypeIds },
      },
      select: { name: true },
    });

    const allBoardNames = [...competitorBoardTypes.map((b) => b.name)];

    const sovScore = calculateSovScore(clientBoard, allBoardNames);
    const lts = audit.billboardEvaluation.ltsScore;

    totalSiteScore = audit.impressionScore * 0.3 + lts * 0.5 + sovScore * 0.2;

    siteScore = Math.round(totalSiteScore * 100) / 100;
    siteGrade = gradeSite(siteScore);

    //Update score on billboardEvaluation Table
    await prisma.billboardEvaluation.update({
      where: { auditId: parseInt(reaudit.auditId) },
      data: {
        siteScore,
        siteGrade,
      },
    });

    //Get Name Values
    const [
      trafficSpeed,
      evaluationTime,
      advertiser,
      industry,
      category,
      boardCondition,
      posterCondition,
    ] = await Promise.all([
      prisma.trafficSpeed.findUnique({
        where: { id: parseInt(reaudit.data.trafficSpeedId) },
        select: { name: true },
      }),
      prisma.evaluationTime.findUnique({
        where: { id: parseInt(reaudit.data.evaluationTimeId) },
        select: { name: true },
      }),
      prisma.advertiser.findUnique({
        where: { id: parseInt(reaudit.data.advertiserId) },
        select: { name: true },
      }),
      prisma.industry.findUnique({
        where: { id: parseInt(reaudit.data.industryId) },
        select: { name: true },
      }),
      prisma.category.findUnique({
        where: { id: parseInt(reaudit.data.categoryId) },
        select: { name: true },
      }),
      prisma.boardCondition.findUnique({
        where: { id: parseInt(reaudit.data.boardConditionId) },
        select: { name: true },
      }),
      prisma.posterCondition.findUnique({
        where: { id: parseInt(reaudit.data.posterConditionId) },
        select: { name: true },
      }),
    ]);

    //Save snapshot in Audit History
    await prisma.auditHistory.create({
      data: {
        auditId: reaudit.auditId,
        billboardType: audit.billboardType.name,
        advertiser: advertiser.name,
        industry: industry.name,
        category: category.name,
        boardCondition: boardCondition.name,
        posterCondition: posterCondition.name,
        trafficSpeed: trafficSpeed.name,
        evaluationTime: evaluationTime.name,
        boardCode: audit.boardCode,
        location: audit.location,
        state: audit.state,
        town: audit.town,
        country: audit.country,
        geolocation: audit.geolocation,
        brand: reaudit.data.brand,
        brandIdentifier: reaudit.data.brandIdentifier,
        closeShotUrl: reaudit.data.closeShotUrl,
        longShotUrl: reaudit.data.longShotUrl,
        videoUrl: reaudit.data.videoUrl,
        objectCounts: reaudit.data.objectCounts,
        impressionScore: reaudit.data.impressionScore,
        sovScore: sovScore,
        ltsScore: lts,
        siteScore,
        siteGrade,
      },
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

    // Check if user qualifies for level upgrade or reset
    await updateUserLevel(updatedUser.id);

    console.log(
      `User ${user.id} credited with ₦${paymentAmount} for approved audit.`
    );

    return res.json({
      message: "Re-audit approved and processed successfully.",
    });
  } catch (error) {
    console.error("Error updating audit status:", error);
    res.status(500).json({ error: "Failed to update audit status" });
  }
};

exports.expireOverdueReaudits = async (req, res) => {
  try {
    const now = new Date();

    await prisma.reauditSchedule.updateMany({
      where: {
        status: "IN_PROGRESS",
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
        acceptedBy: null,
        acceptedAt: null,
        expiresAt: null,
      },
    });
  } catch (error) {
    console.error("Error expiring reaudits:", error);
  }
};

exports.getPendingReaudits = async (req, res) => {
  try {
    const { country, page = 1, limit = 10 } = req.query;

    if (!country) {
      return res.status(400).json("Country is required");
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    //Get Paginated data
    const [pendingReaudits, total] = await Promise.all([
      prisma.reauditSubmission.findMany({
        where: {
          status: "PENDING",
          audit: {
            country: {
              equals: country,
              mode: "insensitive",
            }, //Case insensitive
          },
        },
        include: {
          audit: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        skip,
        take: limitNumber,
      }),

      //Get total count
      prisma.reauditSubmission.count({
        where: {
          status: "PENDING",
          audit: {
            country: {
              equals: country,
              mode: "insensitive",
            },
          },
        },
      }),
    ]);

    res.json({
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      pendingReaudits,
    });
  } catch (error) {
    console.error("error fetching audits by country", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAcceptedReaudits = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const acceptedReaudit = await prisma.reauditSchedule.findFirst({
      where: { acceptedBy: userId, status: "IN_PROGRESS" },
      include: {
        audit: true,
      },
    });

    if (!acceptedReaudit) {
      return res
        .status(404)
        .json({ message: "You have no pending reaudits at this time." });
    }

    res.json({ data: acceptedReaudit });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
