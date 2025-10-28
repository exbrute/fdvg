import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { userLimiter } from '../middleware/rateLimiter.js';
import Connection from '../models/Connection.js';
import User from '../models/User.js';
import Server from '../models/Server.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// User statistics
router.get('/user', authenticate, userLimiter, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get connection statistics for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const connectionStats = await Connection.aggregate([
      {
        $match: {
          userId: userId,
          startTime: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$startTime' },
            month: { $month: '$startTime' },
            day: { $dayOfMonth: '$startTime' }
          },
          totalConnections: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalUpload: { $sum: '$dataTransferred.upload' },
          totalDownload: { $sum: '$dataTransferred.download' },
          avgSpeed: {
            $avg: {
              $add: ['$speed.upload', '$speed.download']
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get server usage distribution
    const serverUsage = await Connection.aggregate([
      {
        $match: {
          userId: userId,
          startTime: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$serverId',
          connectionCount: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalData: {
            $sum: {
              $add: ['$dataTransferred.upload', '$dataTransferred.download']
            }
          }
        }
      },
      {
        $lookup: {
          from: 'servers',
          localField: '_id',
          foreignField: '_id',
          as: 'server'
        }
      },
      {
        $unwind: '$server'
      },
      {
        $project: {
          serverName: '$server.name',
          serverCountry: '$server.country',
          connectionCount: 1,
          totalDuration: 1,
          totalData: 1
        }
      },
      { $sort: { connectionCount: -1 } },
      { $limit: 10 }
    ]);

    // Get current session if any
    const activeConnection = await Connection.findActiveByUser(userId);

    res.json({
      success: true,
      data: {
        overview: {
          totalConnections: connectionStats.reduce((sum, day) => sum + day.totalConnections, 0),
          totalDuration: connectionStats.reduce((sum, day) => sum + day.totalDuration, 0),
          totalData: connectionStats.reduce((sum, day) => sum + day.totalUpload + day.totalDownload, 0),
          activeSession: activeConnection ? {
            duration: activeConnection.currentDuration,
            server: activeConnection.serverId.name,
            dataTransferred: activeConnection.dataTransferred
          } : null
        },
        dailyStats: connectionStats,
        serverUsage,
        period: {
          start: thirtyDaysAgo,
          end: new Date()
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// Admin statistics
router.get('/admin/overview', authenticate, requireAdmin, userLimiter, async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Platform overview
    const platformStats = await Promise.all([
      User.countDocuments(),
      User.getUserStats(),
      Connection.countDocuments({ startTime: { $gte: twentyFourHoursAgo } }),
      Server.countDocuments({ active: true }),
      Server.aggregate([
        { $match: { active: true } },
        {
          $group: {
            _id: null,
            totalCapacity: { $sum: '$maxUsers' },
            currentUsers: { $sum: '$currentUsers' },
            avgLoad: { $avg: '$load' }
          }
        }
      ]),
      AuditLog.countDocuments({ timestamp: { $gte: twentyFourHoursAgo } })
    ]);

    const [totalUsers, userStats, dailyConnections, activeServers, serverCapacity, dailyLogs] = platformStats;

    // Connection trends
    const connectionTrends = await Connection.aggregate([
      {
        $match: {
          startTime: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$startTime' },
            month: { $month: '$startTime' },
            day: { $dayOfMonth: '$startTime' }
          },
          connections: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          totalData: {
            $sum: {
              $add: ['$dataTransferred.upload', '$dataTransferred.download']
            }
          }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          connections: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          totalData: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Server performance
    const serverPerformance = await Server.aggregate([
      { $match: { active: true } },
      {
        $project: {
          name: 1,
          country: 1,
          load: 1,
          currentUsers: 1,
          maxUsers: 1,
          utilization: {
            $multiply: [
              { $divide: ['$currentUsers', '$maxUsers'] },
              100
            ]
          },
          healthStatus: '$stats.healthStatus'
        }
      },
      { $sort: { load: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: {
        platform: {
          totalUsers,
          userDistribution: userStats,
          activeServers,
          serverCapacity: serverCapacity[0] || {},
          dailyConnections,
          dailyLogs
        },
        trends: {
          connectionTrends,
          period: {
            start: sevenDaysAgo,
            end: new Date()
          }
        },
        performance: {
          servers: serverPerformance,
          timestamp: new Date()
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics'
    });
  }
});

// Real-time statistics for dashboard
router.get('/realtime', authenticate, userLimiter, async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const realtimeStats = await Promise.all([
      Connection.countDocuments({
        status: 'connected',
        'speed.lastUpdate': { $gte: fiveMinutesAgo }
      }),
      Server.aggregate([
        { $match: { active: true } },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: '$currentUsers' },
            avgLoad: { $avg: '$load' },
            healthyServers: {
              $sum: {
                $cond: [{ $eq: ['$stats.healthStatus', 'healthy'] }, 1, 0]
              }
            }
          }
        }
      ]),
      Connection.aggregate([
        {
          $match: {
            status: 'connected',
            'speed.lastUpdate': { $gte: fiveMinutesAgo }
          }
        },
        {
          $group: {
            _id: null,
            avgUploadSpeed: { $avg: '$speed.upload' },
            avgDownloadSpeed: { $avg: '$speed.download' },
            avgPing: { $avg: '$speed.ping' }
          }
        }
      ])
    ]);

    const [activeConnections, serverOverview, speedStats] = realtimeStats;

    res.json({
      success: true,
      data: {
        activeConnections,
        serverOverview: serverOverview[0] || {},
        speedStats: speedStats[0] || {},
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time statistics'
    });
  }
});

export default router;