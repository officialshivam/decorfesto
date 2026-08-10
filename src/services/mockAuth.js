const STORAGE_KEY = 'decorfesto-users';
const CURRENT_USER_KEY = 'decorfesto-current-user';

export const defaultUsers = [
  {
    id: 'customer-1',
    fullName: 'Shivam Gupta',
    mobile: '+919876543210',
    email: 'shivam@decorfesto.com',
    password: 'password123',
    savedAddress: 'B-402, Green Park Apartments, Hauz Khas, New Delhi',
    orders: [
      {
        id: 'DFC-104921',
        customerName: 'Shivam Gupta',
        decorationId: '1',
        decorationName: 'Romantic Birthday Balloon Decoration',
        customization: {
          balloonTheme: 'Metallic +₹400',
          balloonColors: 'Red & Gold +₹350',
          nameCustomization: 'Custom Name Neon Sign +₹500',
          ledLights: 'Add LED Lights +₹299',
          cakeTable: 'Premium Table +₹399',
        },
        remarks: 'Please use pastel pink flowers and write Happy Birthday Shivam on the backdrop.',
        pincode: '110016',
        scheduledDate: '2026-03-20',
        scheduledTime: '18:00 - 20:00',
        date: '2026-03-20',
        time: '18:00 - 20:00',
        address: 'B-402, Green Park Apartments, Hauz Khas, New Delhi',
        subtotal: 14947,
        serviceCharge: 299,
        totalAmount: 15246,
        total: 15246,
        paymentStatus: 'Paid via UPI',
        bookingStatus: 'Order Received',
        adminReviewStatus: 'Pending Review',
        createdAt: '2026-03-01T10:00:00.000Z',
      },
    ],
    createdAt: '2026-01-15T00:00:00.000Z',
  },
];

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeMobile(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName || user.name || 'Customer',
    name: user.fullName || user.name || 'Customer',
    mobile: user.mobile || '',
    email: user.email || '',
    savedAddress: user.savedAddress || user.address || '',
    address: user.savedAddress || user.address || '',
    password: user.password || '',
    orders: Array.isArray(user.orders) ? user.orders : [],
    createdAt: user.createdAt || new Date().toISOString(),
  };
}

function readUsers() {
  if (typeof window === 'undefined') return defaultUsers.map(sanitizeUser);

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
      return defaultUsers.map(sanitizeUser);
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(sanitizeUser) : defaultUsers.map(sanitizeUser);
  } catch (error) {
    console.warn('Unable to read saved users, falling back to default.', error);
    return defaultUsers.map(sanitizeUser);
  }
}

function writeUsers(users) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users.map(sanitizeUser)));
  }
}

function persistUser(user) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sanitizeUser(user)));
  }
}

function clearUser() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const users = readUsers();
    const freshUser = users.find((entry) => entry.id === parsed.id);
    return freshUser ? sanitizeUser(freshUser) : sanitizeUser(parsed);
  } catch (error) {
    console.warn('Unable to read active user from storage.', error);
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

export function addOrder(order, userFields = {}) {
  const activeUser = getStoredUser();

  if (activeUser) {
    addOrderToUser(activeUser, order);
    return order;
  }

  const users = readUsers();
  let guestUser = users.find((u) => u.id === 'guest-user');

  if (!guestUser) {
    guestUser = sanitizeUser({
      id: 'guest-user',
      fullName: userFields.fullName || order.customerName || 'Guest Customer',
      mobile: userFields.mobile || order.customerMobile || '',
      email: userFields.email || order.customerEmail || '',
      password: '',
      savedAddress: userFields.savedAddress || order.address || '',
      orders: [],
      createdAt: new Date().toISOString(),
    });
    users.push(guestUser);
  }

  guestUser.orders.unshift(order);
  writeUsers(users);
  return order;
}

export function clearStoredSession() {
  clearUser();
}
