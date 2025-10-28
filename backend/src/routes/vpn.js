import express from 'express';
import {
  connect,
  disconnect,
  disconnectAll,
  getStatus,
  getConnectionStatus,
  updateStats,
  getConnectionHistory,
  getConfigFile,
  quickConnect
} from '../controllers/vpnController.js';
import {
  validateConnection,
  validateStatsUpdate,
  validateConnectionId
} from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { connectionLimiter, userLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All VPN routes require authentication
router.use(authenticate);

// Connection management
router.post('/connect', connectionLimiter, validateConnection, connect);
router.post('/quick-connect', connectionLimiter, quickConnect);
router.post('/disconnect/all', userLimiter, disconnectAll);
router.post('/disconnect/:connectionId', userLimiter, validateConnectionId, disconnect);

// Status and monitoring
router.get('/status', userLimiter, getStatus);
router.get('/status/:connectionId', userLimiter, validateConnectionId, getConnectionStatus);
router.put('/stats/:connectionId', userLimiter, validateConnectionId, validateStatsUpdate, updateStats);

// History and configuration
router.get('/history', userLimiter, getConnectionHistory);
router.get('/config/:connectionId', userLimiter, validateConnectionId, getConfigFile);

export default router;