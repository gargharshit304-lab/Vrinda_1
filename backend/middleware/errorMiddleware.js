export const notFound = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const isDevelopment = process.env.NODE_ENV !== "production";

export const errorHandler = (err, _req, res, _next) => {
  const isCastError = err?.name === "CastError";
  const isValidationError = err?.name === "ValidationError";
  const isPayloadTooLarge = err?.type === "entity.too.large" || err?.status === 413;
  const isMulterLimit = err?.code === "LIMIT_FILE_SIZE";
  const isDbConnectionIssue =
    err?.name === "MongooseServerSelectionError" ||
    err?.name === "MongoNetworkError" ||
    String(err?.message || "").includes("ECONNREFUSED");

  const statusCode = err.statusCode || (isCastError || isValidationError ? 400 : isPayloadTooLarge || isMulterLimit ? 413 : isDbConnectionIssue ? 503 : 500);
  const message = isCastError
    ? "Invalid ID"
    : isValidationError
    ? err.message || "Validation failed"
    : isPayloadTooLarge
    ? "Uploaded data is too large. Please reduce file size."
    : isMulterLimit
    ? "Uploaded data is too large. Please reduce file size."
    : isDbConnectionIssue
    ? "Database connection unavailable. Please try again in a moment."
    : err.message || "Internal server error";

  if (isDevelopment) {
    // eslint-disable-next-line no-console
    console.error("[api/error]", {
      statusCode,
      message,
      originalMessage: err?.message || "",
      errorType: err?.type || "",
      errorName: err?.name || "",
      errorCode: err?.code || "",
      stackTop: typeof err?.stack === "string" ? err.stack.split("\n").slice(0, 3).join("\n") : ""
    });
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};
