const express = require("express");
const router = express.Router();
const industryController = require("../controllers/industryController");
const { authToken, authRole } = require("../middleware/auth");

router.post(
  "/industries",
  authToken,
  authRole("ADMIN"),
  industryController.createIndustry
);

router.get(
  "/industries",
  authToken,
  industryController.getAllIndustries
);

router.put(
  "/industries/:id",
  authToken,
  authRole("ADMIN"),
  industryController.updateIndustry
);

router.delete(
  "/industries/:id",
  authToken,
  authRole("ADMIN"),
  industryController.deleteIndustry
);

module.exports = router;
