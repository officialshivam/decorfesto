import crypto from 'node:crypto';
import { adminPasswordHash, adminPasswordSalt, adminUsername, authSecret } from './config.js';

export function hashPassword(password) {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedCombinedHash) {
  if (!password || !storedCombinedHash) return false;
  if (!storedCombinedHash.includes(':')) {
    // Fallback for legacy plain passwords during local dev/migration
    return password === storedCombinedHash;
  }
  const [salt, expectedHash] = storedCombinedHash.split(':');
  try {
    const computedHash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
    const bufA = Buffer.from(computedHash, 'hex');
    const bufB = Buffer.from(expectedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function verifyAdminCredentials({ username, password }) {
  if (!username || !password) return false;
  const normalizedUser = String(username).trim().toLowerCase();
  const expectedUser = String(adminUsername).trim().toLowerCase();
  if (normalizedUser !== expectedUser) return false;

  try {
    const computedHash = crypto.pbkdf2Sync(String(password), adminPasswordSalt, 100000, 64, 'sha512').toString('hex');
    const bufA = Buffer.from(computedHash, 'hex');
    const bufB = Buffer.from(adminPasswordHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function createAdminSessionToken() {
  const payload = {
    role: 'ADMIN',
    user: adminUsername,
    exp: Date.now() + 8 * 3600 * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function createUserSessionToken(user) {
  const payload = {
    id: user.id,
    role: (user.role || 'CUSTOMER').toUpperCase(),
    email: user.email || '',
    name: user.fullName || user.name || 'User',
    exp: Date.now() + 24 * 3600 * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyAdminSessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  try {
    const expectedSignature = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');
    const bufSig = Buffer.from(signature);
    const bufExp = Buffer.from(expectedSignature);
    if (bufSig.length !== bufExp.length || !crypto.timingSafeEqual(bufSig, bufExp)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    if (payload.role !== 'ADMIN' && payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyUserSessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  try {
    const expectedSignature = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');
    const bufSig = Buffer.from(signature);
    const bufExp = Buffer.from(expectedSignature);
    if (bufSig.length !== bufExp.length || !crypto.timingSafeEqual(bufSig, bufExp)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractTokenFromHeaders(headers = {}) {
  for (const key of Object.keys(headers)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'authorization') {
      const authHeader = String(headers[key] || '');
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) return token;
    }
    if (lowerKey === 'cookie') {
      const cookieHeader = String(headers[key] || '');
      const match = cookieHeader.match(/decorfesto_admin_session=([^;\s]+)/) || cookieHeader.match(/decorfesto_session=([^;\s]+)/);
      if (match) return match[1];
    }
  }
  return null;
}

import { createRepository } from './dataAccess/repository.js';

export async function validateActiveUserSession(headers = {}) {
  const token = extractTokenFromHeaders(headers);
  if (!token) return { valid: true };
  const adminPayload = verifyAdminSessionToken(token);
  if (adminPayload) return { valid: true, role: 'ADMIN' };
  const userPayload = verifyUserSessionToken(token);
  if (!userPayload) return { valid: true };

  if (userPayload.id) {
    try {
      const repository = createRepository('customers');
      const user = await repository.getById(userPayload.id);
      if (user && (user.disabled === true || user.status === 'DISABLED')) {
        return {
          valid: false,
          statusCode: 403,
          error: 'ACCOUNT_DISABLED',
          message: 'This account has been disabled. Please contact DecorFesto support.',
        };
      }
    } catch {
      // Fallback if DB lookup is unavailable
    }
  }
  return { valid: true, role: userPayload.role || 'CUSTOMER', user: userPayload };
}

export function getUserRole(headers = {}) {
  const token = extractTokenFromHeaders(headers);
  if (!token) return 'CUSTOMER';
  const adminPayload = verifyAdminSessionToken(token);
  if (adminPayload) return 'ADMIN';
  const userPayload = verifyUserSessionToken(token);
  if (userPayload) return userPayload.role || 'CUSTOMER';
  return 'CUSTOMER';
}

export function requireRole(role, request) {
  const userRole = getUserRole(request.headers);
  const normalizedTarget = String(role).toUpperCase();
  const normalizedCurrent = String(userRole).toUpperCase();
  if (normalizedCurrent !== normalizedTarget && normalizedCurrent !== 'ADMIN') {
    return { allowed: false, message: `Role ${role} required.` };
  }
  return { allowed: true, userRole: normalizedCurrent };
}

export async function adminLogin({ req }) {
  const body = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const { username, password } = body;
  if (!verifyAdminCredentials({ username, password })) {
    return { statusCode: 401, body: { error: 'Invalid admin credentials.' } };
  }
  const token = createAdminSessionToken();
  return {
    statusCode: 200,
    headers: { 'Set-Cookie': `decorfesto_admin_session=${token}; Path=/; HttpOnly; SameSite=Lax` },
    body: { success: true, role: 'ADMIN', token },
  };
}
