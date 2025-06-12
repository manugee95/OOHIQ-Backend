const { PrismaClient } = require("@prisma/client");
const xlsx = require("xlsx");
const { haversineDistance } = require("../Helpers/haversineDistance");
const { getDetectedAddress } = require("../Helpers/detectAddress");
const { addedQueue } = require("../Helpers/queue");
const { set } = require("date-fns");

const prisma = new PrismaClient();

const parseSiteList = (filePath, startingIndex = 0) => {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  if (data.length === 0) {
    return { error: "The uploaded file is empty" };
  }

  // Remove header row
  data.shift();

  if (data[0].length !== 10) {
    return {
      error: `The uploaded file must have exactly 10 columns, found ${data[0].length}`,
    };
  }

  const siteData = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    if (row.length !== 10) {
      return { error: `row ${i + 2} does not have exactly 10 columns` };
    }

    const [
      code,
      state,
      town,
      location,
      mediaOwner,
      brand,
      boardType,
      category,
      latitude,
      longitude,
    ] = row.map((value) => value?.toString().trim() || "");

    const generatedCode =
      code || (startingIndex + i + 1).toString().padStart(4, "0");

    siteData.push({
      code: generatedCode,
      state,
      town,
      location,
      mediaOwner,
      brand,
      boardType,
      category,
      latitude,
      longitude,
    });
  }

  return { data: siteData };
};

exports.createCampaign = async (req, res) => {
  try {
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: "Client is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "A site list file is required" });
    }

    //Find Client information
    const client = await prisma.user.findUnique({
      where: { id: parseInt(clientId) },
    });

    if (!client) {
      return res.status(404).json({ error: "Client is not found" });
    }

    const currentDate = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    //Check if campaign exist for the month
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        clientId: parseInt(clientId),
        createdAt: {
          gte: new Date(currentYear, currentMonth, 1),
          lt: new Date(currentYear, currentMonth + 1, 1),
        },
      },
    });

    if (existingCampaign) {
      return res.status(400).json({
        error: `A campaign for this advertiser already exist for ${monthNames[currentMonth]}-${currentYear}`,
      });
    }

    //Process the site list upload
    let { data, error } = parseSiteList(req.file.path);

    if (error) {
      return res.status(404).json({ error });
    }

    //Generate campaign ID
    const generateCampaignId = async () => {
      const clientName = client.fullName.slice(0, 3).toUpperCase();
      const month = monthNames[currentDate.getMonth()]
        .slice(0, 3)
        .toUpperCase();

      const year = currentDate.getFullYear().toString().slice(-2);

      const baseCampaignId = `${clientName}${month}${year}`;
      let uniqueId = baseCampaignId;
      let counter = 1;

      while (true) {
        const existingCampaign = await prisma.campaign.findFirst({
          where: { campaignId: uniqueId },
        });

        if (!existingCampaign) break;
        uniqueId = `${baseCampaignId}-${counter}`;
        counter++;
      }

      return uniqueId;
    };

    const campaignId = await generateCampaignId();

    //Evaluate the sites on the list for a match in DB or schedule an audit upload if not in DB
    const GEO_TOLERANCE = 0.0001; //10 meters

    const evaluatedSites = await Promise.all(
      data.map(async (site) => {
        const { latitude, longitude, boardType, category } = site;

        const boardTypeRecord = await prisma.billboardType.findFirst({
          where: {
            name: {
              equals: boardType,
              mode: "insensitive",
            },
          },
        });

        const categoryRecord = await prisma.category.findFirst({
          where: {
            name: {
              equals: category,
              mode: "insensitive",
            },
          },
        });

        if (!boardTypeRecord || !categoryRecord) {
          return { ...site, existStatus: "Unknown" };
        }

        const boardTypeId = boardTypeRecord.id;
        const categoryId = categoryRecord.id;

        const audits = await prisma.audit.findMany({
          where: {
            billboardTypeId: boardTypeId,
            categoryId,
          },
        });

        const match = audits.find((audit) => {
          const geo = Array.isArray(audit.geolocation)
            ? audit.geolocation[0]
            : null;
          if (!geo) return false;

          const auditLat = parseFloat(geo.latitude);
          const auditLng = parseFloat(geo.longitude);

          return (
            Math.abs(auditLat - parseFloat(latitude)) <= GEO_TOLERANCE &&
            Math.abs(auditLng - parseFloat(longitude)) <= GEO_TOLERANCE
          );
        });

        return {
          ...site,
          existStatus: match ? "Existent" : "Non-existent",
        };
      })
    );

    const campaign = await prisma.campaign.create({
      data: {
        campaignId,
        clientId: parseInt(clientId),
        siteList: evaluatedSites,
        createdAt: new Date(),
        totalSites: evaluatedSites.length,
      },
    });

    return res.status(201).json({ "campaign created": campaign });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.scheduleAudit = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: parseInt(id) },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Get Non-existent sites
    const nonExistentSites = campaign.siteList.filter(
      (site) => site.existStatus === "Non-existent"
    );

    if (nonExistentSites.length === 0) {
      return res
        .status(404)
        .json({ error: "No non-existent sites found to schedule audits for" });
    }

    const createdAudits = [];

    for (const site of nonExistentSites) {
      const {
        state,
        town,
        location,
        latitude,
        longitude,
        boardType,
        category,
      } = site;

      // Find boardType and category records
      const boardTypeRecord = await prisma.billboardType.findFirst({
        where: {
          name: { equals: boardType, mode: "insensitive" },
        },
      });

      const categoryRecord = await prisma.category.findFirst({
        where: {
          name: { equals: category, mode: "insensitive" },
        },
      });

      if (!boardTypeRecord || !categoryRecord) {
        continue; // Skip this site if lookup fails
      }

      // Create audit
      const createdAudit = await prisma.audit.create({
        data: {
          state,
          town,
          location,
          geolocation: [
            {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
            },
          ],
          status: "ADDED",
          billboardTypeId: boardTypeRecord.id,
          categoryId: categoryRecord.id,
          createdAt: new Date(),
        },
      });

      // Schedule audit for re-audit
      const scheduledTime = new Date();
      scheduledTime.setHours(8, 0, 0, 0); // schedule for 8 AM today

      await prisma.auditSchedule.create({
        data: {
          auditId: createdAudit.id,
          scheduledFor: scheduledTime,
          status: "PENDING",
        },
      });

      createdAudits.push(createdAudit);
    }

    return res.status(201).json({
      message: `${createdAudits.length} audits scheduled for non-existent sites`,
      audits: createdAudits,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occured while adding sites" });
  }
};

exports.addSitesToCampaign = async (req, res) => {
  try {
    const { campaignID } = req.body;

    if (!campaignID) {
      return res.status(400).json({ error: "Campaign campaignID is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "A site list file is required" });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: parseInt(campaignID) },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const existingSiteList = Array.isArray(campaign.siteList)
      ? campaign.siteList
      : [];

    const maxExistingCode = existingSiteList.reduce((max, site) => {
      const num = parseInt(site.code, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    let { duplicates, data, error } = parseSiteList(
      req.file.path,
      maxExistingCode + 1
    );

    if (error) {
      return res.status(400).json({ error });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: "No valid site data found" });
    }

    if (duplicates && duplicates.length > 0) {
      return res.status(400).json({
        error: "Duplicate board locations found",
        duplicates,
        prompt: "Would you like to proceed with the upload?",
      });
    }

    const GEO_TOLERANCE = 0.0001; //10 meters

    const updatedSites = await Promise.all(
      data.map(async (site) => {
        const { latitude, longitude, boardType, category } = site;

        const boardTypeRecord = await prisma.billboardType.findFirst({
          where: {
            name: {
              equals: boardType,
              mode: "insensitive",
            },
          },
        });

        const categoryRecord = await prisma.category.findFirst({
          where: {
            name: {
              equals: category,
              mode: "insensitive",
            },
          },
        });

        if (!boardTypeRecord || !categoryRecord) {
          return { ...site, existStatus: "Unknown" };
        }

        const boardTypeId = boardTypeRecord.id;
        const categoryId = categoryRecord.id;

        const audits = await prisma.audit.findMany({
          where: {
            billboardTypeId: boardTypeId,
            categoryId,
          },
        });

        const match = audits.find((audit) => {
          const geo = Array.isArray(audit.geolocation)
            ? audit.geolocation[0]
            : null;
          if (!geo) return false;

          const auditLat = parseFloat(geo.latitude);
          const auditLng = parseFloat(geo.longitude);

          return (
            Math.abs(auditLat - parseFloat(latitude)) <= GEO_TOLERANCE &&
            Math.abs(auditLng - parseFloat(longitude)) <= GEO_TOLERANCE
          );
        });

        return {
          ...site,
          existStatus: match ? "Existent" : "Non-existent",
        };
      })
    );

    //Append new sites to campaign
    const newSiteList = [...existingSiteList, ...updatedSites];

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        siteList: newSiteList,
        totalSites: newSiteList.length,
      },
    });

    return res.status(200).json({
      message: "Sites successfully added to campaign",
      added: updatedSites.length,
      siteList: updatedSites,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occured while adding sites" });
  }
};

exports.getAddedAudits = async (req, res) => {
  try {
    const { lat, lng, range = 5, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing location coordinates" });
    }

    const availableAudits = await prisma.auditSchedule.findMany({
      where: {
        status: "PENDING",
      },
      skip,
      take: limitNumber,
      include: {
        audit: true,
      },
    });

    const nearby = availableAudits.filter(({ audit }) => {
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
    console.error("Error in getAvailableAudits:", error);
    res.status(500).json({ message: error.stack });
  }
};

exports.acceptAudit = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id: auditId } = req.params;

    if (role !== "FIELD_AUDITOR") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const existingActiveAudit = await prisma.auditSchedule.findFirst({
      where: {
        acceptedBy: userId,
        status: "IN_PROGRESS",
      },
    });

    if (existingActiveAudit) {
      return res
        .status(400)
        .json({ error: "You can only accept one audit at a time" });
    }

    const now = new Date();

    const schedule = await prisma.auditSchedule.findFirst({
      where: {
        id: parseInt(auditId),
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
      hours: 18,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    if (now >= expiresAt) {
      return res.status(400).json({ error: "Audit expired for today" });
    }

    const updated = await prisma.auditSchedule.update({
      where: { id: parseInt(auditId) },
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

exports.completeAudit = async (req, res) => {
  try {
    const {
      userId,
      latitude,
      longitude,
      advertiserId,
      industryId,
      billboardTypeId,
      categoryId,
      brand,
      brandIdentifier,
      boardConditionId,
      posterConditionId,
      trafficSpeedId,
      evaluationTimeId,
    } = req.body;
    const { closeShot, longShot, video } = req.files;
    const { id: auditScheduleId } = req.params;

    let geolocation = [];
    geolocation.push({ latitude, longitude });

    // Validate inputs
    const requiredFields = {
      userId,
      latitude,
      longitude,
      advertiserId,
      billboardTypeId,
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

    // Get address (cache results if needed)
    const addressInfo = await getDetectedAddress(latitude, longitude);
    const detectedAddress = addressInfo.address;
    const state = addressInfo.state;
    const town = addressInfo.city;
    const country = addressInfo.country;

    //Fetch Auditschedule and linked audit
    const auditSchedule = await prisma.auditSchedule.findUnique({
      where: { id: parseInt(auditScheduleId) },
      include: { audit: true },
    });

    if (!auditSchedule) {
      return res.status(404).json({ error: "audit schedule not found" });
    }

    const existingAudit = auditSchedule.audit;

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
    const job = await addedQueue.add("processadded", {
      userId: parseInt(userId),
      advertiserId: parseInt(advertiserId),
      industryId: parseInt(industryId),
      categoryId: parseInt(categoryId),
      boardConditionId: parseInt(boardConditionId),
      posterConditionId: parseInt(posterConditionId),
      trafficSpeedId: parseInt(trafficSpeedId),
      evaluationTimeId: parseInt(evaluationTimeId),
      billboardTypeId: parseInt(billboardTypeId),
      geolocation,
      brand,
      brandIdentifier,
      detectedAddress,
      state,
      town,
      country,
      closeShotPath: closeShotFile.path,
      longShotPath: longShotFile.path,
      videoPath: videoFile.path,
      auditId: auditSchedule.audit.id,
      auditScheduleId: auditScheduleId
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

exports.getAcceptedAddedAudits = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const acceptedAudit = await prisma.auditSchedule.findFirst({
      where: { acceptedBy: userId, status: "IN_PROGRESS" },
      include: {
        audit: true,
      },
    });

    if (!acceptedAudit) {
      return res
        .status(404)
        .json({ message: "You have no pending audits at this time." });
    }

    res.json({ data: acceptedAudit });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.fetchCampaign = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { page = 1, limit = 1 } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    //Define role based filter
    let whereClause = {};
    if (role === "ADMIN") {
      whereClause = {};
    } else if (role === "CLIENT") {
      whereClause = { clientId: userId };
    } else {
      return res
        .status(403)
        .json({ error: "Permission denied: You are not authorized to access" });
    }

    // Fetch total count
    const totalCampaigns = await prisma.campaign.count({
      where: whereClause,
    });

    // Fetch paginated campaigns
    const campaigns = await prisma.campaign.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(totalCampaigns / limit),
      totalCampaigns,
      campaigns,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occured while adding sites" });
  }
};

exports.viewCampaign = async (req, res) => {
  const { id } = req.params;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found." });
    }

    if (
      req.user.role === "ADMIN" ||
      (req.user.role === "CLIENT" && campaign.clientId === req.user.id)
    ) {
      return res.status(200).json({
        campaign,
        siteList: campaign.siteList,
      });
    } else {
      return res.status(403).json({
        error:
          "Permission Denied: Only authorized users can access this campaign.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving campaign." });
  }
};

exports.deleteCampaign = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Campaign ID is required." });
  }

  try {
    // Check if the campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: parseInt(id) },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found." });
    }

    // Delete the campaign
    await prisma.campaign.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Campaign successfully deleted." });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({
      error: "An error occurred while deleting the campaign.",
      details: error.message,
    });
  }
};
