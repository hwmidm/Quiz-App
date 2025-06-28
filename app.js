import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet"; // Middleware to secure HTTP headers
import ExpressMongoSanitize from "express-mongo-sanitize";

import AppError from "./utils/AppError.js";
import questionsRoutes from "./Routes/questionsRoutes.js";
import userRoutes from "./Routes/userRoutes.js";
import globalErrorHandler from "./Controller/errorController.js";
import { sanitizeBody } from "./utils/sanitizer.js";

const app = express();

// --- Global Middlewares ---
// Body parser: Reads JSON data from request body, with a size limit
app.use(express.json({ limit: "10kb" }));

// Data sanitization against NoSQL query injection: Removes '$' and '.' from request body/query/params
app.use(ExpressMongoSanitize());

// Data sanitization against XSS (Cross-Site Scripting) attacks: Cleans HTML in request body
app.use(sanitizeBody);

// Rate limiting: Limits requests from the same IP to prevent brute-force attacks or DDoS
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many request from this IP , Please try again later",
});
// Apply rate limiting to all routes starting with /api
app.use("/api", limiter);

// Set security HTTP headers: Adds various headers to enhance security
app.use(helmet());


// --- Routes ---
app.use("/api/questions", questionsRoutes);
app.use("/api/users", userRoutes);


// --- Error Handling ---
// Handles all unhandled routes (404 Not Found errors)
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware: Catches and processes all errors
app.use(globalErrorHandler);

export default app; // Export the Express application
