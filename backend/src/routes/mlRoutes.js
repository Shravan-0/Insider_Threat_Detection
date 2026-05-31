const express = require("express");
const { getMlStatus, retrainModels } = require("../controllers/mlController");
const { protect, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/status", protect, requireRoles("admin"), getMlStatus);
router.post("/retrain", protect, requireRoles("admin"), retrainModels);

module.exports = { mlRoutes: router };
