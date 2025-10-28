import geoip from 'geoip-lite';

/**
 * Utility functions for common tasks
 */

/**
 * Get client location from IP address
 */
export const getClientLocation = (ip) => {
  try {
    // Handle localhost and private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        country: 'Local',
        city: 'Local Network',
        timezone: 'UTC',
        range: [ip, ip]
      };
    }

    const geo = geoip.lookup(ip);
    
    if (!geo) {
      return {
        country: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC'
      };
    }

    return {
      country: geo.country,
      city: geo.city,
      timezone: geo.timezone,
      coordinates: [geo.ll[1], geo.ll[0]], // [lng, lat] for GeoJSON
      range: geo.range
    };
    
  } catch (error) {
    console.error('Error getting client location:', error);
    return {
      country: 'Unknown',
      city: 'Unknown',
      timezone: 'UTC'
    };
  }
};

/**
 * Format bytes to human readable format
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format duration in seconds to human readable format
 */
export const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else {
    return `${minutes}m ${remainingSeconds}s`;
  }
};

/**
 * Generate a unique identifier
 */
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * Validate IP address
 */
export const isValidIP = (ip) => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Sleep function for delays
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
export const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }
    
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  }
};

/**
 * Calculate quality score based on connection metrics
 */
export const calculateQualityScore = (ping, downloadSpeed, uploadSpeed, stability = 1) => {
  // Normalize values
  const pingScore = Math.max(0, 100 - (ping / 2)); // Lower ping = better
  const downloadScore = Math.min(100, (downloadSpeed / 10)); // 100 Mbps = 100 points
  const uploadScore = Math.min(100, (uploadSpeed / 5)); // 50 Mbps = 100 points
  const stabilityScore = stability * 100;
  
  // Weighted average
  const totalScore = (
    pingScore * 0.3 +
    downloadScore * 0.3 +
    uploadScore * 0.2 +
    stabilityScore * 0.2
  );
  
  return Math.round(totalScore);
};

/**
 * Get quality label from score
 */
export const getQualityLabel = (score) => {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'very poor';
};

/**
 * Sanitize user input for logging
 */
export const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .substring(0, 1000); // Limit length
};

/**
 * Parse user agent string
 */
export const parseUserAgent = (userAgent) => {
  if (!userAgent) return {};
  
  const ua = userAgent.toLowerCase();
  
  return {
    isMobile: /mobile|android|iphone|ipad|ipod/.test(ua),
    isTablet: /ipad|tablet/.test(ua),
    isDesktop: !/mobile|android|iphone|ipad|ipod/.test(ua),
    browser: getBrowser(ua),
    os: getOS(ua),
    platform: getPlatform(ua)
  };
};

const getBrowser = (ua) => {
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('edge')) return 'Edge';
  if (ua.includes('opera')) return 'Opera';
  return 'Unknown';
};

const getOS = (ua) => {
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'Unknown';
};

const getPlatform = (ua) => {
  if (ua.includes('electron')) return 'Electron';
  if (ua.includes('postman')) return 'Postman';
  if (ua.includes('curl')) return 'cURL';
  return 'Web';
};