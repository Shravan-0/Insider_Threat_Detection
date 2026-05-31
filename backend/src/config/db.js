const mongoose = require("mongoose");
const { env } = require("./env");

let isConnected = false;

function bindConnectionEvents() {
  mongoose.connection.on("connected", () => {
    isConnected = true;
  });

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("MongoDB disconnected — using memory fallback until reconnected.");
  });

  mongoose.connection.on("error", (error) => {
    isConnected = false;
    console.warn(`MongoDB connection error: ${error.message}`);
  });

  mongoose.connection.on("reconnected", () => {
    isConnected = true;
    console.log("MongoDB reconnected");
  });
}

async function connectDB() {
  try {
    mongoose.set("strictQuery", true);
    bindConnectionEvents();
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log("MongoDB connected");
  } catch (error) {
    isConnected = false;
    console.warn(`MongoDB unavailable: ${error.message}`);
    console.warn("Server will continue with runtime memory fallback.");
  }
}

function hasDatabase() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, hasDatabase };
