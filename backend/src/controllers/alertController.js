const { Alert } = require("../models/Alert");
const { IncidentNote } = require("../models/IncidentNote");
const { hasDatabase } = require("../config/db");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const { memoryStore, pushLimited } = require("../services/memoryStore");
const { recordAuditEvent } = require("../services/auditService");
const { emitRealtime } = require("../services/realtimeService");

function findMemoryAlert(id) {
  return memoryStore.alerts.find((alert) => String(alert._id) === String(id) || String(alert.id) === String(id));
}

const getAlerts = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const alerts = hasDatabase()
    ? await Alert.aggregate([
        {
          $addFields: {
            severityRank: {
              $switch: {
                branches: [
                  { case: { $eq: ["$severity", "CRITICAL"] }, then: 4 },
                  { case: { $eq: ["$severity", "HIGH"] }, then: 3 },
                  { case: { $eq: ["$severity", "MEDIUM"] }, then: 2 },
                  { case: { $eq: ["$severity", "LOW"] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
        },
        { $sort: { severityRank: -1, riskScore: -1, createdAt: -1 } },
        { $limit: limit },
      ])
    : memoryStore.alerts
        .slice()
        .sort((a, b) => {
          const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (
            (rank[b.severity] || 0) - (rank[a.severity] || 0) ||
            Number(b.riskScore || 0) - Number(a.riskScore || 0) ||
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          );
        })
        .slice(0, limit);

  res.json(alerts);
});

const updateAlertStatus = asyncHandler(async (req, res) => {
  const validStatuses = ["NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"];
  if (!validStatuses.includes(req.body.status)) {
    throw new AppError("Invalid incident status", 400);
  }

  if (!hasDatabase()) {
    const alert = findMemoryAlert(req.params.id);
    if (!alert) throw new AppError("Alert not found", 404);

    const previousStatus = alert.status;
    alert.status = req.body.status;
    await recordAuditEvent({
      actor: req.user,
      action: "INCIDENT_STATUS_CHANGED",
      resourceType: "Incident",
      resourceId: req.params.id,
      severity: alert.severity,
      previousValue: { status: previousStatus },
      newValue: { status: alert.status },
    });
    emitRealtime("incident:updated", alert);
    return res.json(alert);
  }

  const previous = await Alert.findById(req.params.id).lean();
  const alert = await Alert.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { returnDocument: "after", runValidators: true }
  );

  if (!alert) throw new AppError("Alert not found", 404);
  await recordAuditEvent({
    actor: req.user,
    action: "INCIDENT_STATUS_CHANGED",
    resourceType: "Incident",
    resourceId: req.params.id,
    severity: alert.severity,
    previousValue: { status: previous?.status },
    newValue: { status: alert.status },
  });
  emitRealtime("incident:updated", alert);
  res.json(alert);
});

const addIncidentNote = asyncHandler(async (req, res) => {
  const noteText = String(req.body.note || "").trim();
  if (!noteText) {
    throw new AppError("Note is required", 400);
  }

  if (!hasDatabase()) {
    const alert = findMemoryAlert(req.params.id);
    if (!alert) throw new AppError("Incident not found", 404);

    const note = pushLimited(
      memoryStore.incidentNotes,
      {
        incidentId: alert._id,
        authorId: req.user.id || req.user._id,
        authorName: req.user.name,
        note: noteText,
        createdAt: new Date(),
      },
      1000
    );

    await recordAuditEvent({
      actor: req.user,
      action: "INCIDENT_NOTE_ADDED",
      resourceType: "Incident",
      resourceId: req.params.id,
      severity: alert.severity,
      newValue: { note: noteText },
    });
    emitRealtime("incident:note", { incidentId: req.params.id, note });
    return res.status(201).json({ note });
  }

  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new AppError("Incident not found", 404);

  const note = await IncidentNote.create({
    incidentId: alert._id,
    authorId: req.user.id || req.user._id,
    authorName: req.user.name,
    note: noteText,
  });

  await recordAuditEvent({
    actor: req.user,
    action: "INCIDENT_NOTE_ADDED",
    resourceType: "Incident",
    resourceId: req.params.id,
    severity: alert.severity,
    newValue: { note: noteText },
  });
  emitRealtime("incident:note", { incidentId: req.params.id, note });

  res.status(201).json({ note });
});

module.exports = { getAlerts, updateAlertStatus, addIncidentNote };
