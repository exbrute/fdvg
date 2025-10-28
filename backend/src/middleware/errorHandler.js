import { config } from '../config/environment.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id
  });

  // Log security-related errors
  if (isSecurityError(error)) {
    AuditLog.log({
      action: 'security_event',
      userId: req.user?._id,
      details: {
        type: 'error',
        message: error.message,
        url: req.originalUrl,
        method: req.method
      },
      ipAddress: req.ip,
      status: 'failure'
    }).catch(console.error);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = createError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = createError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    const message = `Validation failed: ${messages.join(', ')}`;
    error = createError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = createError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = createError(message, 401);
  }

  // Rate limit error
  if (err.status === 429) {
    error = createError('Too many requests, please try again later.', 429);
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  const errorResponse = {
    success: false,
    message,
    ...(config.env === 'development' && { stack: error.stack })
  };

  // Include validation errors if available
  if (error.errors) {
    errorResponse.errors = error.errors;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Create standardized error object
 */
const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Check if error is security-related
 */
const isSecurityError = (error) => {
  const securityKeywords = [
    'token', 'auth', 'password', 'permission', 'access', 'unauthorized',
    'forbidden', 'jwt', 'session', 'brute', 'rate limit'
  ];

  return securityKeywords.some(keyword => 
    error.message.toLowerCase().includes(keyword)
  );
};

/**
 * Async error handler wrapper
 * Catches async errors and passes them to errorHandler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler for undefined routes
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};