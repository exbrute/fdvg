import Server from '../models/Server.js';
import Connection from '../models/Connection.js';
import AuditLog from '../models/AuditLog.js';

export class ServerService {
  /**
   * Get all available servers with filtering and sorting
   */
  static async getAllServers(filters = {}) {
    const {
      country,
      premiumOnly = false,
      sortBy = 'load',
      sortOrder = 'asc',
      limit = 50,
      offset = 0
    } = filters;

    // Build query
    const query = { active: true };
    
    if (country) {
      query.countryCode = country.toUpperCase();
    }
    
    if (premiumOnly) {
      query['flags.isPremium'] = true;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const servers = await Server.find(query)
      .select('name country countryCode hostname ip port coordinates load ping currentUsers maxUsers flags stats metadata')
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .lean();

    // Add virtual fields and calculate availability
    return servers.map(server => ({
      ...server,
      utilization: Math.round((server.currentUsers / server.maxUsers) * 100),
      isAvailable: server.currentUsers < server.maxUsers * 0.95 && server.load < 90,
      recommended: server.flags.isRecommended || (server.load < 30 && server.ping < 50)
    }));
  }

  /**
   * Get server by ID with detailed information
   */
  static async getServerById(serverId) {
    const server = await Server.findById(serverId);
    
    if (!server) {
      throw new Error('Server not found');
    }

    const connectionsCount = await Connection.getServerConnectionsCount(serverId);
    
    return {
      ...server.toObject(),
      currentConnections: connectionsCount,
      utilization: Math.round((connectionsCount / server.maxUsers) * 100),
      status: server.isAvailable() ? 'online' : 'offline'
    };
  }

  /**
   * Get servers by country code
   */
  static async getServersByCountry(countryCode) {
    const servers = await Server.find({
      countryCode: countryCode.toUpperCase(),
      active: true
    })
    .select('name country countryCode hostname load ping currentUsers maxUsers flags coordinates')
    .sort({ load: 1, ping: 1 })
    .lean();

    return servers.map(server => ({
      ...server,
      available: server.currentUsers < server.maxUsers * 0.95,
      score: this.calculateServerScore(server)
    }));
  }

  /**
   * Find optimal server for user
   */
  static async getOptimalServer(userSubscription = 'free', preferredCountry = null) {
    const query = {
      active: true,
      'stats.healthStatus': 'healthy',
      currentUsers: { $lt: { $multiply: ['$maxUsers', 0.9] } },
      load: { $lt: 80 }
    };

    // Free users can't access premium servers
    if (userSubscription === 'free') {
      query['flags.isPremium'] = false;
    }

    // If country preferred, prioritize servers in that country
    if (preferredCountry) {
      const countryServers = await Server.find({
        ...query,
        countryCode: preferredCountry.toUpperCase()
      })
      .sort({ load: 1, ping: 1, currentUsers: 1 })
      .limit(1)
      .lean();

      if (countryServers.length > 0) {
        return this.enhanceServerData(countryServers[0]);
      }
    }

    // Fallback to global optimal server
    const optimalServer = await Server.findOne(query)
      .sort({ load: 1, ping: 1, currentUsers: 1 })
      .lean();

    if (!optimalServer) {
      throw new Error('No optimal server found');
    }

    return this.enhanceServerData(optimalServer);
  }

  /**
   * Update server load and health metrics
   */
  static async updateServerMetrics(serverId, metrics) {
    const server = await Server.findById(serverId);
    
    if (!server) {
      throw new Error('Server not found');
    }

    const updates = {};
    
    if (metrics.load !== undefined) {
      updates.load = Math.max(0, Math.min(100, metrics.load));
    }
    
    if (metrics.ping !== undefined) {
      updates.ping = Math.max(0, metrics.ping);
    }
    
    if (metrics.currentUsers !== undefined) {
      updates.currentUsers = Math.max(0, Math.min(server.maxUsers, metrics.currentUsers));
    }
    
    if (metrics.healthStatus) {
      updates['stats.healthStatus'] = metrics.healthStatus;
    }

    updates['stats.lastHealthCheck'] = new Date();

    const updatedServer = await Server.findByIdAndUpdate(
      serverId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // Log significant status changes
    if (metrics.healthStatus && metrics.healthStatus !== server.stats.healthStatus) {
      await AuditLog.log({
        action: 'server_status_change',
        resourceId: serverId,
        resourceType: 'server',
        details: {
          from: server.stats.healthStatus,
          to: metrics.healthStatus,
          load: metrics.load,
          currentUsers: metrics.currentUsers
        },
        status: metrics.healthStatus === 'healthy' ? 'success' : 'warning'
      });
    }

    return updatedServer;
  }

  /**
   * Get server statistics and health overview
   */
  static async getServerStats() {
    const stats = await Server.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: null,
          totalServers: { $sum: 1 },
          totalCapacity: { $sum: '$maxUsers' },
          totalUsers: { $sum: '$currentUsers' },
          avgLoad: { $avg: '$load' },
          avgPing: { $avg: '$ping' },
          healthyServers: {
            $sum: {
              $cond: [{ $eq: ['$stats.healthStatus', 'healthy'] }, 1, 0]
            }
          },
          degradedServers: {
            $sum: {
              $cond: [{ $eq: ['$stats.healthStatus', 'degraded'] }, 1, 0]
            }
          },
          offlineServers: {
            $sum: {
              $cond: [{ $eq: ['$stats.healthStatus', 'offline'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const countryStats = await Server.getCountryStats();
    const recentConnections = await Connection.countDocuments({
      startTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    return {
      overview: stats[0] || {},
      byCountry: countryStats,
      recentConnections,
      timestamp: new Date()
    };
  }

  /**
   * Calculate server quality score
   */
  static calculateServerScore(server) {
    const loadScore = Math.max(0, 100 - server.load);
    const pingScore = server.ping > 0 ? Math.max(0, 100 - (server.ping / 2)) : 50;
    const capacityScore = Math.max(0, 100 - (server.currentUsers / server.maxUsers) * 100);
    
    return Math.round((loadScore * 0.4) + (pingScore * 0.4) + (capacityScore * 0.2));
  }

  /**
   * Enhance server data with calculated fields
   */
  static enhanceServerData(server) {
    const score = this.calculateServerScore(server);
    const utilization = Math.round((server.currentUsers / server.maxUsers) * 100);
    
    return {
      ...server,
      score,
      utilization,
      isAvailable: utilization < 95 && server.load < 90,
      quality: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
    };
  }

  /**
   * Get servers that need maintenance
   */
  static async getServersNeedingMaintenance() {
    return await Server.find({
      active: true,
      $or: [
        { load: { $gt: 90 } },
        { 'stats.healthStatus': { $in: ['degraded', 'offline'] } },
        { currentUsers: { $gt: { $multiply: ['$maxUsers', 0.95] } } },
        { 'stats.lastHealthCheck': { $lt: new Date(Date.now() - 5 * 60 * 1000) } }
      ]
    })
    .select('name country hostname load currentUsers maxUsers stats.healthStatus stats.lastHealthCheck')
    .sort({ load: -1 });
  }
}