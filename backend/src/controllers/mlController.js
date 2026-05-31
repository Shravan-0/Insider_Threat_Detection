const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const { env, rootDir } = require("../config/env");
const { recordAuditEvent } = require("../services/auditService");
const { emitRealtime } = require("../services/realtimeService");

const modelFiles = [
  {
    key: "isolationForest",
    label: "Isolation Forest",
    path: path.join(rootDir, "models", "isolation_model.pkl"),
    purpose: "Anomaly detection",
  },
  {
    key: "randomForest",
    label: "Random Forest",
    path: path.join(rootDir, "models", "insider_model.pkl"),
    purpose: "Risk classification",
  },
];

function getModelFileStatus(model) {
  if (!fs.existsSync(model.path)) {
    return {
      key: model.key,
      label: model.label,
      purpose: model.purpose,
      available: false,
      path: model.path,
    };
  }

  const stat = fs.statSync(model.path);
  return {
    key: model.key,
    label: model.label,
    purpose: model.purpose,
    available: true,
    path: model.path,
    sizeBytes: stat.size,
    updatedAt: stat.mtime,
  };
}

const getMlStatus = asyncHandler(async (req, res) => {
  res.json({
    pythonBin: env.pythonBin,
    predictScript: env.mlPredictPath,
    models: modelFiles.map(getModelFileStatus),
    features: [
      "login_hour",
      "files_accessed",
      "usb_usage",
      "emails_sent",
      "is_after_hours",
      "is_foreign",
      "high_file_access",
      "high_email_activity",
    ],
  });
});

const retrainModels = asyncHandler(async (req, res) => {
  const trainPath = path.join(rootDir, "models", "train_model.py");
  if (!fs.existsSync(trainPath)) {
    throw new AppError("Training script not found", 404);
  }

  const child = spawn(env.pythonBin, [trainPath], {
    cwd: path.join(rootDir, "models"),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.warn(`ML retrain failed: ${stderr}`);
      emitRealtime("ml:retrain", { status: "failed", stderr, timestamp: new Date() });
      return;
    }
    console.log(`ML retrain complete: ${stdout}`);
    emitRealtime("ml:retrain", { status: "completed", stdout, timestamp: new Date() });
  });

  await recordAuditEvent({
    actor: req.user,
    action: "ML_RETRAIN_STARTED",
    resourceType: "ML",
    severity: "MEDIUM",
    metadata: { script: trainPath },
  });

  res.status(202).json({
    message: "ML retraining started",
    script: trainPath,
  });
});

module.exports = { getMlStatus, retrainModels };
