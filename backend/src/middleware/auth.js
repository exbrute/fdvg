import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { config } from '../config/environment.js';

/**
 * Generate JWT token
 */
export const generateToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      iat: Math.floor(Date.now() / 1000)
    },
    config.jwt.secret,
    { 
      expiresIn: config.jwt.expiresIn,
      issuer: 'vpn-backend',
      subject: userId.toString()
    }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Authentication middleware
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format.'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    // Log authentication failure
    await AuditLog.log({
      action: 'security_event',
      details: {
        type: 'authentication_failure',
        error: error.message,
        ip: req.ip
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'failure'
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

/**
 * Optional authentication middleware
 * Continues even if no token is provided
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Admin authorization middleware
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user has admin privileges
    // This would typically check user.role or similar field
    const isAdmin = req.user.subscription === 'enterprise'; // Example check
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions.'
      });
    }

    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Authorization failed.'
    });
  }
};

/**
 * API key authentication for internal services
 */
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required.'
      });
    }

    if (apiKey !== config.security.adminApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key.'
      });
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'API key authentication failed.'
    });
  }
};