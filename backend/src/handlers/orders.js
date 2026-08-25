import { createRepository } from '../dataAccess/repository.js';
import { getAuthenticatedUser, getUserRole } from '../auth.js';

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

  // Ensure customer record exists in customers table to satisfy foreign key fk_orders_customer
  let validCustomerId = null;
  const rawCustId = payload.customerId || payload.userId;
  if (rawCustId) {
    try {
      const cust = await customerRepo.getById(rawCustId);
      if (cust) validCustomerId = cust.id;
    } catch {}
  }

  if (!validCustomerId && (payload.customerEmail || payload.email || payload.customerPhone || payload.mobile)) {
    try {
      const emailVal = payload.customerEmail || payload.email || '';
      const phoneVal = payload.customerPhone || payload.customerMobile || payload.mobile || '';
      const allCustomers = await customerRepo.list();
      const match = (allCustomers || []).find((c) => (emailVal && c.email === emailVal) || (phoneVal && c.phone === phoneVal));
      if (match) validCustomerId = match.id;
    } catch {}
  }

  if (!validCustomerId) {
    try {
      const newCustId = rawCustId || `cust-${Date.now()}`;
      const newCust = await customerRepo.create({
        id: newCustId,
        fullName: payload.customerName || payload.fullName || 'Customer',
        email: payload.customerEmail || payload.email || '',
        phone: payload.customerPhone || payload.customerMobile || payload.mobile || '',
        createdAt: new Date().toISOString(),
      });
      if (newCust) validCustomerId = newCust.id;
    } catch {
      validCustomerId = null;
    }
  }

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
    customerName: payload.customerName || payload.fullName || 'Guest Customer',
    customerEmail: payload.customerEmail || payload.email || '',
    customerPhone: payload.customerPhone || payload.customerMobile || payload.mobile || '',
    customerMobile: payload.customerPhone || payload.customerMobile || payload.mobile || '',
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
  const order = await repository.getById(targetOrderId);

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
  const role = getUserRole(req.headers);
  const repository = createRepository('orders');

  if (role === 'admin') {
    return {
      statusCode: 200,
      body: { orders: await repository.list() },
    };
  }

  const userAuth = getAuthenticatedUser(req.headers);
  if (!userAuth) {
    return {
      statusCode: 401,
      body: { error: 'Authentication required. Please log in to view orders.' },
    };
  }

  const cleanTokenId = String(userAuth.id || '').trim().toLowerCase();
  const cleanTokenEmail = String(userAuth.email || '').trim().toLowerCase();
  const cleanTokenMobile = String(userAuth.mobile || userAuth.phone || '').replace(/\D/g, '').slice(-10);

  const allOrders = await repository.list();
  const customerOrders = (allOrders || []).filter((o) => {
    const oCustId = String(o.customerId || '').trim().toLowerCase();
    const oEmail = String(o.customerEmail || '').trim().toLowerCase();
    const oMobile = String(o.customerPhone || o.customerMobile || '').replace(/\D/g, '').slice(-10);
    return (
      (cleanTokenId && oCustId && (oCustId === cleanTokenId || oCustId.replace(/^(cust|customer)-/, '') === cleanTokenId.replace(/^(cust|customer)-/, ''))) ||
      (cleanTokenEmail && oEmail && oEmail === cleanEmail) ||
      (cleanTokenMobile && oMobile && oMobile === cleanTokenMobile)
    );
  });

  return {
    statusCode: 200,
    body: { orders: customerOrders },
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
