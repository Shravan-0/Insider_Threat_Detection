const mongoose = require("mongoose");

const mlPredictionSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    isolationAnomaly: { type: Boolean, default: false },
    anomalyScore: { type: Number, default: 0 },
    anomalyConfidence: { type: Number, default: 0 },
    randomForestClass: { type: String },
    randomForestConfidence: { type: Number },
    explanation: { type: String },
    features: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const MlPrediction = mongoose.model("MlPrediction", mlPredictionSchema);

module.exports = { MlPrediction };
