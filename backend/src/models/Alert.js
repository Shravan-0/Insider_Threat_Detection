const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, default: "Unknown Employee" },
    riskScore: { type: Number, required: true },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], required: true },
    reasons: [{ type: String }],
    status: {
      type: String,
      enum: ["NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"],
      default: "NEW",
    },
    indicators: [{ type: String }],
    anomalyConfidence: { type: Number, default: 0 },
    primaryReason: { type: String },
    source: { type: String, enum: ["rules", "ml", "hybrid"], default: "hybrid" },
  },
  { timestamps: true }
);

const Alert = mongoose.model("Alert", alertSchema);

module.exports = { Alert };
