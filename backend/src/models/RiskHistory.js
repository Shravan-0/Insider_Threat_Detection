const mongoose = require("mongoose");

const riskHistorySchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, default: "Unknown Employee" },
    riskScore: { type: Number, required: true },
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], required: true },
    anomalyConfidence: { type: Number, default: 0 },
    indicators: [{ type: String }],
    reasons: [{ type: String }],
  },
  { timestamps: true }
);

const RiskHistory = mongoose.model("RiskHistory", riskHistorySchema);

module.exports = { RiskHistory };
