const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { env } = require("./config/env");
const { authRoutes } = require("./routes/authRoutes");
const { configRoutes } = require("./routes/configRoutes");
const { predictionRoutes } = require("./routes/predictionRoutes");
const { logRoutes } = require("./routes/logRoutes");
const { alertRoutes } = require("./routes/alertRoutes");
const { employeeRoutes } = require("./routes/employeeRoutes");
const { dashboardRoutes } = require("./routes/dashboardRoutes");
const { mlRoutes } = require("./routes/mlRoutes");
const { intelligenceRoutes } = require("./routes/intelligenceRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { loginLimiter } = require("./middleware/loginLimiter");
const { login, loginValidation } = require("./controllers/authController");
const { validateRequest } = require("./middleware/validateRequest");
const { getDashboardStats } = require("./controllers/dashboardController");
const { protect, requireRoles } = require("./middleware/authMiddleware");
const { sanitizeBody } = require("./middleware/sanitizeMiddleware");

const app = express();

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  cors({
    origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(sanitizeBody);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "In_Threat API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/config", configRoutes);
app.use("/api/predict-risk", predictionRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/intelligence", intelligenceRoutes);

// Compatibility routes for the current frontend and project brief.
app.post("/login", loginLimiter, loginValidation, validateRequest, login);
app.use("/config", configRoutes);
app.use("/predict-risk", predictionRoutes);
app.use("/predict-batch", predictionRoutes);
app.use("/logs", logRoutes);
app.use("/alerts", alertRoutes);
app.use("/employees", employeeRoutes);
app.get("/dashboard-stats", protect, requireRoles("manager", "admin"), getDashboardStats);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
