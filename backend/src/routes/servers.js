import express from 'express';
import {
  getAllServers,
  getServer,
  getServersByCountry,
  getOptimalServer,
  getServerStats,
  getCountries,
  getServerHealth
} from '../controllers/serverController.js';
import {
  validateServerQuery,
  validateServerId,
  validateObjectId
} from '../middleware/validation.js';
import { optionalAuth, authenticate, requireAdmin } from '../middleware/auth.js';
import { publicLimiter, userLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public server information
router.get('/', publicLimiter, validateServerQuery, getAllServers);
router.get('/countries', publicLimiter, getCountries);
router.get('/optimal', optionalAuth, publicLimiter, getOptimalServer);
router.get('/:serverId', publicLimiter, validateServerId, getServer);
router.get('/country/:countryCode', publicLimiter, getServersByCountry);

// Protected server stats (requires authentication)
router.get('/stats/overview', authenticate, userLimiter, getServerStats);

// Admin routes
router.get('/admin/health', authenticate, requireAdmin, userLimiter, getServerHealth);

export default router;