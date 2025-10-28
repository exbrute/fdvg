import { body, param, query, validationResult } from 'express-validator';
import User from '../models/User.js';

/**
 * Common validation rules
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Authentication validation rules
 */
export const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores')
    .custom(async (username) => {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error('Username already exists');
      }
    }),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .custom(async (email) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already exists');
      }
    }),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  validateRequest
];

export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  validateRequest
];

export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),

  validateRequest
];

/**
 * VPN connection validation rules
 */
export const validateConnection = [
  body('serverId')
    .isMongoId()
    .withMessage('Invalid server ID'),

  body('clientInfo')
    .optional()
    .isObject()
    .withMessage('Client info must be an object'),

  body('clientInfo.ip')
    .optional()
    .isIP()
    .withMessage('Invalid IP address'),

  body('clientInfo.userAgent')
    .optional()
    .isString()
    .withMessage('User agent must be a string'),

  validateRequest
];

export const validateStatsUpdate = [
  body('upload')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Upload must be a positive number'),

  body('download')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Download must be a positive number'),

  body('uploadSpeed')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Upload speed must be a positive number'),

  body('downloadSpeed')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Download speed must be a positive number'),

  body('ping')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ping must be a positive number'),

  validateRequest
];

/**
 * Server query validation
 */
export const validateServerQuery = [
  query('country')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country code must be 2 characters')
    .isUppercase()
    .withMessage('Country code must be uppercase'),

  query('premium')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Premium must be true or false'),

  query('sortBy')
    .optional()
    .isIn(['name', 'country', 'load', 'ping', 'currentUsers'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a positive integer'),

  validateRequest
];

/**
 * Parameter validation
 */
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),

  validateRequest
];

export const validateConnectionId = [
  param('connectionId')
    .isMongoId()
    .withMessage('Invalid connection ID format'),

  validateRequest
];

export const validateServerId = [
  param('serverId')
    .isMongoId()
    .withMessage('Invalid server ID format'),

  validateRequest
];

/**
 * Profile update validation
 */
export const validateProfileUpdate = [
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),

  body('preferences.theme')
    .optional()
    .isIn(['dark', 'light', 'oled', 'gradient'])
    .withMessage('Invalid theme'),

  body('preferences.accentColor')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Invalid color format'),

  body('preferences.autoConnect')
    .optional()
    .isBoolean()
    .withMessage('Auto connect must be a boolean'),

  body('preferences.killSwitch')
    .optional()
    .isBoolean()
    .withMessage('Kill switch must be a boolean'),

  body('preferences.notifications')
    .optional()
    .isObject()
    .withMessage('Notifications must be an object'),

  body('preferences.notifications.connection')
    .optional()
    .isBoolean()
    .withMessage('Connection notifications must be a boolean'),

  body('preferences.notifications.security')
    .optional()
    .isBoolean()
    .withMessage('Security notifications must be a boolean'),

  body('preferences.notifications.updates')
    .optional()
    .isBoolean()
    .withMessage('Update notifications must be a boolean'),

  validateRequest
];