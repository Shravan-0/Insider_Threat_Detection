const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const rootDir = path.resolve(__dirname, "../../..");

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/in_threat",
  jwtSecret: process.env.JWT_SECRET || "change-this-secret-before-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  pythonBin:
    process.env.PYTHON_BIN ||
    path.join(rootDir, "venv", "Scripts", "python.exe"),
  mlPredictPath:
    process.env.ML_PREDICT_PATH ||
    path.join(rootDir, "ml", "predict.py"),
};

module.exports = { env, rootDir };
