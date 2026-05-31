const { asyncHandler } = require("../utils/asyncHandler");
const { getRiskConfig, updateRiskConfig, toClientConfig } = require("../services/configService");
const { recordAuditEvent } = require("../services/auditService");
const { emitRealtime } = require("../services/realtimeService");

const getConfig = asyncHandler(async (req, res) => {
  const config = await getRiskConfig();
  res.json(toClientConfig(config));
});

const updateConfig = asyncHandler(async (req, res) => {
  const previous = await getRiskConfig();
  const config = await updateRiskConfig(req.body);
  const response = {
    message: "Config updated",
    config: toClientConfig(config),
  };

  await recordAuditEvent({
    actor: req.user,
    action: "CONFIG_UPDATED",
    resourceType: "Config",
    resourceId: "risk",
    severity: "MEDIUM",
    previousValue: toClientConfig(previous),
    newValue: response.config,
  });

  emitRealtime("config:updated", response);

  res.json({
    message: "Config updated",
    config: toClientConfig(config),
  });
});

module.exports = { getConfig, updateConfig };
