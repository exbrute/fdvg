import { WebSocketServer } from 'ws';
import { verifyToken } from '../middleware/auth.js';
import Connection from '../models/Connection.js';

const clients = new Map();
const connectionIntervals = new Map();

export const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    perMessageDeflate: false
  });

  wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection established');

    let userId = null;
    let connectionInterval = null;

    // Authenticate connection
    try {
      const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');
      
      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      const decoded = verifyToken(token);
      userId = decoded.userId;

      // Store client connection
      clients.set(userId, ws);
      console.log(`User ${userId} connected via WebSocket`);

    } catch (error) {
      console.log('WebSocket authentication failed:', error.message);
      ws.close(1008, 'Authentication failed');
      return;
    }

    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established',
      timestamp: Date.now()
    }));

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'subscribe_connection':
            await handleConnectionSubscription(ws, userId, message.connectionId);
            break;
            
          case 'subscribe_stats':
            startStatsUpdates(ws, userId);
            break;
            
          case 'unsubscribe_stats':
            stopStatsUpdates(userId);
            break;
            
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;
            
          default:
            console.log('Unknown WebSocket message type:', message.type);
        }

      } catch (error) {
        console.error('WebSocket message error:', error);
        sendError(ws, 'Invalid message format');
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log(`WebSocket connection closed for user ${userId}: ${code} - ${reason}`);
      
      // Clean up
      if (userId) {
        clients.delete(userId);
        stopStatsUpdates(userId);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error for user', userId, error);
      
      if (userId) {
        clients.delete(userId);
        stopStatsUpdates(userId);
      }
    });

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 30 seconds

    // Cleanup on close
    ws.on('close', () => {
      clearInterval(heartbeatInterval);
    });
  });

  return wss;
};

/**
 * Handle connection-specific subscriptions
 */
const handleConnectionSubscription = async (ws, userId, connectionId) => {
  try {
    // Verify user owns this connection
    const connection = await Connection.findById(connectionId);
    
    if (!connection || connection.userId.toString() !== userId) {
      sendError(ws, 'Connection not found or access denied');
      return;
    }

    // Start sending connection updates
    const interval = setInterval(async () => {
      if (ws.readyState === ws.OPEN) {
        try {
          const updatedConnection = await Connection.findById(connectionId)
            .populate('serverId', 'name country load ping');
          
          if (updatedConnection) {
            ws.send(JSON.stringify({
              type: 'connection_update',
              data: {
                connectionId: updatedConnection._id,
                status: updatedConnection.status,
                duration: updatedConnection.currentDuration,
                dataTransferred: updatedConnection.dataTransferred,
                speed: updatedConnection.speed,
                server: updatedConnection.serverId,
                quality: updatedConnection.quality
              },
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          console.error('Error sending connection update:', error);
        }
      } else {
        clearInterval(interval);
      }
    }, 2000); // Update every 2 seconds

    // Store interval for cleanup
    if (connectionIntervals.has(userId)) {
      clearInterval(connectionIntervals.get(userId));
    }
    connectionIntervals.set(userId, interval);

  } catch (error) {
    sendError(ws, 'Failed to subscribe to connection updates');
  }
};

/**
 * Start sending statistics updates
 */
const startStatsUpdates = (ws, userId) => {
  const interval = setInterval(async () => {
    if (ws.readyState === ws.OPEN) {
      try {
        // Get real-time stats for user's active connection
        const activeConnection = await Connection.findActiveByUser(userId);
        
        if (activeConnection) {
          const stats = {
            uploadSpeed: activeConnection.speed.upload + (Math.random() * 10 - 5), // Simulate variation
            downloadSpeed: activeConnection.speed.download + (Math.random() * 20 - 10),
            ping: activeConnection.speed.ping + (Math.random() * 10 - 5),
            dataTransferred: activeConnection.dataTransferred,
            duration: activeConnection.currentDuration
          };

          ws.send(JSON.stringify({
            type: 'stats_update',
            data: stats,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Error sending stats update:', error);
      }
    } else {
      clearInterval(interval);
    }
  }, 1000); // Update every second

  // Store interval for cleanup
  if (connectionIntervals.has(userId)) {
    clearInterval(connectionIntervals.get(userId));
  }
  connectionIntervals.set(userId, interval);
};

/**
 * Stop statistics updates
 */
const stopStatsUpdates = (userId) => {
  if (connectionIntervals.has(userId)) {
    clearInterval(connectionIntervals.get(userId));
    connectionIntervals.delete(userId);
  }
};

/**
 * Send error message to WebSocket client
 */
const sendError = (ws, message) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      message,
      timestamp: Date.now()
    }));
  }
};

/**
 * Broadcast message to specific user
 */
export const broadcastToUser = (userId, data) => {
  const client = clients.get(userId);
  if (client && client.readyState === client.OPEN) {
    client.send(JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
  }
};

/**
 * Broadcast message to all connected clients
 */
export const broadcastToAll = (data) => {
  clients.forEach((client, userId) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
    }
  });
};

/**
 * Get connected clients count
 */
export const getConnectedClientsCount = () => {
  return clients.size;
};