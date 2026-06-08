import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { authApi } from "../services/api";

const fieldSx = {
  input: { color: "#EEEEEE" },
  label: { color: "#cbd5e1" },
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "#425166" },
    "&:hover fieldset": { borderColor: "#00ADB5" },
    "&.Mui-focused fieldset": { borderColor: "#00ADB5" },
  },
  "& .MuiSelect-select": { color: "#EEEEEE" },
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "Password123",
    role: "client",
    department: "",
    employeeId: "",
  });

  const loadUsers = async () => {
    try {
      const response = await authApi.listUsers();
      setUsers(response.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load users.");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const createUser = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await authApi.createUser(form);
      setMessage("User created successfully.");
      setForm({ name: "", email: "", password: "Password123", role: "client", department: "", employeeId: "" });
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create user.");
    }
  };

  const resetPassword = async (userId) => {
    const password = window.prompt("Enter new temporary password", "Password123");
    if (!password) return;

    try {
      await authApi.resetPassword(userId, password);
      setMessage("Password reset successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset password.");
    }
  };

  const toggleUser = async (user) => {
    try {
      await authApi.updateUserStatus(user._id || user.id, !user.isActive);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update user.");
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
        User Management
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Create User
              </Typography>
              <Box component="form" onSubmit={createUser}>
                <TextField label="Name" value={form.name} onChange={updateField("name")} fullWidth sx={{ mb: 2, ...fieldSx }} />
                <TextField label="Email" value={form.email} onChange={updateField("email")} fullWidth sx={{ mb: 2, ...fieldSx }} />
                <TextField label="Temporary Password" value={form.password} onChange={updateField("password")} fullWidth sx={{ mb: 2, ...fieldSx }} />
                <TextField select label="Role" value={form.role} onChange={updateField("role")} fullWidth sx={{ mb: 2, ...fieldSx }}>
                  <MenuItem value="client">Client</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
                <TextField label="Department" value={form.department} onChange={updateField("department")} fullWidth sx={{ mb: 2, ...fieldSx }} />
                <TextField label="Employee ID" value={form.employeeId} onChange={updateField("employeeId")} fullWidth sx={{ mb: 2, ...fieldSx }} />
                <Button type="submit" variant="contained" fullWidth sx={{ backgroundColor: "#00ADB5" }}>
                  Create Account
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Directory
              </Typography>
              {users.length === 0 ? (
                <Typography sx={{ color: "#cbd5e1" }}>No database users found. Demo users are local-only.</Typography>
              ) : (
                users.map((user) => (
                  <Box
                    key={user._id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      py: 1.5,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 800 }}>{user.name}</Typography>
                      <Typography variant="body2" sx={{ color: "#cbd5e1" }}>{user.email}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <Chip size="small" label={user.role?.toUpperCase()} sx={{ backgroundColor: "#00ADB5", color: "white" }} />
                      <Chip size="small" label={user.isActive === false ? "INACTIVE" : "ACTIVE"} color={user.isActive === false ? "error" : "success"} />
                      <Button size="small" variant="outlined" onClick={() => resetPassword(user._id)} sx={{ color: "#EEEEEE", borderColor: "#64748b" }}>
                        Reset Password
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => toggleUser(user)} sx={{ color: "#EEEEEE", borderColor: "#64748b" }}>
                        {user.isActive === false ? "Activate" : "Deactivate"}
                      </Button>
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

export default AdminUsers;
