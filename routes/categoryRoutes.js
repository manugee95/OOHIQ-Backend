const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { authToken, authRole } = require("../middleware/auth");

router.post(
  "/categories",
  authToken,
  authRole("ADMIN"),
  categoryController.createCategory
);

router.get(
  "/categories",
  authToken,
  categoryController.getAllCategories
);

router.get(
  "/categories/industry/:industryId",
  authToken,
  categoryController.getCategoriesByIndustry
);

router.put(
  "/categories/:id",
  authToken,
  authRole("ADMIN"),
  categoryController.updateCategory
);

router.delete(
  "/categories/:id",
  authToken,
  authRole("ADMIN"),
  categoryController.deleteCategory
);

module.exports = router;
