/**
 * Production readiness smoke tests for In_Threat API.
 * Run with backend server already listening on PORT (default 5000).
 */
const http = require("http");

const BASE = process.env.API_URL || "http://localhost:5000";
const results = [];

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {
            // keep raw
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email, password) {
  const res = await request("POST", "/api/auth/login", { email, password });
  return res;
}

function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} - ${name}${detail ? ` (${detail})` : ""}`);
}

async function run() {
  console.log(`Running production audit against ${BASE}\n`);

  const health = await request("GET", "/health");
  record("Health check", health.status === 200);

  const managerLogin = await login("manager@inthreat.local", "Password123");
  record("Manager login", managerLogin.status === 200 && managerLogin.body.token);
  const managerToken = managerLogin.body.token;

  const adminLogin = await login("admin@inthreat.local", "Password123");
  record("Admin login", adminLogin.status === 200 && adminLogin.body.token);
  const adminToken = adminLogin.body.token;

  const clientLogin = await login("client@inthreat.local", "Password123");
  record("Client login", clientLogin.status === 200 && clientLogin.body.token);
  const clientToken = clientLogin.body.token;

  const badLogin = await login("manager@inthreat.local", "wrong");
  record("Invalid credentials rejected", badLogin.status === 401);

  const noToken = await request("GET", "/api/config");
  record("Missing JWT blocked", noToken.status === 401);

  const tampered = await request("GET", "/api/config", null, `${managerToken}x`);
  record("Tampered JWT blocked", tampered.status === 401);

  const clientConfig = await request("GET", "/api/config", null, clientToken);
  record("Client cannot access manager config", clientConfig.status === 403);

  const managerConfig = await request("GET", "/api/config", null, managerToken);
  record("Manager can access config", managerConfig.status === 200);

  const clientUsers = await request("GET", "/api/auth/users", null, clientToken);
  record("Client cannot access admin users", clientUsers.status === 403);

  const managerUsers = await request("GET", "/api/auth/users", null, managerToken);
  record("Manager cannot access admin users", managerUsers.status === 403);

  const adminUsers = await request("GET", "/api/auth/users", null, adminToken);
  record("Admin can access users", adminUsers.status === 200);

  const mlStatus = await request("GET", "/api/ml/status", null, adminToken);
  record("Admin ML status", mlStatus.status === 200);

  const managerMl = await request("GET", "/api/ml/status", null, managerToken);
  record("Manager blocked from ML control", managerMl.status === 403);

  const stats = await request("GET", "/api/dashboard/stats", null, managerToken);
  record("Dashboard stats available", stats.status === 200);

  const invalidConfig = await request(
    "PUT",
    "/api/config",
    { after_hours_weight: 10, foreign_weight: 10, usb_weight: 10, file_weight: 10, email_weight: 10 },
    managerToken
  );
  record("Invalid config weights rejected", invalidConfig.status === 400);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(`\n${passed}/${results.length} tests passed`);
  if (failed) process.exit(1);
}

run().catch((error) => {
  console.error("Audit test runner failed:", error.message);
  process.exit(1);
});
