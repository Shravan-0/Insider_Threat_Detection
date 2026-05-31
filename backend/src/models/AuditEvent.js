const mongoose = require("mongoose");

const auditEventSchema = new mongoose.Schema(
  {
    actorId: { type: String },
    actorName: { type: String },
    actorRole: { type: String },
    action: { type: String, required: true, index: true },
    resourceType: { type: String },
    resourceId: { type: String },
    severity: { type: String, enum: ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "INFO" },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const AuditEvent = mongoose.model("AuditEvent", auditEventSchema);

module.exports = { AuditEvent };
