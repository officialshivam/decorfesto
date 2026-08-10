import { createRepository } from '../dataAccess/repository.js';
import { getUserRole } from '../auth.js';

function buildOrderId() {
  return `ORD-${Date.now().toString().slice(-8)}`;
}

export async function createOrder({ req }) {
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const repository = createRepository('orders');
  const serviceAreaRepository = createRepository('service-areas');
  const serviceArea = await serviceAreaRepository.getById(payload.pincode);

  if (!serviceArea || !serviceArea.serviceable) {
    return {
      statusCode: 400,
      body: { error: 'Decoration service is not available for the provided pincode.' },
    };
  }

  const existingOrders = await repository.queryByField('scheduledDate', payload.scheduledDate);
  const duplicate = existingOrders.find((order) => {
    return order.decorationId === payload.decorationId && order.scheduledTime === payload.scheduledTime && order.pincode === payload.pincode;
  });

  if (duplicate) {
    return {
      statusCode: 409,
      body: { error: 'This decoration slot is no longer available for the selected date and time.' },
    };
  }

  const order = {
    id: payload.orderId || buildOrderId(),
    customerId: payload.customerId || `customer-${Date.now()}`,
    customerName: payload.customerName || 'Guest Customer',
    customerEmail: payload.customerEmail || '',
    customerPhone: payload.customerPhone || '',
    decorationId: payload.decorationId,
    decorationName: payload.decorationName,
    customization: payload.customization || {},
    pincode: payload.pincode,
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime,
    deliveryAddress: payload.deliveryAddress || '',
    subtotal: payload.subtotal || 0,
    serviceCharge: payload.serviceCharge || 299,
    totalAmount: payload.totalAmount || 0,
    paymentStatus: 'PENDING',
    bookingStatus: 'CREATED',
    adminReviewStatus: 'PENDING',
    vendorId: null,
    vendorAssignedAt: null,
    vendorNotificationSentAt: null,
    createdAt: new Date().toISOString(),
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
  if (role === 'admin') {
    return {
      statusCode: 200,
      body: { orders: await repository.list() },
    };
  }

  const customerId = req.headers['x-customer-id'];
  const orders = await repository.queryByField('customerId', customerId);
  return {
    statusCode: 200,
    body: { orders },
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
  const updatedOrder = await repository.update(params[0], {
    bookingStatus: payload.bookingStatus || 'CREATED',
    adminReviewStatus: payload.adminReviewStatus || 'PENDING',
    vendorId: payload.vendorId || null,
    vendorAssignedAt: payload.vendorId ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  });

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
