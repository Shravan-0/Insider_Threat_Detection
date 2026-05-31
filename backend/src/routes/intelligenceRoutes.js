const express = require("express");
const { getThreatTimeline, getEmployeeIntelligence, getSocFeed, getSystemStatus } = require("../controllers/intelligenceController");
const { protect, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/timeline", protect, requireRoles("manager", "admin"), getThreatTimeline);
router.get("/employees/:employeeId", protect, requireRoles("manager", "admin"), getEmployeeIntelligence);
router.get("/soc-feed", protect, requireRoles("manager", "admin"), getSocFeed);
router.get("/system-status", protect, requireRoles("manager", "admin"), getSystemStatus);

module.exports = { intelligenceRoutes: router };
