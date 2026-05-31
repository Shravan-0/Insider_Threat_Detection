const { hasDatabase } = require("../config/db");
const { Config, defaultRiskConfig } = require("../models/Config");
const { memoryStore } = require("./memoryStore");
const { AppError } = require("../utils/AppError");

const riskWeightFields = ["afterHoursWeight", "foreignWeight", "usbWeight", "fileWeight", "emailWeight"];
const allowedConfigFields = new Set([
  "fileHigh",
  "fileMedium",
  "emailHigh",
  "emailMedium",
  "oddLoginStart",
  "oddLoginEnd",
  "usbWeight",
  "fileWeight",
  "emailWeight",
  "afterHoursWeight",
  "foreignWeight",
  "failedLoginWeight",
  "mlWeight",
  "mlSensitivity",
  "mediumRiskCutoff",
  "highRiskCutoff",
]);

function toClientConfig(config) {
  const merged = { ...defaultRiskConfig, ...(config || {}) };
  return {
    fileHigh: merged.fileHigh,
    fileMedium: merged.fileMedium,
    emailHigh: merged.emailHigh,
    emailMedium: merged.emailMedium,
    oddLoginStart: merged.oddLoginStart,
    oddLoginEnd: merged.oddLoginEnd,
    usbWeight: merged.usbWeight,
    fileWeight: merged.fileWeight,
    emailWeight: merged.emailWeight,
    afterHoursWeight: merged.afterHoursWeight,
    foreignWeight: merged.foreignWeight,
    failedLoginWeight: merged.failedLoginWeight,
    mlWeight: merged.mlWeight,
    mlSensitivity: merged.mlSensitivity,
    mediumRiskCutoff: merged.mediumRiskCutoff,
    highRiskCutoff: merged.highRiskCutoff,
    file_threshold: merged.fileHigh,
    file_high: merged.fileHigh,
    file_medium: merged.fileMedium,
    email_threshold: merged.emailHigh,
    email_high: merged.emailHigh,
    email_medium: merged.emailMedium,
    odd_login_start: merged.oddLoginStart,
    odd_login_end: merged.oddLoginEnd,
    usb_weight: merged.usbWeight,
    file_weight: merged.fileWeight,
    email_weight: merged.emailWeight,
    after_hours_weight: merged.afterHoursWeight,
    foreign_weight: merged.foreignWeight,
    failed_login_weight: merged.failedLoginWeight,
    ml_weight: merged.mlWeight,
    ml_sensitivity: merged.mlSensitivity,
    medium_risk_cutoff: merged.mediumRiskCutoff,
    high_risk_cutoff: merged.highRiskCutoff,
  };
}

function fromClientConfig(payload) {
  const acc = {};
  if (!payload) return acc;

  const resolveField = (target, ...sourceKeys) => {
    for (const k of sourceKeys) {
      if (payload[k] !== undefined && payload[k] !== null && payload[k] !== "") {
        const num = Number(payload[k]);
        if (!Number.isFinite(num)) {
          throw new AppError(`Invalid numeric value for ${k}`, 400);
        }
        acc[target] = num;
        return;
      }
    }
  };

  resolveField("fileHigh", "fileHigh", "file_threshold", "file_high");
  resolveField("fileMedium", "fileMedium", "file_medium");
  resolveField("emailHigh", "emailHigh", "email_threshold", "email_high");
  resolveField("emailMedium", "emailMedium", "email_medium");
  resolveField("oddLoginStart", "oddLoginStart", "odd_login_start");
  resolveField("oddLoginEnd", "oddLoginEnd", "odd_login_end");
  resolveField("usbWeight", "usbWeight", "usb_weight");
  resolveField("fileWeight", "fileWeight", "file_weight");
  resolveField("emailWeight", "emailWeight", "email_weight");
  resolveField("afterHoursWeight", "afterHoursWeight", "after_hours_weight");
  resolveField("foreignWeight", "foreignWeight", "foreign_weight");
  resolveField("failedLoginWeight", "failedLoginWeight", "failed_login_weight");
  resolveField("mlWeight", "mlWeight", "ml_weight");
  resolveField("mlSensitivity", "mlSensitivity", "ml_sensitivity");
  resolveField("mediumRiskCutoff", "mediumRiskCutoff", "medium_risk_cutoff");
  resolveField("highRiskCutoff", "highRiskCutoff", "high_risk_cutoff");

  return acc;
}

function sanitizeUpdateData(payload) {
  const mapped = fromClientConfig(payload);
  return Object.entries(mapped).reduce((acc, [key, value]) => {
    if (allowedConfigFields.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function assertValidRiskWeights(config) {
  const total = riskWeightFields.reduce((sum, field) => sum + Number(config[field] || 0), 0);
  if (total !== 100) {
    throw new AppError("Risk weights must total exactly 100%", 400);
  }
}

async function getRiskConfig() {
  if (hasDatabase()) {
    let config = await Config.findOne({ key: "risk" }).lean();
    if (!config) {
      config = await Config.create({ key: "risk", ...defaultRiskConfig });
      return config.toObject();
    }
    return { ...defaultRiskConfig, ...config };
  }

  if (!memoryStore.config) {
    memoryStore.config = { key: "risk", ...defaultRiskConfig };
  }
  return { ...defaultRiskConfig, ...memoryStore.config };
}

async function updateRiskConfig(payload) {
  console.log("RAW PAYLOAD", payload);
  const updates = sanitizeUpdateData(payload);
  console.log("SANITIZED", updates);
  const current = await getRiskConfig();
  const nextConfig = { ...defaultRiskConfig, ...current, ...updates };

  assertValidRiskWeights(nextConfig);

  console.log("MONGO UPDATE", updates);
  if (hasDatabase()) {
    const savedConfig = await Config.findOneAndUpdate(
      { key: "risk" },
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    ).lean();
    console.log("MONGO RESULT", savedConfig);
    return savedConfig;
  }

  memoryStore.config = nextConfig;
  console.log("MONGO RESULT", memoryStore.config);
  return memoryStore.config;
}

module.exports = { getRiskConfig, updateRiskConfig, toClientConfig, fromClientConfig, sanitizeUpdateData, assertValidRiskWeights };
