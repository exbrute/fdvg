import mongoose from 'mongoose';
import { config } from '../config/environment.js';
import Server from '../models/Server.js';

/**
 * Seed script to populate the database with sample VPN servers
 */
const sampleServers = [
  // North America
  {
    name: 'USA East - New York',
    country: 'United States',
    countryCode: 'US',
    hostname: 'nyc-us.vpnsecure.com',
    ip: '192.168.1.10',
    port: 51820,
    coordinates: { lat: 40.7128, lng: -74.0060 },
    load: 25,
    ping: 32,
    maxUsers: 1000,
    currentUsers: 245,
    flags: {
      isPremium: false,
      supportsWireGuard: true,
      supportsOpenVPN: true,
      supportsIKEv2: true,
      isRecommended: true
    },
    technical: {
      publicKey: 'cF7v6V6V6V6V6V6V6V6V6V6V6V6V6V6V6V6V6V6V6V6V6V=',
      endpoint: 'nyc-us.vpnsecure.com',
      allowedIPs: ['0.0.0.0/0', '::/0'],
      dns: ['1.1.1.1', '8.8.8.8'],
      persistentKeepalive: 25
    },
    metadata: {
      city: 'New York',
      region: 'New York',
      isp: 'DigitalOcean',
      bandwidth: 1000,
      version: '1.0.0'
    },
    stats: {
      uptime: 86400,
      totalConnections: 15000,
      totalDataTransferred: {
        upload: 1500000000000,
        download: 3000000000000
      },
      healthStatus: 'healthy'
    }
  },
  {
    name: 'USA West - Los Angeles',
    country: 'United States',
    countryCode: 'US',
    hostname: 'la-us.vpnsecure.com',
    ip: '192.168.1.11',
    port: 51820,
    coordinates: { lat: 34.0522, lng: -118.2437 },
    load: 45,
    ping: 45,
    maxUsers: 800,
    currentUsers: 360,
    flags: {
      isPremium: false,
      supportsWireGuard: true,
      supportsOpenVPN: true,
      isRecommended: false
    },
    technical: {
      publicKey: 'dG8w7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W=',
      endpoint: 'la-us.vpnsecure.com',
      allowedIPs: ['0.0.0.0/0'],
      dns: ['1.1.1.1', '8.8.8.8'],
      persistentKeepalive: 25
    },
    metadata: {
      city: 'Los Angeles',
      region: 'California',
      isp: 'AWS',
      bandwidth: 2000,
      version: '1.0.0'
    }
  },
  {
    name: 'Canada - Toronto',
    country: 'Canada',
    countryCode: 'CA',
    hostname: 'tor-ca.vpnsecure.com',
    ip: '192.168.1.12',
    port: 51820,
    coordinates: { lat: 43.6532, lng: -79.3832 },
    load: 15,
    ping: 28,
    maxUsers: 600,
    currentUsers: 90,
    flags: {
      isPremium: true,
      supportsWireGuard: true,
      supportsOpenVPN: true,
      isRecommended: true
    },
    technical: {
      publicKey: 'eH9x8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X=',
      endpoint: 'tor-ca.vpnsecure.com',
      allowedIPs: ['0.0.0.0/0', '::/0'],
      dns: ['1.1.1.1', '8.8.8.8'],
      persistentKeepalive: 25
    },
    metadata: {
      city: 'Toronto',
      region: 'Ontario',
      isp: 'Google Cloud',
      bandwidth: 1500,
      version: '1.0.0'
    }
  },

  // Europe
  {
    name: 'Germany - Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    hostname: 'fra-de.vpnsecure.com',
    ip: '192.168.1.20',
    port: 51820,
    coordinates: { lat: 50.1109, lng: 8.6821 },
    load: 35,
    ping: 22,
    maxUsers: 1200,
    currentUsers: 420,
    flags: {
      isPremium: false,
      supportsWireGuard: true,
      supportsOpenVPN: true,
      supportsIKEv2: true,
      isRecommended: true
    },
    technical: {
      publicKey: 'fI0y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y=',
      endpoint: 'fra-de.vpnsecure.com',
      allowedIPs: ['0.0.0.0/0', '::/0'],
      dns: ['1.1.1.1', '8.8.8.8'],
      persistentKeepalive: 25
    },
    metadata: {
      city: 'Frankfurt',
      region: 'Hesse',
      isp: 'Hetzner',
      bandwidth: 2500,
      version: '1.0.0'
    }
  },
  {
    name: 'UK - London',
    country: 'United Kingdom',
    countryCode: 'GB',
    hostname: 'lon-uk.vpnsecure.com',
    ip: '192.168.1.21',
    port: 51820,
    coordinates: { lat: 51.5074, lng: -0.1278 },
    load: 60,
    ping: 18,
    maxUsers: 900,
    currentUsers: 540,
    flags: {
      isPremium: false,
      supportsWireGuard: true,
      isRecommended: false
    },
    technical: {
      publicKey: 'gJ1z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z=',
      endpoint: 'lon-uk.vpnsecure.com',
      allowedIPs: ['0.0.0.0/0'],
      dns: ['1.1.1.1', '8.8.8.8'],
      persistentKeepalive: 25
    },
    metadata: {
      city: 'London',
      region: 'England',
      isp: 'Linode',
      bandwidth: 1000,
      version: '1.0.0'
    }
  },

  // Asia
  {
    name: 'Japan - Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    hostname: 'tyo-jp.vpnsecure.com',
    ip: '192.168.1.30',
    port: 51820,
    coordinates: { lat: 35.6762, lng: 139.6503 },
    load: 75,
    ping: 125,
    maxUsers: 700,
    currentUsers: 525,
    flags: {
      isPremium: false,
      supportsWireGuard: true,
      supportsOpenVPN: true,
      isRecommended: true
    },
    technical: {
      publicKey: 'hK2a1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A=',
      endpoint: 'tyo-jp.vpnsecure.com',
      allowedIPs: ['0.0.0.0/0', '::/0'],
      dns: ['1.1.1.1', '8.8.8.8'],
      persistentKeepalive: 25
    },
    metadata: {
      city: 'Tokyo',
      region: 'Kanto',
      isp: 'Vultr',
      bandwidth: 3000,
      version: '1.0.0'
    }
  },
  {
    name: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    hostname: 'sgp-sg.vpnsecure.com',
    ip: '192.168.1.31',
    port: 51820,
    coordinates: { lat: 1.3521, lng: 103.8198 },
    load: 40,
    ping: 85,
    maxUsers: 800,
    currentUsers: 320,
    flags: {
      isPremium: true,
      supportsWireGuard: true,
      supportsOpenVPN: true,
      supportsIKEv2: true,
      isRecommended: true
    },
    technical: {
      publicKey: 'iL3b2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B=',
      endpoint: 'sgp-sg.vpnsecure.com',
      allowedIPs: ['0.0.0.0/0', '::/0'],
      dns: ['1.1.1.1', '8.8.8.8'],
      persistentKeepalive: 25
    },
    metadata: {
      city: 'Singapore',
      region: 'Singapore',
      isp: 'AWS',
      bandwidth: 5000,
      version: '1.0.0'
    }
  },

  // Australia
  {
    name: 'Australia - Sydney',
    country: 'Australia',
    countryCode: 'AU',
    hostname: 'syd-au.vpnsecure.com',
    ip: '192.168.1.40',
    port: 51820,
    coordinates: { lat: -33.8688, lng: 151.2093 },
    load: 55,
    ping: 190,
    maxUsers: 500,
    currentUsers: 275,
    flags: {
      isPremium: false,
      supportsWireGuard: true,
      isRecommended: false
    },
    technical: {
      publicKey: 'jM4c3C3C3C3C3C3C3C3C3C3C3C3C3C3C3C3C3C3C3C3C3C=',
      endpoint: 'syd-au.vpnsecure.com',
      allowedIPs: ['0.0.0.0/0'],
      dns: ['1.1.1.1', '8.8.8.8'],
      persistentKeepalive: 25
    },
    metadata: {
      city: 'Sydney',
      region: 'New South Wales',
      isp: 'DigitalOcean',
      bandwidth: 1000,
      version: '1.0.0'
    }
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('✅ Connected to database');
    
    // Clear existing servers
    await Server.deleteMany({});
    console.log('✅ Cleared existing servers');
    
    // Insert sample servers
    const servers = await Server.insertMany(sampleServers);
    console.log(`✅ Inserted ${servers.length} sample servers`);
    
    // Display server summary
    console.log('\n📊 Server Summary:');
    servers.forEach(server => {
      console.log(`   - ${server.name} (${server.countryCode}): ${server.load}% load, ${server.currentUsers}/${server.maxUsers} users`);
    });
    
    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
};

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;