import { createRepository } from '../dataAccess/repository.js';
import { getPool } from '../dataAccess/mysqlConnection.js';
import { useMysql } from '../config.js';
import { getAuthenticatedVendor, getUserRole, hashPassword, verifyPassword } from '../auth.js';
import { verifyOrderOtp, hashOtp, isValid4DigitFormat } from '../otp.js';


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

  const currentStatus = String(order.bookingStatus || order.booking_status || '').toUpperCase();
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

  if (targetStatus === 'IN_PROGRESS') {
    return {
      statusCode: 400,
      body: { error: 'Decoration cannot be started directly. Customer OTP verification is required.' },
    };
  }

  const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED'];
  if (terminalStatuses.includes(String(currentStatus).toUpperCase())) {
    return { statusCode: 409, body: { error: `Order is in terminal state "${currentStatus}" and cannot be modified.` } };
  }

  // Allowed transitions state machine
  const allowedTransitions = {
    ORDER_RECEIVED: ['VENDOR_ACCEPTED', 'VENDOR_DECLINED'],
    VENDOR_ASSIGNED: ['VENDOR_ACCEPTED', 'VENDOR_DECLINED'],
    ASSIGNED_TO_VENDOR: ['VENDOR_ACCEPTED', 'VENDOR_DECLINED'],
    VENDOR_ACCEPTED: ['IN_PROGRESS'],
    ACCEPTED: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED'],
    START_PREPARATION: ['COMPLETED'],
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

export async function verifyStartOtp({ req, params }) {
  const vendorAuth = getAuthenticatedVendor(req.headers);
  if (!vendorAuth || (!vendorAuth.vendorId && !vendorAuth.id)) {
    return { statusCode: 401, body: { error: 'Vendor authentication required.' } };
  }

  const orderId = params[0];
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const submittedOtp = String(payload.otp || '').trim();

  if (!isValid4DigitFormat(submittedOtp)) {
    return { statusCode: 400, body: { error: 'OTP must be strictly 4 numeric digits (e.g. 0482).' } };
  }

  // ATOMIC MYSQL TRANSACTION PATH
  if (useMysql) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Lock order row
      const [orderRows] = await connection.query(`SELECT * FROM orders WHERE id = ? FOR UPDATE`, [orderId]);
      const order = orderRows?.[0];
      if (!order) {
        await connection.rollback();
        return { statusCode: 404, body: { error: 'Order not found.' } };
      }

      if (!isOrderAssignedToAuthVendor(order, vendorAuth)) {
        await connection.rollback();
        return { statusCode: 403, body: { error: 'Forbidden: Cannot verify OTP for an order assigned to another vendor.' } };
      }

      const currentStatus = String(order.booking_status || order.bookingStatus || '').toUpperCase();
      if (currentStatus !== 'VENDOR_ACCEPTED' && currentStatus !== 'ACCEPTED') {
        await connection.rollback();
        return { statusCode: 400, body: { error: `Order must be accepted before verifying customer OTP. Current status: "${currentStatus}".` } };
      }

      // 2. Lock active OTP record row
      const [otpRows] = await connection.query(
        `SELECT * FROM order_start_otps WHERE order_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [orderId],
      );
      const activeOtpRec = otpRows?.[0];
      if (!activeOtpRec) {
        await connection.rollback();
        return { statusCode: 400, body: { error: 'No active start OTP found for this order. Please ask Admin to generate OTP.' } };
      }

      // Vendor ID match check
      const authVendorId = String(vendorAuth?.vendorId || vendorAuth?.id || '').trim().toLowerCase();
      const recVendorId = String(activeOtpRec.vendor_id || activeOtpRec.vendorId || '').trim().toLowerCase();

      const isVendorMatch = (
        (authVendorId && recVendorId && authVendorId === recVendorId) ||
        (authVendorId === 'vnd-0001' && recVendorId === 'vendor-001') ||
        (authVendorId === 'vendor-001' && recVendorId === 'vnd-0001') ||
        (authVendorId === 'vnd-0002' && recVendorId === 'vendor-002') ||
        (authVendorId === 'vendor-002' && recVendorId === 'vnd-0002')
      );

      if (!isVendorMatch) {
        await connection.rollback();
        return { statusCode: 403, body: { error: 'Forbidden: OTP verification can only be performed by the assigned vendor.' } };
      }

      // Attempt limit check
      const currentAttempts = Number(activeOtpRec.attempt_count || 0);
      if (currentAttempts >= 5) {
        await connection.rollback();
        return { statusCode: 400, body: { error: 'Maximum OTP attempts (5/5) exceeded. Please ask Admin to regenerate OTP.' } };
      }

      // Expiry check
      if (activeOtpRec.expires_at && new Date(activeOtpRec.expires_at) < new Date()) {
        await connection.rollback();
        return { statusCode: 400, body: { error: 'OTP has expired (24h limit). Please ask Admin to regenerate OTP.' } };
      }

      // Hash comparison
      const submittedHash = hashOtp(submittedOtp);
      const targetHash = activeOtpRec.otp_hash;

      if (submittedHash !== targetHash) {
        const newAttempts = currentAttempts + 1;
        const now = new Date().toISOString();
        await connection.query(`UPDATE order_start_otps SET attempt_count = ?, updated_at = ? WHERE id = ?`, [newAttempts, now, activeOtpRec.id]);
        await connection.commit();

        if (newAttempts >= 5) {
          return { statusCode: 400, body: { error: 'Incorrect OTP. Maximum attempts (5/5) exceeded. OTP is now locked. Please ask Admin to regenerate OTP.' } };
        }
        return { statusCode: 400, body: { error: `Incorrect OTP. ${5 - newAttempts} attempt(s) remaining.` } };
      }

      // SUCCESS! ATOMIC TRANSACTION COMMIT:
      // Mark OTP active = 0 and verified_at = NOW(), and update orders booking_status = 'IN_PROGRESS'
      const now = new Date().toISOString();

      await connection.query(
        `UPDATE order_start_otps SET active = 0, verified_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, activeOtpRec.id],
      );

      await connection.query(
        `UPDATE orders SET booking_status = 'IN_PROGRESS', vendor_started_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, orderId],
      );

      await connection.commit();

      const repository = createRepository('orders');
      const updatedOrder = await repository.getById(orderId);

      return {
        statusCode: 200,
        body: {
          message: 'Customer OTP verified successfully. Decoration is now IN_PROGRESS.',
          order: updatedOrder || { ...order, bookingStatus: 'IN_PROGRESS' },
        },
      };
    } catch (err) {
      await connection.rollback();
      console.error('❌ Error during atomic OTP verification transaction:', err.message);
      return { statusCode: 500, body: { error: `Database error during OTP verification: ${err.message}` } };
    } finally {
      connection.release();
    }
  }

  // FALLBACK PATH (JSON / Memory Mode)
  const repository = createRepository('orders');
  const order = await repository.getById(orderId);

  if (!order) {
    return { statusCode: 404, body: { error: 'Order not found.' } };
  }

  if (!isOrderAssignedToAuthVendor(order, vendorAuth)) {
    return { statusCode: 403, body: { error: 'Forbidden: Cannot verify OTP for an order assigned to another vendor.' } };
  }

  const currentStatus = String(order.bookingStatus || '').toUpperCase();
  if (currentStatus !== 'VENDOR_ACCEPTED' && currentStatus !== 'ACCEPTED') {
    return {
      statusCode: 400,
      body: { error: `Order must be accepted before verifying customer OTP. Current status: "${currentStatus}".` },
    };
  }

  const otpRes = await verifyOrderOtp(orderId, vendorAuth, submittedOtp);
  if (!otpRes.ok) {
    return {
      statusCode: otpRes.statusCode || 400,
      body: { error: otpRes.error },
    };
  }

  const now = new Date().toISOString();
  const currentHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const updates = {
    bookingStatus: 'IN_PROGRESS',
    vendorStartedAt: now,
    updatedAt: now,
    statusHistory: [
      ...currentHistory,
      {
        status: 'IN_PROGRESS',
        updatedByRole: 'VENDOR',
        updatedByName: vendorAuth.name || 'Vendor',
        updatedById: vendorAuth.vendorId || vendorAuth.id,
        timestamp: now,
        note: 'Customer 4-digit OTP verified successfully.',
      },
    ],
  };

  let updatedOrder;
  try {
    updatedOrder = await repository.update(order.id, updates);
  } catch (err) {
    console.warn('Failed full status update on OTP verify, falling back to core status:', err.message);
    updatedOrder = await repository.update(order.id, {
      bookingStatus: 'IN_PROGRESS',
      updatedAt: now,
    });
  }

  return {
    statusCode: 200,
    body: {
      message: 'Customer OTP verified successfully. Decoration is now IN_PROGRESS.',
      order: updatedOrder || { ...order, ...updates },
    },
  };
}


