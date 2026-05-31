const { ActivityLog } = require("../models/ActivityLog");
const { User } = require("../models/User");
const { hasDatabase } = require("../config/db");
const { asyncHandler } = require("../utils/asyncHandler");
const { memoryStore } = require("../services/memoryStore");

const getEmployees = asyncHandler(async (req, res) => {
  if (!hasDatabase()) {
    const latestByEmployee = new Map();
    memoryStore.logs.forEach((log) => latestByEmployee.set(log.employeeId, log));
    return res.json(Array.from(latestByEmployee.values()));
  }

  const employees = await ActivityLog.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$employeeId",
        employeeName: { $first: "$employeeName" },
        latestRiskScore: { $first: "$riskScore" },
        latestRiskLevel: { $first: "$riskLevel" },
        reasons: { $first: "$reasons" },
        lastSeen: { $first: "$createdAt" },
        totalEvents: { $sum: 1 },
      },
    },
    { $sort: { latestRiskScore: -1 } },
  ]);

  res.json(employees);
});

const getEmployeeSelf = asyncHandler(async (req, res) => {
  const employeeId = req.user.employeeId;
  if (!hasDatabase()) {
    const logs = employeeId
      ? memoryStore.logs.filter((log) => log.employeeId === employeeId).slice(-20).reverse()
      : [];
    return res.json({ user: req.user, logs });
  }

  const user = await User.findById(req.user._id).select("-password").lean();
  const logs = employeeId
    ? await ActivityLog.find({ employeeId }).sort({ createdAt: -1 }).limit(20).lean()
    : [];

  res.json({ user, logs });
});

module.exports = { getEmployees, getEmployeeSelf };
