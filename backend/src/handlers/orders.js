import { createRepository } from '../dataAccess/repository.js';
import { getAuthenticatedUser, getAuthenticatedCustomer, getUserRole, requireRole } from '../auth.js';
import { createOrRefreshOrderOtp, getActiveOtpRecord } from '../otp.js';
import { validateCouponLogic } from './coupons.js';

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
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  let orderSubtotal = 0;
  if (rawItems.length > 0) {
    let allDecs = [];
    try {
      const decRepo = createRepository('decorations');
      allDecs = (await decRepo.list()) || [];
    } catch {
      allDecs = [];
    }

    orderSubtotal = rawItems.reduce((sum, item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const decId = item.id || item.productId || item.decorationId;
      const dbDec = allDecs.find((d) => String(d.id) === String(decId) || String(d.decorationId) === String(decId));

      const basePrice = dbDec
        ? Number(dbDec.price ?? dbDec.basePrice ?? dbDec.base_price ?? item.price ?? 0)
        : Number(item.price || item.basePrice || item.total_price || 0);

      const addOnTotal = Number(item.addOnPrice || item.customizationTotal || 0);
      return sum + (basePrice + addOnTotal) * qty;
    }, 0);
  } else {
    orderSubtotal = Number(payload.subtotal || 0);
  }

  let couponCode = payload.couponCode || payload.coupon_code || null;
  let couponId = null;
  let discountAmount = 0;

  if (couponCode) {
    const couponValidation = await validateCouponLogic({
      code: couponCode,
      subtotal: orderSubtotal,
      items: rawItems,
      customerId: validCustomerId,
      customerPhone,
    });

    if (!couponValidation.valid) {
      return {
        statusCode: 400,
        body: { error: couponValidation.message },
      };
    }

    couponCode = couponValidation.coupon.code;
    couponId = couponValidation.coupon.id;
    discountAmount = couponValidation.discountAmount;
  }

  const finalOrderTotal = Math.max(0, Math.round((orderSubtotal - discountAmount + calculatedServiceFee) * 100) / 100);

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
    items: rawItems,
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
    couponCode,
    coupon_code: couponCode,
    couponId,
    coupon_id: couponId,
    discountAmount,
    discount_amount: discountAmount,
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

  // Attach active 4-digit start OTP details for customer owner view
  try {
    const activeOtp = await getActiveOtpRecord(order.id || targetOrderId);
    if (activeOtp) {
      order.startOtp = activeOtp.startOtp || activeOtp.start_otp;
      order.otpDetails = {
        active: activeOtp.active === 1 || activeOtp.active === true,
        expiresAt: activeOtp.expiresAt,
        attemptCount: activeOtp.attemptCount,
        verifiedAt: activeOtp.verifiedAt,
      };
    }
  } catch (err) {
    console.warn('Notice attaching OTP to customer order:', err.message);
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

  // Attach active OTP record for Admin observation
  try {
    const activeOtp = await getActiveOtpRecord(order.id || targetOrderId);
    if (activeOtp) {
      order.startOtp = activeOtp.startOtp || activeOtp.start_otp;
      order.otpDetails = {
        active: activeOtp.active === 1 || activeOtp.active === true,
        expiresAt: activeOtp.expiresAt,
        attemptCount: activeOtp.attemptCount,
        verifiedAt: activeOtp.verifiedAt,
      };
    }
  } catch (err) {
    console.warn('Notice attaching OTP to admin order details:', err.message);
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

  if (payload.bookingStatus && String(payload.bookingStatus).toUpperCase() === 'IN_PROGRESS') {
    return {
      statusCode: 400,
      body: { error: 'Decoration cannot be started directly. Customer OTP verification is required.' },
    };
  }

  const updates = {
    updatedAt: new Date().toISOString(),
  };
  if (payload.bookingStatus) updates.bookingStatus = payload.bookingStatus;
  if (payload.adminReviewStatus) updates.adminReviewStatus = payload.adminReviewStatus;
  if (payload.vendorId !== undefined) updates.vendorId = payload.vendorId;
  if (payload.vendorName !== undefined) updates.vendorName = payload.vendorName;
  if (payload.vendorId && !payload.vendorAssignedAt) updates.vendorAssignedAt = new Date().toISOString();

  // If vendor assigned or reassigned by Admin, trigger OTP generation
  const assignedVendorId = payload.vendorId || existingOrder.vendorId;
  if (payload.vendorId && assignedVendorId) {
    try {
      await createOrRefreshOrderOtp(existingOrder.id || targetId, assignedVendorId);
      if (!payload.bookingStatus || payload.bookingStatus === 'ORDER_RECEIVED') {
        updates.bookingStatus = 'VENDOR_ASSIGNED';
      }
    } catch (err) {
      console.warn('Failed to generate customer start OTP during vendor assignment:', err.message);
    }
  }

  const updatedOrder = await repository.update(existingOrder.id || targetId, updates);

  return {
    statusCode: 200,
    body: { order: updatedOrder || { ...existingOrder, ...updates } },
  };
}

export async function regenerateOrderOtp({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const targetOrderId = params[0];
  const repository = createRepository('orders');
  const order = await repository.getByIdOrOrderId(targetOrderId);

  if (!order) {
    return { statusCode: 404, body: { error: 'Order not found.' } };
  }

  if (!order.vendorId) {
    return { statusCode: 400, body: { error: 'Cannot generate OTP for order without an assigned vendor.' } };
  }

  try {
    const { otpCode } = await createOrRefreshOrderOtp(order.id, order.vendorId);

    // Record audit history
    const currentHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const now = new Date().toISOString();
    await repository.update(order.id, {
      statusHistory: [
        ...currentHistory,
        {
          status: order.bookingStatus,
          updatedByRole: 'ADMIN',
          updatedByName: 'Admin',
          timestamp: now,
          note: 'Customer start OTP regenerated by Admin',
        },
      ],
      updatedAt: now,
    }).catch(() => {});

    return {
      statusCode: 200,
      body: {
        message: 'Customer start OTP regenerated successfully.',
        startOtp: otpCode,
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: { error: `Failed to regenerate OTP: ${err.message}` },
    };
  }
}

