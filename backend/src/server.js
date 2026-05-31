const jwt = require("jsonwebtoken");
const { app } = require("./app");
const http = require("http");
const { Server } = require("socket.io");
const { connectDB } = require("./config/db");
const { env } = require("./config/env");
const { attachRealtime } = require("./services/realtimeService");

async function startServer() {
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const header = socket.handshake.headers?.authorization || "";
    const token = socket.handshake.auth?.token || (header.startsWith("Bearer ") ? header.slice(7) : null);

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      jwt.verify(token, env.jwtSecret);
      return next();
    } catch (error) {
      return next(new Error(error.name === "TokenExpiredError" ? "Token expired" : "Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join("soc");
    socket.emit("soc:connected", { status: "connected", timestamp: new Date() });
  });

  attachRealtime(io);

  server.listen(env.port, () => {
    console.log(`In_Threat API running on http://localhost:${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
