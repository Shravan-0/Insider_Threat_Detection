const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const { env } = require("../config/env");
const { hasDatabase } = require("../config/db");
const { User } = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const { findDemoUser } = require("../services/demoAuthService");

function signToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      employeeId: user.employeeId,
      demo: Boolean(user.id && String(user.id).startsWith("demo-")),
    },
    env.jwtSecret,
    {
    expiresIn: env.jwtExpiresIn,
    }
  );
}

function sendAuthResponse(res, user, statusCode = 200) {
  const token = signToken(user);
  res.status(statusCode).json({
    token,
    user: {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      employeeId: user.employeeId,
    },
  });
}

const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const createUserValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").isIn(["client", "manager", "admin"]).withMessage("Invalid role"),
];

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const demoUser = findDemoUser(email, password);

  if (!hasDatabase()) {
    if (!demoUser) {
      throw new AppError("Invalid demo credentials. Start MongoDB for real users or use seeded demo accounts.", 401);
    }
    return sendAuthResponse(res, demoUser);
  }

  const user = await User.findOne({ email }).select("+password");
  if (user && user.isActive === false) {
    throw new AppError("Account is deactivated", 403);
  }

  if (!user || !(await user.comparePassword(password))) {
    if (demoUser) {
      return sendAuthResponse(res, demoUser);
    }
    throw new AppError("Invalid email or password", 401);
  }

  sendAuthResponse(res, user);
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const createUser = asyncHandler(async (req, res) => {
  if (!hasDatabase()) throw new AppError("MongoDB is required to create users", 503);

  const { name, email, password, role, department, employeeId } = req.body;
  const existing = await User.findOne({ email });
  if (existing) throw new AppError("Email is already registered", 409);

  const user = await User.create({ name, email, password, role, department, employeeId });
  res.status(201).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      department: user.department,
      employeeId: user.employeeId,
    },
  });
});

const listUsers = asyncHandler(async (req, res) => {
  if (!hasDatabase()) {
    return res.json({ users: [] });
  }

  const users = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();
  res.json({ users });
});

const resetPassword = asyncHandler(async (req, res) => {
  if (!hasDatabase()) throw new AppError("MongoDB is required to reset passwords", 503);

  const { password } = req.body;
  if (!password || password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const user = await User.findById(req.params.id).select("+password");
  if (!user) throw new AppError("User not found", 404);

  user.password = password;
  await user.save();
  res.json({ message: "Password reset successfully" });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  if (!hasDatabase()) throw new AppError("MongoDB is required to update users", 503);

  if (String(req.user._id || req.user.id) === String(req.params.id) && req.body.isActive === false) {
    throw new AppError("Admins cannot deactivate their own account", 400);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: Boolean(req.body.isActive) },
    { returnDocument: "after", runValidators: true }
  ).select("-password");

  if (!user) throw new AppError("User not found", 404);
  res.json({ user });
});

module.exports = {
  login,
  me,
  createUser,
  listUsers,
  resetPassword,
  updateUserStatus,
  loginValidation,
  createUserValidation,
};
