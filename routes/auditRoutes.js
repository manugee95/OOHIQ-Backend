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
  startAuditProcess
);

module.exports = router;
