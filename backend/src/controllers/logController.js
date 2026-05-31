const { ActivityLog } = require("../models/ActivityLog");
const { hasDatabase } = require("../config/db");
const { asyncHandler } = require("../utils/asyncHandler");
const { memoryStore } = require("../services/memoryStore");

function toLogResponse(log) {
  const raw = log.raw || {};
  return {
    id: log._id || log.id,
    employeeId: log.employeeId,
    employeeName: log.employeeName,
    activityType: log.activityType || "behavior_scan",
    severity: log.severity || log.riskLevel,
    riskScore: log.riskScore,
    risk_score: log.riskScore,
    riskLevel: log.riskLevel,
    risk_level: log.riskLevel,
    anomaly: log.riskLevel === "LOW" ? 1 : -1,
    reasons: log.reasons || [],
    timestamp: log.createdAt,
    createdAt: log.createdAt,
    input: {
      login_hour: log.loginHour ?? raw.login_hour,
      files_accessed: log.fileAccessCount ?? raw.files_accessed,
      usb_usage: log.usbUsage ?? raw.usb_usage,
      emails_sent: log.emailCount ?? raw.emails_sent,
    },
  };
}

const getLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const logs = hasDatabase()
    ? await ActivityLog.find({}).sort({ createdAt: -1 }).limit(limit).lean()
    : memoryStore.logs.slice(-limit).reverse();

  res.json(logs.map(toLogResponse));
});

module.exports = { getLogs };
