const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config.json");

const defaultConfig = {
  file_high: 350,
  file_medium: 200,
  email_high: 90,
  email_medium: 70,
  odd_login_start: 22,
  odd_login_end: 6,
  usb_weight: 2
};

function getConfig() {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }

  const raw = fs.readFileSync(configPath);
  return JSON.parse(raw);
}

function updateConfig(newConfig) {
  const current = getConfig();
  const updated = { ...current, ...newConfig };

  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2));
}

module.exports = { getConfig, updateConfig };