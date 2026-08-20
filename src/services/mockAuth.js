import {
  assignOrderVendor,
  createOrder,
  createOrderApi,
  getLastOrder,
  getOrderByIdApi,
  getOrders,
  getOrdersApi,
  readAllOrders,
  saveLastOrder as saveLastOrderService,
  updateOrderStatus,
  writeAllOrders,
} from './orderService';
import {
  createAdminUser as createAdminUserService,
  getAllUsersForAdmin as getAllUsersForAdminService,
  getAllUsersForAdminApi,
  getCurrentUser,
  getUsers,
  persistCurrentUser,
  readUsers,
  resetUserPassword as resetUserPasswordService,
  toggleUserStatus as toggleUserStatusService,
  verifyAdminReauthPassword as verifyAdminReauthPasswordService,
  verifyAdminReauthPasswordApi,
  writeUsers,
} from './userService';

export { defaultUsers } from './userService';
export {
  readAllOrders,
  writeAllOrders,
  getLastOrder as getStoredLastOrder,
  saveLastOrderService as saveLastOrder,
  getOrders as getStoredOrders,
  createOrder as addOrder,
  updateOrderStatus as updateStoredOrderStatus,
  assignOrderVendor as assignStoredOrderVendor,
  createOrderApi,
  getOrdersApi,
  getOrderByIdApi,
};
export {
  readUsers,
  writeUsers,
  getCurrentUser as getStoredUser,
  persistCurrentUser as persistUser,
  getUsers,
  getAllUsersForAdminService as getAllUsersForAdmin,
  verifyAdminReauthPasswordService as verifyAdminReauthPassword,
  createAdminUserService as createAdminUser,
  toggleUserStatusService as toggleUserStatus,
  resetUserPasswordService as resetUserPassword,
  getAllUsersForAdminApi,
  verifyAdminReauthPasswordApi,
};

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeMobile(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName || user.name || 'Customer',
    name: user.fullName || user.name || 'Customer',
    mobile: user.mobile || user.phone || '',
    phone: user.mobile || user.phone || '',
    email: user.email || '',
    savedAddress: user.savedAddress || user.address || '',
    address: user.savedAddress || user.address || '',
    password: user.password || '',
    role: user.role || 'CUSTOMER',
    orders: Array.isArray(user.orders) ? user.orders : [],
    createdAt: user.createdAt || new Date().toISOString(),
  };
}

export function clearUser() {
  persistCurrentUser(null);
}

export function loginWithCredentials({ identifier, password }) {
  const users = readUsers();
  const cleanId = normalizeIdentifier(identifier);
  const cleanMobile = normalizeMobile(identifier);

  const matched = users.find((user) => {
    const userEmail = normalizeIdentifier(user.email);
    const userMobile = normalizeMobile(user.mobile);
    return (userEmail && userEmail === cleanId) || (userMobile && userMobile === cleanMobile);
  });

  if (!matched) {
    return { ok: false, error: 'User account not found. Please check your credentials or sign up.' };
  }

  if (matched.disabled) {
    return { ok: false, error: 'This account has been disabled. Please contact DecorFesto support.' };
  }

  if (matched.password && matched.password !== password) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }

  const safeUser = sanitizeUser(matched);
  persistCurrentUser(safeUser);
  return { ok: true, user: safeUser };
}

export function signupWithDetails(payload) {
  const users = readUsers();
  const cleanEmail = normalizeIdentifier(payload.email);
  const cleanMobile = normalizeMobile(payload.mobile);

  if (cleanEmail && users.some((user) => normalizeIdentifier(user.email) === cleanEmail)) {
    return { ok: false, error: 'An account with this email address already exists.' };
  }

  const user = sanitizeUser({
    id: `customer-${Date.now()}`,
    fullName: String(payload.fullName || payload.name || '').trim(),
    mobile: cleanMobile.length === 10 ? `+91${cleanMobile}` : payload.mobile,
    email: cleanEmail,
    password: payload.password,
    savedAddress: payload.savedAddress || '',
    role: 'CUSTOMER',
    orders: [],
    createdAt: new Date().toISOString(),
  });

  users.push(user);
  writeUsers(users);
  persistCurrentUser(user);
  return { ok: true, user };
}

export function updateStoredUser(user) {
  const safeUser = sanitizeUser(user);
  const users = readUsers();
  const nextUsers = users.map((entry) => (entry.id === safeUser.id ? safeUser : entry));
  writeUsers(nextUsers);
  persistCurrentUser(safeUser);
  return safeUser;
}

export function addOrderToUser(user, order) {
  const safeUser = sanitizeUser({
    ...user,
    orders: [{ ...order, createdAt: order.createdAt || new Date().toISOString() }, ...(user?.orders || [])],
  });

  const users = readUsers();
  const exists = users.some((entry) => entry.id === safeUser.id);
  const nextUsers = exists
    ? users.map((entry) => (entry.id === safeUser.id ? safeUser : entry))
    : [...users, safeUser];

  writeUsers(nextUsers);
  persistCurrentUser(safeUser);
  return safeUser;
}

export function clearStoredSession() {
  clearUser();
}

export function findOrCreateCustomerByMobile({ fullName, mobile, email }) {
  const users = readUsers();
  const normalizedMobile = normalizeMobile(mobile);

  const existing = users.find((u) => normalizeMobile(u.mobile) === normalizedMobile);
  if (existing) {
    const safeUser = sanitizeUser(existing);
    persistCurrentUser(safeUser);
    return { ok: true, user: safeUser, isNew: false };
  }

  const tempPassword = `df-${Date.now()}`;
  const newUser = sanitizeUser({
    id: `customer-${Date.now()}`,
    fullName: String(fullName || '').trim() || 'Customer',
    mobile: normalizedMobile.length === 10 ? `+91${normalizedMobile}` : mobile,
    email: String(email || '').trim().toLowerCase(),
    password: tempPassword,
    savedAddress: '',
    role: 'CUSTOMER',
    orders: [],
    createdAt: new Date().toISOString(),
  });

  users.push(newUser);
  writeUsers(users);
  persistCurrentUser(newUser);
  return { ok: true, user: newUser, isNew: true };
}
