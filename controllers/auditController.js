const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Queue } = require("bullmq");
const { updateUserLevel } = require("../Helpers/userLevel");
const { subDays } = require("date-fns");

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
  } = req.body;
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
      !video ||
      !advertiserId ||
      !industryId ||
      !categoryId ||
      !brand ||
      !brandIdentifier
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
      advertiserId: parseInt(advertiserId),
      industryId: parseInt(industryId),
      categoryId: parseInt(categoryId),
      brand,
      brandIdentifier,
      detectedAddress,
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
    }

    res.json({ message: `Audit ${status} successfully`, id, status });
  } catch (error) {
    console.error("Error updating audit status:", error);
    res.status(500).json({ error: "Failed to update audit status" });
  }
};

// exports.getAudits = async (req, res) => {
//   try {
//     const { id, role } = req.user;

//     const sevenDaysAgo = subDays(new Date(), 7);

//     let audits;

//     if (role === "ADMIN") {
//       // Admin sees all audits
//       audits = await prisma.audit.findMany({
//         orderBy: { createdAt: "desc" },
//       });
//     } else {
//       // Regular user sees only audits from the last 7 days
//       audits = await prisma.audit.findMany({
//         where: {
//           userId: id,
//           createdAt: {
//             gte: sevenDaysAgo, // Only fetch audits from the last 7 days
//           },
//         },
//         orderBy: { createdAt: "desc" },
//       });
//     }

//     res.json(audits);
//   } catch (error) {
//     console.error("Error fetching audits:", error);
//     res.status(500).json({ success: false, error: "Failed to fetch audits" });
//   }
// };

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
      where: { id: parseInt(id, 10) },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true, // Include user details
          },
        },
        billboardType: { select: { name: true } }
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
