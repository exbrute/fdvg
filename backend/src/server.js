import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { config, validateEnvironment } from './config/environment.js';
import { connectDatabase } from './config/database.js';
import { setupWebSocket } from './utils/websocket.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import apiRoutes from './routes/index.js';
import { startMonitoringJobs } from './jobs/serverMonitoring.js';
import { startCleanupJobs } from './jobs/cleanupJobs.js';

// Validate environment variables
validateEnvironment();

// Create Express app
const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VPN Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs'
  });
});

// 404 handler for non-API routes
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize application
const initializeApp = async () => {
  try {
    console.log('🚀 Starting VPN Backend Server...');
    
    // Connect to database
    await connectDatabase();
    
    // Setup WebSocket server
    setupWebSocket(server);
    console.log('✅ WebSocket server initialized');
    
    // Start background jobs
    startMonitoringJobs();
    startCleanupJobs();
    console.log('✅ Background jobs started');
    
    // Create required directories
    await createRequiredDirectories();
    
    // Start server
    server.listen(config.port, () => {
      console.log(`✅ Server running on port ${config.port}`);
      console.log(`✅ Environment: ${config.env}`);
      console.log(`✅ Health check: http://localhost:${config.port}/api/health`);
      console.log(`✅ WebSocket: ws://localhost:${config.port}/ws`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Create required directories
const createRequiredDirectories = async () => {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const directories = [
    'wireguard-configs',
    'logs',
    'temp'
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.warn(`Could not create directory ${dir}:`, error.message);
      }
    }
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n📦 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
    
    // Close database connection
    const mongoose = await import('mongoose');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
initializeApp();

export default app;