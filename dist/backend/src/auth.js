import crypto from 'node:crypto';
import { adminPasswordHash, adminPasswordSalt, adminUsername, authSecret } from './config.js';

export function verifyAdminCredentials({ username, password }) {
  if (!username || !password) {
    return false;
  }

  const normalizedUser = String(username).trim().toLowerCase();
  const expectedUser = String(adminUsername).trim().toLowerCase();

  if (normalizedUser !== expectedUser) {
    return false;
  }

  try {
    const computedHash = crypto
      .pbkdf2Sync(String(password), adminPasswordSalt, 100000, 64, 'sha512')
      .toString('hex');

    const bufA = Buffer.from(computedHash, 'hex');
    const bufB = Buffer.from(adminPasswordHash, 'hex');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function createAdminSessionToken() {
  const payload = {
    role: 'admin',
    user: adminUsername,
    exp: Date.now() + 8 * 3600 * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifyAdminSessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, signature] = parts;

  try {
    const expectedSignature = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');

    const bufSig = Buffer.from(signature);
    const bufExp = Buffer.from(expectedSignature);

    if (bufSig.length !== bufExp.length || !crypto.timingSafeEqual(bufSig, bufExp)) {
      return null;
    }

    const payloadRaw = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadRaw);

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    if (payload.role !== 'admin') {
      return null;
    }

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
      const match = cookieHeader.match(/decorfesto_admin_session=([^;\s]+)/);
      if (match) return match[1];
    }
  }

  return null;
}

export function getUserRole(headers = {}) {
  const token = extractTokenFromHeaders(headers);
  if (!token) {
    return 'customer';
  }

  const verifiedPayload = verifyAdminSessionToken(token);
  if (verifiedPayload && verifiedPayload.role === 'admin') {
    return 'admin';
  }

  return 'customer';
}

export function requireRole(role, request) {
  const userRole = getUserRole(request.headers);
  if (userRole !== role) {
    return {
      allowed: false,
      message: `Role ${role} required.`,
    };
  }

  return { allowed: true, userRole };
}

export async function adminLogin({ req }) {
  const body = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const { username, password } = body;

  if (!verifyAdminCredentials({ username, password })) {
    return {
      statusCode: 401,
      body: { error: 'Invalid admin credentials.' },
    };
  }

  const token = createAdminSessionToken();

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': `decorfesto_admin_session=${token}; Path=/; HttpOnly; SameSite=Lax`,
    },
    body: {
      success: true,
      role: 'admin',
      token,
    },
  };
}
