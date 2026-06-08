import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Typography } from "@mui/material";
import { mlApi } from "../services/api";

function MlControl() {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStatus = async () => {
    try {
      setError("");
      const data = await mlApi.getStatus();
      setStatus(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load ML status.");
    }
  };

  const statusTimerRef = useRef(null);

  useEffect(() => {
    loadStatus();
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const retrain = async () => {
    try {
      setMessage("");
      setError("");
      const response = await mlApi.retrain();
      setMessage(response.message);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(loadStatus, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to start retraining.");
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
        ML Control
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {(status?.models || []).map((model) => (
          <Grid size={{ xs: 12, md: 6 }} key={model.key}>
            <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2, height: "100%" }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{model.label}</Typography>
                  <Chip
                    label={model.available ? "AVAILABLE" : "MISSING"}
                    color={model.available ? "success" : "error"}
                    size="small"
                  />
                </Box>
                <Typography sx={{ color: "#cbd5e1", mt: 1 }}>{model.purpose}</Typography>
                {model.available && (
                  <Typography variant="body2" sx={{ color: "#94a3b8", mt: 2 }}>
                    Updated: {new Date(model.updatedAt).toLocaleString()} | Size: {Math.round(model.sizeBytes / 1024)} KB
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid size={{ xs: 12 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Feature Contract</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
                {(status?.features || []).map((feature) => (
                  <Chip key={feature} label={feature} variant="outlined" sx={{ color: "#EEEEEE", borderColor: "#64748b" }} />
                ))}
              </Box>
              <Button variant="contained" onClick={retrain} sx={{ backgroundColor: "#00ADB5" }}>
                Retrain Isolation Forest
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
  <Card
    sx={{
      backgroundColor: "#34404F",
      color: "#EEEEEE",
      borderRadius: 2,
      mt: 2
    }}
  >
    <CardContent>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
        Future Roadmap
      </Typography>

      <Typography sx={{ color: "#cbd5e1", mb: 1 }}>
        Feature Contract Management
      </Typography>

      <Typography variant="body2" sx={{ color: "#94a3b8", mb: 2 }}>
        Status: Planned for v2.0
      </Typography>

      <Button
        variant="outlined"
        disabled
        sx={{
          color: "#94a3b8",
          borderColor: "#64748b"
        }}
      >
        Coming Soon
      </Button>
    </CardContent>
  </Card>
</Grid>
      </Grid>
    </Box>
  );
}

export default MlControl;
