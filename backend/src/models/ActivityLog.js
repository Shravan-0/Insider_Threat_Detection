const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, default: "Unknown Employee" },
    loginHour: { type: Number, required: true },
    fileAccessCount: { type: Number, default: 0 },
    usbUsage: { type: Number, default: 0 },
    emailCount: { type: Number, default: 0 },
    location: { type: String, default: "local" },
    failedLogins: { type: Number, default: 0 },
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "LOW" },
    reasons: [{ type: String }],
    mlAnomaly: { type: Boolean, default: false },
    mlScore: { type: Number, default: 0 },
    activityType: { type: String, default: "behavior_scan" },
    severity: { type: String, enum: ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "LOW" },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = { ActivityLog };
