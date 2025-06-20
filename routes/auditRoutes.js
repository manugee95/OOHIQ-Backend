const express = require("express");
const multer = require("multer");
const { authToken, authRole } = require("../middleware/auth");
const auditController = require("../controllers/auditController");

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    cb(null, `${file.fieldname}.${ext}`);
  },
});

const media = multer({ storage });

// Route for starting an audit process
router.post(
  "/new-audit",
  authToken,
  media.fields([
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

router.get("/audits/:id", authToken, auditController.viewAudit);

router.get(
  "/pending-audits",
  authToken,
  authRole("ADMIN"),
  auditController.getPendingAudits
);

router.get("/api/all-boards", authToken, auditController.getAllBoards);

router.get(
  "/api/audit-history/:auditId",
  authToken,
  auditController.getAuditHistory
);

router.get(
  "/api/view-audit-history/:auditHistoryId",
  authToken,
  auditController.viewSingleAuditHistory
);

module.exports = router;
