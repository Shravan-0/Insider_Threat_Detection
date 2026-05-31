const { RiskHistory } = require("../models/RiskHistory");
const { ThreatTimeline } = require("../models/ThreatTimeline");
const { MlPrediction } = require("../models/MlPrediction");
const { AuditEvent } = require("../models/AuditEvent");
const { ActivityLog } = require("../models/ActivityLog");
const { Alert } = require("../models/Alert");
const { hasDatabase } = require("../config/db");
const { asyncHandler } = require("../utils/asyncHandler");
const { memoryStore } = require("../services/memoryStore");

const getThreatTimeline = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 300);
  const filter = req.query.employeeId ? { employeeId: req.query.employeeId } : {};
  const events = hasDatabase()
    ? await ThreatTimeline.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
    : memoryStore.timeline
        .filter((event) => !req.query.employeeId || event.employeeId === req.query.employeeId)
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, limit);

  res.json({ events });
});

const getEmployeeIntelligence = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  if (!hasDatabase()) {
    return res.json({
      riskHistory: memoryStore.riskHistory.filter((item) => item.employeeId === employeeId).slice(-50).reverse(),
      timeline: memoryStore.timeline.filter((item) => item.employeeId === employeeId).slice(-50).reverse(),
      mlPredictions: memoryStore.mlPredictions.filter((item) => item.employeeId === employeeId).slice(-20).reverse(),
    });
  }

  const [riskHistory, timeline, mlPredictions] = await Promise.all([
    RiskHistory.find({ employeeId }).sort({ createdAt: -1 }).limit(50).lean(),
    ThreatTimeline.find({ employeeId }).sort({ createdAt: -1 }).limit(50).lean(),
    MlPrediction.find({ employeeId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  res.json({ riskHistory, timeline, mlPredictions });
});

const getSocFeed = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const events = hasDatabase()
    ? await AuditEvent.find({}).sort({ createdAt: -1 }).limit(limit).lean()
    : memoryStore.auditEvents.slice(-limit).reverse();

  res.json({ events });
});

const getSystemStatus = asyncHandler(async (req, res) => {
  if (!hasDatabase()) {
    return res.json({
      mlEngine: "ACTIVE",
      detectionPipeline: "HEALTHY",
      database: "MEMORY_FALLBACK",
      api: "HEALTHY",
      activeAlerts: memoryStore.alerts.filter((alert) => !["RESOLVED", "FALSE_POSITIVE"].includes(alert.status)).length,
      threatsToday: memoryStore.alerts.length,
      predictionsTracked: memoryStore.mlPredictions.length,
    });
  }

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [activeAlerts, threatsToday, predictionsTracked, logsToday] = await Promise.all([
    Alert.countDocuments({ status: { $nin: ["RESOLVED", "FALSE_POSITIVE"] } }),
    Alert.countDocuments({ createdAt: { $gte: since } }),
    MlPrediction.countDocuments({ createdAt: { $gte: since } }),
    ActivityLog.countDocuments({ createdAt: { $gte: since } }),
  ]);

  res.json({
    mlEngine: "ACTIVE",
    detectionPipeline: "HEALTHY",
    database: "CONNECTED",
    api: "HEALTHY",
    activeAlerts,
    threatsToday,
    predictionsTracked,
    logsToday,
  });
});

module.exports = { getThreatTimeline, getEmployeeIntelligence, getSocFeed, getSystemStatus };
