const mongoose = require("mongoose");

const defaultRiskConfig = {
  fileHigh: 300,
  fileMedium: 120,
  emailHigh: 80,
  emailMedium: 35,
  oddLoginStart: 22,
  oddLoginEnd: 6,
  usbWeight: 20,
  fileWeight: 20,
  emailWeight: 20,
  afterHoursWeight: 20,
  foreignWeight: 20,
  failedLoginWeight: 15,
  mlWeight: 25,
  mlSensitivity: 0.5,
  mediumRiskCutoff: 40,
  highRiskCutoff: 70,
};

const configSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "risk" },
    ...Object.fromEntries(
      Object.keys(defaultRiskConfig).map((key) => [key, { type: Number, default: defaultRiskConfig[key] }])
    ),
  },
  { timestamps: true }
);

const Config = mongoose.model("Config", configSchema);

module.exports = { Config, defaultRiskConfig };
