// This file defines a custom error class for handling operational errors in the application
// It helps distinguish between programming errors (bugs) and operational errors (expected issues like invalid input)

class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Call the parent (Error) constructor with the error message

    this.statusCode = statusCode; // HTTP status code for the error
    // Determine status: 'fail' for 4xx errors (client-side), 'error' for 5xx errors (server-side)
    this.status = `${this.statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Mark as operational error (known, expected error)
    // Capture the stack trace, for better debugging
    Error.captureStackTrace(this, this.constructor);
  }
}
export default AppError;
