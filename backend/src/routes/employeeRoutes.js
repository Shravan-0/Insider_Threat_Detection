const express = require("express");
const { getEmployees, getEmployeeSelf } = require("../controllers/employeeController");
const { protect, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, requireRoles("manager", "admin"), getEmployees);
router.get("/me", protect, requireRoles("client", "manager", "admin"), getEmployeeSelf);

module.exports = { employeeRoutes: router };
