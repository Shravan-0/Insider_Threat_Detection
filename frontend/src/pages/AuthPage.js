import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const textFieldSx = {
  input: { color: "#EEEEEE" },
  label: { color: "#9ca3af" },
  "& .MuiOutlinedInput-root": {
    backgroundColor: "rgba(34, 40, 49, 0.82)",
    "& fieldset": { borderColor: "#334155" },
    "&:hover fieldset": { borderColor: "#00ADB5" },
    "&.Mui-focused fieldset": { borderColor: "#00ADB5" },
  },
};

function AuthPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "manager@inthreat.local",
    password: "Password123",
  });

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email: form.email, password: form.password });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check credentials or backend status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(0,173,181,0.18), transparent 32%), linear-gradient(135deg, #121A24 0%, #17212D 48%, #0E1724 100%)",
        color: "#EEEEEE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Grid container spacing={4} sx={{ maxWidth: 920, alignItems: "center", justifyContent: "center" }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="overline" sx={{ color: "#00ADB5", letterSpacing: 2 }}>
            Enterprise SOC Access
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mt: 1, mb: 2 }}>
            InThreat
          </Typography>
          <Typography sx={{ color: "#cbd5e1", fontSize: 17, maxWidth: 420 }}>
            Internal AI cybersecurity platform.
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ backgroundColor: "rgba(31, 41, 55, 0.9)", color: "#EEEEEE", border: "1px solid #334155", borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Login
              </Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 3 }}>
                Use your organization-issued account.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={submit}>
                <TextField label="Email" type="email" value={form.email} onChange={updateField("email")} fullWidth sx={{ mb: 2, ...textFieldSx }} />
                <TextField label="Password" type="password" value={form.password} onChange={updateField("password")} fullWidth sx={{ mb: 3, ...textFieldSx }} />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                  sx={{ py: 1.2, backgroundColor: "#00ADB5", "&:hover": { backgroundColor: "#008c93" } }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: "white" }} /> : "LOG IN"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AuthPage;
