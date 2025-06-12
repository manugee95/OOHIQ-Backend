const express = require("express");
const multer = require("multer");
const campaignController = require("../controllers/campaignController");
const { authToken, authRole } = require("../middleware/auth");

const router = express.Router();

// Configure Multer for file uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only CSV and Excel files are allowed"));
    }
    cb(null, true);
  },
});

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    cb(null, `${file.fieldname}.${ext}`);
  },
});

const media = multer({ storage });

router.post(
  "/api/campaign/create",
  authToken,
  authRole("ADMIN"),
  upload.single("siteList"),
  campaignController.createCampaign
);

router.post(
  "/api/campaign/schedule-audit/:id",
  authToken,
  authRole("ADMIN"),
  campaignController.scheduleAudit
);

router.post(
  "/api/sites/upload",
  authToken,
  authRole("ADMIN"),
  upload.single("siteList"),
  campaignController.addSitesToCampaign
);

router.get(
  "/api/campaign/added-audits",
  authToken,
  campaignController.getAddedAudits
);

router.put(
  "/api/campaign/accept-audit/:id",
  authToken,
  campaignController.acceptAudit
);

router.post(
  "/api/campaign/upload-audit/:id",
  authToken,
  media.fields([
    { name: "closeShot", maxCount: 1 },
    { name: "longShot", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  campaignController.completeAudit
);

router.get(
  "/api/campaign/get-accepted-audit",
  authToken,
  campaignController.getAcceptedAddedAudits
);

router.get("/api/campaigns", authToken, campaignController.fetchCampaign);

router.get("/api/campaign/:id", authToken, campaignController.viewCampaign);

router.delete(
  "/api/campaign/:id",
  authToken,
  authRole("ADMIN"),
  campaignController.deleteCampaign
);

module.exports = router;
