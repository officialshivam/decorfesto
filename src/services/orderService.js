import { calculateItemSubtotal, getEnabledCharges } from './chargeService.js';
import { getCurrentUser, persistCurrentUser, readUsers, writeUsers } from './userService.js';

const ALL_ORDERS_STORAGE_KEY = 'decorfesto-all-orders';
const LAST_ORDER_STORAGE_KEY = 'decorfesto-last-order';

function sanitizeOrder(ord) {
  if (!ord) return null;
  const items = Array.isArray(ord.items) ? ord.items : [];
  const primaryItem = items[0] || {};
  const activeCharges = Array.isArray(ord.charges) ? ord.charges : getEnabledCharges();
  const chargesTotal = typeof ord.serviceCharges === 'number'
    ? ord.serviceCharges
    : activeCharges.reduce((sum, c) => sum + (c.amount || 0), 0);

  const subtotal = typeof ord.subtotal === 'number' && ord.subtotal > 0
    ? ord.subtotal
    : items.reduce((sum, i) => sum + calculateItemSubtotal(i), 0);

  const total = typeof ord.total === 'number' && ord.total > 0
    ? ord.total
    : subtotal + chargesTotal;

  return {
    id: String(ord.id || `DFC-${Date.now().toString().slice(-6)}`).trim(),
    orderId: String(ord.orderId || ord.id || `DFC-${Date.now().toString().slice(-6)}`).trim(),
    customerId: String(ord.customerId || ord.userId || 'guest-user').trim(),
    customerName: String(ord.customerName || ord.name || 'Customer').trim(),
    customerEmail: String(ord.customerEmail || ord.email || '').trim(),
    customerMobile: String(ord.customerMobile || ord.mobile || '').trim(),
    productId: String(ord.productId || primaryItem.id || '1').trim(),
    decorationName: String(ord.decorationName || primaryItem.productName || 'DecorFesto Package').trim(),
    pincode: String(ord.pincode || primaryItem.pincode || '').trim(),
    address: String(ord.address || '').trim(),
    city: String(ord.city || 'Delhi NCR').trim(),
    state: String(ord.state || 'Delhi').trim(),
    eventDate: String(ord.eventDate || ord.scheduledDate || ord.date || primaryItem.date || '').trim(),
    scheduledDate: String(ord.eventDate || ord.scheduledDate || ord.date || primaryItem.date || '').trim(),
    date: String(ord.eventDate || ord.scheduledDate || ord.date || primaryItem.date || '').trim(),
    timeSlot: String(ord.timeSlot || ord.scheduledTime || ord.time || primaryItem.time || '').trim(),
    scheduledTime: String(ord.timeSlot || ord.scheduledTime || ord.time || primaryItem.time || '').trim(),
    time: String(ord.timeSlot || ord.scheduledTime || ord.time || primaryItem.time || '').trim(),
    items: JSON.parse(JSON.stringify(items)),
    customizations: ord.customizations || primaryItem.customization || {},
    addons: Array.isArray(ord.addons) ? ord.addons : (primaryItem.selectedAddons || []),
    subtotal,
    discount: Number(ord.discount || 0),
    charges: activeCharges,
    serviceCharges: chargesTotal,
    total,
    paymentStatus: String(ord.paymentStatus || 'Paid via UPI / Mock').trim(),
    bookingStatus: String(ord.bookingStatus || 'Order Received').trim(),
    vendorId: ord.vendorId || null,
    vendorName: ord.vendorName || 'Unassigned',
    remarks: String(ord.remarks || '').trim(),
    reviewMessage: String(ord.reviewMessage || 'DecorFesto will review your booking shortly and confirm the next step with you.').trim(),
    createdAt: ord.createdAt || new Date().toISOString(),
    updatedAt: ord.updatedAt || new Date().toISOString(),
  };
}

export function readAllOrders() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ALL_ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw).map(sanitizeOrder) : [];
  } catch {
    return [];
  }
}

export function writeAllOrders(orders) {
  if (typeof window !== 'undefined' && Array.isArray(orders)) {
    window.localStorage.setItem(ALL_ORDERS_STORAGE_KEY, JSON.stringify(orders.map(sanitizeOrder)));
  }
}

export function getLastOrder() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LAST_ORDER_STORAGE_KEY);
    return stored ? sanitizeOrder(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

export function saveLastOrder(order) {
  if (typeof window !== 'undefined' && order) {
    const clean = sanitizeOrder(order);
    window.localStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(clean));
  }
}

export function createOrder(orderData, userFields = {}) {
  const cleanOrder = sanitizeOrder(orderData);
  saveLastOrder(cleanOrder);

  // 1. Write to canonical order store
  const existingAll = readAllOrders();
  const nextAll = [cleanOrder, ...existingAll.filter((o) => o.id !== cleanOrder.id)];
  writeAllOrders(nextAll);

  // 2. Attach order to user profile
  const activeUser = getCurrentUser();
  const users = readUsers();

  if (activeUser) {
    const nextUser = {
      ...activeUser,
      orders: [cleanOrder, ...(activeUser.orders || []).filter((o) => o.id !== cleanOrder.id)],
    };
    const nextUsers = users.map((u) => (u.id === nextUser.id ? nextUser : u));
    writeUsers(nextUsers);
    persistCurrentUser(nextUser);
    return cleanOrder;
  }

  let guestUser = users.find((u) => u.id === 'guest-user');
  if (!guestUser) {
    guestUser = {
      id: 'guest-user',
      name: userFields.fullName || cleanOrder.customerName || 'Guest Customer',
      fullName: userFields.fullName || cleanOrder.customerName || 'Guest Customer',
      mobile: userFields.mobile || cleanOrder.customerMobile || '',
      phone: userFields.mobile || cleanOrder.customerMobile || '',
      email: userFields.email || cleanOrder.customerEmail || '',
      role: 'CUSTOMER',
      disabled: false,
      orders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(guestUser);
  }

  guestUser.orders = [cleanOrder, ...(guestUser.orders || []).filter((o) => o.id !== cleanOrder.id)];
  writeUsers(users);
  return cleanOrder;
}

export function getOrders() {
  const standaloneOrders = readAllOrders();
  const userOrders = readUsers().flatMap((user) =>
    (user.orders || []).map((order) => sanitizeOrder({
      ...order,
      customerName: order.customerName || user.fullName || user.name || 'Customer',
      customerEmail: order.customerEmail || order.email || user.email || '',
      customerMobile: order.customerMobile || order.mobile || user.mobile || '',
    })),
  );

  const map = new Map();
  for (const order of [...standaloneOrders, ...userOrders]) {
    if (order && order.id) {
      map.set(order.id, order);
    }
  }

  return Array.from(map.values()).sort(
    (first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0),
  );
}

export function getStoredOrders() {
  return getOrders();
}

export function getOrderById(orderId) {
  const idStr = String(orderId || '').trim();
  if (!idStr) return null;
  return getOrders().find((o) => o.id === idStr || o.orderId === idStr) || null;
}

export function updateOrderStatus(orderId, bookingStatus) {
  const orders = readAllOrders();
  let updated = null;

  const nextOrders = orders.map((o) => {
    if (o.id !== orderId) return o;
    updated = sanitizeOrder({ ...o, bookingStatus, updatedAt: new Date().toISOString() });
    return updated;
  });

  if (updated) {
    writeAllOrders(nextOrders);
  }

  const users = readUsers();
  const nextUsers = users.map((u) => ({
    ...u,
    orders: (u.orders || []).map((o) => (o.id === orderId ? { ...o, bookingStatus } : o)),
  }));
  writeUsers(nextUsers);

  const activeUser = getCurrentUser();
  if (activeUser && (activeUser.orders || []).some((o) => o.id === orderId)) {
    persistCurrentUser({
      ...activeUser,
      orders: activeUser.orders.map((o) => (o.id === orderId ? { ...o, bookingStatus } : o)),
    });
  }

  return getOrderById(orderId);
}

export function assignOrderVendor(orderId, vendor, vendorNameParam = '') {
  let vId = null;
  let vName = 'Vendor';
  if (typeof vendor === 'object' && vendor !== null) {
    vId = vendor.id;
    vName = vendor.name || vendor.contactName || 'Vendor';
  } else if (typeof vendor === 'string') {
    vId = vendor;
    vName = vendorNameParam || vendor;
  }

  const orders = readAllOrders();
  let updated = null;

  const nextOrders = orders.map((o) => {
    if (o.id !== orderId) return o;
    updated = sanitizeOrder({
      ...o,
      vendorId: vId,
      vendorName: vName,
      bookingStatus: 'VENDOR_ASSIGNED',
      vendorAssignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return updated;
  });

  if (updated) {
    writeAllOrders(nextOrders);
  }

  const users = readUsers();
  const nextUsers = users.map((u) => ({
    ...u,
    orders: (u.orders || []).map((o) =>
      o.id === orderId ? { ...o, vendorId, vendorName, bookingStatus: 'ASSIGNED_TO_VENDOR' } : o,
    ),
  }));
  writeUsers(nextUsers);

  return getOrderById(orderId);
}

import { getApiBaseUrl } from './apiConfig.js';

const API_BASE_URL = getApiBaseUrl();

export async function createOrderApi(orderData, userFields = {}) {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ ...orderData, ...userFields }),
  });
  if (response.ok) {
    const result = await response.json();
    const serverOrder = sanitizeOrder(result.order || result);
    saveLastOrder(serverOrder);
    return serverOrder;
  }
  const errData = await response.json().catch(() => ({}));
  throw new Error(errData.error || `Failed to create order on server (HTTP ${response.status}).`);
}

import { getAdminAuthHeaders } from './adminAuthService';

export async function getOrdersApi() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/orders`, {
      headers: getAdminAuthHeaders(),
      credentials: 'include',
    });
    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result.orders)) {
        return result.orders.map(sanitizeOrder);
      }
    }
  } catch (error) {
    console.debug('Unable to fetch backend orders list:', error);
  }
  return [];
}

export async function getUserOrdersApi() {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });
    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result.orders)) {
        return result.orders.map(sanitizeOrder);
      }
    }
  } catch (error) {
    console.debug('Unable to fetch customer orders from backend:', error);
  }
  return [];
}

export async function getCustomerOrderByIdApi(orderId) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });
    if (response.ok) {
      const result = await response.json();
      if (result.order) {
        return { ok: true, statusCode: 200, order: sanitizeOrder(result.order) };
      }
    }
    const errData = await response.json().catch(() => ({}));
    return {
      ok: false,
      statusCode: response.status,
      error: errData.error || `Failed to fetch booking details (HTTP ${response.status}).`,
    };
  } catch (error) {
    console.debug('Unable to fetch backend customer order:', error);
    return { ok: false, statusCode: 500, error: 'Network error fetching booking details.' };
  }
}

export async function getAdminOrderByIdApi(orderId) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
      headers: getAdminAuthHeaders({ Accept: 'application/json' }),
      credentials: 'include',
    });
    if (response.ok) {
      const result = await response.json();
      if (result.order) {
        return sanitizeOrder(result.order);
      }
    }
  } catch (error) {
    console.debug('Unable to fetch backend admin order:', error);
  }
  return null;
}

export async function getOrderByIdApi(orderId) {
  const res = await getCustomerOrderByIdApi(orderId);
  return res.ok ? res.order : null;
}

export async function updateAdminOrderStatusApi(orderId, updates) {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  if (response.ok) {
    const result = await response.json();
    if (result.order) {
      return sanitizeOrder(result.order);
    }
  }
  const errData = await response.json().catch(() => ({}));
  throw new Error(errData.error || `Failed to update order status on server (HTTP ${response.status}).`);
}
