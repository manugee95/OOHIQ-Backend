const express = require("express");
const router = express.Router();
const billboardController = require("../controllers/billboardController");
const { authToken, authRole } = require("../middleware/auth");

router.post("/api/board-type", authToken, authRole("ADMIN"), billboardController.createBoardType)
router.get("/api/board-type", authToken, billboardController.getboard)

module.exports = router