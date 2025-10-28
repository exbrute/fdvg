import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { generateToken } from '../middleware/auth.js';
import { validationResult } from 'express-validator';

export const register = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new user
    const user = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log registration
    await AuditLog.log({
      action: 'user_registered',
      userId: user._id,
      resourceType: 'user',
      details: {
        username: user.username,
        email: user.email
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          preferences: user.preferences,
          subscription: user.subscription,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      await AuditLog.log({
        action: 'user_login',
        details: {
          email,
          reason: 'user_not_found'
        },
        ipAddress: req.ip,
        status: 'failure'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      await AuditLog.log({
        action: 'user_login',
        userId: user._id,
        details: {
          reason: 'account_inactive'
        },
        ipAddress: req.ip,
        status: 'failure'
      });

      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await AuditLog.log({
        action: 'user_login',
        userId: user._id,
        details: {
          reason: 'invalid_password'
        },
        ipAddress: req.ip,
        status: 'failure'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log successful login
    await AuditLog.log({
      action: 'user_login',
      userId: user._id,
      resourceType: 'user',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          preferences: user.preferences,
          subscription: user.subscription,
          dataUsage: user.dataUsage,
          limits: user.limits,
          lastLogin: user.lastLogin
        },
        token
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Get user statistics
    const activeConnection = await Connection.findActiveByUser(req.user._id);
    const connectionStats = await Connection.getDataUsageByPeriod(
      req.user._id,
      new Date(user.dataUsage.resetDate),
      new Date()
    );

    const stats = connectionStats[0] || {
      totalUpload: 0,
      totalDownload: 0,
      totalConnections: 0
    };

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          preferences: user.preferences,
          subscription: user.subscription,
          dataUsage: user.dataUsage,
          limits: user.limits,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        stats: {
          activeConnection: !!activeConnection,
          currentSession: activeConnection ? {
            duration: activeConnection.currentDuration,
            server: activeConnection.serverId
          } : null,
          dataUsage: {
            upload: stats.totalUpload || 0,
            download: stats.totalDownload || 0,
            total: (stats.totalUpload || 0) + (stats.totalDownload || 0),
            remaining: user.getRemainingData(),
            resetDate: user.dataUsage.resetDate
          },
          totalConnections: stats.totalConnections || 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { preferences } = req.body;
    const userId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          preferences: {
            ...req.user.preferences,
            ...preferences
          }
        } 
      },
      { 
        new: true, 
        runValidators: true 
      }
    );

    // Log profile update
    await AuditLog.log({
      action: 'config_update',
      userId,
      resourceType: 'user',
      details: {
        type: 'preferences_update',
        changes: Object.keys(preferences)
      },
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          preferences: updatedUser.preferences,
          subscription: updatedUser.subscription
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Get user with password
    const user = await User.findById(userId).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change
    await AuditLog.log({
      action: 'security_event',
      userId,
      resourceType: 'user',
      details: {
        type: 'password_change'
      },
      ipAddress: req.ip,
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    next(error);
  }
};

export const getActivity = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 20 } = req.query;

    const activity = await AuditLog.getUserActivity(userId, parseInt(limit));

    res.json({
      success: true,
      data: activity
    });

  } catch (error) {
    next(error);
  }
};