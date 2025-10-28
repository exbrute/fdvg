import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Connection from '../models/Connection.js';
import Server from '../models/Server.js';
import AuditLog from '../models/AuditLog.js';
import { generateWireGuardConfig, formatWireGuardConfig, CryptoUtils } from '../utils/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class WireGuardService {
  /**
   * Establish a new VPN connection
   */
  static async connect(userId, serverId, clientInfo = {}) {
    let connection;
    
    try {
      // Validate inputs
      if (!userId || !serverId) {
        throw new Error('User ID and Server ID are required');
      }

      // Find the server
      const server = await Server.findById(serverId);
      if (!server) {
        throw new Error('Server not found');
      }

      if (!server.active) {
        throw new Error('Server is not active');
      }

      if (!server.isAvailable()) {
        throw new Error('Server is not available for new connections');
      }

      // Check if user already has active connection
      const activeConnection = await Connection.findActiveByUser(userId);
      if (activeConnection) {
        await this.disconnect(activeConnection._id);
      }

      // Check server capacity
      const currentConnections = await Connection.getServerConnectionsCount(serverId);
      if (currentConnections >= server.maxUsers * 0.95) {
        throw new Error('Server is at capacity');
      }

      // Generate WireGuard configuration
      const config = await generateWireGuardConfig(server, { _id: userId });

      // Create connection record
      connection = new Connection({
        userId,
        serverId: server._id,
        config,
        status: 'connecting',
        startTime: new Date(),
        clientInfo: {
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          platform: clientInfo.platform,
          country: clientInfo.country,
          city: clientInfo.city
        },
        metadata: {
          killSwitchEnabled: clientInfo.killSwitch !== false,
          protocol: 'wireguard'
        }
      });

      await connection.save();

      // Generate config file
      const configContent = formatWireGuardConfig(config);
      const configFileName = `wg-${connection._id}.conf`;
      const configFilePath = path.join(process.cwd(), 'wireguard-configs', configFileName);

      // Ensure directory exists
      await fs.mkdir(path.dirname(configFilePath), { recursive: true });
      await fs.writeFile(configFilePath, configContent, 'utf8');

      // Update connection with config file path
      connection.config.configFile = configFileName;
      await connection.save();

      // Log the connection attempt
      await AuditLog.log({
        action: 'connection_start',
        userId,
        resourceId: connection._id,
        resourceType: 'connection',
        details: {
          server: server.name,
          country: server.country,
          hostname: server.hostname
        },
        ipAddress: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: 'success'
      });

      // Simulate connection process (in real implementation, this would interface with WireGuard)
      setTimeout(async () => {
        try {
          connection.status = 'connected';
          await connection.save();

          // Update server user count
          await Server.findByIdAndUpdate(serverId, {
            $inc: { currentUsers: 1 },
            $set: { 'stats.lastHealthCheck': new Date() }
          });

          // Log successful connection
          await AuditLog.log({
            action: 'connection_start',
            userId,
            resourceId: connection._id,
            resourceType: 'connection',
            details: {
              server: server.name,
              status: 'connected',
              duration: connection.currentDuration
            },
            status: 'success'
          });

        } catch (error) {
          console.error('Error updating connection status:', error);
        }
      }, 2000);

      return {
        success: true,
        connectionId: connection._id,
        config: connection.getClientConfig(),
        server: {
          id: server._id,
          name: server.name,
          country: server.country,
          countryCode: server.countryCode,
          hostname: server.hostname,
          load: server.load,
          ping: server.ping
        },
        estimatedWait: 2 // seconds
      };

    } catch (error) {
      // Log failed connection attempt
      if (connection) {
        await connection.markError('CONNECTION_FAILED', error.message);
      }

      await AuditLog.log({
        action: 'connection_start',
        userId,
        resourceId: serverId,
        resourceType: 'connection',
        details: {
          error: error.message,
          serverId
        },
        ipAddress: clientInfo.ip,
        status: 'failure'
      });

      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect an active connection
   */
  static async disconnect(connectionId, userId = null) {
    let connection;
    
    try {
      // Find the connection
      connection = await Connection.findById(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Verify ownership if userId is provided
      if (userId && connection.userId.toString() !== userId) {
        throw new Error('Access denied');
      }

      // Calculate duration
      const endTime = new Date();
      const duration = Math.floor((endTime - connection.startTime) / 1000);

      // Update connection
      connection.status = 'disconnected';
      connection.endTime = endTime;
      connection.duration = duration;
      await connection.save();

      // Update server user count
      await Server.findByIdAndUpdate(connection.serverId, {
        $inc: { currentUsers: -1 }
      });

      // Clean up config file
      if (connection.config.configFile) {
        const configFilePath = path.join(process.cwd(), 'wireguard-configs', connection.config.configFile);
        try {
          await fs.unlink(configFilePath);
        } catch (error) {
          console.warn('Could not delete config file:', error.message);
        }
      }

      // Log disconnection
      await AuditLog.log({
        action: 'connection_end',
        userId: connection.userId,
        resourceId: connection._id,
        resourceType: 'connection',
        details: {
          duration,
          dataTransferred: connection.dataTransferred
        },
        status: 'success'
      });

      return {
        success: true,
        duration,
        dataTransferred: connection.dataTransferred
      };

    } catch (error) {
      if (connection) {
        await connection.markError('DISCONNECT_FAILED', error.message);
      }

      await AuditLog.log({
        action: 'connection_end',
        userId: connection?.userId,
        resourceId: connectionId,
        resourceType: 'connection',
        details: {
          error: error.message
        },
        status: 'failure'
      });

      throw new Error(`Disconnection failed: ${error.message}`);
    }
  }

  /**
   * Get connection status
   */
  static async getConnectionStatus(connectionId, userId) {
    try {
      const connection = await Connection.findById(connectionId)
        .populate('serverId', 'name country hostname load ping');
      
      if (!connection) {
        throw new Error('Connection not found');
      }

      if (connection.userId.toString() !== userId) {
        throw new Error('Access denied');
      }

      return {
        connectionId: connection._id,
        status: connection.status,
        server: connection.serverId,
        duration: connection.currentDuration,
        dataTransferred: connection.dataTransferred,
        speed: connection.speed,
        quality: connection.quality,
        startTime: connection.startTime
      };

    } catch (error) {
      throw new Error(`Failed to get connection status: ${error.message}`);
    }
  }

  /**
   * Update connection statistics
   */
  static async updateStats(connectionId, stats, userId) {
    try {
      const connection = await Connection.findById(connectionId);
      
      if (!connection) {
        throw new Error('Connection not found');
      }

      if (connection.userId.toString() !== userId) {
        throw new Error('Access denied');
      }

      if (connection.status !== 'connected') {
        throw new Error('Connection is not active');
      }

      // Update speed metrics
      if (stats.uploadSpeed !== undefined || stats.downloadSpeed !== undefined || stats.ping !== undefined) {
        await connection.updateSpeed(
          stats.uploadSpeed || connection.speed.upload,
          stats.downloadSpeed || connection.speed.download,
          stats.ping || connection.speed.ping
        );
      }

      // Update data transfer
      if (stats.upload !== undefined || stats.download !== undefined) {
        await connection.addDataTransfer(
          stats.upload || 0,
          stats.download || 0
        );
      }

      return await Connection.findById(connectionId);

    } catch (error) {
      throw new Error(`Failed to update stats: ${error.message}`);
    }
  }

  /**
   * Force disconnect all user connections
   */
  static async disconnectAllUserConnections(userId) {
    try {
      const activeConnections = await Connection.find({
        userId,
        status: { $in: ['connected', 'connecting'] }
      });

      const results = await Promise.allSettled(
        activeConnections.map(conn => this.disconnect(conn._id, userId))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        total: activeConnections.length,
        successful,
        failed
      };

    } catch (error) {
      throw new Error(`Failed to disconnect all connections: ${error.message}`);
    }
  }

  /**
   * Get connection configuration file
   */
  static async getConfigFile(connectionId, userId) {
    try {
      const connection = await Connection.findById(connectionId);
      
      if (!connection) {
        throw new Error('Connection not found');
      }

      if (connection.userId.toString() !== userId) {
        throw new Error('Access denied');
      }

      if (!connection.config.configFile) {
        throw new Error('Configuration file not found');
      }

      const configFilePath = path.join(process.cwd(), 'wireguard-configs', connection.config.configFile);
      const configContent = await fs.readFile(configFilePath, 'utf8');

      return {
        filename: `vpn-${connection.serverId.name.toLowerCase()}.conf`,
        content: configContent,
        connectionId: connection._id,
        server: connection.serverId.name
      };

    } catch (error) {
      throw new Error(`Failed to get config file: ${error.message}`);
    }
  }
}