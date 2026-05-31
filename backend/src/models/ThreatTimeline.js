const mongoose = require("mongoose");

const threatTimelineSchema = new mongoose.Schema(
  {
    employeeId: { type: String, index: true },
    employeeName: { type: String },
    eventType: {
      type: String,
      enum: ["LOG", "INCIDENT", "ALERT", "ML_DETECTION", "CONFIG_CHANGE"],
      required: true,
    },
    severity: { type: String, enum: ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "INFO" },
    riskScore: { type: Number, default: 0 },
    title: { type: String, required: true },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const ThreatTimeline = mongoose.model("ThreatTimeline", threatTimelineSchema);

module.exports = { ThreatTimeline };
