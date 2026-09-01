import { createRepository } from '../dataAccess/repository.js';
import { getAuthenticatedUser, getAuthenticatedCustomer, getUserRole, requireRole } from '../auth.js';

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

  let customer = await customerRepo.getById(userAuth.id);
  if (!customer && userAuth.email) {
    try { customer = await customerRepo.getByEmail(userAuth.email); } catch {}
  }
  if (!customer && userAuth.mobile) {
    try { customer = await customerRepo.getByMobile(userAuth.mobile); } catch {}
  }
  if (!customer && userAuth.id) {
    customer = {
      id: userAuth.id,
      fullName: userAuth.fullName || userAuth.name || payload.customerName || 'Customer',
      email: userAuth.email || payload.customerEmail || payload.email || '',
      phone: userAuth.mobile || userAuth.phone || payload.customerMobile || payload.mobile || '',
    };
  }

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

  const rawBookingStatus = String(payload.bookingStatus || '').trim().toUpperCase();
  const normalizedBookingStatus = (rawBookingStatus === 'BOOKING PLACED' || rawBookingStatus === 'BOOKING_PLACED' || !rawBookingStatus)
    ? 'ORDER_RECEIVED'
    : (payload.bookingStatus || 'ORDER_RECEIVED');

  // Pincode validation and anti-tampering check
  const submittedPincode = String(payload.pincode || '').trim();
  const cartItemPincode = String(payload.items?.[0]?.pincode || '').trim();
  if (!submittedPincode || !/^[1-9][0-9]{5}$/.test(submittedPincode)) {
    return {
      statusCode: 400,
      body: { error: 'Invalid 6-digit Indian pincode.' },
    };
  }
  if (cartItemPincode && submittedPincode !== cartItemPincode) {
    return {
      statusCode: 400,
      body: { error: 'Checkout pincode does not match the validated booking pincode context.' },
    };
  }

  // Fetch active service charges dynamically from backend DB source of truth
  let calculatedServiceFee = 100;
  try {
    const chargeRepo = createRepository('charges');
    const chargesList = await chargeRepo.list();
    if (Array.isArray(chargesList) && chargesList.length > 0) {
      const activeCharges = chargesList.filter((c) => c.enabled !== false && c.is_enabled !== 0);
      if (activeCharges.length > 0) {
        calculatedServiceFee = activeCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      }
    }
  } catch (err) {
    console.warn('Backend service charge lookup notice:', err.message);
  }

  const userRemarks = String(payload.remarks || payload.items?.[0]?.remarks || payload.items?.[0]?.customization?.remarks || '').trim();
  const userLandmark = String(payload.landmark || payload.items?.[0]?.landmark || payload.customization?.landmark || '').trim();
  const rawCustomization = payload.customization || payload.items?.[0]?.customization || {};
  const customizationObj = typeof rawCustomization === 'object' && rawCustomization !== null ? { ...rawCustomization } : {};
  if (userRemarks) {
    customizationObj.remarks = userRemarks;
  }
  if (userLandmark) {
    customizationObj.landmark = userLandmark;
  }

  const cleanDeliveryAddress = String(payload.deliveryAddress || payload.address || '').trim();
  const orderSubtotal = Number(payload.subtotal || 0);
  const finalOrderTotal = orderSubtotal + calculatedServiceFee;

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
    customization: customizationObj,
    items: Array.isArray(payload.items) ? payload.items : [],
    pincode: submittedPincode,
    scheduledDate: payload.scheduledDate || payload.eventDate || payload.date || payload.items?.[0]?.scheduledDate || payload.items?.[0]?.eventDate || payload.items?.[0]?.date || '',
    eventDate: payload.scheduledDate || payload.eventDate || payload.date || payload.items?.[0]?.scheduledDate || payload.items?.[0]?.eventDate || payload.items?.[0]?.date || '',
    scheduledTime: payload.scheduledTime || payload.timeSlot || payload.time || payload.items?.[0]?.scheduledTime || payload.items?.[0]?.timeSlot || payload.items?.[0]?.time || '',
    timeSlot: payload.scheduledTime || payload.timeSlot || payload.time || payload.items?.[0]?.scheduledTime || payload.items?.[0]?.timeSlot || payload.items?.[0]?.time || '',
    deliveryAddress: cleanDeliveryAddress,
    address: cleanDeliveryAddress,
    landmark: userLandmark,
    remarks: userRemarks,
    subtotal: orderSubtotal,
    serviceCharge: calculatedServiceFee,
    serviceCharges: calculatedServiceFee,
    totalAmount: finalOrderTotal,
    total: finalOrderTotal,
    paymentStatus: payload.paymentStatus || 'PAYMENT_INITIATED',
    bookingStatus: normalizedBookingStatus,
    adminReviewStatus: 'PENDING',
    vendorId: validVendorId,
    vendorName: payload.vendorName || (validVendorId ? 'Assigned Vendor' : 'Unassigned'),
    vendorAssignedAt: validVendorId ? new Date().toISOString() : null,
    vendorNotificationSentAt: null,
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const createdOrder = await repository.create(order);
    return {
      statusCode: 201,
      body: { order: createdOrder || order },
    };
  } catch (err) {
    console.error('❌ Failed to insert order into repository/MySQL database:', err);
    return {
      statusCode: 500,
      body: { error: `Database error creating order: ${err?.message || err}` },
    };
  }
}

export async function getOrder({ req, params }) {
  const targetOrderId = params[0];
  const customerAuth = getAuthenticatedCustomer(req.headers);

  // Customer endpoint requires valid customer authentication
  if (!customerAuth || !customerAuth.id) {
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

  if (order && order.customerId && (!order.customerPhone || !order.customerMobile)) {
    try {
      const customerRepo = createRepository('customers');
      const customer = await customerRepo.getById(order.customerId);
      if (customer && (customer.phone || customer.mobile)) {
        order.customerPhone = customer.phone || customer.mobile;
        order.customerMobile = customer.phone || customer.mobile;
      }
    } catch {}
  }

  // Enforce strict customer ownership (Admin session token/cookie CANNOT override customer ownership on this endpoint)
  const cleanTokenId = String(customerAuth.id || '').trim().toLowerCase();
  const cleanTokenEmail = String(customerAuth.email || '').trim().toLowerCase();
  const cleanTokenMobile = String(customerAuth.mobile || customerAuth.phone || '').replace(/\D/g, '').slice(-10);

  const oCustId = String(order.customerId || '').trim().toLowerCase();
  const oEmail = String(order.customerEmail || '').trim().toLowerCase();
  const oMobile = String(order.customerPhone || order.customerMobile || '').replace(/\D/g, '').slice(-10);

  const isOwner = (
    (cleanTokenId && oCustId && (oCustId === cleanTokenId || oCustId.replace(/^(cust|customer)-/, '') === cleanTokenId.replace(/^(cust|customer)-/, ''))) ||
    (cleanTokenEmail && oEmail && oEmail === cleanTokenEmail) ||
    (cleanTokenMobile && oMobile && oMobile === cleanTokenMobile)
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

export async function getAdminOrderDetails({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const targetOrderId = params[0];
  const repository = createRepository('orders');
  const order = await repository.getByIdOrOrderId(targetOrderId);

  if (!order) {
    return {
      statusCode: 404,
      body: { error: 'Order not found.' },
    };
  }

  if (order && order.customerId && (!order.customerPhone || !order.customerMobile)) {
    try {
      const customerRepo = createRepository('customers');
      const customer = await customerRepo.getById(order.customerId);
      if (customer && (customer.phone || customer.mobile)) {
        order.customerPhone = customer.phone || customer.mobile;
        order.customerMobile = customer.phone || customer.mobile;
      }
    } catch {}
  }

  return {
    statusCode: 200,
    body: { order },
  };
}

export async function listAdminOrders({ req }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const repository = createRepository('orders');
  const allOrders = await repository.list();

  return {
    statusCode: 200,
    body: { orders: allOrders || [] },
  };
}

export async function listOrders({ req }) {
  const customerAuth = getAuthenticatedCustomer(req.headers);
  if (!customerAuth || !customerAuth.id) {
    return {
      statusCode: 401,
      body: { error: 'Authentication required. Please log in to view orders.' },
    };
  }

  const cleanTokenId = String(customerAuth.id || '').trim().toLowerCase();
  const cleanTokenEmail = String(customerAuth.email || '').trim().toLowerCase();
  const cleanTokenMobile = String(customerAuth.mobile || customerAuth.phone || '').replace(/\D/g, '').slice(-10);

  const repository = createRepository('orders');
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

export function isTerminalOrderStatus(status) {
  if (!status) return false;
  const s = String(status).toUpperCase().trim();
  return ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(s);
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
  const targetId = params[0];
  const existingOrder = await repository.getByIdOrOrderId(targetId);

  if (!existingOrder) {
    return {
      statusCode: 404,
      body: { error: 'Order not found.' },
    };
  }

  if (isTerminalOrderStatus(existingOrder.bookingStatus)) {
    return {
      statusCode: 409,
      body: { error: `Order is in terminal state "${existingOrder.bookingStatus}" and cannot be modified.` },
    };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const updates = {
    updatedAt: new Date().toISOString(),
  };
  if (payload.bookingStatus) updates.bookingStatus = payload.bookingStatus;
  if (payload.adminReviewStatus) updates.adminReviewStatus = payload.adminReviewStatus;
  if (payload.vendorId !== undefined) updates.vendorId = payload.vendorId;
  if (payload.vendorName !== undefined) updates.vendorName = payload.vendorName;
  if (payload.vendorId && !payload.vendorAssignedAt) updates.vendorAssignedAt = new Date().toISOString();

  const updatedOrder = await repository.update(existingOrder.id || targetId, updates);

  return {
    statusCode: 200,
    body: { order: updatedOrder || { ...existingOrder, ...updates } },
  };
}
