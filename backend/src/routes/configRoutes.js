const express = require("express");
const { getConfig, updateConfig } = require("../controllers/configController");
const { protect, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, requireRoles("manager", "admin"), getConfig);
router.post("/", protect, requireRoles("manager", "admin"), updateConfig);
router.put("/", protect, requireRoles("manager", "admin"), updateConfig);

module.exports = { configRoutes: router };
