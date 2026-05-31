const express = require("express");
const { getLogs } = require("../controllers/logController");
const { protect, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, requireRoles("manager", "admin"), getLogs);

module.exports = { logRoutes: router };
