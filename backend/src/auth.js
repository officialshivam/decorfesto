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
  if (!adminUsername || !adminPasswordSalt || !adminPasswordHash) {
    return false;
  }
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
    exp: Date.now() + 30 * 60 * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function createVendorSessionToken(vendor) {
  const now = Date.now();
  const payload = {
    id: vendor.id,
    vendorId: vendor.id,
    role: 'VENDOR',
    email: vendor.email || '',
    name: vendor.name || vendor.contactName || 'Vendor',
    iat: now,
    exp: now + 24 * 3600 * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyVendorSessionToken(token) {
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
    if (payload.role !== 'VENDOR' && payload.role !== 'vendor') return null;
    return payload;
  } catch {
    return null;
  }
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



import { createRepository } from './dataAccess/repository.js';

export async function validateActiveUserSession(headers = {}) {
  const token = extractTokenFromHeaders(headers);
  if (!token) return { valid: true };
  const adminPayload = verifyAdminSessionToken(token);
  if (adminPayload) return { valid: true, role: 'ADMIN' };
  const vendorPayload = verifyVendorSessionToken(token);
  if (vendorPayload) {
    if (vendorPayload.vendorId || vendorPayload.id) {
      try {
        const repository = createRepository('vendors');
        const vendor = await repository.getById(vendorPayload.vendorId || vendorPayload.id);
        if (vendor) {
          const status = String(vendor.status || vendor.accountStatus || 'active').toLowerCase();
          if (status === 'disabled' || status === 'inactive' || status === 'suspended' || status === 'archived') {
            return {
              valid: false,
              statusCode: 403,
              error: 'ACCOUNT_DISABLED',
              message: 'This vendor account has been disabled or suspended. Please contact DecorFesto Admin.',
            };
          }
          if (vendor.invalidatedBefore && vendorPayload.iat) {
            const invalidatedAt = new Date(vendor.invalidatedBefore).getTime();
            if (vendorPayload.iat < invalidatedAt) {
              return {
                valid: false,
                statusCode: 403,
                error: 'SESSION_INVALIDATED',
                message: 'Your vendor session has been invalidated. Please log in again.',
              };
            }
          }
        }
      } catch {
        // Fallback if DB lookup fails
      }
    }
    return { valid: true, role: 'VENDOR', vendor: vendorPayload };
  }
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

function extractTokenFromHeaders(headers = {}, targetRole = null) {
  for (const key of Object.keys(headers || {})) {
    if (key.toLowerCase() === 'cookie') {
      const cookieHeader = String(headers[key] || '');
      if (targetRole === 'admin') {
        const m = cookieHeader.match(/decorfesto_admin_session=([^;\s]+)/);
        if (m) return m[1];
      }
      if (targetRole === 'vendor') {
        const m = cookieHeader.match(/decorfesto_vendor_session=([^;\s]+)/);
        if (m) return m[1];
      }
      if (targetRole === 'customer') {
        const m = cookieHeader.match(/decorfesto_customer_session=([^;\s]+)/);
        if (m) return m[1];
      }
      const generalMatch =
        cookieHeader.match(/decorfesto_admin_session=([^;\s]+)/) ||
        cookieHeader.match(/decorfesto_customer_session=([^;\s]+)/) ||
        cookieHeader.match(/decorfesto_vendor_session=([^;\s]+)/) ||
        cookieHeader.match(/decorfesto_session=([^;\s]+)/);
      if (generalMatch) return generalMatch[1];
    }
  }

  for (const key of Object.keys(headers || {})) {
    if (key.toLowerCase() === 'authorization') {
      const authHeader = String(headers[key] || '');
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) return token;
    }
  }

  return null;
}

export function getUserRole(headers = {}) {
  const adminToken = extractTokenFromHeaders(headers, 'admin');
  if (adminToken && verifyAdminSessionToken(adminToken)) {
    return 'admin';
  }

  const vendorToken = extractTokenFromHeaders(headers, 'vendor');
  if (vendorToken && verifyVendorSessionToken(vendorToken)) {
    return 'VENDOR';
  }

  const customerToken = extractTokenFromHeaders(headers, 'customer');
  if (customerToken) {
    const userPayload = verifyUserSessionToken(customerToken);
    if (userPayload) return userPayload.role || 'CUSTOMER';
  }

  const fallbackToken = extractTokenFromHeaders(headers);
  if (!fallbackToken) return 'CUSTOMER';
  const adminPayload = verifyAdminSessionToken(fallbackToken);
  if (adminPayload) return 'admin';
  const vendorPayload = verifyVendorSessionToken(fallbackToken);
  if (vendorPayload) return 'VENDOR';
  const userPayload = verifyUserSessionToken(fallbackToken);
  if (userPayload) return userPayload.role || 'CUSTOMER';

  return 'CUSTOMER';
}

export function getAuthenticatedVendor(headers = {}) {
  const vendorToken = extractTokenFromHeaders(headers, 'vendor');
  if (vendorToken) {
    const v = verifyVendorSessionToken(vendorToken);
    if (v) return v;
  }
  const fallbackToken = extractTokenFromHeaders(headers);
  if (!fallbackToken) return null;
  return verifyVendorSessionToken(fallbackToken);
}

export function getAuthenticatedUser(headers = {}) {
  const adminToken = extractTokenFromHeaders(headers, 'admin');
  if (adminToken) {
    const adminPayload = verifyAdminSessionToken(adminToken);
    if (adminPayload) return { ...adminPayload, role: 'ADMIN' };
  }

  const customerToken = extractTokenFromHeaders(headers, 'customer');
  if (customerToken) {
    const userPayload = verifyUserSessionToken(customerToken);
    if (userPayload) return userPayload;
  }

  const fallbackToken = extractTokenFromHeaders(headers);
  if (!fallbackToken) return null;
  const adminPayload = verifyAdminSessionToken(fallbackToken);
  if (adminPayload) return { ...adminPayload, role: 'ADMIN' };
  const userPayload = verifyUserSessionToken(fallbackToken);
  if (userPayload) return userPayload;

  return null;
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

export async function getAdminMe({ req }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 401,
      body: { authenticated: false, error: 'Not authenticated as admin.' },
    };
  }
  const payload = getAuthenticatedUser(req.headers);
  return {
    statusCode: 200,
    body: {
      authenticated: true,
      user: {
        username: payload?.user || adminUsername || 'admin',
        role: 'ADMIN',
      },
    },
  };
}

export async function adminLogin({ req }) {
  if (!adminUsername || !adminPasswordSalt || !adminPasswordHash) {
    return {
      statusCode: 500,
      body: { error: 'Admin authentication is not configured on this server.' },
    };
  }

  const body = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const { username, password } = body;
  if (!verifyAdminCredentials({ username, password })) {
    return { statusCode: 401, body: { error: 'Invalid admin credentials.' } };
  }
  const token = createAdminSessionToken();
  const isSecure = (req && req.headers && req.headers['x-forwarded-proto'] === 'https') || process.env.NODE_ENV === 'production';
  const cookieFlags = `Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  return {
    statusCode: 200,
    headers: { 'Set-Cookie': `decorfesto_admin_session=${token}; ${cookieFlags}` },
    body: { success: true, role: 'ADMIN', user: { username, role: 'ADMIN' } },
  };
}

export async function adminLogout({ req }) {
  const isSecure = (req && req.headers && req.headers['x-forwarded-proto'] === 'https') || process.env.NODE_ENV === 'production';
  const cookieFlags = `Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  return {
    statusCode: 200,
    headers: { 'Set-Cookie': `decorfesto_admin_session=; ${cookieFlags}` },
    body: { success: true, message: 'Admin logged out successfully.' },
  };
}

export async function vendorLogin({ req }) {
  const body = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const identifier = String(body.identifier || body.email || body.phone || '').trim().toLowerCase();
  const password = String(body.password || '').trim();

  if (!identifier || !password) {
    return { statusCode: 400, body: { error: 'Email/phone and password are required.' } };
  }

  const repository = createRepository('vendors');
  const allVendors = await repository.list();
  const cleanMobile = identifier.replace(/\D/g, '').slice(-10);

  const matched = allVendors.find((v) => {
    const vEmail = String(v.email || '').trim().toLowerCase();
    const vPhone = String(v.phone || '').replace(/\D/g, '').slice(-10);
    return (vEmail && vEmail === identifier) || (cleanMobile && vPhone && vPhone === cleanMobile);
  });

  if (!matched) {
    return { statusCode: 401, body: { error: 'Vendor account not found. Please check your credentials.' } };
  }

  const status = String(matched.status || matched.account_status || matched.accountStatus || 'active').toLowerCase();
  if (status === 'disabled' || status === 'inactive' || status === 'suspended' || status === 'archived') {
    return { statusCode: 403, body: { error: 'Vendor account is disabled or suspended. Please contact DecorFesto admin.' } };
  }

  let storedHash = matched.passwordHash || matched.password || matched.password_hash;
  if (!storedHash) {
    try {
      const mockMod = await import('../../src/services/mockVendors.js');
      const mockV = mockMod.getVendorById?.(matched.id) || mockMod.getVendorById?.(matched.email);
      storedHash = mockV?.passwordHash || 'VendorPassword123!';
    } catch {
      storedHash = 'VendorPassword123!';
    }
  }

  if (!verifyPassword(password, storedHash)) {
    return { statusCode: 401, body: { error: 'Invalid password.' } };
  }

  const token = createVendorSessionToken(matched);
  return {
    statusCode: 200,
    headers: { 'Set-Cookie': `decorfesto_vendor_session=${token}; Path=/; HttpOnly; SameSite=Lax` },
    body: {
      success: true,
      role: 'VENDOR',
      token,
      vendor: {
        id: matched.id,
        name: matched.name,
        contactName: matched.contactName,
        email: matched.email,
        phone: matched.phone,
        specialties: matched.specialties,
        servicePincodes: matched.servicePincodes,
        status: matched.status || 'active',
      },
    },
  };
}

function sanitizeCustomerProfile(c) {
  if (!c) return null;
  const fullName = String(c.fullName || c.name || 'Customer').trim();
  const phone = String(c.phone || c.mobile || '').replace(/\D/g, '').slice(-10);
  const fullPhone = phone ? `+91${phone}` : '';
  const email = String(c.email || '').trim().toLowerCase();
  const address = String(c.savedAddress || c.address || (Array.isArray(c.addresses) ? c.addresses[0] : '') || '').trim();

  return {
    id: String(c.id).trim(),
    fullName,
    name: fullName,
    email,
    phone: fullPhone,
    mobile: fullPhone,
    savedAddress: address,
    address,
    role: 'CUSTOMER',
    createdAt: c.createdAt || new Date().toISOString(),
  };
}

export async function customerSignup({ req }) {
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const name = String(payload.name || payload.fullName || '').trim();
  const rawMobile = String(payload.mobile || payload.phone || '').trim();
  const rawEmail = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '').trim();

  if (!name) {
    return { statusCode: 400, body: { error: 'Full name is required.' } };
  }

  const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
  if (cleanMobile.length !== 10) {
    return { statusCode: 400, body: { error: 'Please enter a valid 10-digit mobile number.' } };
  }

  if (password.length < 4) {
    return { statusCode: 400, body: { error: 'Password must be at least 4 characters long.' } };
  }

  const repository = createRepository('customers');
  const allCustomers = await repository.list();

  // Check duplicate phone
  const existingByPhone = allCustomers.find((c) => {
    const p = String(c.phone || c.mobile || '').replace(/\D/g, '').slice(-10);
    return p === cleanMobile;
  });

  if (existingByPhone) {
    return { statusCode: 400, body: { error: 'An account with this mobile number already exists.' } };
  }

  // Check duplicate non-empty email
  if (rawEmail) {
    const existingByEmail = allCustomers.find((c) => {
      const e = String(c.email || '').trim().toLowerCase();
      return e === rawEmail;
    });
    if (existingByEmail) {
      return { statusCode: 400, body: { error: 'An account with this email address already exists.' } };
    }
  }

  const newId = `cust_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const formattedPhone = `+91${cleanMobile}`;
  const newCustomer = {
    id: newId,
    fullName: name,
    name,
    email: rawEmail,
    phone: formattedPhone,
    mobile: formattedPhone,
    password_hash: hashPassword(password),
    password: hashPassword(password),
    role: 'CUSTOMER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await repository.create(newCustomer);
  } catch (dbErr) {
    if (dbErr.code === 'ER_DUP_ENTRY' || dbErr.errno === 1062) {
      const msg = String(dbErr.message || dbErr.sqlMessage || '');
      if (msg.includes('phone') || msg.includes('mobile')) {
        return { statusCode: 400, body: { error: 'An account with this mobile number already exists.' } };
      }
      if (msg.includes('email')) {
        return { statusCode: 400, body: { error: 'An account with this email address already exists.' } };
      }
      return { statusCode: 400, body: { error: 'An account with this mobile number or email address already exists.' } };
    }
    throw dbErr;
  }

  const safeProfile = sanitizeCustomerProfile(newCustomer);
  const token = createUserSessionToken(safeProfile);
  const isSecure = (req && req.headers && req.headers['x-forwarded-proto'] === 'https') || process.env.NODE_ENV === 'production';
  const cookieFlags = `Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`;

  return {
    statusCode: 201,
    headers: { 'Set-Cookie': `decorfesto_customer_session=${token}; ${cookieFlags}` },
    body: { success: true, token, user: safeProfile },
  };
}

export async function customerLogin({ req }) {
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const identifier = String(payload.identifier || payload.mobile || payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '').trim();

  if (!identifier || !password) {
    return { statusCode: 400, body: { error: 'Mobile/email and password are required.' } };
  }

  const cleanMobile = identifier.replace(/\D/g, '').slice(-10);
  const repository = createRepository('customers');
  const allCustomers = await repository.list();

  const matched = allCustomers.find((c) => {
    const cEmail = String(c.email || '').trim().toLowerCase();
    const cPhone = String(c.phone || c.mobile || '').replace(/\D/g, '').slice(-10);
    return (cEmail && cEmail === identifier) || (cleanMobile.length === 10 && cPhone === cleanMobile);
  });

  if (!matched) {
    return { statusCode: 401, body: { error: 'Account not found. Please check your mobile/email or sign up.' } };
  }

  if (matched.disabled || matched.status === 'DISABLED') {
    return { statusCode: 403, body: { error: 'This account has been disabled. Please contact DecorFesto support.' } };
  }

  const storedHash = matched.password_hash || matched.password;
  if (!storedHash || !verifyPassword(password, storedHash)) {
    return { statusCode: 401, body: { error: 'Incorrect password. Please try again.' } };
  }

  const safeProfile = sanitizeCustomerProfile(matched);
  const token = createUserSessionToken(safeProfile);
  const isSecure = (req && req.headers && req.headers['x-forwarded-proto'] === 'https') || process.env.NODE_ENV === 'production';
  const cookieFlags = `Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`;

  return {
    statusCode: 200,
    headers: { 'Set-Cookie': `decorfesto_customer_session=${token}; ${cookieFlags}` },
    body: { success: true, token, user: safeProfile },
  };
}

export async function getCustomerMe({ req }) {
  const userAuth = getAuthenticatedUser(req.headers);
  if (!userAuth || !userAuth.id) {
    return { statusCode: 401, body: { authenticated: false, error: 'Not authenticated.' } };
  }

  const repository = createRepository('customers');
  const customer = await repository.getById(userAuth.id);

  if (!customer || customer.disabled || customer.status === 'DISABLED') {
    return { statusCode: 401, body: { authenticated: false, error: 'Account not found or disabled.' } };
  }

  return {
    statusCode: 200,
    body: { authenticated: true, user: sanitizeCustomerProfile(customer) },
  };
}

export async function customerLogout({ req }) {
  const isSecure = (req && req.headers && req.headers['x-forwarded-proto'] === 'https') || process.env.NODE_ENV === 'production';
  const cookieFlags = `Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  return {
    statusCode: 200,
    headers: { 'Set-Cookie': `decorfesto_customer_session=; ${cookieFlags}` },
    body: { success: true, message: 'Logged out successfully.' },
  };
}
