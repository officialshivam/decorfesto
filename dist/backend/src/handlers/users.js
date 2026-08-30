import { createRepository } from '../dataAccess/repository.js';
import { hashPassword, requireRole } from '../auth.js';

function sanitizeUserRecord(u) {
  if (!u) return null;
  return {
    id: u.id,
    fullName: u.fullName || u.name || 'User',
    email: u.email || '',
    mobile: u.mobile || u.phone || '',
    role: u.role || (u.id.includes('admin') || u.email?.includes('admin') ? 'ADMIN' : 'CUSTOMER'),
    status: u.disabled || u.status === 'DISABLED' ? 'Disabled' : 'Active',
    createdAt: u.createdAt || new Date().toISOString(),
    lastLogin: u.lastLogin || u.createdAt || new Date().toISOString(),
  };
}

export async function listAdminUsers({ req }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const repository = createRepository('customers');
  const allUsers = await repository.list();
  const safeUsers = (allUsers || []).map(sanitizeUserRecord);

  return {
    statusCode: 200,
    body: { users: safeUsers },
  };
}

export async function createAdminUserRecord({ req }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const repository = createRepository('customers');

  const cleanEmail = String(payload.email || '').trim().toLowerCase();
  const existingUsers = await repository.list();

  if (existingUsers.some((u) => u.email?.toLowerCase() === cleanEmail)) {
    return { statusCode: 400, body: { error: 'User with this email already exists.' } };
  }

  const role = (payload.role || 'ADMIN').toUpperCase();
  const newUser = {
    id: `${role.toLowerCase()}-${Date.now().toString().slice(-6)}`,
    fullName: String(payload.fullName || payload.name || 'User').trim(),
    name: String(payload.fullName || payload.name || 'User').trim(),
    email: cleanEmail,
    mobile: String(payload.mobile || payload.phone || '').trim(),
    phone: String(payload.mobile || payload.phone || '').trim(),
    password_hash: hashPassword(payload.password),
    role,
    disabled: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repository.create(newUser);
  return {
    statusCode: 201,
    body: { user: sanitizeUserRecord(newUser) },
  };
}

export async function toggleAdminUserStatus({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const userId = params[0];
  const repository = createRepository('customers');
  const user = await repository.getById(userId);

  if (!user) {
    return { statusCode: 404, body: { error: 'User not found.' } };
  }

  const nextDisabled = !user.disabled;
  const updatedUser = await repository.update(userId, {
    disabled: nextDisabled,
    status: nextDisabled ? 'DISABLED' : 'ACTIVE',
    updatedAt: new Date().toISOString(),
  });

  return {
    statusCode: 200,
    body: { user: sanitizeUserRecord(updatedUser) },
  };
}

export async function resetAdminUserPassword({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const userId = params[0];
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  if (!payload.password || String(payload.password).length < 4) {
    return { statusCode: 400, body: { error: 'Password must be at least 4 characters long.' } };
  }

  const repository = createRepository('customers');
  const hashedPass = hashPassword(payload.password);
  const updatedUser = await repository.update(userId, {
    password: hashedPass,
    password_hash: hashedPass,
    passwordHash: hashedPass,
    updatedAt: new Date().toISOString(),
  });

  if (!updatedUser) {
    return { statusCode: 404, body: { error: 'User not found.' } };
  }

  return {
    statusCode: 200,
    body: { success: true },
  };
}
