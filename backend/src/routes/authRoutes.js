const express = require("express");
const {
  login,
  me,
  createUser,
  listUsers,
  resetPassword,
  updateUserStatus,
  loginValidation,
  createUserValidation,
} = require("../controllers/authController");
const { protect, requireRoles } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validateRequest");
const { loginLimiter } = require("../middleware/loginLimiter");

const router = express.Router();

router.post("/login", loginLimiter, loginValidation, validateRequest, login);
router.get("/me", protect, me);
router.post("/users", protect, requireRoles("admin"), createUserValidation, validateRequest, createUser);
router.get("/users", protect, requireRoles("admin"), listUsers);
router.patch("/users/:id/status", protect, requireRoles("admin"), updateUserStatus);
router.patch("/users/:id/password", protect, requireRoles("admin"), resetPassword);

module.exports = { authRoutes: router };
