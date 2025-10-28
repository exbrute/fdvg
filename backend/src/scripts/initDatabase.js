import mongoose from 'mongoose';
import { config } from '../config/environment.js';

/**
 * Database initialization script
 * Creates indexes and performs initial setup
 */
const initDatabase = async () => {
  try {
    console.log('🗄️  Initializing database...');
    
    // Connect to database
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('✅ Connected to database');
    
    // Import models to ensure they're registered
    const User = (await import('../models/User.js')).default;
    const Server = (await import('../models/Server.js')).default;
    const Connection = (await import('../models/Connection.js')).default;
    const AuditLog = (await import('../models/AuditLog.js')).default;
    
    // Create indexes
    console.log('📊 Creating indexes...');
    
    await User.createIndexes();
    console.log('✅ User indexes created');
    
    await Server.createIndexes();
    console.log('✅ Server indexes created');
    
    await Connection.createIndexes();
    console.log('✅ Connection indexes created');
    
    await AuditLog.createIndexes();
    console.log('✅ AuditLog indexes created');
    
    // Perform initial data setup if needed
    const serverCount = await Server.countDocuments();
    
    if (serverCount === 0) {
      console.log('⚠️  No servers found. Run "npm run seed" to populate sample data.');
    } else {
      console.log(`✅ Found ${serverCount} servers in database`);
    }
    
    // Display database stats
    const stats = await mongoose.connection.db.stats();
    console.log('\n📈 Database Statistics:');
    console.log(`   - Collections: ${stats.collections}`);
    console.log(`   - Documents: ${stats.objects}`);
    console.log(`   - Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n🎉 Database initialization completed!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
};

// Run initialization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}

export default initDatabase;