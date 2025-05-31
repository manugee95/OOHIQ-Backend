const express = require("express");
const multer = require("multer");
const { authToken, authRole } = require("../middleware/auth");
const reauditsController = require("../controllers/reauditsController");

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    cb(null, `${file.fieldname}.${ext}`);
  },
});

const upload = multer({ storage });

router.get(
  "/api/get-available-audits",
  authToken,
  reauditsController.getAvailableReaudits
);

router.put(
  "/api/accept-reaudit/:id",
  authToken,
  reauditsController.acceptReaudit
);

router.post(
  "/api/re-audit/:id",
  authToken,
  upload.fields([
    { name: "closeShot", maxCount: 1 },
    { name: "longShot", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  reauditsController.completeReaudit
);

router.put(
  "/api/update-reaudit-status/:id",
  authToken,
  authRole(["ADMIN", "MODERATOR"]),
  reauditsController.updateReauditStatus
);

router.get(
  "/api/pending-reaudits",
  authToken,
  authRole("ADMIN"),
  reauditsController.getPendingReaudits
);

router.get(
  "/api/get-accepted-reaudits",
  authToken,
  reauditsController.getAcceptedReaudits
);

module.exports = router;
