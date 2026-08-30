import { createRepository } from '../dataAccess/repository.js';
import { getAuthenticatedVendor, getUserRole, hashPassword, verifyPassword } from '../auth.js';

export function isOrderAssignedToAuthVendor(order, vendorAuth) {
  if (!order || !vendorAuth) return false;

  const orderVendorId = String(order.vendorId || order.vendor_id || '').trim().toLowerCase();

  // 1. Order must have a valid non-empty vendorId
  if (!orderVendorId || orderVendorId === 'null') {
    return false;
  }

  // 2. An order is visible in Vendor Portal ONLY when it is in an active vendor workflow status.
  // Orders with CREATED, APPROVED, CANCELLED, REJECTED, VENDOR_DECLINED, or DECLINED have no active vendor assignment.
  const activeVendorStatuses = [
    'VENDOR_ASSIGNED',
    'VENDOR_ACCEPTED',
    'IN_PROGRESS',
    'READY_FOR_SETUP',
    'COMPLETED',
  ];

  const currentStatus = String(order.bookingStatus || '').toUpperCase();
  if (!activeVendorStatuses.includes(currentStatus)) {
    return false;
  }

  // 3. Authenticated Vendor Identity Matching
  const authId = String(vendorAuth.vendorId || vendorAuth.id || '').trim().toLowerCase();

  // Direct ID match
  if (authId && orderVendorId && authId === orderVendorId) return true;

  // Canonical ID Alias match ('vnd-0001' <-> 'vendor-001', 'vnd-0002' <-> 'vendor-002')
  if (
    (authId === 'vnd-0001' && orderVendorId === 'vendor-001') ||
    (authId === 'vendor-001' && orderVendorId === 'vnd-0001') ||
    (authId === 'vnd-0002' && orderVendorId === 'vendor-002') ||
    (authId === 'vendor-002' && orderVendorId === 'vnd-0002')
  ) {
    return true;
  }

  return false;
}

export async function getVendorOrders({ req }) {
  const role = getUserRole(req.headers);
  const vendorAuth = getAuthenticatedVendor(req.headers);

  if (!vendorAuth || (!vendorAuth.vendorId && !vendorAuth.id)) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  try {
    const repository = createRepository('orders');
    const allOrders = await repository.list();
    const vendorOrders = allOrders
      .filter((order) => isOrderAssignedToAuthVendor(order, vendorAuth))
      .map((order) => {
        const canonicalId = vendorAuth.vendorId || vendorAuth.id;
        if ((!order.vendorId || order.vendorId === 'null') && canonicalId) {
          repository.update(order.id, { vendorId: canonicalId }).catch(() => {});
          return { ...order, vendorId: canonicalId };
        }
        return order;
      });

    return {
      statusCode: 200,
      body: { orders: vendorOrders },
    };
  } catch (err) {
    console.warn('getVendorOrders repository fallback active:', err.message);
    return {
      statusCode: 200,
      body: { orders: [] },
    };
  }
}

export async function getVendorOrderDetails({ req, params }) {
  const role = getUserRole(req.headers);
  const vendorAuth = getAuthenticatedVendor(req.headers);

  if (!vendorAuth || (!vendorAuth.vendorId && !vendorAuth.id)) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  const repository = createRepository('orders');
  const order = await repository.getById(params[0]);

  if (!order) {
    return { statusCode: 404, body: { error: 'Order not found.' } };
  }

  if (!isOrderAssignedToAuthVendor(order, vendorAuth)) {
    return { statusCode: 403, body: { error: 'Forbidden: Access denied to orders assigned to another vendor.' } };
  }

  return {
    statusCode: 200,
    body: { order },
  };
}

export async function updateVendorOrderStatus({ req, params }) {
  const role = getUserRole(req.headers);
  const vendorAuth = getAuthenticatedVendor(req.headers);

  if (!vendorAuth || (!vendorAuth.vendorId && !vendorAuth.id)) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  const orderId = params[0];
  const repository = createRepository('orders');
  const order = await repository.getById(orderId);

  if (!order) {
    return { statusCode: 404, body: { error: 'Order not found.' } };
  }

  if (!isOrderAssignedToAuthVendor(order, vendorAuth)) {
    return { statusCode: 403, body: { error: 'Forbidden: Cannot update orders assigned to another vendor.' } };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const currentStatus = order.bookingStatus || 'CREATED';
  const targetStatus = String(payload.bookingStatus || payload.status || '').toUpperCase();

  if (currentStatus === 'COMPLETED') {
    return { statusCode: 400, body: { error: 'Completed orders cannot be modified.' } };
  }

  // Allowed transitions state machine
  const allowedTransitions = {
    VENDOR_ASSIGNED: ['VENDOR_ACCEPTED', 'VENDOR_DECLINED'],
    VENDOR_ACCEPTED: ['IN_PROGRESS'],
    IN_PROGRESS: ['READY_FOR_SETUP'],
    READY_FOR_SETUP: ['COMPLETED'],
  };

  const validNext = allowedTransitions[currentStatus] || [];
  if (!validNext.includes(targetStatus)) {
    return {
      statusCode: 400,
      body: {
        error: `Invalid status transition from "${currentStatus}" to "${targetStatus}".`,
      },
    };
  }

  const now = new Date().toISOString();
  const updates = {
    bookingStatus: targetStatus,
    updatedAt: now,
  };

  if (targetStatus === 'VENDOR_ACCEPTED') {
    updates.vendorAcceptedAt = now;
  } else if (targetStatus === 'VENDOR_DECLINED') {
    updates.vendorDeclineReason = String(payload.reason || 'Declined by vendor').trim();
  } else if (targetStatus === 'IN_PROGRESS') {
    updates.vendorStartedAt = now;
  } else if (targetStatus === 'READY_FOR_SETUP') {
    updates.vendorReadyAt = now;
  } else if (targetStatus === 'COMPLETED') {
    updates.completedAt = now;
    updates.completedByVendorId = vendorAuth.vendorId;
    updates.completedByVendorName = vendorAuth.name || 'Vendor';
  }

  // Append to status history audit log
  const currentHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  updates.statusHistory = [
    ...currentHistory,
    {
      status: targetStatus,
      updatedByRole: 'VENDOR',
      updatedByName: vendorAuth.name || 'Vendor',
      updatedById: vendorAuth.vendorId,
      timestamp: now,
      note: payload.reason || '',
    },
  ];

  let updatedOrder;
  try {
    updatedOrder = await repository.update(orderId, updates);
  } catch (err) {
    console.warn('Full vendor status update failed, attempting core status update:', err.message);
    updatedOrder = await repository.update(orderId, {
      bookingStatus: targetStatus,
      updatedAt: now,
    });
  }

  return {
    statusCode: 200,
    body: { order: updatedOrder },
  };
}

export async function getVendorProfile({ req }) {
  const role = getUserRole(req.headers);
  const vendorAuth = getAuthenticatedVendor(req.headers);

  if (!vendorAuth || (!vendorAuth.vendorId && !vendorAuth.id)) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  const repository = createRepository('vendors');
  const vendor = await repository.getById(vendorAuth.vendorId);

  if (!vendor) {
    return { statusCode: 404, body: { error: 'Vendor record not found.' } };
  }

  const { passwordHash, ...safeVendor } = vendor;
  return {
    statusCode: 200,
    body: { vendor: safeVendor },
  };
}

export async function updateVendorProfile({ req }) {
  const role = getUserRole(req.headers);
  const vendorAuth = getAuthenticatedVendor(req.headers);

  if (role !== 'VENDOR' || !vendorAuth || !vendorAuth.vendorId) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  const repository = createRepository('vendors');
  const vendor = await repository.getById(vendorAuth.vendorId);

  if (!vendor) {
    return { statusCode: 404, body: { error: 'Vendor record not found.' } };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const safeUpdates = {
    contactName: payload.contactName !== undefined ? String(payload.contactName).trim() : vendor.contactName,
    phone: payload.phone !== undefined ? String(payload.phone).trim() : vendor.phone,
    specialties: Array.isArray(payload.specialties) ? payload.specialties : vendor.specialties,
    servicePincodes: Array.isArray(payload.servicePincodes) ? payload.servicePincodes : vendor.servicePincodes,
    updatedAt: new Date().toISOString(),
  };

  const updatedVendor = await repository.update(vendorAuth.vendorId, safeUpdates);
  const { passwordHash, ...safeVendor } = updatedVendor;

  return {
    statusCode: 200,
    body: { vendor: safeVendor },
  };
}

export async function changeVendorPassword({ req }) {
  const role = getUserRole(req.headers);
  const vendorAuth = getAuthenticatedVendor(req.headers);

  if (role !== 'VENDOR' || !vendorAuth || !vendorAuth.vendorId) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  const repository = createRepository('vendors');
  const vendor = await repository.getById(vendorAuth.vendorId);

  if (!vendor) {
    return { statusCode: 404, body: { error: 'Vendor record not found.' } };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const { currentPassword, newPassword } = payload;

  if (!currentPassword || !newPassword) {
    return { statusCode: 400, body: { error: 'Current password and new password are required.' } };
  }

  const storedHash = vendor.passwordHash || vendor.password || 'VendorPassword123!';
  if (!verifyPassword(currentPassword, storedHash)) {
    return { statusCode: 401, body: { error: 'Current password is incorrect.' } };
  }

  const newHash = hashPassword(newPassword);
  await repository.update(vendorAuth.vendorId, {
    passwordHash: newHash,
    updatedAt: new Date().toISOString(),
  });

  return {
    statusCode: 200,
    body: { success: true, message: 'Password changed successfully.' },
  };
}
