const express = require("express");
const boardConditionController = require("../controllers/boardConditionController");
const boardLevelController = require("../controllers/boardLevelController");
const boardPositioningController = require("../controllers/boardPositioningController");
const distanceOfVisibilityController = require("../controllers/distanceOfVisibilityController");
const evaluationTimeController = require("../controllers/evaluationTimeController");
const noOfBoardsInViewController = require("../controllers/noOfBoardsInViewController");
const noOfCompetitiveBoardsController = require("../controllers/noOfCompetitiveBoardsController");
const noOfLargerBoardsController = require("../controllers/noOfLargerBoardsController");
const pedestrianTrafficController = require("../controllers/pedestrianTrafficController");
const posterConditionController = require("../controllers/posterConditionController");
const roadTypeController = require("../controllers/roadTypeController");
const specialFeaturesController = require("../controllers/specialFeaturesController");
const trafficSpeedController = require("../controllers/trafficSpeedController");
const vehicularTrafficController = require("../controllers/vehicularTrafficController");
const visibilityPointsController = require("../controllers/visibilityPointsController");
const { authToken, authRole } = require("../middleware/auth");

const router = express.Router();

//Board Condition Routes
router.post(
  "/api/board-condition",
  authToken,
  authRole("ADMIN"),
  boardConditionController.createBoardCondition
);
router.get(
  "/api/board-condition",
  authToken,
  boardConditionController.getBoardCondition
);

//Board Level Routes
router.post(
  "/api/board-Level",
  authToken,
  authRole("ADMIN"),
  boardLevelController.createBoardLevel
);
router.get("/api/board-Level", authToken, boardLevelController.getBoardLevel);

//Board Positioning Routes
router.post(
  "/api/board-positioning",
  authToken,
  authRole("ADMIN"),
  boardPositioningController.createBoardPositioning
);
router.get(
  "/api/board-positioning",
  authToken,
  boardPositioningController.getBoardPositioning
);

//Distance Of Visibilty Routes
router.post(
  "/api/distance-of-visibility",
  authToken,
  authRole("ADMIN"),
  distanceOfVisibilityController.createDistanceOfVisibility
);
router.get(
  "/api/distance-of-visibility",
  authToken,
  distanceOfVisibilityController.getDistanceOfVisibility
);

//Evaluation Time Routes
router.post(
  "/api/evaluation-time",
  authToken,
  authRole("ADMIN"),
  evaluationTimeController.createEvaluationTime
);
router.get(
  "/api/evaluation-time",
  authToken,
  evaluationTimeController.getEvaluationTime
);

//No of Boards in view Routes
router.post(
  "/api/no-of-boards-in-view",
  authToken,
  authRole("ADMIN"),
  noOfBoardsInViewController.createNoOfBoardsInView
);
router.get(
  "/api/no-of-boards-in-view",
  authToken,
  noOfBoardsInViewController.getNoOfBoardsInView
);

//No of Competitive Boards Routes
router.post(
  "/api/no-of-competitive-boards",
  authToken,
  authRole("ADMIN"),
  noOfCompetitiveBoardsController.createNoOfCompetitiveBoards
);
router.get(
  "/api/no-of-competitive-boards",
  authToken,
  noOfCompetitiveBoardsController.getNoOfCompetitiveBoards
);

//No of Larger Boards Routes
router.post(
  "/api/no-of-larger-boards",
  authToken,
  authRole("ADMIN"),
  noOfLargerBoardsController.createNoOfLargerBoards
);
router.get(
  "/api/no-of-larger-boards",
  authToken,
  noOfLargerBoardsController.getNoOfLargerBoards
);

//Pedestrian Traffic Routes
router.post(
  "/api/pedestrian-traffic",
  authToken,
  authRole("ADMIN"),
  pedestrianTrafficController.createPedestrianTraffic
);
router.get(
  "/api/pedestrian-traffic",
  authToken,
  pedestrianTrafficController.getPedestrianTraffic
);

//Poster Condition Routes
router.post(
  "/api/poster-condition",
  authToken,
  authRole("ADMIN"),
  posterConditionController.createPosterCondition
);
router.get(
  "/api/poster-condition",
  authToken,
  posterConditionController.getPosterCondition
);

//Road Type Routes
router.post(
  "/api/road-type",
  authToken,
  authRole("ADMIN"),
  roadTypeController.createRoadType
);
router.get("/api/road-type", authToken, roadTypeController.getRoadType);

//Special Features Routes
router.post(
  "/api/special-features",
  authToken,
  authRole("ADMIN"),
  specialFeaturesController.createSpecialFeatures
);
router.get(
  "/api/special-features",
  authToken,
  specialFeaturesController.getSpecialFeatures
);

//Traffic Speed Routes
router.post(
  "/api/traffic-speed",
  authToken,
  authRole("ADMIN"),
  trafficSpeedController.createTrafficSpeed
);
router.get(
  "/api/traffic-speed",
  authToken,
  trafficSpeedController.getTrafficSpeed
);

//Vehicular Traffic Routes
router.post(
  "/api/vehicular-traffic",
  authToken,
  authRole("ADMIN"),
  vehicularTrafficController.createVehicularTraffic
);
router.get(
  "/api/vehicular-traffic",
  authToken,
  vehicularTrafficController.getVehicularTraffic
);

//Visibility Points Routes
router.post(
  "/api/visibility-points",
  authToken,
  authRole("ADMIN"),
  visibilityPointsController.createVisibilityPoints
);
router.get(
  "/api/visibility-points",
  authToken,
  visibilityPointsController.getVisibilityPoints
);

module.exports = router;
