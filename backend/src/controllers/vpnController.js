import { WireGuardService } from '../services/wireguardService.js';
import { validationResult } from 'express-validator';
import Connection from '../models/Connection.js';
import User from '../models/User.js';
import Server from '../models/Server.js';
import AuditLog from '../models/AuditLog.js';
import { broadcastToUser } from '../utils/websocket.js';

export const connect = async (req, res, next) => {
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

    const { serverId, clientInfo = {} } = req.body;
    const userId = req.user._id.toString();

    const result = await WireGuardService.connect(userId, serverId, {
      ...clientInfo,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Notify via WebSocket
    broadcastToUser(userId, {
      type: 'connection_started',
      data: {
        connectionId: result.connectionId,
        status: 'connecting',
        server: result.server
      }
    });

    res.status(201).json({
      success: true,
      message: 'Connection initiated successfully',
      data: result
    });

  } catch (error) {
    next(error);
  }
};

export const disconnect = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user._id.toString();

    const result = await WireGuardService.disconnect(connectionId, userId);

    // Notify via WebSocket
    broadcastToUser(userId, {
      type: 'connection_ended',
      data: {
        connectionId,
        duration: result.duration,
        dataTransferred: result.dataTransferred
      }
    });

    res.json({
      success: true,
      message: 'Disconnected successfully',
      data: result
    });

  } catch (error) {
    next(error);
  }
};

export const disconnectAll = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();

    const result = await WireGuardService.disconnectAllUserConnections(userId);

    // Notify via WebSocket
    broadcastToUser(userId, {
      type: 'all_connections_ended',
      data: result
    });

    res.json({
      success: true,
      message: `Disconnected ${result.successful} connection(s)`,
      data: result
    });

  } catch (error) {
    next(error);
  }
};

export const getStatus = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();

    const activeConnection = await Connection.findActiveByUser(userId);
    
    if (!activeConnection) {
      return res.json({
        success: true,
        data: {
          isConnected: false,
          connection: null
        }
      });
    }

    const status = await WireGuardService.getConnectionStatus(activeConnection._id, userId);

    res.json({
      success: true,
      data: {
        isConnected: true,
        connection: status
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getConnectionStatus = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user._id.toString();

    const status = await WireGuardService.getConnectionStatus(connectionId, userId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    next(error);
  }
};

export const updateStats = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { connectionId } = req.params;
    const { upload, download, uploadSpeed, downloadSpeed, ping } = req.body;
    const userId = req.user._id.toString();

    const updatedConnection = await WireGuardService.updateStats(
      connectionId,
      { upload, download, uploadSpeed, downloadSpeed, ping },
      userId
    );

    // Notify via WebSocket for real-time updates
    broadcastToUser(userId, {
      type: 'stats_updated',
      data: {
        connectionId,
        stats: {
          uploadSpeed: updatedConnection.speed.upload,
          downloadSpeed: updatedConnection.speed.download,
          ping: updatedConnection.speed.ping,
          dataTransferred: updatedConnection.dataTransferred
        }
      }
    });

    res.json({
      success: true,
      message: 'Statistics updated successfully',
      data: updatedConnection
    });

  } catch (error) {
    next(error);
  }
};

export const getConnectionHistory = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { limit = 10, offset = 0 } = req.query;

    const connections = await Connection.find({ userId })
      .populate('serverId', 'name country hostname load ping')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Connection.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        connections,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + connections.length < total
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getConfigFile = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user._id.toString();

    const configFile = await WireGuardService.getConfigFile(connectionId, userId);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${configFile.filename}"`);

    res.send(configFile.content);

  } catch (error) {
    next(error);
  }
};

export const quickConnect = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { preferredCountry } = req.body;

    // Get optimal server
    const user = await User.findById(userId);
    const ServerService = (await import('../services/serverService.js')).ServerService;
    const optimalServer = await ServerService.getOptimalServer(
      user.subscription, 
      preferredCountry
    );

    if (!optimalServer) {
      return res.status(404).json({
        success: false,
        message: 'No available servers found'
      });
    }

    // Connect to optimal server
    const result = await WireGuardService.connect(
      userId, 
      optimalServer._id, 
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    // Log quick connect action
    await AuditLog.log({
      action: 'connection_start',
      userId,
      resourceId: result.connectionId,
      resourceType: 'connection',
      details: {
        type: 'quick_connect',
        server: optimalServer.name,
        country: optimalServer.country
      },
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Quick connection established',
      data: result
    });

  } catch (error) {
    next(error);
  }
};