import cron from 'node-cron';
import Server from '../models/Server.js';
import Connection from '../models/Connection.js';
import { ServerService } from '../services/serverService.js';

/**
 * Server health monitoring job
 * Runs every 5 minutes to check server status and update metrics
 */
export const startMonitoringJobs = () => {
  console.log('🔄 Starting server monitoring jobs...');

  // Monitor server health every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('🔍 Running server health check...');
      await monitorServerHealth();
    } catch (error) {
      console.error('❌ Server health check failed:', error);
    }
  });

  // Update server loads every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      await updateServerLoads();
    } catch (error) {
      console.error('❌ Server load update failed:', error);
    }
  });

  // Check for overloaded servers every minute
  cron.schedule('* * * * *', async () => {
    try {
      await checkOverloadedServers();
    } catch (error) {
      console.error('❌ Overload check failed:', error);
    }
  });
};

/**
 * Monitor server health and update status
 */
const monitorServerHealth = async () => {
  const servers = await Server.find({ active: true });
  
  const healthChecks = servers.map(async (server) => {
    try {
      // Simulate health check (in production, this would ping the actual server)
      const isHealthy = await simulateHealthCheck(server);
      const currentLoad = await calculateServerLoad(server);
      const ping = await simulatePing(server);
      
      await ServerService.updateServerMetrics(server._id, {
        load: currentLoad,
        ping: ping,
        healthStatus: isHealthy ? 'healthy' : 'offline',
        currentUsers: await Connection.getServerConnectionsCount(server._id)
      });
      
      return {
        server: server.name,
        status: isHealthy ? 'healthy' : 'offline',
        load: currentLoad,
        ping: ping
      };
      
    } catch (error) {
      console.error(`Health check failed for server ${server.name}:`, error);
      
      // Mark server as offline if health check fails
      await ServerService.updateServerMetrics(server._id, {
        healthStatus: 'offline',
        load: 100
      });
      
      return {
        server: server.name,
        status: 'offline',
        error: error.message
      };
    }
  });

  const results = await Promise.allSettled(healthChecks);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`✅ Server health check completed: ${successful} successful, ${failed} failed`);
};

/**
 * Update server load metrics based on current usage
 */
const updateServerLoads = async () => {
  const servers = await Server.find({ active: true });
  
  for (const server of servers) {
    try {
      const currentConnections = await Connection.getServerConnectionsCount(server._id);
      const utilization = (currentConnections / server.maxUsers) * 100;
      
      // Add some random variation to simulate real load
      const randomVariation = (Math.random() * 20) - 10; // -10 to +10
      const simulatedLoad = Math.max(0, Math.min(100, utilization + randomVariation));
      
      await ServerService.updateServerMetrics(server._id, {
        load: simulatedLoad,
        currentUsers: currentConnections
      });
      
    } catch (error) {
      console.error(`Failed to update load for server ${server.name}:`, error);
    }
  }
};

/**
 * Check for overloaded servers and take action
 */
const checkOverloadedServers = async () => {
  const overloadedServers = await Server.find({
    active: true,
    $or: [
      { load: { $gt: 90 } },
      { currentUsers: { $gt: { $multiply: ['$maxUsers', 0.95] } } }
    ]
  });

  if (overloadedServers.length > 0) {
    console.warn(`🚨 Found ${overloadedServers.length} overloaded servers:`);
    
    overloadedServers.forEach(server => {
      console.warn(`   - ${server.name} (${server.country}): ${server.load}% load, ${server.currentUsers}/${server.maxUsers} users`);
    });

    // In production, this could trigger alerts or auto-scaling
  }
};

/**
 * Simulate server health check
 */
const simulateHealthCheck = async (server) => {
  // Simulate occasional failures (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Simulated health check failure');
  }
  
  // Server is considered healthy if load < 95%
  return server.load < 95;
};

/**
 * Calculate simulated server load
 */
const calculateServerLoad = async (server) => {
  const baseLoad = (server.currentUsers / server.maxUsers) * 100;
  
  // Add some realistic variation
  const variation = (Math.random() * 30) - 15; // -15 to +15
  return Math.max(0, Math.min(100, baseLoad + variation));
};

/**
 * Simulate ping time to server
 */
const simulatePing = async (server) => {
  // Base ping based on server location (simplified)
  const basePing = getBasePingByRegion(server.countryCode);
  
  // Add some random variation
  const variation = Math.random() * 50; // 0-50ms variation
  return Math.round(basePing + variation);
};

/**
 * Get base ping time by region
 */
const getBasePingByRegion = (countryCode) => {
  const regionPing = {
    // North America
    'US': 30, 'CA': 40, 'MX': 60,
    // Europe
    'GB': 20, 'DE': 25, 'FR': 25, 'NL': 20, 'SE': 30,
    // Asia
    'JP': 120, 'SG': 150, 'KR': 130, 'HK': 140,
    // Australia
    'AU': 180, 'NZ': 190,
    // South America
    'BR': 100, 'AR': 120, 'CL': 110,
    // Africa
    'ZA': 200, 'EG': 150, 'KE': 220
  };
  
  return regionPing[countryCode] || 100; // Default ping
};