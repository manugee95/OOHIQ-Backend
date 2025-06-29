const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { updateUserLevel } = require("../Helpers/userLevel");
const { auditQueue } = require("../Helpers/queue");
const { generateBoardCode } = require("../Helpers/boardCode");
const { subDays } = require("date-fns");
const { getDetectedAddress } = require("../Helpers/detectAddress");

exports.startAuditProcess = async (req, res) => {
  const {
    userId,
    billboardTypeId,
    latitude,
    longitude,
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

// exports.updateAuditStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body; // Status should be "APPROVED" or "DISAPPROVED"

//     if (!["APPROVED", "DISAPPROVED"].includes(status)) {
//       return res
//         .status(400)
//         .json({ error: "Invalid status. Use 'APPROVED' or 'DISAPPROVED'." });
//     }

//     // Find the audit
//     const audit = await prisma.audit.findUnique({
//       where: { id: parseInt(id) },
//       include: { user: true }, // Include user data to update stats
//     });

//     if (!audit) {
//       return res.status(404).json({ error: "Audit not found" });
//     }

//     //If disapproved, delete audit history and audit record
//     // if (status === "disapproved") {
//     //   await prisma.auditHistory.deleteMany({
//     //     where: { id: parseInt(id) },
//     //   });

//     //   await prisma.audit.delete({
//     //     where: { id: parseInt(id) },
//     //   });

//     //   return res.json({ message: "Audit disapproved and removed", id });
//     // }

//     // Update audit status
//     await prisma.audit.update({
//       where: { id: parseInt(id) },
//       data: { status },
//     });

//     // If approved, increment user's approved audits count
//     const user = audit.user;
//     const paymentAmount = PAYMENT_PER_LEVEL[user.level] || 0;

//     // Increment user's approved audits and credit wallet
//     const updatedUser = await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         approvedAudits: { increment: 1 },
//         walletBalance: { increment: paymentAmount },
//       },
//     });

//     console.log(
//       `User ${user.id} credited with ₦${paymentAmount} for approved audit.`
//     );

//     // Check if user qualifies for level upgrade or reset
//     await updateUserLevel(updatedUser.id);

//     //Assign Board Code If doesn't exist
//     if (!audit.boardCode) {
//       const boardCode = await generateBoardCode(prisma, id);
//       await prisma.audit.update({
//         where: { id: audit.id },
//         data: { boardCode },
//       });

//       console.log(`Board code ${boardCode} assigned to Audit`);
//     }

//     res.json({ message: `Audit ${status} successfully`, id, status });
//   } catch (error) {
//     console.error("Error updating audit status:", error);
//     res.status(500).json({ error: "Failed to update audit status" });
//   }
// };

exports.updateAuditStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "DISAPPROVED"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Use 'APPROVED' or 'DISAPPROVED'." });
    }

    const audit = await prisma.audit.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        billboardType: true,
        category: true,
      },
    });

    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }

    // Handle DISAPPROVED and reschedule if status was ADDED -> PENDING -> DISAPPROVED
    if (status === "DISAPPROVED" && audit.status === "PENDING") {
      // Check if audit was previously ADDED before becoming PENDING
      const history = await prisma.auditHistory.findMany({
        where: { auditId: audit.id },
        orderBy: { createdAt: "asc" },
        take: 1,
      });

      const wasInitiallyAdded = history.length > 0;

      if (wasInitiallyAdded) {
        // Revert status back to ADDED
        await prisma.audit.update({
          where: { id: audit.id },
          data: { status: "ADDED" },
        });

        // Schedule audit again
        const scheduledTime = new Date();
        scheduledTime.setHours(8, 0, 0, 0); // 8 AM today

        await prisma.auditSchedule.create({
          data: {
            auditId: audit.id,
            scheduledFor: scheduledTime,
            status: "PENDING",
          },
        });

        return res.json({
          message:
            "Audit disapproved and rescheduled for re-audit (status reverted to ADDED)",
          id,
          status: "ADDED",
        });
      }
    }

    await prisma.audit.update({
      where: { id: audit.id },
      data: { status },
    });

    if (status === "APPROVED") {
      const user = audit.user;
      const paymentAmount = PAYMENT_PER_LEVEL[user.level] || 0;

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          approvedAudits: { increment: 1 },
          walletBalance: { increment: paymentAmount },
        },
      });

      console.log(`User ${user.id} credited with ₦${paymentAmount}`);

      await updateUserLevel(updatedUser.id);

      if (!audit.boardCode) {
        const boardCode = await generateBoardCode(prisma, id);
        await prisma.audit.update({
          where: { id: audit.id },
          data: { boardCode },
        });

        console.log(`Board code ${boardCode} assigned`);
      }

      // Update site in first matching campaign only
      const geo = Array.isArray(audit.geolocation)
        ? audit.geolocation[0]
        : audit.geolocation;

      if (geo && audit.billboardType?.name && audit.category?.name) {
        const allCampaigns = await prisma.campaign.findMany();

        for (const campaign of allCampaigns) {
          let updated = false;

          const updatedSiteList = (campaign.siteList || []).map((site) => {
            const sameLat =
              Math.abs(parseFloat(site.latitude) - parseFloat(geo.latitude)) <
              0.0001;
            const sameLng =
              Math.abs(parseFloat(site.longitude) - parseFloat(geo.longitude)) <
              0.0001;
            const sameBoard =
              site.boardType?.toLowerCase() ===
              audit.billboardType.name.toLowerCase();
            const sameCategory =
              site.category?.toLowerCase() ===
              audit.category.name.toLowerCase();

            if (
              site.existStatus === "Non-Existent" &&
              sameLat &&
              sameLng &&
              sameBoard &&
              sameCategory
            ) {
              updated = true;
              return {
                ...site,
                existStatus: "Existent",
              };
            }

            return site;
          });

          if (updated) {
            await prisma.campaign.update({
              where: { id: campaign.id },
              data: { siteList: updatedSiteList },
            });

            console.log(`Updated site to Existent in campaign ${campaign.id}`);
            break;
          }
        }
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

exports.getAuditHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, month, year } = req.query;
    const { auditId } = req.params;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const audit = await prisma.audit.findUnique({
      where: { id: parseInt(auditId) },
    });

    if (!audit || !audit.boardCode) {
      return res.status(404).json({ error: "Audit or Board code not found" });
    }

    const dateFilter = {};
    if (!isNaN(month) && !isNaN(year)) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      dateFilter.createdAt = { gte: start, lt: end };
    }

    //Filter audit history with same board code and Approved status
    const total = await prisma.auditHistory.count({
      where: {
        boardCode: audit.boardCode,
        status: "APPROVED",
        ...dateFilter,
      },
    });

    const historyEntries = await prisma.auditHistory.findMany({
      where: {
        boardCode: audit.boardCode,
        status: "APPROVED",
        ...dateFilter,
      },
      include: { audit: true },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    });

    const progression = historyEntries.map((entry) => ({
      date: entry.createdAt,
      siteScore: entry.siteScore ?? 0,
      siteGrade: entry.siteGrade ?? "N/A",
    }));

    return res.status(200).json({
      total,
      page,
      limit,
      History: historyEntries,
      scoreProgression: progression,
    });
  } catch (error) {
    console.error("Error retrieving audit history:", error);
    return res.status(500).json({ error: "Failed to retrieve audit history" });
  }
};

exports.viewSingleAuditHistory = async (req, res) => {
  try {
    const { auditHistoryId } = req.params;

    const auditHistory = await prisma.auditHistory.findUnique({
      where: { id: parseInt(auditHistoryId) },
    });

    if (!auditHistory) {
      return res.status(404).json({ error: "Audit History not found" });
    }

    return res.json({ data: auditHistory });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};
