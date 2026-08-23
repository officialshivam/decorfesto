import { createRepository } from '../dataAccess/repository.js';
import { getAuthenticatedVendor, getUserRole, hashPassword, verifyPassword } from '../auth.js';

export async function getVendorOrders({ req }) {
  const role = getUserRole(req.headers);
  const vendorAuth = getAuthenticatedVendor(req.headers);

  if (role !== 'VENDOR' || !vendorAuth || !vendorAuth.vendorId) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  const repository = createRepository('orders');
  const allOrders = await repository.list();
  const vendorOrders = allOrders.filter((order) => order.vendorId === vendorAuth.vendorId);

  return {
    statusCode: 200,
    body: { orders: vendorOrders },
  };
}

export async function getVendorOrderDetails({ req, params }) {
  const role = getUserRole(req.headers);
  const vendorAuth = getAuthenticatedVendor(req.headers);

  if (role !== 'VENDOR' || !vendorAuth || !vendorAuth.vendorId) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  const repository = createRepository('orders');
  const order = await repository.getById(params[0]);

  if (!order) {
    return { statusCode: 404, body: { error: 'Order not found.' } };
  }

  if (order.vendorId !== vendorAuth.vendorId) {
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

  if (role !== 'VENDOR' || !vendorAuth || !vendorAuth.vendorId) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  const orderId = params[0];
  const repository = createRepository('orders');
  const order = await repository.getById(orderId);

  if (!order) {
    return { statusCode: 404, body: { error: 'Order not found.' } };
  }

  if (order.vendorId !== vendorAuth.vendorId) {
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

  const updatedOrder = await repository.update(orderId, updates);
  return {
    statusCode: 200,
    body: { order: updatedOrder },
  };
}

export async function getVendorProfile({ req }) {
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
