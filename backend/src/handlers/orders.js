import { createRepository } from '../dataAccess/repository.js';
import { getUserRole } from '../auth.js';

function buildOrderId() {
  return `ORD-${Date.now().toString().slice(-8)}`;
}

export async function createOrder({ req }) {
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const repository = createRepository('orders');

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

  const order = {
    id: targetId,
    orderId: targetId,
    customerId: payload.customerId || `customer-${Date.now()}`,
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
    vendorId: payload.vendorId || null,
    vendorName: payload.vendorName || 'Unassigned',
    vendorAssignedAt: null,
    vendorNotificationSentAt: null,
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repository.create(order);
  return {
    statusCode: 201,
    body: { order },
  };
}

export async function getOrder({ req, params }) {
  const repository = createRepository('orders');
  const order = await repository.getById(params[0]);
  const role = getUserRole(req.headers);

  if (!order) {
    return {
      statusCode: 404,
      body: { error: 'Order not found.' },
    };
  }

  if (role !== 'admin' && order.customerId !== params[0] && order.customerId !== req.headers['x-customer-id']) {
    return {
      statusCode: 403,
      body: { error: 'Forbidden.' },
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
  const customerId = req.headers['x-customer-id'] || req.headers['X-Customer-Id'];

  if (role === 'admin') {
    return {
      statusCode: 200,
      body: { orders: await repository.list() },
    };
  }

  if (customerId) {
    const allOrders = await repository.list();
    const customerOrders = (allOrders || []).filter(
      (o) => o.customerId === customerId || o.customerEmail === customerId || o.customerMobile === customerId
    );
    return {
      statusCode: 200,
      body: { orders: customerOrders },
    };
  }

  return {
    statusCode: 200,
    body: { orders: await repository.list() },
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
