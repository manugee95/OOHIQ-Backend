const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authToken } = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/reset-password", authController.resetPassword);
router.post("/forgot-password", authController.forgotPassword);
router.get("/user/detail", authToken, authController.getUser);
router.put(
  "/user/:id",
  authToken,
  upload.single("profilePicture"),
  authController.updateUser
);

module.exports = router;
