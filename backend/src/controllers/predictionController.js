const { ActivityLog } = require("../models/ActivityLog");
const { Alert } = require("../models/Alert");
const { RiskHistory } = require("../models/RiskHistory");
const { ThreatTimeline } = require("../models/ThreatTimeline");
const { MlPrediction } = require("../models/MlPrediction");
const { hasDatabase } = require("../config/db");
const { asyncHandler } = require("../utils/asyncHandler");
const { getRiskConfig } = require("../services/configService");
const { predictWithML } = require("../services/mlService");
const { normalizeActivity, calculateRisk } = require("../services/riskService");
const { memoryStore, pushLimited } = require("../services/memoryStore");
const { emitRealtime } = require("../services/realtimeService");
const { recordAuditEvent } = require("../services/auditService");

function toFrontendResult(result) {
  return {
    employeeId: result.employeeId,
    employeeName: result.employeeName,
    risk_score: result.riskScore,
    riskScore: result.riskScore,
    risk_level: result.riskLevel,
    riskLevel: result.riskLevel,
    anomalyConfidence: result.anomalyConfidence,
    anomaly: result.mlAnomaly || result.riskLevel !== "LOW" ? -1 : 1,
    reasons: result.reasons,
    indicators: result.indicators,
    mlExplanation: result.explanation,
    mlAnomalyDetected: result.mlAnomalyDetected,
    behavior_summary: result.reasons.slice(0, 3).join(", "),
    mlAnomaly: result.mlAnomaly,
    mlScore: result.mlScore,
    randomForestClass: result.randomForestClass,
    randomForestConfidence: result.randomForestConfidence,
    input: result.raw,
  };
}

async function persistResults(results) {
  const openAlertEmployeeIds = new Set();
  if (hasDatabase()) {
    const openAlerts = await Alert.find({ status: { $nin: ["RESOLVED", "FALSE_POSITIVE"] } })
      .select("employeeId")
      .lean();
    openAlerts.forEach((alert) => openAlertEmployeeIds.add(alert.employeeId));
  } else {
    memoryStore.alerts
      .filter((alert) => !["RESOLVED", "FALSE_POSITIVE"].includes(alert.status))
      .forEach((alert) => openAlertEmployeeIds.add(alert.employeeId));
  }

  const logDocs = results.map((result) => ({
    employeeId: result.employeeId,
    employeeName: result.employeeName,
    loginHour: result.loginHour,
    fileAccessCount: result.fileAccessCount,
    usbUsage: result.usbUsage,
    emailCount: result.emailCount,
    location: result.location,
    failedLogins: result.failedLogins,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    reasons: result.reasons,
    indicators: result.indicators,
    mlAnomaly: result.mlAnomaly,
    mlScore: result.mlScore,
    severity: result.severity,
    raw: result.raw,
  }));

  const alertDocs = results
    .filter((result) => ["HIGH", "CRITICAL"].includes(result.riskLevel) && result.riskScore >= 85 && result.reasons.length >= 2)
    .filter((result) => !openAlertEmployeeIds.has(result.employeeId))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 50)
    .map((result) => ({
      employeeId: result.employeeId,
      employeeName: result.employeeName,
      riskScore: result.riskScore,
      severity: result.riskScore >= 95 || result.riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
      reasons: result.reasons,
      indicators: result.indicators,
      anomalyConfidence: result.anomalyConfidence,
      primaryReason: result.reasons[0],
      source: result.mlAnomaly ? "hybrid" : "rules",
    }));

  const riskHistoryDocs = results.map((result) => ({
    employeeId: result.employeeId,
    employeeName: result.employeeName,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    anomalyConfidence: result.anomalyConfidence,
    indicators: result.indicators,
    reasons: result.reasons,
  }));

  const mlPredictionDocs = results.map((result) => ({
    employeeId: result.employeeId,
    isolationAnomaly: result.mlAnomaly,
    anomalyScore: result.mlScore,
    anomalyConfidence: result.anomalyConfidence,
    randomForestClass: result.randomForestClass,
    randomForestConfidence: result.randomForestConfidence,
    explanation: result.explanation,
    features: result.raw,
  }));

  const timelineDocs = [
    ...results.map((result) => ({
      employeeId: result.employeeId,
      employeeName: result.employeeName,
      eventType: result.mlAnomaly ? "ML_DETECTION" : "LOG",
      severity: result.riskLevel,
      riskScore: result.riskScore,
      title: result.mlAnomaly ? "ML anomaly detected" : "Behavior analysis completed",
      description: result.explanation,
      metadata: { indicators: result.indicators },
    })),
    ...alertDocs.map((alert) => ({
      employeeId: alert.employeeId,
      employeeName: alert.employeeName,
      eventType: "INCIDENT",
      severity: alert.severity,
      riskScore: alert.riskScore,
      title: alert.primaryReason,
      description: alert.reasons.join(", "),
      metadata: { indicators: alert.indicators },
    })),
  ];

  if (hasDatabase()) {
    if (logDocs.length) await ActivityLog.insertMany(logDocs, { ordered: false });
    if (alertDocs.length) await Alert.insertMany(alertDocs, { ordered: false });
    if (riskHistoryDocs.length) await RiskHistory.insertMany(riskHistoryDocs, { ordered: false });
    if (mlPredictionDocs.length) await MlPrediction.insertMany(mlPredictionDocs, { ordered: false });
    if (timelineDocs.length) await ThreatTimeline.insertMany(timelineDocs, { ordered: false });
    return;
  }

  logDocs.forEach((doc) => pushLimited(memoryStore.logs, { ...doc, createdAt: new Date() }, 12000));
  alertDocs.forEach((doc) => pushLimited(memoryStore.alerts, { ...doc, status: "NEW", createdAt: new Date() }));
  riskHistoryDocs.forEach((doc) => pushLimited(memoryStore.riskHistory, { ...doc, createdAt: new Date() }));
  mlPredictionDocs.forEach((doc) => pushLimited(memoryStore.mlPredictions, { ...doc, createdAt: new Date() }));
  timelineDocs.forEach((doc) => pushLimited(memoryStore.timeline, { ...doc, createdAt: new Date() }));
}

const predictRisk = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : req.body.records || [req.body];
  const normalized = rows.map(normalizeActivity);
  const config = await getRiskConfig();
  const mlResults = await predictWithML(normalized.map((row) => row.raw));
  const results = normalized.map((row, index) => calculateRisk(row, config, mlResults[index] || {}));

  await persistResults(results);
  const highPriority = results.filter((result) => ["HIGH", "CRITICAL"].includes(result.riskLevel));
  if (highPriority.length) {
    emitRealtime("alerts:created", {
      count: highPriority.length,
      highestRisk: highPriority.sort((a, b) => b.riskScore - a.riskScore)[0],
      timestamp: new Date(),
    });
  }
  await recordAuditEvent({
    actor: req.user,
    action: "RISK_ANALYSIS_COMPLETED",
    resourceType: "PredictionBatch",
    severity: highPriority.length ? "HIGH" : "INFO",
    metadata: { records: rows.length, highPriority: highPriority.length },
  });

  res.json(results.map(toFrontendResult));
});

module.exports = { predictRisk };
