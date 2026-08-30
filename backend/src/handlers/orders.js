import { createRepository } from '../dataAccess/repository.js';
import { getAuthenticatedUser, getAuthenticatedCustomer, getUserRole, extractTokenFromHeaders, verifyAdminSessionToken } from '../auth.js';

function buildOrderId() {
  return `ORD-${Date.now().toString().slice(-8)}`;
}

export async function createOrder({ req }) {
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const repository = createRepository('orders');
  const customerRepo = createRepository('customers');
  const vendorRepo = createRepository('vendors');

  if (payload.pincode && !/^[1-9][0-9]{5}$/.test(String(payload.pincode).trim())) {
    return {
      statusCode: 400,
      body: { error: 'Please enter a valid 6-digit Indian pincode.' },
    };
  }

  const targetId = payload.id || payload.orderId || buildOrderId();

  // Check if order already exists in database
  let existingOrder = null;
  try {
    existingOrder = await repository.getById(targetId);
  } catch {
    existingOrder = null;
  }

  if (existingOrder) {
    return {
      statusCode: 200,
      body: { order: existingOrder },
    };
  }

  // Derive customer identity strictly from authenticated server session
  const userAuth = getAuthenticatedUser(req.headers);
  if (!userAuth || !userAuth.id) {
    return {
      statusCode: 401,
      body: { error: 'Authentication required. Please log in to complete your booking.' },
    };
  }

  const customer = await customerRepo.getById(userAuth.id);
  if (!customer) {
    return {
      statusCode: 401,
      body: { error: 'Authenticated customer account not found. Please log in again.' },
    };
  }

  const validCustomerId = customer.id;
  const customerName = customer.fullName || customer.name || payload.customerName || 'Customer';
  const customerEmail = customer.email || payload.customerEmail || payload.email || '';
  const customerPhone = customer.phone || customer.mobile || payload.customerPhone || payload.customerMobile || payload.mobile || '';

  // Ensure vendor record exists if vendorId passed to satisfy fk_orders_vendor
  let validVendorId = null;
  if (payload.vendorId) {
    try {
      const vendor = await vendorRepo.getById(payload.vendorId);
      if (vendor) validVendorId = vendor.id;
    } catch {
      validVendorId = null;
    }
  }

  const order = {
    id: targetId,
    orderId: targetId,
    customerId: validCustomerId,
    customerName,
    customerEmail,
    customerPhone,
    customerMobile: customerPhone,
    decorationId: payload.decorationId || payload.productId || payload.items?.[0]?.id || '1',
    decorationName: payload.decorationName || payload.items?.[0]?.productName || 'DecorFesto Package',
    customization: payload.customization || payload.items?.[0]?.customization || {},
    items: Array.isArray(payload.items) ? payload.items : [],
    pincode: String(payload.pincode || '').trim(),
    scheduledDate: payload.scheduledDate || payload.eventDate || payload.date || '',
    eventDate: payload.scheduledDate || payload.eventDate || payload.date || '',
    scheduledTime: payload.scheduledTime || payload.timeSlot || payload.time || '',
    timeSlot: payload.scheduledTime || payload.timeSlot || payload.time || '',
    deliveryAddress: payload.deliveryAddress || payload.address || '',
    address: payload.deliveryAddress || payload.address || '',
    subtotal: Number(payload.subtotal || 0),
    serviceCharge: Number(payload.serviceCharge || payload.serviceCharges || 299),
    serviceCharges: Number(payload.serviceCharge || payload.serviceCharges || 299),
    totalAmount: Number(payload.totalAmount || payload.total || 0),
    total: Number(payload.totalAmount || payload.total || 0),
    paymentStatus: payload.paymentStatus || 'PAYMENT_INITIATED',
    bookingStatus: payload.bookingStatus || 'Order Received',
    adminReviewStatus: 'PENDING',
    vendorId: validVendorId,
    vendorName: payload.vendorName || (validVendorId ? 'Assigned Vendor' : 'Unassigned'),
    vendorAssignedAt: validVendorId ? new Date().toISOString() : null,
    vendorNotificationSentAt: null,
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createdOrder = await repository.create(order);
  return {
    statusCode: 201,
    body: { order: createdOrder || order },
  };
}

export async function getOrder({ req, params }) {
  const targetOrderId = params[0];
  const role = getUserRole(req.headers);
  const userAuth = getAuthenticatedUser(req.headers);

  // Unauthenticated requests are rejected with 401 immediately
  if (role !== 'admin' && !userAuth) {
    return {
      statusCode: 401,
      body: { error: 'Authentication required. Please log in to view this order.' },
    };
  }

  const repository = createRepository('orders');
  const order = await repository.getByIdOrOrderId(targetOrderId);

  if (!order) {
    return {
      statusCode: 404,
      body: { error: 'Order not found.' },
    };
  }

  // Admin access allows viewing any order
  if (role === 'admin') {
    return {
      statusCode: 200,
      body: { order },
    };
  }

  // Verify order ownership against trusted session identity (ignoring untrusted client headers)
  const cleanTokenId = String(userAuth.id || userAuth.vendorId || '').trim().toLowerCase();
  const cleanTokenEmail = String(userAuth.email || '').trim().toLowerCase();
  const cleanTokenMobile = String(userAuth.mobile || userAuth.phone || '').replace(/\D/g, '').slice(-10);

  const oCustId = String(order.customerId || '').trim().toLowerCase();
  const oEmail = String(order.customerEmail || '').trim().toLowerCase();
  const oMobile = String(order.customerPhone || order.customerMobile || '').replace(/\D/g, '').slice(-10);
  const oVendorId = String(order.vendorId || '').trim().toLowerCase();

  const isOwner = (
    (cleanTokenId && oCustId && (oCustId === cleanTokenId || oCustId.replace(/^(cust|customer)-/, '') === cleanTokenId.replace(/^(cust|customer)-/, ''))) ||
    (cleanTokenEmail && oEmail && oEmail === cleanTokenEmail) ||
    (cleanTokenMobile && oMobile && oMobile === cleanTokenMobile) ||
    (role === 'VENDOR' && cleanTokenId && oVendorId && oVendorId === cleanTokenId)
  );

  if (!isOwner) {
    return {
      statusCode: 403,
      body: { error: 'Forbidden. You do not have permission to view this order.' },
    };
  }

  return {
    statusCode: 200,
    body: { order },
  };
}

export async function listOrders({ req }) {
  const repository = createRepository('orders');

  let adminAuthFromHeader = false;
  for (const key of Object.keys(req.headers || {})) {
    if (key.toLowerCase() === 'authorization') {
      const authHeader = String(req.headers[key] || '');
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token && verifyAdminSessionToken(token)) {
        adminAuthFromHeader = true;
        break;
      }
    }
  }

  const adminCookieToken = extractTokenFromHeaders(req.headers, 'admin');
  const isAdminCookieValid = Boolean(adminCookieToken && verifyAdminSessionToken(adminCookieToken));
  const customerAuth = getAuthenticatedCustomer(req.headers);

  // 1. Explicit Admin Request: carries an Admin Authorization header OR has valid Admin cookie without Customer session
  const isAdminRequest = adminAuthFromHeader || (isAdminCookieValid && !customerAuth);

  if (isAdminRequest) {
    return {
      statusCode: 200,
      body: { orders: await repository.list() },
    };
  }

  // 2. Customer Request: enforce strict customer order isolation against authenticated customer identity
  if (customerAuth) {
    const cleanTokenId = String(customerAuth.id || '').trim().toLowerCase();
    const cleanTokenEmail = String(customerAuth.email || '').trim().toLowerCase();
    const cleanTokenMobile = String(customerAuth.mobile || customerAuth.phone || '').replace(/\D/g, '').slice(-10);

    const allOrders = await repository.list();
    const customerOrders = (allOrders || []).filter((o) => {
      const oCustId = String(o.customerId || '').trim().toLowerCase();
      const oEmail = String(o.customerEmail || '').trim().toLowerCase();
      const oMobile = String(o.customerPhone || o.customerMobile || '').replace(/\D/g, '').slice(-10);
      return (
        (cleanTokenId && oCustId && (oCustId === cleanTokenId || oCustId.replace(/^(cust|customer)-/, '') === cleanTokenId.replace(/^(cust|customer)-/, ''))) ||
        (cleanTokenEmail && oEmail && oEmail === cleanTokenEmail) ||
        (cleanTokenMobile && oMobile && oMobile === cleanTokenMobile)
      );
    });

    return {
      statusCode: 200,
      body: { orders: customerOrders },
    };
  }

  // 3. Fallback for role-based Admin access
  const role = getUserRole(req.headers);
  if (role === 'admin') {
    return {
      statusCode: 200,
      body: { orders: await repository.list() },
    };
  }

  return {
    statusCode: 401,
    body: { error: 'Authentication required. Please log in to view orders.' },
  };
}

export async function updateOrderStatus({ req, params }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin access required.' },
    };
  }

  const repository = createRepository('orders');
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const updates = {
    updatedAt: new Date().toISOString(),
  };
  if (payload.bookingStatus) updates.bookingStatus = payload.bookingStatus;
  if (payload.adminReviewStatus) updates.adminReviewStatus = payload.adminReviewStatus;
  if (payload.vendorId !== undefined) updates.vendorId = payload.vendorId;
  if (payload.vendorName !== undefined) updates.vendorName = payload.vendorName;
  if (payload.vendorId && !payload.vendorAssignedAt) updates.vendorAssignedAt = new Date().toISOString();

  const updatedOrder = await repository.update(params[0], updates);

  if (!updatedOrder) {
    return {
      statusCode: 404,
      body: { error: 'Order not found.' },
    };
  }

  return {
    statusCode: 200,
    body: { order: updatedOrder },
  };
}
