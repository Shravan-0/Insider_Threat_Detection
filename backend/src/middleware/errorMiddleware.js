function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
}

function errorHandler(error, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : error.statusCode || 500;

  res.status(statusCode).json({
    message: error.message || "Internal server error",
    status: statusCode >= 500 ? "error" : "fail",
  });
}

module.exports = { notFound, errorHandler };
