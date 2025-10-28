import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getActivity
} from '../controllers/authController.js';
import {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate
} from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, userLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.post('/register', authLimiter, validateRegistration, register);
router.post('/login', authLimiter, validateLogin, login);

// Protected routes
router.get('/profile', authenticate, userLimiter, getProfile);
router.put('/profile', authenticate, userLimiter, validateProfileUpdate, updateProfile);
router.put('/password', authenticate, userLimiter, validatePasswordChange, changePassword);
router.get('/activity', authenticate, userLimiter, getActivity);

export default router;