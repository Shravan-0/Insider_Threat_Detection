/**
 * Seeds realistic enterprise SOC data for In_Threat production demos.
 * Targets: 350 employees, 10,000+ logs, 100–300 incidents.
 *
 * Usage: npm run seed:enterprise [-- --force]
 */
const fs = require("fs");
const path = require("path");
const { connectDB, hasDatabase } = require("../config/db");
const { User } = require("../models/User");
const { ActivityLog } = require("../models/ActivityLog");
const { Alert } = require("../models/Alert");
const { ThreatTimeline } = require("../models/ThreatTimeline");
const { RiskHistory } = require("../models/RiskHistory");
const { MlPrediction } = require("../models/MlPrediction");
const { Config } = require("../models/Config");
const { rootDir } = require("../config/env");

const DEPARTMENTS = [
  "Engineering",
  "Finance",
  "Human Resources",
  "Legal",
  "Sales",
  "Marketing",
  "Information Technology",
  "Security Operations",
  "Customer Success",
  "Operations",
];

const FIRST_NAMES = [
  "Ava", "Noah", "Mia", "Ethan", "Sophia", "Liam", "Olivia", "James", "Emma", "Lucas",
  "Amelia", "Mason", "Harper", "Logan", "Evelyn", "Arjun", "Priya", "Raj", "Ananya", "Dev",
  "Sarah", "Michael", "Jennifer", "David", "Emily", "Daniel", "Jessica", "Matthew", "Ashley", "Andrew",
];

const LAST_NAMES = [
  "Chen", "Patel", "Nguyen", "Garcia", "Kim", "Singh", "Brown", "Wilson", "Martinez", "Lee",
  "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "White", "Harris", "Clark", "Lewis", "Walker",
  "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker", "Adams", "Nelson",
];

const REASONS = {
  HIGH: [
    "Unusual file transfer spike",
    "Foreign access combined with USB activity",
    "Late night abnormal login",
    "Suspicious email behavior",
    "ML anomaly pattern detected",
  ],
  MEDIUM: ["Elevated file access volume", "Moderate email activity spike", "After-hours login observed"],
  LOW: ["Behavior is within expected baseline"],
};

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

function buildEmployees(count, random) {
  const employees = [];
  for (let i = 0; i < count; i += 1) {
    const first = pick(random, FIRST_NAMES);
    const last = pick(random, LAST_NAMES);
    employees.push({
      employeeId: `EMP-${String(i + 1).padStart(4, "0")}`,
      employeeName: `${first} ${last}`,
      department: pick(random, DEPARTMENTS),
      riskProfile: random() < 0.02 ? "CRITICAL" : random() < 0.1 ? "HIGH" : random() < 0.3 ? "MEDIUM" : "LOW",
    });
  }
  return employees;
}

function generateActivity(employee, random, hourBias = null) {
  const profile = employee.riskProfile;
  const loginHour =
    hourBias ??
    (profile === "HIGH" || profile === "CRITICAL"
      ? pick(random, [0, 1, 2, 3, 22, 23])
      : Math.floor(random() * 24));

  const filesAccessed =
    profile === "CRITICAL"
      ? 320 + Math.floor(random() * 180)
      : profile === "HIGH"
      ? 250 + Math.floor(random() * 120)
      : profile === "MEDIUM"
      ? 120 + Math.floor(random() * 80)
      : 10 + Math.floor(random() * 90);

  const emailsSent =
    profile === "CRITICAL" || profile === "HIGH"
      ? 40 + Math.floor(random() * 60)
      : profile === "MEDIUM"
      ? 15 + Math.floor(random() * 25)
      : Math.floor(random() * 12);

  const isAfterHours = loginHour >= 22 || loginHour <= 6 ? 1 : 0;
  const isForeign = profile === "HIGH" || profile === "CRITICAL" ? (random() < 0.45 ? 1 : 0) : random() < 0.05 ? 1 : 0;
  const usbUsage = profile === "CRITICAL" ? 1 : profile === "HIGH" ? (random() < 0.5 ? 1 : 0) : random() < 0.08 ? 1 : 0;

  return {
    loginHour,
    fileAccessCount: filesAccessed,
    usbUsage,
    emailCount: emailsSent,
    location: isForeign ? "foreign" : "local",
    failedLogins: profile === "HIGH" && random() < 0.2 ? 1 + Math.floor(random() * 3) : 0,
    isAfterHours,
    isForeign,
    highFileAccess: filesAccessed > 300 ? 1 : 0,
    highEmailActivity: emailsSent > 80 ? 1 : 0,
  };
}

function scoreActivity(activity, random) {
  let score = 0;
  if (activity.isAfterHours) score += 18;
  if (activity.highFileAccess) score += 22;
  else if (activity.fileAccessCount > 180) score += 12;
  if (activity.usbUsage) score += 18;
  if (activity.highEmailActivity) score += 20;
  else if (activity.emailCount > 20) score += 10;
  if (activity.isForeign) score += 18;
  if (activity.failedLogins) score += Math.min(12, activity.failedLogins * 4);
  score = Math.max(0, Math.min(100, score));

  const riskLevel = score >= 90 ? "CRITICAL" : score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  const reasons = REASONS[riskLevel === "CRITICAL" ? "HIGH" : riskLevel] || REASONS.LOW;

  return {
    riskScore: score,
    riskLevel,
    reasons: [pick(random, reasons)],
    mlAnomaly: score >= 70,
    mlScore: Number((0.02 - score / 5000).toFixed(4)),
    anomalyConfidence: Math.max(40, Math.min(98, score + Math.floor(random() * 8))),
  };
}

function randomTimestamp(random, daysBack = 30) {
  const now = Date.now();
  const offset = Math.floor(random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

async function ensureUsers() {
  const users = [
    { name: "Priya Manager", email: "manager@inthreat.local", password: "Password123", role: "manager", department: "Security Operations", employeeId: "MGR-0001" },
    { name: "Arjun Analyst", email: "admin@inthreat.local", password: "Password123", role: "admin", department: "Threat Intelligence", employeeId: "ADM-0001" },
    { name: "Client Demo", email: "client@inthreat.local", password: "Password123", role: "client", department: "Engineering", employeeId: "EMP-0001" },
  ];

  for (const user of users) {
    const existing = await User.findOne({ email: user.email });
    if (!existing) await User.create(user);
  }
}

function writeDashboardCsv(employees, random) {
  const header =
    "employee_id,employee_name,department,login_hour,files_accessed,usb_usage,emails_sent,is_after_hours,is_foreign,high_file_access,high_email_activity";
  const rows = employees.map((employee) => {
    const activity = generateActivity(employee, random);
    return [
      employee.employeeId,
      `"${employee.employeeName}"`,
      `"${employee.department}"`,
      activity.loginHour,
      activity.fileAccessCount,
      activity.usbUsage,
      activity.emailCount,
      activity.isAfterHours,
      activity.isForeign,
      activity.highFileAccess,
      activity.highEmailActivity,
    ].join(",");
  });

  const csvPath = path.join(rootDir, "frontend", "public", "data.csv");
  fs.writeFileSync(csvPath, [header, ...rows].join("\n"), "utf8");
  console.log(`Wrote dashboard CSV: ${csvPath} (${employees.length} employees)`);
}

async function seedEnterprise(force = false) {
  const random = mulberry32(20260530);
  const employees = buildEmployees(350, random);

  if (force) {
    await Promise.all([
      ActivityLog.deleteMany({}),
      Alert.deleteMany({}),
      ThreatTimeline.deleteMany({}),
      RiskHistory.deleteMany({}),
      MlPrediction.deleteMany({}),
    ]);
    console.log("Cleared existing SOC collections.");
  } else {
    const existingLogs = await ActivityLog.countDocuments();
    if (existingLogs >= 10000) {
      console.log(`Enterprise data already present (${existingLogs} logs). Use --force to reseed.`);
      writeDashboardCsv(employees, random);
      return;
    }
  }

  const logs = [];
  const alerts = [];
  const timeline = [];
  const riskHistory = [];
  const mlPredictions = [];
  const alertCandidates = [];

  for (let i = 0; i < 10200; i += 1) {
    const employee = employees[i % employees.length];
    const activity = generateActivity(employee, random);
    const scored = scoreActivity(activity, random);
    const createdAt = randomTimestamp(random, 30);

    logs.push({
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      loginHour: activity.loginHour,
      fileAccessCount: activity.fileAccessCount,
      usbUsage: activity.usbUsage,
      emailCount: activity.emailCount,
      location: activity.location,
      failedLogins: activity.failedLogins,
      riskScore: scored.riskScore,
      riskLevel: scored.riskLevel,
      reasons: scored.reasons,
      mlAnomaly: scored.mlAnomaly,
      mlScore: scored.mlScore,
      severity: scored.riskLevel,
      activityType: "behavior_scan",
      createdAt,
      raw: {
        employee_id: employee.employeeId,
        department: employee.department,
        login_hour: activity.loginHour,
        files_accessed: activity.fileAccessCount,
        usb_usage: activity.usbUsage,
        emails_sent: activity.emailCount,
        is_after_hours: activity.isAfterHours,
        is_foreign: activity.isForeign,
        high_file_access: activity.highFileAccess,
        high_email_activity: activity.highEmailActivity,
      },
    });

    if (i % 12 === 0) {
      riskHistory.push({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        riskScore: scored.riskScore,
        riskLevel: scored.riskLevel,
        anomalyConfidence: scored.anomalyConfidence,
        indicators: scored.reasons,
        reasons: scored.reasons,
        createdAt,
      });
    }

    if (i % 25 === 0) {
      mlPredictions.push({
        employeeId: employee.employeeId,
        isolationAnomaly: scored.mlAnomaly,
        anomalyScore: scored.mlScore,
        anomalyConfidence: scored.anomalyConfidence,
        randomForestClass: scored.riskLevel === "HIGH" || scored.riskLevel === "CRITICAL" ? "HIGH" : "LOW",
        randomForestConfidence: scored.riskScore / 100,
        explanation: `Risk increased due to: ${scored.reasons.join(", ")}`,
        features: logs[logs.length - 1].raw,
        createdAt,
      });
    }

    if (scored.riskScore >= 52) {
      alertCandidates.push({
        employee,
        scored,
        activity,
        createdAt,
      });
    }

    if (i % 40 === 0) {
      timeline.push({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        eventType: scored.mlAnomaly ? "ML_DETECTION" : "LOG",
        severity: scored.riskLevel,
        riskScore: scored.riskScore,
        title: scored.mlAnomaly ? "ML anomaly detected" : "Behavior analysis completed",
        description: scored.reasons.join(", "),
        metadata: { indicators: scored.reasons },
        createdAt,
      });
    }
  }

  const perEmployeeIncidents = new Map();

  alertCandidates
    .sort((a, b) => b.scored.riskScore - a.scored.riskScore)
    .forEach(({ employee, scored, createdAt }) => {
      if (alerts.length >= 220) return;
      const existing = perEmployeeIncidents.get(employee.employeeId) || 0;
      if (existing >= 3) return;
      perEmployeeIncidents.set(employee.employeeId, existing + 1);

      const severity =
        scored.riskScore >= 95 ? "CRITICAL" : scored.riskScore >= 75 ? "HIGH" : scored.riskScore >= 58 ? "MEDIUM" : "LOW";
      alerts.push({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        riskScore: scored.riskScore,
        severity,
        reasons: scored.reasons,
        indicators: scored.reasons,
        anomalyConfidence: scored.anomalyConfidence,
        primaryReason: scored.reasons[0],
        source: scored.mlAnomaly ? "hybrid" : "rules",
        status: pick(random, ["NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"]),
        createdAt,
      });
      timeline.push({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        eventType: "INCIDENT",
        severity,
        riskScore: scored.riskScore,
        title: scored.reasons[0],
        description: scored.reasons.join(", "),
        metadata: { indicators: scored.reasons },
        createdAt,
      });
    });

  const batchInsert = async (Model, docs, label) => {
    const chunkSize = 1000;
    for (let i = 0; i < docs.length; i += chunkSize) {
      await Model.insertMany(docs.slice(i, i + chunkSize), { ordered: false });
    }
    console.log(`Inserted ${docs.length} ${label}`);
  };

  await batchInsert(ActivityLog, logs, "activity logs");
  await batchInsert(Alert, alerts, "incidents");
  await batchInsert(ThreatTimeline, timeline, "timeline events");
  await batchInsert(RiskHistory, riskHistory, "risk history records");
  await batchInsert(MlPrediction, mlPredictions, "ML predictions");

  writeDashboardCsv(employees, random);

  console.log("\nEnterprise seed summary:");
  console.log(`  Employees: ${employees.length}`);
  console.log(`  Logs: ${logs.length}`);
  console.log(`  Incidents: ${alerts.length}`);
  console.log(`  Timeline events: ${timeline.length}`);
}

async function main() {
  const force = process.argv.includes("--force");
  await connectDB();

  if (!hasDatabase()) {
    console.error("MongoDB is not connected. Start MongoDB before running enterprise seed.");
    process.exit(1);
  }

  await Config.findOneAndUpdate({ key: "risk" }, { $setOnInsert: { key: "risk" } }, { upsert: true });
  await ensureUsers();
  await seedEnterprise(force);
  console.log("Enterprise seed complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
