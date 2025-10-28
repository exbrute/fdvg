import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

export class CryptoUtils {
  /**
   * Generate a new WireGuard key pair
   * @returns {Object} { privateKey, publicKey } in base64 format
   */
  static generateKeyPair() {
    try {
      const keyPair = nacl.box.keyPair();
      
      return {
        privateKey: util.encodeBase64(keyPair.secretKey),
        publicKey: util.encodeBase64(keyPair.publicKey)
      };
    } catch (error) {
      throw new Error(`Key generation failed: ${error.message}`);
    }
  }

  /**
   * Derive public key from private key
   * @param {string} privateKeyBase64 - Private key in base64
   * @returns {string} Public key in base64
   */
  static derivePublicKey(privateKeyBase64) {
    try {
      const privateKey = util.decodeBase64(privateKeyBase64);
      const keyPair = nacl.box.keyPair.fromSecretKey(privateKey);
      return util.encodeBase64(keyPair.publicKey);
    } catch (error) {
      throw new Error(`Public key derivation failed: ${error.message}`);
    }
  }

  /**
   * Validate a WireGuard key
   * @param {string} keyBase64 - Key in base64 format
   * @param {string} type - 'public' or 'private'
   * @returns {boolean}
   */
  static validateKey(keyBase64, type = 'public') {
    try {
      if (!keyBase64 || typeof keyBase64 !== 'string') {
        return false;
      }

      // Check base64 format and length
      if (!keyBase64.match(/^[A-Za-z0-9+/]{43}=$/)) {
        return false;
      }

      const keyBytes = util.decodeBase64(keyBase64);
      
      if (type === 'public') {
        return keyBytes.length === 32;
      } else if (type === 'private') {
        return keyBytes.length === 32;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a unique client IP address
   * @param {number} subnet - Subnet identifier
   * @returns {string} IP address in CIDR notation
   */
  static generateClientIP(subnet = 8) {
    const octet3 = Math.floor(Math.random() * 254) + 1;
    const octet4 = Math.floor(Math.random() * 254) + 1;
    return `10.${subnet}.${octet3}.${octet4}/32`;
  }

  /**
   * Generate pre-shared key (optional for enhanced security)
   * @returns {string} Pre-shared key in base64
   */
  static generatePresharedKey() {
    const key = nacl.randomBytes(32);
    return util.encodeBase64(key);
  }

  /**
   * Create a secure random string
   * @param {number} length - Length of the string
   * @returns {string} Random string
   */
  static generateRandomString(length = 32) {
    const bytes = nacl.randomBytes(length);
    return util.encodeBase64(bytes).slice(0, length);
  }
}

/**
 * Generate complete WireGuard configuration
 * @param {Object} server - Server object with technical details
 * @param {Object} user - User object
 * @returns {Object} Complete WireGuard configuration
 */
export const generateWireGuardConfig = async (server, user) => {
  try {
    // Generate client keys
    const keys = CryptoUtils.generateKeyPair();
    
    // Generate client IP
    const clientIP = CryptoUtils.generateClientIP();
    
    // Create configuration object
    const config = {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      address: clientIP,
      dns: server.technical.dns || ['1.1.1.1', '8.8.8.8'],
      endpoint: `${server.technical.endpoint}:${server.port}`,
      allowedIPs: server.technical.allowedIPs || ['0.0.0.0/0', '::/0'],
      persistentKeepalive: server.technical.persistentKeepalive || 25,
      serverPublicKey: server.technical.publicKey,
      preSharedKey: server.technical.presharedKey ? CryptoUtils.generatePresharedKey() : undefined
    };

    // Validate all cryptographic elements
    if (!CryptoUtils.validateKey(config.publicKey, 'public')) {
      throw new Error('Generated public key is invalid');
    }
    
    if (!CryptoUtils.validateKey(config.privateKey, 'private')) {
      throw new Error('Generated private key is invalid');
    }

    if (!CryptoUtils.validateKey(server.technical.publicKey, 'public')) {
      throw new Error('Server public key is invalid');
    }

    return config;
  } catch (error) {
    throw new Error(`Configuration generation failed: ${error.message}`);
  }
};

/**
 * Format configuration as WireGuard config file content
 * @param {Object} config - Configuration object
 * @returns {string} WireGuard config file content
 */
export const formatWireGuardConfig = (config) => {
  const lines = [
    '[Interface]',
    `PrivateKey = ${config.privateKey}`,
    `Address = ${config.address}`,
    `DNS = ${config.dns.join(', ')}`,
    '',
    '[Peer]',
    `PublicKey = ${config.serverPublicKey}`,
    `Endpoint = ${config.endpoint}`,
    `AllowedIPs = ${config.allowedIPs.join(', ')}`,
    `PersistentKeepalive = ${config.persistentKeepalive}`
  ];

  if (config.preSharedKey) {
    lines.push(`PresharedKey = ${config.preSharedKey}`);
  }

  return lines.join('\n');
};