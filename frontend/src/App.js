import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { configApi, threatApi } from "./services/api";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import EmployeeStatus from "./pages/EmployeeStatus";
import AdminUsers from "./pages/AdminUsers";
import MlControl from "./pages/MlControl";
import EmployeeInvestigation from "./pages/EmployeeInvestigation";
import { subscribeSocEvents } from "./services/socket";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import ChartContainer from "./components/ChartContainer";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  Drawer,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText
} from "@mui/material";

const drawerWidth = 240;

const COLORS = ["#f87171", "#facc15", "#4ade80"];
const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const getPrimaryReason = (row) => {
  if (row.reasons?.length) return row.reasons[0];
  if (row.files_accessed > 300) return "📁 Excessive file access";
  if (row.is_after_hours === 1 && row.files_accessed > 100) return "🌙 Suspicious after-hours activity";
  if (row.is_foreign === 1 && row.usb_usage === 1) return "🌍 Foreign + USB activity";
  if (row.emails_sent > 20) return "📧 Email spike detected";
  return "⚠️ Abnormal behavior";
};

function App() {
  const preventWheelChange = (e) => {
  e.target.blur();
   };
  const { user, loading: authLoading, logout } = useAuth();
  const [data, setData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [socFeed, setSocFeed] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [liveNotice, setLiveNotice] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [logFilter, setLogFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configMessage, setConfigMessage] = useState("");
  const [configError, setConfigError] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [config, setConfig] = useState({
    fileHigh: 300,
    emailHigh: 20,
    after_hours_weight: 20,
    foreign_weight: 20,
    usb_weight: 20,
    file_weight: 20,
    email_weight: 20
  });

  const getRiskLevel = (anomaly, score) => {
    if (anomaly === -1 && score < -0.05) return "HIGH";
    if (anomaly === -1) return "MEDIUM";
    return "LOW";
  };

  const isClient = user?.role === "client";
  const isAdmin = user?.role === "admin";
  const allowedTabs = useMemo(
    () => {
      if (isClient) return ["my activity"];
      const tabs = ["dashboard", "incidents", "logs", "settings"];
      if (isAdmin) tabs.push("users", "ml control");
      return tabs;
    },
    [isClient, isAdmin]
  );

  useEffect(() => {
    if (isClient) setActiveTab("my activity");
    else if (!allowedTabs.includes(activeTab)) setActiveTab("dashboard");
  }, [isClient, activeTab, allowedTabs]);

  const fetchOperationalData = useCallback(async () => {
    if (!user || isClient) return;
    try {
      const [logData, alertData, timelineData, feedData, statusData, statsData] = await Promise.all([
        threatApi.getLogs(200),
        threatApi.getAlerts(200),
        threatApi.getTimeline(),
        threatApi.getSocFeed(),
        threatApi.getSystemStatus(),
        threatApi.getDashboardStats(),
      ]);
      setLogs(logData);
      setAlerts(alertData);
      setTimeline(timelineData.events || []);
      setSocFeed(feedData.events || []);
      setSystemStatus(statusData);
      setDashboardStats(statsData);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to refresh SOC data.");
    }
  }, [user, isClient]);

  const runThreatAnalysis = useCallback(async () => {
    if (!user || isClient) return;
    setError("");
    setLoading(true);

    Papa.parse("/data.csv", {
      download: true,
      header: true,
      complete: async (result) => {
        const rows = result.data.filter((r) => r.login_hour);

        if (rows.length === 0) {
          setError("No employee activity data available.");
          setLoading(false);
          return;
        }

        const payload = rows.map((row) => ({
          employee_id: row.employee_id,
          employee_name: row.employee_name,
          department: row.department,
          login_hour: Number(row.login_hour),
          files_accessed: Number(row.files_accessed),
          usb_usage: Number(row.usb_usage),
          emails_sent: Number(row.emails_sent),
          is_after_hours: Number(row.is_after_hours),
          is_foreign: Number(row.is_foreign),
          high_file_access: Number(row.high_file_access),
          high_email_activity: Number(row.high_email_activity),
        }));

        try {
          const results = await threatApi.predictRisk(payload);

          const processed = rows.map((row, i) => ({
            ...row,
            employeeId: row.employee_id || results[i]?.employeeId,
            employeeName: row.employee_name || results[i]?.employeeName,
            department: row.department,
            risk_score: results[i]?.risk_score || 0,
            anomaly: results[i]?.anomaly || 1,
            risk_level: results[i]?.risk_level || getRiskLevel(results[i]?.anomaly, results[i]?.risk_score),
            reasons: results[i]?.reasons || [],
            behavior_summary: results[i]?.behavior_summary || "",
            mlAnomaly: results[i]?.mlAnomaly || false,
            randomForestClass: results[i]?.randomForestClass,
            randomForestConfidence: results[i]?.randomForestConfidence,
            anomalyConfidence: results[i]?.anomalyConfidence,
          }));

          setData(processed);
          await fetchOperationalData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || "Backend error while fetching predictions.");
        } finally {
          setLoading(false);
        }
      },
      error: () => {
        setError("Error parsing CSV data.");
        setLoading(false);
      },
    });
  }, [user, isClient, fetchOperationalData]);

  const fetchOperationalRef = useRef(fetchOperationalData);
  const runThreatAnalysisRef = useRef(runThreatAnalysis);
  fetchOperationalRef.current = fetchOperationalData;
  runThreatAnalysisRef.current = runThreatAnalysis;

  useEffect(() => {
    if (!user || isClient) return undefined;

    let refreshTimer;
    const scheduleRefresh = (message) => {
      setLiveNotice(message);
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        fetchOperationalRef.current();
      }, 500);
    };

    const unsubscribe = subscribeSocEvents({
      connect_error: (err) => {
        setError(err.message || "Realtime connection failed.");
      },
      "alerts:created": () => scheduleRefresh("New high-priority alert detected"),
      "incident:updated": () => scheduleRefresh("Incident status updated"),
      "config:updated": () => {
        setLiveNotice("Risk configuration updated");
        runThreatAnalysisRef.current();
      },
      "soc:event": (event) => {
        setSocFeed((current) => [event, ...current].slice(0, 50));
      },
      "ml:retrain": () => scheduleRefresh("ML pipeline event received"),
    });

    return () => {
      clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [user, isClient]);

  useEffect(() => {
    if (!user || isClient) return;

    const fetchConfig = async () => {
      try {
        const configData = await configApi.getConfig();
        setConfig({
          fileHigh: configData.fileHigh ?? configData.file_threshold ?? 300,
          emailHigh: configData.emailHigh ?? configData.email_threshold ?? 20,
          after_hours_weight: configData.after_hours_weight ?? 20,
          foreign_weight: configData.foreign_weight ?? 20,
          usb_weight: configData.usb_weight ?? 20,
          file_weight: configData.file_weight ?? 20,
          email_weight: configData.email_weight ?? 20
        });
      } catch (err) {
        setError(err.response?.data?.message || "Config fetch error");
      }
    };

    fetchConfig();
    runThreatAnalysis();
  }, [user, isClient, runThreatAnalysis]);

  const weightTotal = useMemo(
    () =>
      Number(config.after_hours_weight || 0) +
      Number(config.foreign_weight || 0) +
      Number(config.usb_weight || 0) +
      Number(config.file_weight || 0) +
      Number(config.email_weight || 0),
    [config]
  );

  const weightsValid = weightTotal === 100;

  const updateConfig = async () => {
    if (!weightsValid) {
      setConfigError("Risk weights must total exactly 100%");
      return;
    }

    try {
      setConfigError("");
      setConfigMessage("");
      const payload = {
        fileHigh: config.fileHigh,
        emailHigh: config.emailHigh,
        after_hours_weight: config.after_hours_weight,
        foreign_weight: config.foreign_weight,
        usb_weight: config.usb_weight,
        file_weight: config.file_weight,
        email_weight: config.email_weight
      };
      console.log("CONFIG SAVE PAYLOAD", payload);
      const result = await configApi.updateConfig(payload);
      const updated = result.config || {};
      setConfig({
        fileHigh: updated.fileHigh ?? updated.file_threshold ?? 300,
        emailHigh: updated.emailHigh ?? updated.email_threshold ?? 20,
        after_hours_weight: updated.after_hours_weight ?? 20,
        foreign_weight: updated.foreign_weight ?? 20,
        usb_weight: updated.usb_weight ?? 20,
        file_weight: updated.file_weight ?? 20,
        email_weight: updated.email_weight ?? 20
      });
      setConfigMessage("Settings saved. Dashboard recalculated.");
      await runThreatAnalysis();
    } catch (err) {
      setConfigError(err.response?.data?.message || "Error updating config");
    }
  };

  useEffect(() => {
    setShowBanner(data.some(d => d.risk_level === "HIGH"));
  }, [data]);

  const filteredData = data
    .filter(row =>
      Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase())
    )
    .filter(row =>
      filter === "ALL" ? true : row.risk_level === filter
    );

  const highRiskCount = data.filter(d => d.risk_level === "HIGH").length;
  const mediumRiskCount = data.filter(d => d.risk_level === "MEDIUM").length;
  const lowRiskCount = data.filter(d => d.risk_level === "LOW").length;
  const sortedIncidents = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const severityDiff = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
        if (severityDiff) return severityDiff;
        const riskDiff = Number(b.riskScore || b.risk_score || 0) - Number(a.riskScore || a.risk_score || 0);
        if (riskDiff) return riskDiff;
        return new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0);
      }),
    [alerts]
  );

  const pieData = [
    { name: 'High Risk', value: highRiskCount },
    { name: 'Medium Risk', value: mediumRiskCount },
    { name: 'Low Risk', value: lowRiskCount },
  ];

  const statCards = [
    { title: "Total Users", value: data.length || dashboardStats?.totalEvents || 0, bg: "#34404F", color: "#F8FAFC", border: "#64748b" },
    { title: "High Risk", value: highRiskCount, bg: "#5E2B32", color: "#fecaca", border: "#f87171" },
    { title: "Medium Risk", value: mediumRiskCount, bg: "#51472E", color: "#fde68a", border: "#facc15" },
    { title: "Low Risk", value: lowRiskCount, bg: "#234D3C", color: "#bbf7d0", border: "#4ade80" },
  ];

  const updateIncidentStatus = async (incident, status) => {
    const id = incident._id || incident.id;
    if (!id) return;
    await threatApi.updateIncidentStatus(id, status);
    await fetchOperationalData();
  };

  if (selectedEmployee) {
    return (
      <Box sx={{ minHeight: "100vh", backgroundColor: "#222831", color: "#EEEEEE", p: 4 }}>
        <EmployeeInvestigation
          employee={selectedEmployee}
          incidents={alerts}
          onBack={() => setSelectedEmployee(null)}
          onIncidentUpdated={fetchOperationalData}
        />
      </Box>
    );
  }

  const textFieldSx = {
    input: { color: "#EEEEEE" },
    label: { color: "#EEEEEE" },
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: "#00ADB5" },
      "&:hover fieldset": { borderColor: "#00ADB5" },
      "&.Mui-focused fieldset": { borderColor: "#00ADB5" }
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#222831", color: "#EEEEEE" }}>
        <CircularProgress sx={{ color: "#00ADB5" }} />
      </Box>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#222831", color: "#EEEEEE", fontFamily: "'Inter', sans-serif" }}>
      {/* SIDEBAR */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#222831",
            color: "#EEEEEE",
            borderRight: "1px solid #393E46",
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", mb: 4, display: "flex", alignItems: "center", gap: 1 }}>
            🛡️ InThreat
          </Typography>
          <List>
            {allowedTabs.map((tab) => (
              <ListItemButton
                key={tab}
                onClick={() => setActiveTab(tab)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  backgroundColor: activeTab === tab ? "#00ADB5" : "transparent",
                  color: activeTab === tab ? "white" : "#EEEEEE",
                  "&:hover": { backgroundColor: activeTab === tab ? "#00ADB5" : "rgba(255,255,255,0.1)" }
                }}
              >
                <ListItemText
                  primary={tab.toUpperCase()}
                  sx={{ "& .MuiTypography-root": { fontWeight: activeTab === tab ? "bold" : "normal" } }}
                />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ mt: 4, p: 2, border: "1px solid #393E46", borderRadius: 2, backgroundColor: "rgba(255,255,255,0.03)" }}>
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              Signed in as
            </Typography>
            <Typography sx={{ fontWeight: 800 }}>{user.name}</Typography>
            <Chip size="small" label={user.role.toUpperCase()} sx={{ mt: 1, backgroundColor: "#00ADB5", color: "white" }} />
            <Button
              size="small"
              variant="outlined"
              onClick={logout}
              fullWidth
              sx={{ mt: 2, color: "#EEEEEE", borderColor: "#64748b" }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* MAIN CONTENT */}
      <Box component="main" sx={{ flexGrow: 1, p: 4, overflowY: "auto", minWidth: 0 }}>
        
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#EEEEEE" }}>
            {isClient ? "Client Activity Portal" : "Security Operations Center"}
          </Typography>
          {!isClient && (
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search activity..."
              onChange={(e) => setSearch(e.target.value)}
              sx={{ backgroundColor: "#34404F", borderRadius: 1, width: 300, ...textFieldSx }}
            />
          )}
        </Box>

        {activeTab === "my activity" && <EmployeeStatus />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "ml control" && <MlControl />}

        {/* STATUS AND BANNERS */}
{loading && (
  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
    <CircularProgress size={24} sx={{ color: "#00ADB5" }} />
    <Typography>Loading threat intelligence...</Typography>
  </Box>
)}

{error && (
  <Alert
    severity="error"
    sx={{
      mb: 3,
      backgroundColor: "#5E2B32",
      color: "#fecaca"
    }}
  >
    {error}
  </Alert>
)}

{liveNotice && (
  <Alert
    severity="info"
    sx={{ mb: 3 }}
    onClose={() => setLiveNotice("")}
  >
    {liveNotice}
  </Alert>
)}

{/* Show critical threat banner ONLY on SOC pages */}
{["dashboard", "incidents", "logs"].includes(activeTab) &&
  showBanner && (
    <Alert
      severity="error"
      variant="filled"
      sx={{
        mb: 3,
        fontWeight: "bold",
        backgroundColor: "#5E2B32",
        color: "white",
        border: "1px solid red"
      }}
    >
      CRITICAL: High Risk Activity Detected in Recent Logs
    </Alert>
)}

        {/* 🔹 DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            {/* METRICS ROW */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {statCards.map((stat, i) => (
                <Grid size={{ xs: 12, sm: 6, xl: 3 }} key={i}>
                  <Card sx={{ 
                    backgroundColor: stat.bg, 
                    color: stat.color, 
                    borderLeft: `6px solid ${stat.border}`,
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
                    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                    minHeight: 132,
                    "&:hover": { transform: "translateY(-4px)", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)" }
                  }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, opacity: 0.8, textTransform: "uppercase" }}>
                        {stat.title}
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, mt: 1 }}>
                        {stat.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3} sx={{ alignItems: "stretch" }}>
              {/* LEFT COLUMN */}
              <Grid size={{ xs: 12, xl: 8 }}>
                
                {/* FILTER BUTTONS */}
                <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
                  {["ALL", "HIGH", "MEDIUM", "LOW"].map(level => (
                    <Button 
                      key={level}
                      variant={filter === level ? "contained" : "outlined"} 
                      onClick={() => setFilter(level)}
                      sx={{ 
                        borderRadius: 20, px: 3, fontWeight: "bold",
                        backgroundColor: filter === level ? "#00ADB5" : "transparent",
                        color: filter === level ? "white" : "#00ADB5",
                        borderColor: "#00ADB5",
                        "&:hover": {
                          backgroundColor: filter === level ? "#00ADB5" : "rgba(0,173,181,0.1)",
                          borderColor: "#00ADB5"
                        }
                      }}
                    >
                      {level} Risk
                    </Button>
                  ))}
                </Box>

                <Card sx={{ mb: 4, backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Filtered Users</Typography>
                    {filteredData.length === 0 ? (
                      <Typography>No data available</Typography>
                    ) : (
                      filteredData.slice(0, 10).map((row, i) => (
                        <Box
                          key={i}
                          onClick={() => setSelectedEmployee(row)}
                          sx={{
                            p: 2,
                            mb: 1,
                            borderRadius: 2,
                            cursor: "pointer",
                            backgroundColor:
                              row.risk_level === "HIGH"
                                ? "#5E2B32"
                                : row.risk_level === "MEDIUM"
                                ? "#51472E"
                                : "#234D3C",
                            borderLeft: `5px solid ${
                              row.risk_level === "HIGH"
                                ? "#f87171"
                                : row.risk_level === "MEDIUM"
                                ? "#facc15"
                                : "#bbf7d0"
                            }`,
                            color:
                              row.risk_level === "HIGH"
                                ? "#fecaca"
                                : row.risk_level === "MEDIUM"
                                ? "#facc15"
                                : "#bbf7d0"
                          }}
                        >
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                            <Chip size="small" label={`🕒 ${row.login_hour}:00`} sx={{ color: "#EEEEEE", borderColor: "#EEEEEE" }} variant="outlined" />
                            {row.is_after_hours === 1 && <Chip size="small" label="🌙 After Hours" color="warning" />}
                            {row.is_foreign === 1 && <Chip size="small" label="🌍 Foreign" color="error" />}
                            {row.usb_usage === 1 && <Chip size="small" label="🔌 USB" color="secondary" />}
                            {row.high_file_access === 1 && <Chip size="small" label="📁 High Files" sx={{ color: "#EEEEEE", borderColor: "#EEEEEE" }} variant="outlined" />}
                            {row.high_email_activity === 1 && <Chip size="small" label="📧 Email Spike" sx={{ color: "#EEEEEE", borderColor: "#EEEEEE" }} variant="outlined" />}
                          </Box>

                          <Typography sx={{ color: "#fca5a5", fontWeight: "bold", mt: 2 }}>
                            {getPrimaryReason(row)}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* ALERTS SECTION */}
                <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)", mb: 4, borderRadius: 2 }}>
                  <Box sx={{ p: 2, backgroundColor: "#5E2B32", color: "#fecaca", borderLeft: "5px solid #f87171" }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>🚨 Top High Risk Users</Typography>
                  </Box>
                  <CardContent sx={{ p: 0 }}>
                    {filteredData.filter(row => row.risk_level === "HIGH").length === 0 ? (
                      <Typography sx={{ p: 3, color: "#EEEEEE" }}>No high risk users detected.</Typography>
                    ) : (
                      <List sx={{ p: 0 }}>
                        {filteredData
                          .filter(row => row.risk_level === "HIGH")
                          .slice(0, 5)
                          .map((row, i) => (
                            <Box key={i}>
                              <Box sx={{
                                p: 2,
                                mb: 2,
                                borderRadius: 2,
                                backgroundColor: "#5E2B32",
                                color: "#fecaca"
                              }}>
                                {/* 🔥 MAIN REASON */}
                                <Typography sx={{ fontWeight: "bold", fontSize: 16 }}>
                                  🚨 {getPrimaryReason(row)}
                                </Typography>

                                {/* 🧠 SHORT DETAILS */}
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                  Login {row.login_hour}:00 | Score: {row.risk_score?.toFixed(3)}
                                </Typography>

                                {/* 🔹 COMPACT BEHAVIOR */}
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                                  {row.is_after_hours === 1 && <Chip size="small" label="🌙 After Hours" sx={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fecaca" }} />}
                                  {row.is_foreign === 1 && <Chip size="small" label="🌍 Foreign" sx={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fecaca" }} />}
                                  {row.usb_usage === 1 && <Chip size="small" label="🔌 USB" sx={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fecaca" }} />}
                                  {row.high_file_access === 1 && <Chip size="small" label="📁 High Files" sx={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fecaca" }} />}
                                  {row.high_email_activity === 1 && <Chip size="small" label="📧 Email Spike" sx={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fecaca" }} />}
                                </Box>
                              </Box>
                              {i < 4 && <Divider sx={{ backgroundColor: "rgba(255,255,255,0.1)" }} />}
                            </Box>
                          ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* RIGHT COLUMN */}
              <Grid size={{ xs: 12, xl: 4 }}>
                
                {/* PIE CHART */}
                <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)", mb: 4, borderRadius: 2, height: "100%" }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>Risk Distribution</Typography>
                    {data.length > 0 ? (
                    <ChartContainer height={320}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "#222831", borderColor: "#393E46", color: "#EEEEEE" }} itemStyle={{ color: "#EEEEEE" }} />
                        <Legend wrapperStyle={{ color: "#EEEEEE" }} />
                      </PieChart>
                    </ChartContainer>
                    ) : (
                      <Typography sx={{ color: "#cbd5e1" }}>Risk distribution will appear after analysis completes.</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mt: 0 }}>
              <Grid size={{ xs: 12, xl: 7 }}>
                <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Threat Timeline</Typography>
                    {timeline.slice(0, 6).map((event, i) => (
                      <Box key={event._id || i} sx={{ py: 1.2, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                          <Typography sx={{ fontWeight: 800 }}>{event.title}</Typography>
                          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                            {new Date(event.createdAt || Date.now()).toLocaleTimeString()}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: "#cbd5e1" }}>{event.description}</Typography>
                      </Box>
                    ))}
                    {timeline.length === 0 && <Typography sx={{ color: "#cbd5e1" }}>Timeline will populate after analysis events.</Typography>}
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, xl: 5 }}>
                <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Live Alert Center</Typography>
                    {sortedIncidents.slice(0, 5).map((incident, i) => (
                      <Box key={incident._id || i} sx={{ py: 1.2, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                          <Chip size="small" label={incident.severity} color={incident.severity === "CRITICAL" ? "error" : "warning"} />
                          <Button size="small" onClick={() => updateIncidentStatus(incident, "ACKNOWLEDGED")} sx={{ color: "#00ADB5" }}>
                            Acknowledge
                          </Button>
                        </Box>
                        <Typography sx={{ mt: 1, fontWeight: 800 }}>{incident.employeeName || incident.employeeId}</Typography>
                        <Typography variant="body2" sx={{ color: "#cbd5e1" }}>{incident.primaryReason || incident.reasons?.[0]}</Typography>
                      </Box>
                    ))}
                    {sortedIncidents.length === 0 && <Typography sx={{ color: "#cbd5e1" }}>No active high-priority alerts.</Typography>}
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, xl: 5 }}>
                <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Live System Status</Typography>
                    <Grid container spacing={2}>
                      {[
                        ["ML Engine", systemStatus?.mlEngine || "ACTIVE"],
                        ["Pipeline", systemStatus?.detectionPipeline || "HEALTHY"],
                        ["Database", systemStatus?.database || "UNKNOWN"],
                        ["Active Alerts", systemStatus?.activeAlerts ?? 0],
                        ["Threats Today", systemStatus?.threatsToday ?? 0],
                        ["Predictions", systemStatus?.predictionsTracked ?? 0],
                      ].map(([label, value]) => (
                        <Grid size={{ xs: 6 }} key={label}>
                          <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: "#263241" }}>
                            <Typography variant="caption" sx={{ color: "#94a3b8" }}>{label}</Typography>
                            <Typography sx={{ fontWeight: 900 }}>{value}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, xl: 7 }}>
                <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE", borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>SOC Activity Feed</Typography>
                    {socFeed.slice(0, 6).map((event, i) => (
                      <Box key={event._id || i} sx={{ py: 1, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <Typography sx={{ fontWeight: 800 }}>{event.action}</Typography>
                        <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
                          {event.actorName || "System"} | {event.resourceType || "System"} | {new Date(event.createdAt || Date.now()).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    ))}
                    {socFeed.length === 0 && <Typography sx={{ color: "#cbd5e1" }}>SOC feed will populate as analysts take actions.</Typography>}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}

        {/* 🔹 INCIDENTS */}
        {activeTab === "incidents" && (
          <Card sx={{ backgroundColor: "#34404F", color: "#EEEEEE" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Incidents</Typography>

              {sortedIncidents.length === 0 ? (
                <Typography sx={{ color: "#cbd5e1" }}>No suspicious incidents generated from the current analysis window.</Typography>
              ) : (
                sortedIncidents.map((incident, i) => (
                  <Box
                    key={incident._id || incident.id || i}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      backgroundColor: incident.severity === "CRITICAL" || incident.severity === "HIGH" ? "#5E2B32" : "#51472E",
                      borderLeft: `5px solid ${incident.severity === "CRITICAL" || incident.severity === "HIGH" ? "#f87171" : "#facc15"}`,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 900 }}>{incident.severity} | Risk Score: {incident.riskScore}</Typography>
                      <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
                        {new Date(incident.createdAt || incident.timestamp || Date.now()).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography sx={{ mt: 1, fontWeight: 700 }}>{incident.employeeName || incident.employeeId}</Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: "#fecaca" }}>
                      {(incident.reasons || ["Suspicious behavior pattern"])[0]}
                    </Typography>
                    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3 }}>
                      {(incident.reasons || []).slice(0, 4).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                      {["ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"].map((status) => (
                        <Button
                          key={status}
                          size="small"
                          variant={incident.status === status ? "contained" : "outlined"}
                          onClick={() => updateIncidentStatus(incident, status)}
                          sx={{ color: incident.status === status ? "white" : "#00ADB5", borderColor: "#00ADB5" }}
                        >
                          {status}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* 🔹 LOGS */}
        {activeTab === "logs" && (
          <Card sx={{ borderRadius: 2, backgroundColor: "#34404F", color: "#EEEEEE" }}>
            <Box sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #222831"
            }}>
              <Typography variant="h6">📜 System Logs</Typography>

              <Box>
                <Button
                  size="small"
                  variant={logFilter === "ALL" ? "contained" : "outlined"}
                  onClick={() => setLogFilter("ALL")}
                  sx={{
                    backgroundColor: logFilter === "ALL" ? "#00ADB5" : "transparent",
                    color: logFilter === "ALL" ? "white" : "#00ADB5",
                    borderColor: "#00ADB5",
                    "&:hover": { backgroundColor: logFilter === "ALL" ? "#00ADB5" : "rgba(0,173,181,0.1)", borderColor: "#00ADB5" }
                  }}
                >
                  All Logs
                </Button>

                <Button
                  size="small"
                  variant={logFilter === "THREATS" ? "contained" : "outlined"}
                  onClick={() => setLogFilter("THREATS")}
                  sx={{ 
                    ml: 1,
                    backgroundColor: logFilter === "THREATS" ? "#00ADB5" : "transparent",
                    color: logFilter === "THREATS" ? "white" : "#00ADB5",
                    borderColor: "#00ADB5",
                    "&:hover": { backgroundColor: logFilter === "THREATS" ? "#00ADB5" : "rgba(0,173,181,0.1)", borderColor: "#00ADB5" }
                  }}
                >
                  Threats Only
                </Button>
              </Box>
            </Box>

            <CardContent sx={{
              maxHeight: 500,
              overflowY: "auto",
              background: "#222831",
              color: "#EEEEEE"
            }}>
              {logs.length === 0 ? (
                <Typography>No logs available</Typography>
              ) : (
                logs
                  .filter(log =>
                    logFilter === "ALL" ? true : log.anomaly === -1
                  )
                  .map((log, i) => (
                    <Box key={i} sx={{
                      p: 1,
                      borderBottom: "1px solid #393E46"
                    }}>
                      <Typography sx={{
                        fontFamily: "monospace",
                        color: log.anomaly === -1 ? "#ef4444" : "#9ca3af"
                      }}>
                        [{new Date(log.createdAt || log.timestamp || Date.now()).toLocaleTimeString()}]{" "}
                        {log.anomaly === -1 ? "🚨 THREAT" : "INFO"} → 
                        Login {log.input?.login_hour}h | Files {log.input?.files_accessed}
                      </Typography>
                    </Box>
                  ))
              )}
            </CardContent>
          </Card>
        )}

        {/* 🔹 SETTINGS */}
        {activeTab === "settings" && (
          <Card sx={{ maxWidth: 820, backgroundColor: "#34404F", color: "#EEEEEE" }}>
            <CardContent>
              <Typography variant="h6">Manager Control Panel</Typography>
              {configMessage && <Alert severity="success" sx={{ mt: 2 }}>{configMessage}</Alert>}
              {configError && <Alert severity="error" sx={{ mt: 2 }}>{configError}</Alert>}

              {/* 🔹 Thresholds */}
              <Typography sx={{ mt: 2, fontWeight: "bold", color: "#00ADB5" }}>Thresholds</Typography>

              <TextField
                label="File Access Limit"
                type="number"
                value={config.fileHigh || ""}
                onChange={(e) =>
                  setConfig({ ...config, fileHigh: Number(e.target.value) })
                }
                onWheel={preventWheelChange}
                fullWidth sx={{ mt: 1, ...textFieldSx }}
              />

              <TextField
                label="Email Limit"
                type="number"
                value={config.emailHigh || ""}
                onChange={(e) =>
                  setConfig({ ...config, emailHigh: Number(e.target.value) })
                }
                onWheel={preventWheelChange}
                fullWidth sx={{ mt: 2, ...textFieldSx }}
              />

              {/* 🔹 Weights */}
              <Typography sx={{ mt: 3, fontWeight: "bold", color: "#00ADB5" }}>Risk Weights (%)</Typography>
              <Typography sx={{ mt: 1, color: weightsValid ? "#bbf7d0" : "#fecaca", fontWeight: 800 }}>
                Current Total: {weightTotal}% {weightsValid ? "VALID" : "INVALID"}
              </Typography>
              {!weightsValid && (
                <Typography variant="body2" sx={{ color: "#fecaca", mt: 0.5 }}>
                  Risk weights must total exactly 100%.
                </Typography>
              )}

              <TextField
                label="After Hours Weight"
                type="number"
                value={config.after_hours_weight}
                error={!weightsValid}
                onChange={(e) =>
                  setConfig({ ...config, after_hours_weight: Number(e.target.value) })
                }
                onWheel={preventWheelChange}
                fullWidth sx={{ mt: 1, ...textFieldSx }}
              />

              <TextField
                label="Foreign Access Weight"
                type="number"
                value={config.foreign_weight}
                error={!weightsValid}
                onChange={(e) =>
                  setConfig({ ...config, foreign_weight: Number(e.target.value) })
                }
                onWheel={preventWheelChange}
                fullWidth sx={{ mt: 2, ...textFieldSx }}
              />

              <TextField
                label="USB Usage Weight"
                type="number"
                value={config.usb_weight}
                error={!weightsValid}
                onChange={(e) =>
                  setConfig({ ...config, usb_weight: Number(e.target.value) })
                }
                onWheel={preventWheelChange}
                fullWidth sx={{ mt: 2, ...textFieldSx }}
              />

              <TextField
                label="File Activity Weight"
                type="number"
                value={config.file_weight}
                error={!weightsValid}
                onChange={(e) =>
                  setConfig({ ...config, file_weight: Number(e.target.value) })
                }
                onWheel={preventWheelChange}
                fullWidth sx={{ mt: 2, ...textFieldSx }}
              />

              <TextField
                label="Email Activity Weight"
                type="number"
                value={config.email_weight}
                error={!weightsValid}
                onChange={(e) =>
                  setConfig({ ...config, email_weight: Number(e.target.value) })
                }
                onWheel={preventWheelChange}
                fullWidth sx={{ mt: 2, ...textFieldSx }}
              />

              <Button
                variant="contained"
                onClick={updateConfig}
                disabled={!weightsValid || loading}
                sx={{ 
                  mt: 3, 
                  backgroundColor: "#00ADB5", 
                  color: "white",
                  "&.Mui-disabled": { backgroundColor: "#475569", color: "#94a3b8" },
                  "&:hover": { backgroundColor: "#008c93" }
                }}
              >
                Save Settings
              </Button>
            </CardContent>
          </Card>
        )}

      </Box>
    </Box>
  );
}

export default App;
