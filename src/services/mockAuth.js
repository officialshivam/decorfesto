const USER_STORAGE_KEY = 'decorfesto-auth-user';
const USERS_STORAGE_KEY = 'decorfesto-auth-users';

function normalizeIdentifier(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeMobile(value) {
  return String(value || '').replace(/\D/g, '');
}

function readUsers() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to read saved users.', error);
    return [];
  }
}

function writeUsers(users) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function persistUser(user) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearUser() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(USER_STORAGE_KEY);
}

function sanitizeUser(user) {
  return {
    ...user,
    orders: Array.isArray(user.orders) ? user.orders : [],
    savedAddress: user.savedAddress || '',
  };
}

export function getStoredUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return sanitizeUser(JSON.parse(stored));
  } catch (error) {
    console.warn('Unable to read active user.', error);
    return null;
  }
}

export function getStoredOrders() {
  return readUsers()
    .flatMap((user) =>
      sanitizeUser(user).orders.map((order) => ({
        ...order,
        customerName: order.customerName || user.fullName || 'Customer',
        customerEmail: order.email || user.email || '',
        customerMobile: order.mobile || user.mobile || '',
      })),
    )
    .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0));
}

function updateStoredOrder(orderId, updates) {
  const users = readUsers();
  let updatedOrder = null;
  const nextUsers = users.map((user) => {
    const safeUser = sanitizeUser(user);
    const orders = safeUser.orders.map((order) => {
      if (order.id !== orderId) {
        return order;
      }

      updatedOrder = { ...order, ...updates };
      return updatedOrder;
    });

    return { ...safeUser, orders };
  });

  if (!updatedOrder) {
    return null;
  }

  writeUsers(nextUsers);

  const activeUser = getStoredUser();
  if (activeUser?.orders.some((order) => order.id === orderId)) {
    persistUser({
      ...activeUser,
      orders: activeUser.orders.map((order) => (order.id === orderId ? { ...order, ...updates } : order)),
    });
  }

  return getStoredOrders().find((order) => order.id === orderId) || null;
}

export function updateStoredOrderStatus(orderId, bookingStatus) {
  return updateStoredOrder(orderId, { bookingStatus });
}

export function assignStoredOrderVendor(orderId, vendor) {
  return updateStoredOrder(orderId, {
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorAssignedAt: new Date().toISOString(),
    bookingStatus: 'ASSIGNED_TO_VENDOR',
  });
}

export function loginWithCredentials({ identifier, password }) {
  const users = readUsers();
  const normalizedIdentifier = normalizeIdentifier(identifier);

  const user = users.find((entry) => {
    const matchesEmail = normalizeIdentifier(entry.email) === normalizedIdentifier;
    const matchesMobile = normalizeMobile(entry.mobile) === normalizeMobile(identifier);
    return matchesEmail || matchesMobile;
  });

  if (!user) {
    return { ok: false, error: 'We could not find an account with that email or mobile number.' };
  }

  if (user.password !== String(password)) {
    return { ok: false, error: 'The password you entered is incorrect.' };
  }

  const safeUser = sanitizeUser(user);
  persistUser(safeUser);
  return { ok: true, user: safeUser };
}

export function signupWithDetails(payload) {
  const users = readUsers();
  const normalizedEmail = normalizeIdentifier(payload.email);
  const normalizedMobile = normalizeMobile(payload.mobile);

  const existingUser = users.find((entry) => {
    return normalizeIdentifier(entry.email) === normalizedEmail || normalizeMobile(entry.mobile) === normalizedMobile;
  });

  if (existingUser) {
    return { ok: false, error: 'An account already exists with this email or mobile number.' };
  }

  const user = sanitizeUser({
    id: `customer-${Date.now()}`,
    fullName: payload.fullName.trim(),
    mobile: payload.mobile.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    savedAddress: payload.savedAddress || '',
    orders: [],
    createdAt: new Date().toISOString(),
  });

  users.push(user);
  writeUsers(users);
  persistUser(user);
  return { ok: true, user };
}

export function updateStoredUser(user) {
  const safeUser = sanitizeUser(user);
  const users = readUsers();
  const nextUsers = users.map((entry) => (entry.id === safeUser.id ? safeUser : entry));
  writeUsers(nextUsers);
  persistUser(safeUser);
  return safeUser;
}

export function addOrderToUser(user, order) {
  const safeUser = sanitizeUser({
    ...user,
    orders: [{ ...order, createdAt: order.createdAt || new Date().toISOString() }, ...(user?.orders || [])],
  });

  const users = readUsers();
  const nextUsers = users.map((entry) => (entry.id === safeUser.id ? safeUser : entry));
  writeUsers(nextUsers);
  persistUser(safeUser);
  return safeUser;
}

export function clearStoredSession() {
  clearUser();
}
