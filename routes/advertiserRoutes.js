const express = require("express");
const router = express.Router();
const advertiserController = require("../controllers/advertiserController");
const { authToken, authRole } = require("../middleware/auth");

router.post(
  "/advertisers",
  authToken,
  authRole("ADMIN"),
  advertiserController.createAdvertiser
);

router.get(
  "/advertisers",
  authToken,
  advertiserController.getAdvertiser
);

router.put(
  "/advertisers/:id",
  authToken,
  authRole("ADMIN"),
  advertiserController.updateAdvertiser
);

router.delete(
  "/advertisers/:id",
  authToken,
  authRole("ADMIN"),
  advertiserController.deleteAdvertiser
);

module.exports = router;
