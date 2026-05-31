const express = require("express");
const { predictRisk } = require("../controllers/predictionController");
const { protect, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, requireRoles("manager", "admin"), predictRisk);

module.exports = { predictionRoutes: router };
