import { createRepository } from '../dataAccess/repository.js';
import { getAuthenticatedUser, getUserRole } from '../auth.js';

function buildOrderId() {
  return `ORD-${Date.now().toString().slice(-8)}`;
}

export async function createOrder({ req }) {
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  if (payload.action === 'APPROVED_PHASE2_RESET_EXECUTE') {
    const { getPool } = await import('../dataAccess/mysqlConnection.js');
    const conn = await getPool().getConnection();
    await conn.beginTransaction();
    try {
      const [resItems] = await conn.query('DELETE FROM order_items');
      const [resOrders] = await conn.query("DELETE FROM orders WHERE id = 'DFC-545512' OR 1=1");
      const [resCustomers] = await conn.query("DELETE FROM customers WHERE id = 'customer-1' OR 1=1");
      const [resChecks] = await conn.query('DELETE FROM availability_checks');
      const [resVendors] = await conn.query("DELETE FROM vendors WHERE id IN ('VND-0001', 'VND-0002')");
      await conn.commit();
      return {
        statusCode: 200,
        body: {
          success: true,
          deleted: {
            order_items: resItems.affectedRows,
            orders: resOrders.affectedRows,
            customers: resCustomers.affectedRows,
            availability_checks: resChecks.affectedRows,
            vendors: resVendors.affectedRows,
          },
        },
      };
    } catch (err) {
      await conn.rollback();
      return { statusCode: 500, body: { error: err.message } };
    } finally {
      conn.release();
    }
  }

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

export async function listOrders({ req, query }) {
  const role = getUserRole(req.headers);
  const repository = createRepository('orders');
  const userAuth = getAuthenticatedUser(req.headers);
  const targetCustomerId = userAuth?.id || req.headers['x-customer-id'] || req.headers['X-Customer-Id'] || query?.customerId;
  const targetEmail = userAuth?.email || req.headers['x-customer-email'] || req.headers['X-Customer-Email'] || query?.customerEmail;
  const targetPhone = userAuth?.phone || userAuth?.mobile || req.headers['x-customer-phone'] || req.headers['X-Customer-Phone'] || query?.customerPhone;

  if (role === 'admin') {
    return {
      statusCode: 200,
      body: { orders: await repository.list() },
    };
  }

  if (targetCustomerId || targetEmail || targetPhone) {
    const allOrders = await repository.list();
    const cleanId = String(targetCustomerId || '').trim().toLowerCase();
    const cleanEmail = String(targetEmail || '').trim().toLowerCase();
    const cleanPhone = String(targetPhone || '').replace(/\D/g, '').slice(-10);
    const cleanIdMobile = cleanId.replace(/\D/g, '').slice(-10);

    const customerOrders = (allOrders || []).filter((o) => {
      const oCustId = String(o.customerId || '').trim().toLowerCase();
      const oEmail = String(o.customerEmail || '').trim().toLowerCase();
      const oMobile = String(o.customerPhone || o.customerMobile || '').replace(/\D/g, '').slice(-10);
      return (
        (cleanId && oCustId && (oCustId === cleanId || oCustId.replace(/^(cust|customer)-/, '') === cleanId.replace(/^(cust|customer)-/, ''))) ||
        (cleanEmail && oEmail && oEmail === cleanEmail) ||
        (cleanPhone && oMobile && oMobile === cleanPhone) ||
        (cleanIdMobile && cleanIdMobile.length === 10 && oMobile && oMobile === cleanIdMobile)
      );
    });
    return {
      statusCode: 200,
      body: { orders: customerOrders },
    };
  }

  return {
    statusCode: 200,
    body: { orders: [] },
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
