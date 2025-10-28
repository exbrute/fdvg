import rateLimit from 'express-rate-limit';
import { config } from '../config/environment.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Create rate limiters with different configurations
 */
const createLimiter = (windowMs, max, message, keyGenerator = null) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    keyGenerator: keyGenerator || ((req) => req.ip),
    handler: async (req, res) => {
      // Log rate limit hits for security monitoring
      await AuditLog.log({
        action: 'security_event',
        userId: req.user?._id,
        details: {
          type: 'rate_limit_exceeded',
          windowMs,
          max,
          path: req.path,
          method: req.method
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'warning'
      });

      res.status(429).json({
        success: false,
        message
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

/**
 * General API rate limiter
 */
export const generalLimiter = createLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.max,
  'Too many requests from this IP, please try again later.'
);

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  'Too many authentication attempts, please try again later.'
);

/**
 * Connection rate limiter
 */
export const connectionLimiter = createLimiter(
  60 * 1000, // 1 minute
  10, // 10 connection attempts per minute
  'Too many connection attempts, please try again later.'
);

/**
 * Strict rate limiter per user
 */
export const userLimiter = createLimiter(
  config.rateLimit.windowMs,
  50, // 50 requests per window per user
  'Too many requests from this account, please try again later.',
  (req) => req.user?._id?.toString() || req.ip
);

/**
 * Public endpoints rate limiter (more generous)
 */
export const publicLimiter = createLimiter(
  config.rateLimit.windowMs,
  200, // 200 requests per window
  'Too many requests, please try again later.'
);

/**
 * WebSocket connection rate limiter
 */
export const websocketLimiter = createLimiter(
  60 * 1000, // 1 minute
  20, // 20 WebSocket connections per minute
  'Too many WebSocket connections, please try again later.'
);