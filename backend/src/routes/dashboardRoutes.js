const express = require("express");
const { getDashboardStats } = require("../controllers/dashboardController");
const { protect, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/stats", protect, requireRoles("manager", "admin"), getDashboardStats);

module.exports = { dashboardRoutes: router };
