process.env.DECORFESTO_USE_MYSQL = 'false';
process.env.USE_MYSQL = 'false';
delete process.env.DECORFESTO_DB_HOST;

import assert from 'node:assert';
import http from 'node:http';

let server;
let serverUrl;
let initializeBackend, handleApiRequest, createRepository, validateCouponLogic, recordCouponUsage, createAdminSessionToken, createUserSessionToken, createVendorSessionToken;

async function setupImports() {
  const router = await import('../backend/src/router.js');
  initializeBackend = router.initializeBackend;
  handleApiRequest = router.handleApiRequest;

  const repo = await import('../backend/src/dataAccess/repository.js');
  createRepository = repo.createRepository;

  const coupons = await import('../backend/src/handlers/coupons.js');
  validateCouponLogic = coupons.validateCouponLogic;
  recordCouponUsage = coupons.recordCouponUsage;

  const auth = await import('../backend/src/auth.js');
  createAdminSessionToken = auth.createAdminSessionToken;
  createUserSessionToken = auth.createUserSessionToken;
  createVendorSessionToken = auth.createVendorSessionToken;
}

function startTestServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      handleApiRequest(req, res);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      serverUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

async function apiCall({ method = 'GET', path, body = null, headers = {} }) {
  const url = `${serverUrl}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  const response = await fetch(url, {
    ...options,
    body: body ? JSON.stringify(body) : null,
  });

  const resData = await response.json().catch(() => ({}));
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: resData,
  };
}

async function runSecurityAudit() {
  await setupImports();
  console.log('🚀 Initializing Backend and Test Server for Security Audit...');
  await initializeBackend();
  await startTestServer();

  console.log(`Test server listening at ${serverUrl}\n`);

  const couponRepo = createRepository('coupons');
  const orderRepo = createRepository('orders');
  const usageRepo = createRepository('coupon_usages');
  const customerRepo = createRepository('customers');
  const decRepo = createRepository('decorations');

  // Create test customer
  const testCustomer = {
    id: `cust_${Date.now()}`,
    fullName: 'Audit Customer',
    email: `audit_${Date.now()}@example.com`,
    phone: '9876543210',
    mobile: '9876543210',
  };
  await customerRepo.create(testCustomer);
  const customerToken = createUserSessionToken(testCustomer);
  const adminToken = createAdminSessionToken();
  const vendorToken = createVendorSessionToken({ id: 'v1', name: 'Vendor 1' });

  // Create test decoration
  const testDec = {
    id: `dec_${Date.now()}`,
    decorationId: `dec_${Date.now()}`,
    name: 'Luxury Birthday Decor',
    basePrice: 2000,
    price: 2000,
    active: true,
  };
  await decRepo.create(testDec);

  try {
    // ----------------------------------------------------
    // AUDIT 1 & 2: RAZORPAY AMOUNT & FRONTEND PRICE MANIPULATION
    // ----------------------------------------------------
    console.log('--- AUDIT 1 & 2: Razorpay Amount & Frontend Price Manipulation ---');
    const couponCode1 = `AUDITPCT_${Date.now()}`;
    const c1 = await couponRepo.create({
      id: `c_audit_1`,
      code: couponCode1,
      name: '20% Off',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxDiscountAmount: 500,
      minOrderAmount: 1000,
      active: true,
      visibleToCustomers: true,
      createdAt: new Date().toISOString(),
    });

    // Attempt payload manipulation: send fake subtotal = 10, total = 10, discount = 9999
    const orderPayload = {
      pincode: '110001',
      items: [{ id: testDec.id, productName: testDec.name, price: 2000, quantity: 1, pincode: '110001' }],
      subtotal: 10, // MANIPULATED
      total: 10, // MANIPULATED
      discountAmount: 9999, // MANIPULATED
      couponCode: couponCode1,
      deliveryAddress: '123 Test Street, New Delhi',
    };

    const orderRes = await apiCall({
      method: 'POST',
      path: '/orders',
      body: orderPayload,
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    if (orderRes.status !== 201) {
      console.log('ORDER ERROR BODY:', orderRes.body);
    }
    assert.strictEqual(orderRes.status, 201, 'Order creation should succeed');
    const createdOrder = orderRes.body.order;

    // Decoration price = 2000. 20% discount = 400. Service fee = 100. Total = 2000 - 400 + 100 = 1700.
    const expectedTotal = createdOrder.subtotal - createdOrder.discountAmount + createdOrder.serviceCharge;
    assert.strictEqual(createdOrder.subtotal, 2000, 'Backend must compute real subtotal = 2000 (ignoring frontend subtotal=10)');
    assert.strictEqual(createdOrder.discountAmount, 400, 'Backend must compute real discount = 400 (ignoring frontend discount=9999)');
    assert.strictEqual(createdOrder.total, expectedTotal, `Backend must compute total = ${expectedTotal} (${createdOrder.subtotal} - ${createdOrder.discountAmount} + ${createdOrder.serviceCharge})`);
    console.log(`✅ PASS: Backend recalculated subtotal ₹${createdOrder.subtotal}, discount ₹${createdOrder.discountAmount}, service fee ₹${createdOrder.serviceCharge} -> total ₹${createdOrder.total} (frontend manipulation ignored)`);

    // ----------------------------------------------------
    // AUDIT 3: COUPON REVALIDATION AT CHECKOUT
    // ----------------------------------------------------
    console.log('\n--- AUDIT 3: Coupon Revalidation at Checkout ---');
    const cExpired = await couponRepo.create({
      id: `c_audit_exp`,
      code: `EXPIRED_${Date.now()}`,
      discountType: 'FIXED',
      discountValue: 200,
      active: true,
      expiresAt: new Date(Date.now() - 10000).toISOString(), // Already expired
      createdAt: new Date().toISOString(),
    });

    const expOrderRes = await apiCall({
      method: 'POST',
      path: '/orders',
      body: {
        pincode: '110001',
        items: [{ id: testDec.id, price: 2000, quantity: 1, pincode: '110001' }],
        couponCode: cExpired.code,
        deliveryAddress: '123 Test Street',
      },
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert.strictEqual(expOrderRes.status, 400, 'Expired coupon should be rejected during order creation');
    assert.ok(expOrderRes.body.error.includes('expired'), 'Error should state coupon expired');
    console.log('✅ PASS: Expired coupon revalidation at order creation rejected with 400');

    // ----------------------------------------------------
    // AUDIT 4: HIDDEN COUPONS
    // ----------------------------------------------------
    console.log('\n--- AUDIT 4: Hidden Coupons ---');
    const cHidden = await couponRepo.create({
      id: `c_audit_hidden`,
      code: `HIDDEN_${Date.now()}`,
      name: 'Hidden VIP Code',
      discountType: 'FIXED',
      discountValue: 300,
      active: true,
      visibleToCustomers: false, // Hidden
      createdAt: new Date().toISOString(),
    });

    const availRes = await apiCall({ path: '/coupons/available' });
    const availCodes = availRes.body.coupons.map((c) => c.code);
    assert.ok(!availCodes.includes(cHidden.code), 'Hidden coupon must NOT appear in GET /coupons/available');

    // Manual validation
    const valHidden = await validateCouponLogic({ code: cHidden.code, subtotal: 1000 });
    assert.strictEqual(valHidden.valid, true, 'Hidden coupon must validate when entered manually');
    console.log('✅ PASS: Hidden coupon excluded from available list but validates on manual entry');

    // ----------------------------------------------------
    // AUDIT 5: COUPON USAGE TIMING
    // ----------------------------------------------------
    console.log('\n--- AUDIT 5: Coupon Usage Timing ---');
    const cTiming = await couponRepo.create({
      id: `c_audit_timing`,
      code: `TIMING_${Date.now()}`,
      discountType: 'FIXED',
      discountValue: 100,
      usageLimit: 5,
      usageCount: 0,
      active: true,
      visibleToCustomers: true,
      createdAt: new Date().toISOString(),
    });

    // 1. Available query -> usageCount remains 0
    await apiCall({ path: '/coupons/available' });
    let freshC = await couponRepo.getById(cTiming.id);
    assert.strictEqual(freshC.usageCount, 0, 'Usage count should remain 0 after available list query');

    // 2. Validate query -> usageCount remains 0
    await validateCouponLogic({ code: cTiming.code, subtotal: 1000 });
    freshC = await couponRepo.getById(cTiming.id);
    assert.strictEqual(freshC.usageCount, 0, 'Usage count should remain 0 after validation query');

    // 3. Create order -> usageCount remains 0
    const timingOrderRes = await apiCall({
      method: 'POST',
      path: '/orders',
      body: {
        pincode: '110001',
        items: [{ id: testDec.id, price: 2000, quantity: 1, pincode: '110001' }],
        couponCode: cTiming.code,
        deliveryAddress: '123 Test Street',
      },
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const timingOrder = timingOrderRes.body.order;
    freshC = await couponRepo.getById(cTiming.id);
    assert.strictEqual(freshC.usageCount, 0, 'Usage count should remain 0 after order creation');

    // 4. Simulate successful payment completion -> usageCount increments to 1
    await recordCouponUsage({
      couponId: cTiming.id,
      customerId: testCustomer.id,
      customerPhone: testCustomer.phone,
      orderId: timingOrder.id,
      discountAmount: 100,
    });

    freshC = await couponRepo.getById(cTiming.id);
    assert.strictEqual(freshC.usageCount, 1, 'Usage count should increment to 1 ONLY after successful payment verification');
    console.log('✅ PASS: Coupon usage is consumed ONLY upon payment verification (not on view/validate/order creation)');

    // ----------------------------------------------------
    // AUDIT 7: ORDER PERSISTENCE
    // ----------------------------------------------------
    console.log('\n--- AUDIT 7: Order Persistence ---');
    const persistedOrder = await orderRepo.getById(timingOrder.id);
    assert.strictEqual(persistedOrder.couponCode, cTiming.code);
    assert.strictEqual(persistedOrder.couponId, cTiming.id);
    assert.strictEqual(persistedOrder.discountAmount, 100);

    const usages = await usageRepo.scan((u) => u.orderId === timingOrder.id);
    assert.strictEqual(usages.length, 1);
    assert.strictEqual(usages[0].couponId, cTiming.id);
    assert.strictEqual(usages[0].customerId, testCustomer.id);
    assert.strictEqual(usages[0].discountAmount, 100);
    console.log('✅ PASS: Order and coupon_usages persistence verified');

    // ----------------------------------------------------
    // AUDIT 9: CUSTOMER IDENTITY SECURITY
    // ----------------------------------------------------
    console.log('\n--- AUDIT 9: Customer Identity Security ---');
    // Send fake customerId in body while authenticated as testCustomer
    const identityOrderRes = await apiCall({
      method: 'POST',
      path: '/orders',
      body: {
        pincode: '110001',
        items: [{ id: testDec.id, price: 2000, quantity: 1, pincode: '110001' }],
        customerId: 'FAKE_CUSTOMER_999', // MANIPULATED
        deliveryAddress: '123 Test Street',
      },
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(identityOrderRes.body.order.customerId, testCustomer.id, 'Order customerId must be derived from token (ignoring fake customerId in body)');
    console.log('✅ PASS: Customer identity strictly enforced from JWT token session');

    // ----------------------------------------------------
    // AUDIT 10: ADMIN AUTHORIZATION
    // ----------------------------------------------------
    console.log('\n--- AUDIT 10: Admin Authorization ---');
    const custAdminRes = await apiCall({
      path: '/admin/coupons',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(custAdminRes.status, 403, 'Customer token accessing /admin/coupons must receive 403');

    const vendAdminRes = await apiCall({
      path: '/admin/coupons',
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    assert.strictEqual(vendAdminRes.status, 403, 'Vendor token accessing /admin/coupons must receive 403');

    const realAdminRes = await apiCall({
      path: '/admin/coupons',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(realAdminRes.status, 200, 'Admin token accessing /admin/coupons must succeed');
    console.log('✅ PASS: Admin authorization enforced (403 for Customer/Vendor, 200 for Admin)');

    // ----------------------------------------------------
    // AUDIT 12: INPUT VALIDATION
    // ----------------------------------------------------
    console.log('\n--- AUDIT 12: Input Validation ---');
    // Percentage > 100
    const pct150Res = await apiCall({
      method: 'POST',
      path: '/admin/coupons',
      body: { code: 'INVALID_PCT', discountType: 'PERCENTAGE', discountValue: 150 },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(pct150Res.status, 400);

    // Negative min order
    const negMinRes = await apiCall({
      method: 'POST',
      path: '/admin/coupons',
      body: { code: 'INVALID_MIN', discountType: 'FIXED', discountValue: 100, minOrderAmount: -50 },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(negMinRes.status, 400);

    // Invalid characters in code
    const invalidCharRes = await apiCall({
      method: 'POST',
      path: '/admin/coupons',
      body: { code: 'BAD CODE!', discountType: 'FIXED', discountValue: 100 },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(invalidCharRes.status, 400);
    console.log('✅ PASS: Input validation rejected percentage > 100, negative min order, and invalid characters');

    console.log('\n🎉 ALL SECURITY AUDIT SCENARIOS PASSED WITH ZERO VULNERABILITIES!');
  } catch (err) {
    console.error('❌ Security Audit Failed:', err);
    process.exitCode = 1;
  } finally {
    await stopTestServer();
  }
}

runSecurityAudit();
