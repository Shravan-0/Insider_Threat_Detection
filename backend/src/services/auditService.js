const { AuditEvent } = require("../models/AuditEvent");
const { hasDatabase } = require("../config/db");
const { memoryStore, pushLimited } = require("./memoryStore");
const { emitRealtime } = require("./realtimeService");

async function recordAuditEvent({ actor, action, resourceType, resourceId, severity = "INFO", previousValue, newValue, metadata }) {
  const event = {
    actorId: actor?.id || actor?._id,
    actorName: actor?.name || "System",
    actorRole: actor?.role || "system",
    action,
    resourceType,
    resourceId,
    severity,
    previousValue,
    newValue,
    metadata,
    createdAt: new Date(),
  };

  let saved = event;
  if (hasDatabase()) {
    saved = (await AuditEvent.create(event)).toObject();
  } else {
    pushLimited(memoryStore.auditEvents, event);
  }

  emitRealtime("soc:event", saved);
  return saved;
}

module.exports = { recordAuditEvent };
