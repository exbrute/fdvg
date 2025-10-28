import express from 'express';
import authRoutes from './auth.js';
import vpnRoutes from './vpn.js';
import serverRoutes from './servers.js';
import statsRoutes from './stats.js';
import { notFound } from '../middleware/errorHandler.js';

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/vpn', vpnRoutes);
router.use('/servers', serverRoutes);
router.use('/stats', statsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'VPN API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler for API routes
router.use('*', notFound);

export default router;