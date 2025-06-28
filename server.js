import app from "./app.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

// --- Global Error Handling for Synchronous Code ---
// Catches uncaught exceptions (synchronous errors not handled by try/catch)
process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("Uncaught Exception! Shutting Down...");
  process.exit(1); // Exit the process immediately
});

// --- Configuration ---
// Load environment variables from config.env file
dotenv.config({ path: "./config.env" });

// Enforce strict query for Mongoose (prevents querying for non-schema fields)
mongoose.set("strictQuery", true);

// --- Database Connection ---
// Connect to MongoDB using the connection string from environment variables
mongoose.connect(process.env.LocalDatabase).then(() => {
  console.log("DB Connected successfully");
});

// --- Environment Logging ---
// Log the current Node.js environment
if (process.env.NODE_ENV === "development") {
  console.log("development");
} else if (process.env.NODE_ENV === "production") {
  console.log("production");
}

// --- Server Setup ---
const PORT = process.env.PORT || 3000;

// Start the server and listen for incoming requests
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// --- Global Error Handling for Asynchronous Code ---
// Catches unhandled promise rejections (asynchronous errors not caught by .catch())
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("UnHandler Rejection ! Shutting Down...");
  // Close the server gracefully before exiting the process
  server.close(() => {
    process.exit(1);
  });
});
