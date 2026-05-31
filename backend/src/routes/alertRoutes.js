const express = require("express");
const { getAlerts, updateAlertStatus, addIncidentNote } = require("../controllers/alertController");
const { protect, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, requireRoles("manager", "admin"), getAlerts);
router.patch("/:id/status", protect, requireRoles("manager", "admin"), updateAlertStatus);
router.post("/:id/notes", protect, requireRoles("manager", "admin"), addIncidentNote);

module.exports = { alertRoutes: router };
