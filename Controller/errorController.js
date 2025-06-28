import AppError from "../utils/AppError.js"; // Custom error class for operational errors

// Handles Mongoose CastError
const handleCastErrorDb = (err) => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};

// Handles MongoDB duplicate key error (code 11000)
const handleDuplicateFieldErrorDB = (err) => {
  // Extracts the duplicated value from the error object
  const value = err.keyValue
    ? Object.values(err.keyValue).join(", ")
    : "duplicate field";
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

// Handles Mongoose ValidationError
const handleValidationErrDB = (err) => {
  // Extracts all validation error messages
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Handles JWT (JSON Web Token) invalid token error
const handleJWTError = () => {
  return new AppError("Invalid Token ! Please login again", 401);
};

// Handles JWT token expired error
const handleTokenExpiredError = () => {
  return new AppError("Your toke has expired , Please login again", 401);
};

// Sends detailed error responses during development
const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack, // Include stack trace for debugging in dev
  });
};

// Sends concise error responses in production
const sendErrProd = (err, res) => {
  // Operational error , trusted error send to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    // Unknown error and programming error send to client and we dont want to lead error details
  } else {
    // 1) log error
    console.error("Unknown ERRROOOORR in PRODUCTION", err);
    // 2) send generic error message
    res.status(500).json({
      status: "error",
      message: "Something went very wrong",
    });
  }
};

// --- Global Error Handling Middleware ---
// This is the main error handling middleware that catches all errors.
export default (err, req, res, next) => {
  // Set default status code and status if not already defined
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrDev(err, res); // Send detailed error in development
  } else if (process.env.NODE_ENV === "production") {
    // Create a copy of the error to avoid modifying the original error object
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.stack = err.stack;

    // Handle specific error types and convert them into operational AppErrors
    if (error.name === "CastError") error = handleCastErrorDb(error);
    if (error.name === "ValidationError") error = handleValidationErrDB(error);
    if (error.code === 11000) error = handleDuplicateFieldErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleTokenExpiredError();

    sendErrProd(error, res); // Send concise error in production
  }
};
