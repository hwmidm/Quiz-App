// This utility function is a wrapper for asynchronous Express route handlers
// It catches any errors that occur in async functions and passes them to the Express error-handling middleware

export default (fn) => {
  // Returns a new Express middleware function
  return (req, res, next) => {
    // Executes the asynchronous function (fn) and catches any promise rejections
    // If an error occurs, it passes the error to the 'next' middleware (global error handler).
    fn(req, res, next).catch(next);
  };
};
