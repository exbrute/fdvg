import cron from 'node-cron';
import Connection from '../models/Connection.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Cleanup and maintenance jobs
 */
export const startCleanupJobs = () => {
  console.log('🧹 Starting cleanup jobs...');

  // Cleanup old connections every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await cleanupOldConnections();
    } catch (error) {
      console.error('❌ Connection cleanup failed:', error);
    }
  });

  // Cleanup old audit logs daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      await cleanupOldAuditLogs();
    } catch (error) {
      console.error('❌ Audit log cleanup failed:', error);
    }
  });

  // Cleanup orphaned config files every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await cleanupOrphanedConfigs();
    } catch (error) {
      console.error('❌ Config cleanup failed:', error);
    }
  });

  // Reset data usage monthly
  cron.schedule('0 0 1 * *', async () => {
    try {
      await resetDataUsage();
    } catch (error) {
      console.error('❌ Data usage reset failed:', error);
    }
  });

  // Database maintenance weekly
  cron.schedule('0 3 * * 0', async () => {
    try {
      await performDatabaseMaintenance();
    } catch (error) {
      console.error('❌ Database maintenance failed:', error);
    }
  });
};

/**
 * Cleanup connections older than 30 days
 */
const cleanupOldConnections = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const result = await Connection.deleteMany({
    status: 'disconnected',
    endTime: { $lt: thirtyDaysAgo }
  });
  
  console.log(`🧹 Cleaned up ${result.deletedCount} old connections`);
};

/**
 * Cleanup audit logs older than 90 days
 */
const cleanupOldAuditLogs = async () => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  const result = await AuditLog.deleteMany({
    timestamp: { $lt: ninetyDaysAgo }
  });
  
  console.log(`🧹 Cleaned up ${result.deletedCount} old audit logs`);
};

/**
 * Cleanup orphaned WireGuard config files
 */
const cleanupOrphanedConfigs = async () => {
  try {
    const configsDir = path.join(process.cwd(), 'wireguard-configs');
    
    // Get all config files
    const files = await fs.readdir(configsDir);
    const configFiles = files.filter(file => file.endsWith('.conf'));
    
    let cleanedCount = 0;
    
    for (const file of configFiles) {
      try {
        // Extract connection ID from filename (wg-{connectionId}.conf)
        const match = file.match(/^wg-([a-f0-9]+)\.conf$/);
        if (!match) continue;
        
        const connectionId = match[1];
        
        // Check if connection exists and is active
        const connection = await Connection.findById(connectionId);
        
        if (!connection || connection.status === 'disconnected') {
          // Delete orphaned or completed connection config
          await fs.unlink(path.join(configsDir, file));
          cleanedCount++;
        }
        
      } catch (error) {
        console.warn(`Could not process config file ${file}:`, error.message);
      }
    }
    
    console.log(`🧹 Cleaned up ${cleanedCount} orphaned config files`);
    
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Directory doesn't exist yet, which is fine
  }
};

/**
 * Reset monthly data usage for all users
 */
const resetDataUsage = async () => {
  const result = await User.updateMany(
    {},
    {
      $set: {
        'dataUsage.upload': 0,
        'dataUsage.download': 0,
        'dataUsage.resetDate': new Date()
      }
    }
  );
  
  console.log(`🔄 Reset data usage for ${result.modifiedCount} users`);
};

/**
 * Perform database maintenance tasks
 */
const performDatabaseMaintenance = async () => {
  console.log('🔧 Performing database maintenance...');
  
  try {
    // Get database statistics
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;
    
    // Run compact command on collections (if supported)
    const collections = ['users', 'servers', 'connections', 'auditlogs'];
    
    for (const collectionName of collections) {
      try {
        await db.command({
          compact: collectionName
        });
        console.log(`✅ Compacted collection: ${collectionName}`);
      } catch (error) {
        // Compact might not be supported in all environments
        console.log(`⚠️ Could not compact ${collectionName}:`, error.message);
      }
    }
    
    // Update indexes
    await Connection.syncIndexes();
    await User.syncIndexes();
    await Server.syncIndexes();
    await AuditLog.syncIndexes();
    
    console.log('✅ Database indexes updated');
    
  } catch (error) {
    console.error('❌ Database maintenance failed:', error);
  }
};

/**
 * Emergency cleanup function (can be called manually)
 */
export const emergencyCleanup = async () => {
  console.log('🚨 Starting emergency cleanup...');
  
  try {
    // Disconnect all active connections
    const activeConnections = await Connection.find({
      status: { $in: ['connected', 'connecting'] }
    });
    
    for (const connection of activeConnections) {
      connection.status = 'disconnected';
      connection.endTime = new Date();
      connection.duration = Math.floor(
        (connection.endTime - connection.startTime) / 1000
      );
      await connection.save();
    }
    
    // Reset all server user counts
    await Server.updateMany(
      {},
      { $set: { currentUsers: 0 } }
    );
    
    console.log(`✅ Emergency cleanup completed: ${activeConnections.length} connections disconnected`);
    
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    throw error;
  }
};