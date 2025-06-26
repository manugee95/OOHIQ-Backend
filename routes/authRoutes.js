const express = require("express");
const router = express.Router();
const userController = require("../controllers/authController");
const { authToken, authRole } = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/signup", userController.signup);
router.post("/api/create-user", authToken, authRole("ADMIN"), userController.createUser)
router.post("/login", userController.mobileLogin);
router.post("/api/web-login", userController.webLogin)
router.post("/reset-password", userController.resetPassword);
router.post("/forgot-password", userController.forgotPassword);
router.get("/user/detail", authToken, userController.getUser);
router.get(
  "/user/field-auditor",
  authToken,
  authRole(["ADMIN"]),
  userController.getFieldAuditors
);
router.get(
  "/user/clients",
  authToken,
  authRole(["ADMIN"]),
  userController.getClients
);
router.get(
  "/user/media_owners",
  authToken,
  authRole(["ADMIN"]),
  userController.getMediaOwners
);
router.get("/api/user/:id", authToken, authRole("ADMIN"), userController.getUserById);
router.put(
  "/api/user",
  authToken,
  upload.single("profilePicture"),
  userController.updateUser
);
router.put("/api/save-token", authToken, userController.saveUserToken);

module.exports = router;
