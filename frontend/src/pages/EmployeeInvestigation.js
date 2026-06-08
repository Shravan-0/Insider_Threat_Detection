import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Grid, TextField, Typography } from "@mui/material";
import { threatApi } from "../services/api";
import RiskTrendChart from "../components/RiskTrendChart";

function EmployeeInvestigation({ employee, incidents = [], onBack, onIncidentUpdated }) {
  const [intel, setIntel] = useState({ riskHistory: [], timeline: [], mlPredictions: [] });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const employeeId = employee?.employeeId || employee?.employee_id || employee?.id;

  useEffect(() => {
    let active = true;
    async function load() {
      if (!employeeId) return;
      try {
        const data = await threatApi.getEmployeeIntelligence(employeeId);
        if (active) setIntel(data);
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Unable to load employee intelligence.");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [employeeId]);

  const employeeIncidents = useMemo(
    () => incidents.filter((incident) => incident.employeeId === employeeId),
    [incidents, employeeId]
  );

  const latestMl = intel.mlPredictions?.[0];
  const riskSeries = (intel.riskHistory || []).slice().reverse().map((item, index) => ({
    name: new Date(item.createdAt || Date.now()).toLocaleTimeString(),
    risk: item.riskScore,
    confidence: item.anomalyConfidence,
    index,
  }));

  const updateStatus = async (incident, status) => {
    try {
      setError("");
      await threatApi.updateIncidentStatus(incident._id || incident.id, status);
      if (onIncidentUpdated) onIncidentUpdated();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update incident status.");
    }
  };

  const addNote = async (incident) => {
    if (!note.trim()) return;
    try {
      setError("");
      await threatApi.addIncidentNote(incident._id || incident.id, note.trim());
      setNote("");
      if (onIncidentUpdated) onIncidentUpdated();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save investigation note.");
    }
  };

  return (
    <Box>
      <Button onClick={onBack} sx={{ color: "#00ADB5", mb: 2 }}>Back to dashboard</Button>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2, height: "100%" }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: "#00ADB5" }}>Employee Risk Profile</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>{employee?.employeeName || employee?.name || employeeId}</Typography>
              <Typography sx={{ color: "#cbd5e1" }}>Department: {employee?.department || "Unknown"}</Typography>
              <Typography variant="h2" sx={{ mt: 3, fontWeight: 900, color: employee?.risk_level === "CRITICAL" || employee?.risk_level === "HIGH" ? "#f87171" : "#4ade80" }}>
                {employee?.risk_score || employee?.riskScore || 0}%
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                <Chip label={employee?.risk_level || employee?.riskLevel || "LOW"} sx={{ backgroundColor: "#00ADB5", color: "white" }} />
                <Chip label={`Confidence ${employee?.anomalyConfidence || latestMl?.anomalyConfidence || 0}%`} variant="outlined" sx={{ color: "#EEEEEE", borderColor: "#64748b" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 8 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Threat Score Evolution</Typography>
              {riskSeries.length > 0 ? (
                <RiskTrendChart data={riskSeries} />
              ) : (
                <Typography sx={{ color: "#cbd5e1" }}>Risk history will appear after analysis events.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>ML Analysis</Typography>
              <Typography sx={{ color: "#cbd5e1" }}>{latestMl?.explanation || employee?.mlExplanation || "No ML explanation available yet."}</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                {(employee?.indicators || latestMl?.features?.indicators || []).map((indicator) => (
                  <Chip key={indicator} label={indicator} variant="outlined" sx={{ color: "#EEEEEE", borderColor: "#64748b" }} />
                ))}
              </Box>
              <Typography variant="body2" sx={{ color: "#94a3b8", mt: 2 }}>
                Isolation score: {latestMl?.anomalyScore ?? employee?.mlScore ?? "N/A"} | RF class: {latestMl?.randomForestClass || employee?.randomForestClass || "N/A"} | RF confidence: {latestMl?.randomForestConfidence != null ? `${Math.round(latestMl.randomForestConfidence * 100)}%` : "N/A"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Risk Timeline</Typography>
              {(intel.timeline || []).slice(0, 8).map((event) => (
                <Box key={event._id || event.createdAt} sx={{ py: 1, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <Typography sx={{ fontWeight: 800 }}>{event.title}</Typography>
                  <Typography variant="body2" sx={{ color: "#cbd5e1" }}>{event.description}</Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>{new Date(event.createdAt || Date.now()).toLocaleString()}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Incident History & Notes</Typography>
              {employeeIncidents.length === 0 ? (
                <Typography sx={{ color: "#cbd5e1" }}>No active incidents for this employee.</Typography>
              ) : (
                employeeIncidents.map((incident) => (
                  <Box key={incident._id || incident.id} sx={{ p: 2, mb: 2, borderRadius: 2, backgroundColor: "#263241" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 900 }}>{incident.severity} | {incident.status}</Typography>
                      <Typography sx={{ color: "#94a3b8" }}>{new Date(incident.createdAt || Date.now()).toLocaleString()}</Typography>
                    </Box>
                    <Typography sx={{ mt: 1 }}>{incident.primaryReason || incident.reasons?.[0]}</Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                      {["ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"].map((status) => (
                        <Button key={status} size="small" onClick={() => updateStatus(incident, status)} sx={{ color: "#00ADB5", borderColor: "#00ADB5" }} variant="outlined">
                          {status}
                        </Button>
                      ))}
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      <TextField size="small" label="Investigation note" value={note} onChange={(event) => setNote(event.target.value)} fullWidth sx={{ input: { color: "#EEEEEE" }, label: { color: "#cbd5e1" } }} />
                      <Button variant="contained" onClick={() => addNote(incident)} sx={{ backgroundColor: "#00ADB5" }}>Add</Button>
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default EmployeeInvestigation;
