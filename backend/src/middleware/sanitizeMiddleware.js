function cleanValue(value) {
  if (Array.isArray(value)) return value.map(cleanValue);
  if (!value || typeof value !== "object") return value;

  return Object.entries(value).reduce((acc, [key, nested]) => {
    const safeKey = key.replace(/^\$+/g, "").replace(/\./g, "_");
    acc[safeKey] = cleanValue(nested);
    return acc;
  }, {});
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = cleanValue(req.body);
  }
  next();
}

module.exports = { sanitizeBody };
