const { ActivityLog } = require("../models/ActivityLog");
const { Alert } = require("../models/Alert");
const { hasDatabase } = require("../config/db");
const { asyncHandler } = require("../utils/asyncHandler");
const { memoryStore } = require("../services/memoryStore");

function buildStatsFromCounts(counts, alerts, topRiskEmployees) {
  return {
    totalEvents: counts.totalEvents,
    totalAlerts: counts.totalAlerts,
    highRisk: counts.highRisk,
    mediumRisk: counts.mediumRisk,
    lowRisk: counts.lowRisk,
    openAlerts: counts.openAlerts,
    topRiskEmployees,
  };
}

const getDashboardStats = asyncHandler(async (req, res) => {
  if (!hasDatabase()) {
    const logs = memoryStore.logs;
    const alerts = memoryStore.alerts;
    return res.json({
      totalEvents: logs.length,
      totalAlerts: alerts.length,
      highRisk: logs.filter((log) => log.riskLevel === "HIGH" || log.riskLevel === "CRITICAL").length,
      mediumRisk: logs.filter((log) => log.riskLevel === "MEDIUM").length,
      lowRisk: logs.filter((log) => log.riskLevel === "LOW").length,
      openAlerts: alerts.filter((alert) => !["RESOLVED", "FALSE_POSITIVE"].includes(alert.status)).length,
      topRiskEmployees: logs
        .slice()
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
        .slice(0, 5),
    });
  }

  const [totalEvents, highRisk, mediumRisk, lowRisk, totalAlerts, openAlerts, topRiskEmployees] = await Promise.all([
    ActivityLog.countDocuments(),
    ActivityLog.countDocuments({ riskLevel: { $in: ["HIGH", "CRITICAL"] } }),
    ActivityLog.countDocuments({ riskLevel: "MEDIUM" }),
    ActivityLog.countDocuments({ riskLevel: "LOW" }),
    Alert.countDocuments(),
    Alert.countDocuments({ status: { $nin: ["RESOLVED", "FALSE_POSITIVE"] } }),
    ActivityLog.find({})
      .sort({ riskScore: -1, createdAt: -1 })
      .limit(5)
      .select("employeeId employeeName riskScore riskLevel")
      .lean(),
  ]);

  res.json(
    buildStatsFromCounts(
      { totalEvents, highRisk, mediumRisk, lowRisk, totalAlerts, openAlerts },
      [],
      topRiskEmployees
    )
  );
});

module.exports = { getDashboardStats };
