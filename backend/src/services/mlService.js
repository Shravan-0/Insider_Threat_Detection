const { spawn } = require("child_process");
const fs = require("fs");
const { env } = require("../config/env");

const ML_TIMEOUT_MS = 20000;

function runPythonPrediction(rows) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(env.mlPredictPath)) {
      return reject(new Error(`ML script not found at ${env.mlPredictPath}`));
    }

    const child = spawn(env.pythonBin, [env.mlPredictPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(new Error("ML prediction timed out"));
    }, ML_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (code !== 0) {
        return reject(new Error(stderr || `ML process exited with code ${code}`));
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Invalid ML response: ${error.message}`));
      }
    });

    child.stdin.write(JSON.stringify({ records: rows }));
    child.stdin.end();
  });
}

async function predictWithML(rows) {
  try {
    return await runPythonPrediction(rows);
  } catch (error) {
    console.warn(`ML prediction unavailable: ${error.message}`);
    return rows.map(() => ({
      anomaly: 1,
      anomalyScore: 0,
      normalizedAnomalyRisk: 0,
      mlAvailable: false,
      mlError: error.message,
    }));
  }
}

module.exports = { predictWithML };
