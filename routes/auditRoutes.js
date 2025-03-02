const express = require("express");
const multer = require("multer");
const { authToken, authRole } = require("../middleware/auth");
const auditController = require("../controllers/auditController");

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to store uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    const ext = file.mimetype.split("/")
    cb(null, `${uniqueName}.${ext}`);
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
  auditController.startAuditProcess
);

router.put(
  "/audit/status/:id",
  authToken,
  authRole("ADMIN"),
  auditController.updateAuditStatus
);

router.get("/audits", authToken, auditController.getAudits);

module.exports = router;
