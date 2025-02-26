const express = require("express");
const router = express.Router();
const userController = require("../controllers/authController");
const { authToken } = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/reset-password", userController.resetPassword);
router.post("/forgot-password", userController.forgotPassword);
router.get("/user/detail", authToken, userController.getUser);
router.put(
  "/user/:id",
  authToken,
  upload.single("profilePicture"),
  userController.updateUser
);

module.exports = router;
