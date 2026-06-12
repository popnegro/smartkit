export class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(_req, _res, next) {
  next(new AppError(404, 'Resource not found'));
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  const payload = {
    error: status >= 500 ? 'Internal server error' : error.message
  };
  if (error.details) payload.details = error.details;
  if (status >= 500) console.error(error);
  res.status(status).json(payload);
}
