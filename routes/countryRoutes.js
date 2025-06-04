const express = require("express");
const countryController = require("../controllers/countryController");
const { authRole, authToken } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/api/create-country",
  authToken,
  authRole("ADMIN"),
  countryController.createCountry
);

router.get("/api/get-countries", countryController.getCountries);

module.exports = router;
