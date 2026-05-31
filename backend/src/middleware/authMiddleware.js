const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { hasDatabase } = require("../config/db");
const { User } = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new AppError("Authentication token required", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Token expired", 401);
    }
    if (error.name === "JsonWebTokenError") {
      throw new AppError("Invalid token", 401);
    }
    throw error;
  }
  if (!hasDatabase() || decoded.demo) {
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      department: decoded.department,
      employeeId: decoded.employeeId,
    };
    return next();
  }

  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    throw new AppError("User no longer exists", 401);
  }

  req.user = user;
  next();
});

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Access Denied", 403));
    }
    next();
  };
}

module.exports = { protect, requireRoles };
