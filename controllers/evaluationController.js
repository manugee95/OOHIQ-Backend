const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  scoreBoardLevel,
  scoreBoardPositioning,
  scoreBoardsInView,
  scoreCompetitiveBoards,
  scoreDistanceOfVisibility,
  scoreLargerBoards,
  scorePedestrianTraffic,
  scoreRoadType,
  scoreSpecialFeatures,
  scoreVehicularTraffic,
  scoreVisibilityPoints,
} = require("../Helpers/lts");
const { gradeSite } = require("../Helpers/siteGrade");

//Weighting by Section
const weights = {
  location: 20,
  visibilityImpact: 50,
  competitiveness: 30,
};

exports.evaluateBillboard = async (req, res) => {
  try {
    const {
      phone,
      contractorName,
      roadTypeId,
      vehicularTrafficId,
      pedestrianTrafficId,
      distanceOfVisibilityId,
      boardPositioningId,
      boardLevelId,
      visibilityPointsId,
      specialFeaturesId,
      noOfBoardsInViewId,
      noOfCompetitiveBoardsId,
      noOfLargerBoardsId,
      competitiveBoardTypesId,
    } = req.body;
    const uploadedBy = req.user.id;
    const auditId = req.params.auditId;

    const requiredFields = {
      roadTypeId,
      vehicularTrafficId,
      pedestrianTrafficId,
      distanceOfVisibilityId,
      boardPositioningId,
      boardLevelId,
      visibilityPointsId,
      specialFeaturesId,
      noOfBoardsInViewId,
      noOfCompetitiveBoardsId,
      noOfLargerBoardsId,
      competitiveBoardTypesId,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json(`${key} is required`);
      }
    }

    if (!auditId) {
      return res.status(404).json("Audit not Found");
    }

    const existingEvaluation = await prisma.billboardEvaluation.findFirst({
      where: { auditId: parseInt(auditId) },
    });

    if (existingEvaluation) {
      return res
        .status(400)
        .json("An evaluation for this audit board already exist");
    }

    //Get Name Values
    const [
      roadType,
      vehicularTraffic,
      pedestrianTraffic,
      distanceOfVisibility,
      boardPositioning,
      boardLevel,
      visibilityPoints,
      specialFeatures,
      noOfBoardsInView,
      noOfCompetitiveBoards,
      noOfLargerBoards,
    ] = await Promise.all([
      prisma.roadType.findUnique({
        where: { id: parseInt(roadTypeId) },
        select: { name: true },
      }),
      prisma.vehicularTraffic.findUnique({
        where: { id: parseInt(vehicularTrafficId) },
        select: { name: true },
      }),
      prisma.pedestrianTraffic.findUnique({
        where: { id: parseInt(pedestrianTrafficId) },
        select: { name: true },
      }),
      prisma.distanceOfVisibility.findUnique({
        where: { id: parseInt(distanceOfVisibilityId) },
        select: { name: true },
      }),
      prisma.boardPositioning.findUnique({
        where: { id: parseInt(boardPositioningId) },
        select: { name: true },
      }),
      prisma.boardLevel.findUnique({
        where: { id: parseInt(boardLevelId) },
        select: { name: true },
      }),
      prisma.visibilityPoints.findUnique({
        where: { id: parseInt(visibilityPointsId) },
        select: { name: true },
      }),
      prisma.specialFeatures.findUnique({
        where: { id: parseInt(specialFeaturesId) },
        select: { name: true },
      }),
      prisma.noOfBoardsInView.findUnique({
        where: { id: parseInt(noOfBoardsInViewId) },
        select: { name: true },
      }),
      prisma.noOfCompetitiveBoards.findUnique({
        where: { id: parseInt(noOfCompetitiveBoardsId) },
        select: { name: true },
      }),
      prisma.noOfLargerBoards.findUnique({
        where: { id: parseInt(noOfLargerBoardsId) },
        select: { name: true },
      }),
    ]);

    //Calculate Scores
    const locationScore =
      (scoreRoadType(roadType.name) +
        scoreVehicularTraffic(vehicularTraffic.name) +
        scorePedestrianTraffic(pedestrianTraffic.name)) /
      3;

    const visibilityScore =
      (scoreDistanceOfVisibility(distanceOfVisibility.name) +
        scoreBoardPositioning(boardPositioning.name) +
        scoreBoardLevel(boardLevel.name) +
        scoreVisibilityPoints(visibilityPoints.name) +
        scoreSpecialFeatures(specialFeatures.name)) /
      5;

    const competitivenessScore =
      (scoreBoardsInView(noOfBoardsInView.name) +
        scoreCompetitiveBoards(noOfCompetitiveBoards.name) +
        scoreLargerBoards(noOfLargerBoards.name)) /
      3;

    //Weighted Total
    const totalLTS =
      locationScore * (weights.location / 100) +
      visibilityScore * (weights.visibilityImpact / 100) +
      competitivenessScore * (weights.competitiveness / 100);

    const finalScore = Math.round((totalLTS / 10) * 100);

    //Save to DB
    const evaluation = await prisma.billboardEvaluation.create({
      data: {
        uploadedBy,
        auditId: parseInt(auditId),
        phone,
        contractorName,
        roadTypeId,
        vehicularTrafficId,
        pedestrianTrafficId,
        distanceOfVisibilityId,
        boardPositioningId,
        boardLevelId,
        visibilityPointsId,
        specialFeaturesId,
        noOfBoardsInViewId,
        noOfCompetitiveBoardsId,
        noOfLargerBoardsId,
        ltsScore: finalScore,
      },
    });

    //Link Competitive Billboard Types via Join Table
    const createLinks = competitiveBoardTypesId.map((billboardTypeId) => {
      return prisma.competitiveBoardType.create({
        data: {
          billboardEvaluationId: evaluation.id,
          billboardTypeId,
        },
      });
    });

    await Promise.all(createLinks);

    //Calculate SOV Score
    const clientAudit = await prisma.audit.findUnique({
      where: { id: parseInt(auditId) },
      include: { billboardType: true },
    });

    const clientBoard = clientAudit.billboardType.id;

    if (!clientBoard) {
      return res.status(404).json("Client Board Type not found");
    }

    const competitiveBoards = await prisma.competitiveBoardType.findMany({
      where: { billboardEvaluationId: evaluation.id },
      select: { billboardTypeId: true },
    });
    const totalCompetitors = competitiveBoards.length;

    //Count how many matches client board type
    const matchingCount = competitiveBoards.filter(
      (b) => b.billboardTypeId === clientBoard
    ).length;

    const sovScore = (matchingCount / totalCompetitors) * 100;

    //Set SOV score in the audit table
    await prisma.audit.update({
      where: { id: parseInt(auditId) },
      data: { sovScore: sovScore },
    });

    //Calculate Site Grade and Score
    siteScore =
      clientAudit.impressionScore * 0.3 + finalScore * 0.5 + sovScore * 0.2;

    siteGrade = gradeSite(siteScore);

    //Update Audit History
    const latestAuditHistory = await prisma.auditHistory.findFirst({
      where: { auditId: parseInt(auditId) },
      orderBy: { createdAt: "desc" },
    });

    if (latestAuditHistory) {
      await prisma.auditHistory.update({
        where: { id: latestAuditHistory.id },
        data: {
          evaluationId: evaluation.id,
          sovScore: sovScore,
          ltsScore: evaluation.ltsScore,
          siteScore: siteScore,
          siteGrade: siteGrade,
        },
      });
    }

    //Update score on billboardEvaluation Table
    await prisma.billboardEvaluation.update({
      where: { id: parseInt(evaluation.id) },
      data: {
        siteScore,
        siteGrade,
      },
    });

    return res.status(201).json({
      message: "Evaluation submitted successfully",
      id: evaluation.id,
    });
  } catch (error) {
    res.status(500).json({ messge: error.message });
  }
};

exports.getAllBoardEvaluation = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    //Fetch Board Evaluation with Pagination
    const [evaluations, total] = await Promise.all([
      prisma.billboardEvaluation.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
        include: {
          fieldAuditor: { select: { fullName: true, email: true } },
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
          audit: {
            select: {
              state: true,
              town: true,
              location: true,
              boardCode: true,
            },
          },
        },
      }),
      prisma.billboardEvaluation.count(),
    ]);

    res.json({
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      evaluations,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.viewBoardEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluation = await prisma.billboardEvaluation.findUnique({
      where: { id: parseInt(id) },
      include: {
        fieldAuditor: { select: { fullName: true, email: true } },
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
        audit: {
          select: {
            state: true,
            town: true,
            location: true,
            boardCode: true,
          },
        },
      },
    });

    if (!evaluation) {
      return res.status(404).json("Evaluation not found");
    }

    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
