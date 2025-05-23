const express = require("express");
const evaluationController = require("../controllers/evaluationController");
const { authToken, authRole } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/api/billboard-evaluation/:auditId",
  authToken,
  evaluationController.evaluateBillboard
);

router.get("/api/billboard-evaluation", authToken, evaluationController.getAllBoardEvaluation)
router.get("/api/billboard-evaluation/:id", authToken, evaluationController.viewBoardEvaluation)

module.exports = router;
