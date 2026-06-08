import React, { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Typography } from "@mui/material";
import { threatApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

function EmployeeStatus() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await threatApi.getEmployeeSelf();
        if (active) setProfile(response);
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Unable to load your activity status.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const latest = profile?.logs?.[0];

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <CircularProgress size={24} sx={{ color: "#00ADB5" }} />
        <Typography>Loading personal activity status...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        My Activity Status
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: "#00ADB5" }}>Identity</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{user?.name}</Typography>
              <Typography sx={{ color: "#cbd5e1" }}>{user?.email}</Typography>
              <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip label={user?.role?.toUpperCase()} sx={{ backgroundColor: "#00ADB5", color: "white" }} />
                {user?.employeeId && <Chip label={user.employeeId} variant="outlined" sx={{ color: "#EEEEEE", borderColor: "#64748b" }} />}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: "#00ADB5" }}>Latest Risk Signal</Typography>
              {latest ? (
                <>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: latest.riskLevel === "HIGH" ? "#ef4444" : latest.riskLevel === "MEDIUM" ? "#facc15" : "#22c55e" }}>
                    {latest.riskScore}%
                  </Typography>
                  <Typography sx={{ mb: 2 }}>{latest.riskLevel} risk level</Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {(latest.reasons || []).map((reason) => (
                      <Chip key={reason} label={reason} sx={{ color: "#EEEEEE", borderColor: "#64748b" }} variant="outlined" />
                    ))}
                  </Box>
                </>
              ) : (
                <Typography sx={{ color: "#cbd5e1" }}>
                  No personal activity events are currently linked to your employee ID.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default EmployeeStatus;
