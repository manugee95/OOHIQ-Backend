const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const { authToken, authRole } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/api/get-analytics-overview",
  authToken,
  authRole(["ADMIN", "MODERATOR", "CLIENT"]),
  analyticsController.getAnalyticsOverview
);

module.exports = router;
