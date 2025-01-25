const express = require("express");
const multer = require("multer");
const { authToken } = require("../middleware/auth");
const { startAuditProcess } = require("../controllers/auditController");
const path = require("path");

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to store uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Route for starting an audit process
router.post(
  "/new-audit",
  authToken,
  upload.fields([
    { name: "closeShot", maxCount: 1 },
    { name: "longShot", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { userId, billboardTypeId, latitude, longitude } = req.body;
      const { closeShot, longShot, video } = req.files || {};

      // Ensure all required fields and files are present
      if (
        !userId ||
        !billboardTypeId ||
        !latitude ||
        !longitude ||
        !closeShot ||
        !longShot ||
        !video
      ) {
        return res.status(400).json({
          message:
            "Missing required fields or files: userId, billboardTypeId, latitude, longitude, closeShot, longShot, video.",
        });
      }

      // Normalize paths for cross-platform compatibility
      req.files.closeShot[0].path = path.normalize(req.files.closeShot[0].path);
      req.files.longShot[0].path = path.normalize(req.files.longShot[0].path);
      req.files.video[0].path = path.normalize(req.files.video[0].path);

      next(); // Pass control to the controller
    } catch (error) {
      console.error("Error in route middleware:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  },
  startAuditProcess
);

module.exports = router;
