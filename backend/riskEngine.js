
const { getConfig } = require("./config");

function calculateRisk(user) {
  const config = getConfig();

  let risk = 0;
  let reasons = [];

  const login_hour = Number(user.login_hour);
  const files = Number(user.files_accessed);
  const usb = Number(user.usb_usage);
  const emails = Number(user.emails_sent);

  // 🔍 Login time
  if (login_hour < config.odd_login_end || login_hour > config.odd_login_start) {
    risk += 2;
    reasons.push(`Unusual login time (${login_hour}h)`);
  }

  // 📁 File access
  if (files > config.file_high) {
    risk += 3;
    reasons.push(`Very high file access (${files} files)`);
  } else if (files > config.file_medium) {
    risk += 2;
    reasons.push(`High file access (${files} files)`);
  }

  // 🔌 USB
  if (usb === 1) {
    risk += config.usb_weight;
    reasons.push("USB device used");
  }

  // 📧 Emails
  if (emails > config.email_high) {
    risk += 2;
    reasons.push(`Too many emails (${emails})`);
  } else if (emails > config.email_medium) {
    risk += 1;
    reasons.push(`Moderate email activity (${emails})`);
  }

  let level = "LOW";
  if (risk >= 8) level = "HIGH";
  else if (risk >= 4) level = "MEDIUM";

  return { risk, level, reasons };
}

module.exports = { calculateRisk };