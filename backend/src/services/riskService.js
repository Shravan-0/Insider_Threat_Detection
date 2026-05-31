function normalizeActivity(row = {}, index = 0) {
  const employeeId = row.employeeId || row.employee_id || row.userId || row.id || `EMP-${String(index + 1).padStart(4, "0")}`;

  return {
    employeeId,
    employeeName: row.employeeName || row.employee_name || row.name || `Employee ${index + 1}`,
    loginHour: Number(row.loginHour ?? row.login_hour ?? 0),
    fileAccessCount: Number(row.fileAccessCount ?? row.files_accessed ?? 0),
    usbUsage: Number(row.usbUsage ?? row.usb_usage ?? 0),
    emailCount: Number(row.emailCount ?? row.emails_sent ?? 0),
    location: row.location || (Number(row.is_foreign ?? row.isForeign ?? 0) === 1 ? "foreign" : "local"),
    failedLogins: Number(row.failedLogins ?? row.failed_logins ?? 0),
    isAfterHours: Number(row.isAfterHours ?? row.is_after_hours ?? 0),
    isForeign: Number(row.isForeign ?? row.is_foreign ?? 0),
    highFileAccess: Number(row.highFileAccess ?? row.high_file_access ?? 0),
    highEmailActivity: Number(row.highEmailActivity ?? row.high_email_activity ?? 0),
    raw: row,
  };
}

function isOddLoginHour(loginHour, config) {
  return loginHour >= config.oddLoginStart || loginHour <= config.oddLoginEnd;
}

function addRisk(reasons, indicators, indicator, reason, points) {
  if (points > 0) {
    indicators.push(indicator);
    reasons.push(reason);
  }
  return points;
}

function calculateRisk(activity, config, mlResult = {}) {
  const reasons = [];
  const indicators = [];
  let risk = 0;

  if (isOddLoginHour(activity.loginHour, config) || activity.isAfterHours === 1) {
    risk += addRisk(reasons, indicators, "ABNORMAL_LOGIN_TIME", "Late night abnormal login", config.afterHoursWeight);
  }

  if (activity.fileAccessCount > config.fileHigh || activity.highFileAccess === 1) {
    risk += addRisk(reasons, indicators, "FILE_ACTIVITY_SPIKE", "Unusual file transfer spike", config.fileWeight);
  } else if (activity.fileAccessCount > config.fileMedium) {
    risk += addRisk(reasons, indicators, "ELEVATED_FILE_ACTIVITY", "Elevated file access volume", Math.round(config.fileWeight * 0.55));
  }

  if (activity.usbUsage > 0) {
    risk += addRisk(reasons, indicators, "USB_ACTIVITY", "High USB activity detected", config.usbWeight);
  }

  if (activity.emailCount > config.emailHigh || activity.highEmailActivity === 1) {
    risk += addRisk(reasons, indicators, "EMAIL_ACTIVITY_SPIKE", "Suspicious email behavior", config.emailWeight);
  } else if (activity.emailCount > config.emailMedium) {
    risk += addRisk(reasons, indicators, "ELEVATED_EMAIL_ACTIVITY", "Moderate email activity spike", Math.round(config.emailWeight * 0.5));
  }

  if (activity.location.toLowerCase() === "foreign" || activity.isForeign === 1) {
    risk += addRisk(reasons, indicators, "LOCATION_ANOMALY", "Location anomaly detected", config.foreignWeight);
  }

  if (activity.failedLogins > 0) {
    const failedLoginRisk = Math.min(config.failedLoginWeight, activity.failedLogins * 3);
    risk += addRisk(reasons, indicators, "FAILED_LOGINS", "Failed login attempts observed", failedLoginRisk);
  }

  const mlAnomaly = mlResult.anomaly === -1;
  const mlRisk = Number(mlResult.normalizedAnomalyRisk || 0);
  if (mlAnomaly || mlRisk >= config.mlSensitivity * 100) {
    risk += addRisk(reasons, indicators, "ML_ANOMALY", "ML anomaly pattern detected", Math.round((config.mlWeight * Math.max(mlRisk, 50)) / 100));
  }

  const rfClass = String(mlResult.randomForestClass || "").toUpperCase();
  if (["HIGH", "CRITICAL", "1"].includes(rfClass)) {
    const rfBoost = rfClass === "CRITICAL" ? 12 : 8;
    risk += addRisk(reasons, indicators, "RF_THREAT_CLASSIFICATION", "Random Forest classified elevated threat likelihood", rfBoost);
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(risk)));
  const riskLevel = riskScore >= 90 ? "CRITICAL" : riskScore >= config.highRiskCutoff ? "HIGH" : riskScore >= config.mediumRiskCutoff ? "MEDIUM" : "LOW";
  const anomalyConfidence = Math.max(
    0,
    Math.min(100, Math.round(Math.max(mlRisk, Number(mlResult.randomForestConfidence || 0) * 100, riskScore * 0.75)))
  );

  if (reasons.length === 0) {
    reasons.push("Behavior is within expected baseline");
  }

  const explanation = `Risk increased due to: ${reasons.slice(0, 3).join(", ")}`;

  return {
    ...activity,
    riskScore,
    riskLevel,
    anomalyConfidence,
    reasons,
    indicators,
    explanation,
    mlAnomaly,
    mlAnomalyDetected: mlAnomaly,
    mlScore: Number(mlResult.anomalyScore || 0),
    randomForestClass: mlResult.randomForestClass,
    randomForestConfidence: mlResult.randomForestConfidence,
    mlAvailable: mlResult.mlAvailable !== false,
    severity: riskLevel,
  };
}

module.exports = { normalizeActivity, calculateRisk };
