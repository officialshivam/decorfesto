import { createRepository } from '../dataAccess/repository.js';
import { requireRole, getAuthenticatedUser } from '../auth.js';
import { getPool } from '../dataAccess/mysqlConnection.js';
import { useMysql } from '../config.js';

function parseJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parsePayload(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export async function listAdminCoupons({ req }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const repository = createRepository('coupons');
  const coupons = await repository.list();
  coupons.sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));

  return {
    statusCode: 200,
    body: { coupons },
  };
}

export async function createAdminCoupon({ req }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const payload = parsePayload(req);
  const code = String(payload.code || '').trim().toUpperCase();

  if (!code) {
    return { statusCode: 400, body: { error: 'Coupon code is required' } };
  }

  if (code.length > 64) {
    return { statusCode: 400, body: { error: 'Coupon code cannot exceed 64 characters' } };
  }

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return { statusCode: 400, body: { error: 'Coupon code can only contain alphanumeric characters, hyphens, and underscores' } };
  }

  const repository = createRepository('coupons');
  const existing = await repository.scan((c) => (c.code || '').toUpperCase() === code);
  if (existing.length > 0) {
    return { statusCode: 400, body: { error: 'Coupon code already exists' } };
  }

  const discountValue = Number(payload.discountValue || 0);
  if (isNaN(discountValue) || discountValue <= 0) {
    return { statusCode: 400, body: { error: 'Discount value must be greater than 0' } };
  }

  const discountType = (payload.discountType || 'PERCENTAGE').toUpperCase();
  if (discountType !== 'PERCENTAGE' && discountType !== 'FIXED') {
    return { statusCode: 400, body: { error: 'Discount type must be PERCENTAGE or FIXED' } };
  }

  if (discountType === 'PERCENTAGE' && discountValue > 100) {
    return { statusCode: 400, body: { error: 'Percentage discount cannot exceed 100%' } };
  }

  const minOrderAmount = Number(payload.minOrderAmount || 0);
  if (isNaN(minOrderAmount) || minOrderAmount < 0) {
    return { statusCode: 400, body: { error: 'Minimum order amount cannot be negative' } };
  }

  if (payload.startsAt && isNaN(new Date(payload.startsAt).getTime())) {
    return { statusCode: 400, body: { error: 'Invalid start date format' } };
  }

  if (payload.expiresAt && isNaN(new Date(payload.expiresAt).getTime())) {
    return { statusCode: 400, body: { error: 'Invalid expiration date format' } };
  }

  if (payload.startsAt && payload.expiresAt && new Date(payload.expiresAt) <= new Date(payload.startsAt)) {
    return { statusCode: 400, body: { error: 'Expiration date must be after start date' } };
  }

  if (payload.usageLimit !== undefined && payload.usageLimit !== null && payload.usageLimit !== '' && Number(payload.usageLimit) <= 0) {
    return { statusCode: 400, body: { error: 'Usage limit must be greater than 0' } };
  }

  if (payload.perCustomerLimit !== undefined && payload.perCustomerLimit !== null && payload.perCustomerLimit !== '' && Number(payload.perCustomerLimit) <= 0) {
    return { statusCode: 400, body: { error: 'Per-customer limit must be greater than 0' } };
  }

  const newCoupon = {
    id: payload.id || `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    code,
    name: String(payload.name || code).trim(),
    description: String(payload.description || '').trim(),
    discountType,
    discountValue,
    maxDiscountAmount: payload.maxDiscountAmount !== undefined && payload.maxDiscountAmount !== null && payload.maxDiscountAmount !== '' ? Number(payload.maxDiscountAmount) : null,
    minOrderAmount: Number(payload.minOrderAmount || 0),
    startsAt: payload.startsAt ? new Date(payload.startsAt).toISOString() : null,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt).toISOString() : null,
    usageLimit: payload.usageLimit !== undefined && payload.usageLimit !== null && payload.usageLimit !== '' ? Number(payload.usageLimit) : null,
    usageCount: 0,
    perCustomerLimit: payload.perCustomerLimit !== undefined && payload.perCustomerLimit !== null && payload.perCustomerLimit !== '' ? Number(payload.perCustomerLimit) : null,
    active: payload.active !== false && payload.active !== 0 && payload.active !== 'false',
    visibleToCustomers: payload.visibleToCustomers !== false && payload.visibleToCustomers !== 0 && payload.visibleToCustomers !== 'false',
    firstOrderOnly: Boolean(payload.firstOrderOnly && payload.firstOrderOnly !== 'false' && payload.firstOrderOnly !== 0),
    applicableCategories: Array.isArray(payload.applicableCategories)
      ? JSON.stringify(payload.applicableCategories)
      : (payload.applicableCategories || null),
    applicableDecorations: Array.isArray(payload.applicableDecorations)
      ? JSON.stringify(payload.applicableDecorations)
      : (payload.applicableDecorations || null),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repository.create(newCoupon);

  return {
    statusCode: 201,
    body: { coupon: newCoupon },
  };
}

export async function updateAdminCoupon({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const id = params?.id || req?.query?.id;
  if (!id) {
    return { statusCode: 400, body: { error: 'Coupon ID is required' } };
  }

  const payload = parsePayload(req);
  const repository = createRepository('coupons');
  const existing = await repository.getById(id);

  if (!existing) {
    return { statusCode: 404, body: { error: 'Coupon not found' } };
  }

  if (payload.code) {
    const code = String(payload.code).trim().toUpperCase();
    const withSameCode = await repository.scan((c) => c.id !== id && (c.code || '').toUpperCase() === code);
    if (withSameCode.length > 0) {
      return { statusCode: 400, body: { error: 'Coupon code already exists' } };
    }
  }

  const updates = { ...payload };
  if (updates.code) updates.code = String(updates.code).trim().toUpperCase();
  if (updates.discountValue !== undefined) updates.discountValue = Number(updates.discountValue);
  if (updates.minOrderAmount !== undefined) updates.minOrderAmount = Number(updates.minOrderAmount);
  if (updates.maxDiscountAmount !== undefined) updates.maxDiscountAmount = updates.maxDiscountAmount !== null && updates.maxDiscountAmount !== '' ? Number(updates.maxDiscountAmount) : null;
  if (updates.usageLimit !== undefined) updates.usageLimit = updates.usageLimit !== null && updates.usageLimit !== '' ? Number(updates.usageLimit) : null;
  if (updates.perCustomerLimit !== undefined) updates.perCustomerLimit = updates.perCustomerLimit !== null && updates.perCustomerLimit !== '' ? Number(updates.perCustomerLimit) : null;
  if (updates.applicableCategories !== undefined) {
    updates.applicableCategories = Array.isArray(updates.applicableCategories) ? JSON.stringify(updates.applicableCategories) : updates.applicableCategories;
  }
  if (updates.applicableDecorations !== undefined) {
    updates.applicableDecorations = Array.isArray(updates.applicableDecorations) ? JSON.stringify(updates.applicableDecorations) : updates.applicableDecorations;
  }
  updates.updatedAt = new Date().toISOString();

  const updated = await repository.update(id, updates);

  return {
    statusCode: 200,
    body: { coupon: updated },
  };
}

export async function deleteAdminCoupon({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const id = params?.id || req?.query?.id;
  if (!id) {
    return { statusCode: 400, body: { error: 'Coupon ID is required' } };
  }

  const repository = createRepository('coupons');
  const deleted = await repository.delete(id);

  if (!deleted) {
    return { statusCode: 404, body: { error: 'Coupon not found' } };
  }

  return {
    statusCode: 200,
    body: { message: 'Coupon deleted successfully' },
  };
}

export async function listAvailableCoupons() {
  try {
    const repository = createRepository('coupons');
    const allCoupons = await repository.list();
    const now = new Date();

    const available = allCoupons
      .filter((c) => {
        const active = c.active !== false && c.active !== 0 && c.active !== 'false';
        const visible = c.visibleToCustomers !== false && c.visible_to_customers !== 0 && c.visibleToCustomers !== 'false' && c.visible_to_customers !== false;
        if (!active || !visible) return false;

        if (c.startsAt && new Date(c.startsAt) > now) return false;
        if (c.starts_at && new Date(c.starts_at) > now) return false;
        if (c.expiresAt && new Date(c.expiresAt) < now) return false;
        if (c.expires_at && new Date(c.expires_at) < now) return false;

        const limit = c.usageLimit ?? c.usage_limit;
        const count = c.usageCount ?? c.usage_count ?? 0;
        if (limit !== null && limit !== undefined && count >= Number(limit)) return false;

        return true;
      })
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description || '',
        discountType: c.discountType || c.discount_type || 'PERCENTAGE',
        discountValue: Number(c.discountValue ?? c.discount_value ?? 0),
        maxDiscountAmount: (c.maxDiscountAmount ?? c.max_discount_amount) ? Number(c.maxDiscountAmount ?? c.max_discount_amount) : null,
        minOrderAmount: Number(c.minOrderAmount ?? c.min_order_amount ?? 0),
        expiresAt: c.expiresAt || c.expires_at || null,
        firstOrderOnly: Boolean(c.firstOrderOnly || c.first_order_only),
        applicableCategories: parseJsonArray(c.applicableCategories || c.applicable_categories),
        applicableDecorations: parseJsonArray(c.applicableDecorations || c.applicable_decorations),
      }));

    return {
      statusCode: 200,
      body: { coupons: available },
    };
  } catch (err) {
    console.error('Failed to list available coupons:', err);
    return {
      statusCode: 200,
      body: { coupons: [] },
    };
  }
}

export async function validateCouponLogic({ code, subtotal, items = [], customerId = null, customerPhone = null }) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, message: 'Coupon code is required' };
  }

  const repository = createRepository('coupons');
  const found = await repository.scan((c) => (c.code || '').toUpperCase() === cleanCode);

  if (found.length === 0) {
    return { valid: false, message: 'Invalid coupon code' };
  }

  const coupon = found[0];
  const active = coupon.active !== false && coupon.active !== 0 && coupon.active !== 'false';
  if (!active) {
    return { valid: false, message: 'Invalid or inactive coupon code' };
  }

  const now = new Date();
  const startsAt = coupon.startsAt || coupon.starts_at;
  const expiresAt = coupon.expiresAt || coupon.expires_at;

  if (startsAt && now < new Date(startsAt)) {
    return { valid: false, message: 'Coupon is not active yet' };
  }

  if (expiresAt && now > new Date(expiresAt)) {
    return { valid: false, message: 'Coupon has expired' };
  }

  const usageLimit = coupon.usageLimit ?? coupon.usage_limit;
  const usageCount = coupon.usageCount ?? coupon.usage_count ?? 0;
  if (usageLimit !== null && usageLimit !== undefined && Number(usageCount) >= Number(usageLimit)) {
    return { valid: false, message: 'Coupon usage limit reached' };
  }

  const perCustomerLimit = coupon.perCustomerLimit ?? coupon.per_customer_limit;
  if (perCustomerLimit !== null && perCustomerLimit !== undefined && (customerId || customerPhone)) {
    const usageRepo = createRepository('coupon_usages');
    const userUsages = await usageRepo.scan((u) => {
      const matchCoupon = (u.couponId || u.coupon_id) === coupon.id;
      const matchCustomer = (customerId && (u.customerId || u.customer_id) === customerId) ||
                            (customerPhone && (u.customerPhone || u.customer_phone) === customerPhone);
      return matchCoupon && matchCustomer;
    });

    if (userUsages.length >= Number(perCustomerLimit)) {
      return { valid: false, message: 'You have already used this coupon maximum allowed times' };
    }
  }

  const minOrderAmount = Number(coupon.minOrderAmount ?? coupon.min_order_amount ?? 0);
  const subtotalNum = Number(subtotal || 0);
  if (subtotalNum < minOrderAmount) {
    return { valid: false, message: `Minimum order amount of ₹${minOrderAmount} required for this coupon` };
  }

  const firstOrderOnly = Boolean(coupon.firstOrderOnly || coupon.first_order_only);
  if (firstOrderOnly && (customerId || customerPhone)) {
    const ordersRepo = createRepository('orders');
    const existingOrders = await ordersRepo.scan((o) => {
      const matchCustomer = (customerId && (o.customerId || o.customer_id) === customerId) ||
                            (customerPhone && (o.customerPhone || o.customer_phone) === customerPhone);
      const isPaid = (o.paymentStatus || o.payment_status) === 'Paid';
      const isNotCancelled = (o.bookingStatus || o.booking_status) !== 'Cancelled';
      return matchCustomer && (isPaid || isNotCancelled);
    });

    if (existingOrders.length > 0) {
      return { valid: false, message: 'This coupon is valid for first order only' };
    }
  }

  const appCats = parseJsonArray(coupon.applicableCategories || coupon.applicable_categories);
  if (appCats.length > 0) {
    const cartItems = Array.isArray(items) ? items : [];
    const hasMatchingCategory = cartItems.some((item) => {
      const cat = item.category || item.categoryId || item.category_id;
      return cat && appCats.includes(cat);
    });
    if (!hasMatchingCategory) {
      return { valid: false, message: 'Coupon is not applicable to items in your cart' };
    }
  }

  const appDecs = parseJsonArray(coupon.applicableDecorations || coupon.applicable_decorations);
  if (appDecs.length > 0) {
    const cartItems = Array.isArray(items) ? items : [];
    const hasMatchingDecoration = cartItems.some((item) => {
      const decId = item.decorationId || item.decoration_id || item.productId || item.product_id || item.id;
      return decId && appDecs.includes(decId);
    });
    if (!hasMatchingDecoration) {
      return { valid: false, message: 'Coupon is not applicable to items in your cart' };
    }
  }

  const discountType = (coupon.discountType || coupon.discount_type || 'PERCENTAGE').toUpperCase();
  const discountValue = Number(coupon.discountValue ?? coupon.discount_value ?? 0);
  const maxDiscountAmount = (coupon.maxDiscountAmount ?? coupon.max_discount_amount) ? Number(coupon.maxDiscountAmount ?? coupon.max_discount_amount) : null;

  let rawDiscount = 0;
  if (discountType === 'PERCENTAGE') {
    rawDiscount = subtotalNum * (discountValue / 100);
    if (maxDiscountAmount !== null && maxDiscountAmount > 0) {
      rawDiscount = Math.min(rawDiscount, maxDiscountAmount);
    }
  } else {
    rawDiscount = discountValue;
  }

  const discountAmount = Math.max(0, Math.round(Math.min(rawDiscount, subtotalNum) * 100) / 100);
  const finalSubtotal = Math.max(0, Math.round((subtotalNum - discountAmount) * 100) / 100);

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
    },
    discountAmount,
    subtotal: subtotalNum,
    finalSubtotal,
  };
}

export async function validateCouponEndpoint({ req }) {
  const payload = parsePayload(req);
  let customerId = payload.customerId || null;
  let customerPhone = payload.customerPhone || null;

  try {
    const tokenUser = getAuthenticatedUser(req?.headers);
    if (tokenUser) {
      if (tokenUser.id) customerId = tokenUser.id;
      if (tokenUser.mobile || tokenUser.phone) customerPhone = tokenUser.mobile || tokenUser.phone;
    }
  } catch {
    // optional auth token parsing
  }

  const result = await validateCouponLogic({
    code: payload.code,
    subtotal: payload.subtotal,
    items: payload.items || [],
    customerId,
    customerPhone,
  });

  return {
    statusCode: 200,
    body: result,
  };
}

export async function recordCouponUsage({ couponId, customerId, customerPhone, orderId, discountAmount }) {
  if (!couponId) return;

  const usageRepo = createRepository('coupon_usages');
  const usageRecord = {
    id: `cu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    couponId,
    customerId: customerId || null,
    customerPhone: customerPhone || null,
    orderId,
    discountAmount: Number(discountAmount || 0),
    usedAt: new Date().toISOString(),
  };

  await usageRepo.create(usageRecord);

  if (useMysql) {
    try {
      const pool = getPool();
      await pool.query(
        `UPDATE coupons SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (usage_limit IS NULL OR usage_count < usage_limit)`,
        [couponId]
      );
    } catch (err) {
      console.warn('Atomic MySQL coupon usage increment notice:', err.message);
    }
  } else {
    const couponRepo = createRepository('coupons');
    const coupon = await couponRepo.getById(couponId);
    if (coupon) {
      const currentCount = Number(coupon.usageCount ?? coupon.usage_count ?? 0);
      await couponRepo.update(couponId, {
        usageCount: currentCount + 1,
        usage_count: currentCount + 1,
      });
    }
  }
}
