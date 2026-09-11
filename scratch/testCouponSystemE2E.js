process.env.DECORFESTO_USE_MYSQL = 'false';
process.env.USE_MYSQL = 'false';
delete process.env.DECORFESTO_DB_HOST;

import assert from 'node:assert';
import http from 'node:http';

let server;
let serverUrl;

let initializeBackend, handleApiRequest, createRepository, recordCouponUsage, validateCouponLogic;

async function setupImports() {
  const router = await import('../backend/src/router.js');
  initializeBackend = router.initializeBackend;
  handleApiRequest = router.handleApiRequest;

  const repo = await import('../backend/src/dataAccess/repository.js');
  createRepository = repo.createRepository;

  const coupons = await import('../backend/src/handlers/coupons.js');
  recordCouponUsage = coupons.recordCouponUsage;
  validateCouponLogic = coupons.validateCouponLogic;
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
    body: resData,
  };
}

async function runTests() {
  await setupImports();
  console.log('🚀 Initializing Backend and Test Server...');
  await initializeBackend();
  await startTestServer();

  console.log(`Test server running at ${serverUrl}`);

  const couponRepo = createRepository('coupons');
  const usageRepo = createRepository('coupon_usages');
  const ordersRepo = createRepository('orders');

  try {
    // ----------------------------------------------------
    // TEST 1: Admin Creates Percentage Coupon with Max Cap
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Admin Creates Percentage Coupon (20% Off, Max ₹500, Min ₹1000) ---');
    const testCode1 = `TESTPCT_${Date.now()}`;
    const createRes1 = await couponRepo.create({
      id: `c_${Date.now()}_1`,
      code: testCode1,
      name: '20% Off Big Savings',
      description: 'Get 20% off up to ₹500 on orders over ₹1000',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxDiscountAmount: 500,
      minOrderAmount: 1000,
      active: true,
      visibleToCustomers: true,
      createdAt: new Date().toISOString(),
    });
    assert.ok(createRes1.id, 'Coupon 1 should be created');
    console.log('✅ PASS: Percentage coupon created');

    // ----------------------------------------------------
    // TEST 2: Validate Percentage Discount Calculation
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Validate Percentage Discount (Subtotal ₹2000 -> 20% = ₹400) ---');
    const valRes1 = await validateCouponLogic({
      code: testCode1,
      subtotal: 2000,
    });
    assert.strictEqual(valRes1.valid, true, 'Coupon should be valid');
    assert.strictEqual(valRes1.discountAmount, 400, '20% of ₹2000 should be ₹400');
    assert.strictEqual(valRes1.finalSubtotal, 1600, 'Final subtotal should be ₹1600');
    console.log('✅ PASS: Percentage calculation correct');

    // ----------------------------------------------------
    // TEST 3: Validate Max Discount Amount Cap
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Validate Max Discount Cap (Subtotal ₹4000 -> 20% = ₹800 -> Capped at ₹500) ---');
    const valRes2 = await validateCouponLogic({
      code: testCode1,
      subtotal: 4000,
    });
    assert.strictEqual(valRes2.valid, true, 'Coupon should be valid');
    assert.strictEqual(valRes2.discountAmount, 500, 'Discount should be capped at ₹500');
    assert.strictEqual(valRes2.finalSubtotal, 3500, 'Final subtotal should be ₹3500');
    console.log('✅ PASS: Max discount cap enforced');

    // ----------------------------------------------------
    // TEST 4: Minimum Order Amount Check
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Validate Minimum Order Amount (Subtotal ₹800 < Min ₹1000 -> Fail) ---');
    const valRes3 = await validateCouponLogic({
      code: testCode1,
      subtotal: 800,
    });
    assert.strictEqual(valRes3.valid, false, 'Coupon should be invalid when below min subtotal');
    assert.ok(valRes3.message.includes('Minimum order amount'), 'Error message should mention min order amount');
    console.log('✅ PASS: Minimum order amount check passed');

    // ----------------------------------------------------
    // TEST 5: Create Fixed Amount Coupon & Verify
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Create Fixed Amount Coupon (₹250 Off) ---');
    const testCode2 = `TESTFIXED_${Date.now()}`;
    await couponRepo.create({
      id: `c_${Date.now()}_2`,
      code: testCode2,
      name: 'Flat ₹250 Off',
      description: 'Flat ₹250 discount',
      discountType: 'FIXED',
      discountValue: 250,
      minOrderAmount: 500,
      active: true,
      visibleToCustomers: true,
      createdAt: new Date().toISOString(),
    });

    const valRes4 = await validateCouponLogic({
      code: testCode2,
      subtotal: 1500,
    });
    assert.strictEqual(valRes4.valid, true, 'Fixed coupon should be valid');
    assert.strictEqual(valRes4.discountAmount, 250, 'Discount should be ₹250');
    assert.strictEqual(valRes4.finalSubtotal, 1250, 'Final subtotal should be ₹1250');
    console.log('✅ PASS: Fixed amount coupon validated');

    // ----------------------------------------------------
    // TEST 6: Customer Visible vs Hidden Coupons
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Visible vs Hidden Coupons ---');
    const testCodeSecret = `SECRET_${Date.now()}`;
    await couponRepo.create({
      id: `c_${Date.now()}_3`,
      code: testCodeSecret,
      name: 'VIP Secret Offer',
      discountType: 'FIXED',
      discountValue: 100,
      active: true,
      visibleToCustomers: false, // Hidden
      createdAt: new Date().toISOString(),
    });

    const availRes = await apiCall({ path: '/coupons/available' });
    assert.strictEqual(availRes.status, 200);
    const codesInAvail = availRes.body.coupons.map((c) => c.code);
    assert.ok(codesInAvail.includes(testCode1), 'Public coupon 1 should appear in available list');
    assert.ok(codesInAvail.includes(testCode2), 'Public coupon 2 should appear in available list');
    assert.ok(!codesInAvail.includes(testCodeSecret), 'Hidden coupon should NOT appear in available list');

    // But hidden coupon MUST validate successfully when entered manually by code
    const valSecret = await validateCouponLogic({ code: testCodeSecret, subtotal: 500 });
    assert.strictEqual(valSecret.valid, true, 'Hidden coupon should validate when code is manually entered');
    console.log('✅ PASS: Visible vs Hidden coupons logic verified');

    // ----------------------------------------------------
    // TEST 7: Expired & Inactive Coupons
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Expired and Inactive Coupons ---');
    const testCodeExpired = `EXPIRED_${Date.now()}`;
    await couponRepo.create({
      id: `c_${Date.now()}_4`,
      code: testCodeExpired,
      name: 'Expired Coupon',
      discountType: 'FIXED',
      discountValue: 100,
      active: true,
      expiresAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      createdAt: new Date().toISOString(),
    });

    const valExpired = await validateCouponLogic({ code: testCodeExpired, subtotal: 500 });
    assert.strictEqual(valExpired.valid, false);
    assert.ok(valExpired.message.includes('expired'));

    const testCodeInactive = `INACTIVE_${Date.now()}`;
    await couponRepo.create({
      id: `c_${Date.now()}_5`,
      code: testCodeInactive,
      name: 'Inactive Coupon',
      discountType: 'FIXED',
      discountValue: 100,
      active: false,
      createdAt: new Date().toISOString(),
    });

    const valInactive = await validateCouponLogic({ code: testCodeInactive, subtotal: 500 });
    assert.strictEqual(valInactive.valid, false);
    assert.ok(valInactive.message.includes('inactive'));
    console.log('✅ PASS: Expired and Inactive checks verified');

    // ----------------------------------------------------
    // TEST 8: Per-Customer Usage Limit Check
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Per-Customer Usage Limit Check ---');
    const testCodeOnePerUser = `ONCEPERUSER_${Date.now()}`;
    const cOnePerUser = await couponRepo.create({
      id: `c_${Date.now()}_6`,
      code: testCodeOnePerUser,
      name: 'Single Use Customer Coupon',
      discountType: 'FIXED',
      discountValue: 150,
      perCustomerLimit: 1,
      active: true,
      createdAt: new Date().toISOString(),
    });

    const custPhone = '9876543210';
    const valFirstTime = await validateCouponLogic({
      code: testCodeOnePerUser,
      subtotal: 1000,
      customerPhone: custPhone,
    });
    assert.strictEqual(valFirstTime.valid, true, 'First usage should pass');

    // Record usage for custPhone
    await recordCouponUsage({
      couponId: cOnePerUser.id,
      customerPhone: custPhone,
      orderId: 'TEST-ORD-001',
      discountAmount: 150,
    });

    const valSecondTime = await validateCouponLogic({
      code: testCodeOnePerUser,
      subtotal: 1000,
      customerPhone: custPhone,
    });
    assert.strictEqual(valSecondTime.valid, false, 'Second usage for same customer should fail');
    assert.ok(valSecondTime.message.includes('maximum allowed times'));
    console.log('✅ PASS: Per-customer usage limit verified');

    // ----------------------------------------------------
    // TEST 9: Coupon Usage Recording on Payment
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Coupon Usage Count Incremented ---');
    const updatedCoupon = await couponRepo.getById(cOnePerUser.id);
    assert.strictEqual(Number(updatedCoupon.usageCount ?? updatedCoupon.usage_count), 1, 'Coupon usage count should be incremented to 1');
    console.log('✅ PASS: Usage count tracking verified');

    console.log('\n🎉 ALL E2E COUPON SYSTEM TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ E2E Coupon System Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await stopTestServer();
  }
}

runTests();
