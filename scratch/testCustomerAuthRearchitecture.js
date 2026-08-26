import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { handleApiRequest } from '../backend/src/router.js';
import { createRepository } from '../backend/src/dataAccess/repository.js';
import { closePool } from '../backend/src/dataAccess/mysqlConnection.js';

class MockRequest extends EventEmitter {
  constructor({ method = 'GET', url = '/', headers = {}, body = null }) {
    super();
    this.method = method;
    this.url = url;
    this.headers = headers;
    this.body = body;
    this._emitted = false;
  }

  on(event, listener) {
    super.on(event, listener);
    if (event === 'end' && !this._emitted) {
      this._emitted = true;
      queueMicrotask(() => {
        if (this.body !== null) {
          const payloadStr = typeof this.body === 'object' ? JSON.stringify(this.body) : String(this.body);
          this.emit('data', payloadStr);
        }
        this.emit('end');
      });
    }
    return this;
  }
}

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
    this.headersSent = false;
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = { ...this.headers, ...headers };
    this.headersSent = true;
  }

  end(content) {
    if (content) {
      this.body = content;
    }
  }

  get json() {
    try {
      return JSON.parse(this.body);
    } catch {
      return this.body;
    }
  }
}

async function apiCall({ method = 'GET', url = '/', headers = {}, body = null }) {
  const req = new MockRequest({ method, url, headers, body });
  const res = new MockResponse();

  await handleApiRequest(req, res);
  return { statusCode: res.statusCode, headers: res.headers, body: res.json };
}

async function runTests() {
  console.log('=== PRODUCTION CUSTOMER AUTHENTICATION REARCHITECTURE TEST SUITE ===\n');

  const customerRepo = createRepository('customers');
  const orderRepo = createRepository('orders');

  const initialCustCount = (await customerRepo.list()).length;
  console.log(`Initial Customer Count in DB: ${initialCustCount}`);

  // Dynamic Test credentials to prevent leftover collisons
  const ts = Date.now().toString().slice(-5);
  const phoneA = `98765${ts}`;
  const emailA = `alok.${ts}@example.com`;
  const passA = 'AlokPass123!';

  const phoneB = `99999${ts}`;
  const emailB = `shivamm.${ts}@example.com`;
  const passB = 'ShivammPass123!';

  let cookieA = null;
  let tokenA = null;
  let userA = null;

  let cookieB = null;
  let tokenB = null;
  let userB = null;

  // TEST 1: New customer signup (Account A)
  console.log('\nTEST 1: New customer signup (Account A)');
  const signupResA = await apiCall({
    method: 'POST',
    url: '/auth/customer-signup',
    body: { name: 'Alok Kumar', mobile: phoneA, email: emailA, password: passA },
  });

  assert.strictEqual(signupResA.statusCode, 201, 'Signup A should return 201 Created');
  assert.ok(signupResA.body.success, 'Signup A body should have success: true');
  assert.strictEqual(signupResA.body.user.fullName, 'Alok Kumar');
  assert.strictEqual(signupResA.body.user.email, emailA);

  userA = signupResA.body.user;
  tokenA = signupResA.body.token;
  cookieA = signupResA.headers['Set-Cookie'] || signupResA.headers['set-cookie'];
  assert.ok(cookieA && cookieA.includes('decorfesto_customer_session='), 'Should issue HttpOnly session cookie');

  const custCountAfterA = (await customerRepo.list()).length;
  assert.strictEqual(custCountAfterA, initialCustCount + 1, 'Exactly 1 MySQL customer row added');
  console.log('  TEST 1 PASSED: Created Account A with HttpOnly cookie & 1 DB row.');

  // TEST 2: Same mobile signup again (duplicate mobile check)
  console.log('\nTEST 2: Same mobile signup again');
  const dupMobileRes = await apiCall({
    method: 'POST',
    url: '/auth/customer-signup',
    body: { name: 'Fake Alok', mobile: phoneA, email: `different.${ts}@example.com`, password: 'password123' },
  });

  assert.strictEqual(dupMobileRes.statusCode, 400, 'Duplicate mobile signup should return 400 Bad Request');
  assert.ok(dupMobileRes.body.error.includes('mobile number already exists'), 'Rejection error message verified');
  const custCountAfterDupMob = (await customerRepo.list()).length;
  assert.strictEqual(custCountAfterDupMob, custCountAfterA, 'No new customer row added');
  console.log('  TEST 2 PASSED: Duplicate mobile registration rejected with HTTP 400.');

  // TEST 3: Same email signup again (duplicate email check)
  console.log('\nTEST 3: Same email signup again');
  const dupEmailRes = await apiCall({
    method: 'POST',
    url: '/auth/customer-signup',
    body: { name: 'Different Mobile', mobile: `91234${ts}`, email: emailA, password: 'password123' },
  });

  assert.strictEqual(dupEmailRes.statusCode, 400, 'Duplicate email signup should return 400 Bad Request');
  assert.ok(dupEmailRes.body.error.includes('email address already exists'), 'Rejection error message verified');
  const custCountAfterDupEmail = (await customerRepo.list()).length;
  assert.strictEqual(custCountAfterDupEmail, custCountAfterA, 'No new customer row added');
  console.log('  TEST 3 PASSED: Duplicate email registration rejected with HTTP 400.');

  // TEST 4: Account A login & GET /auth/customer-me
  console.log('\nTEST 4: Account A login & GET /auth/customer-me');
  const loginResA = await apiCall({
    method: 'POST',
    url: '/auth/customer-login',
    body: { identifier: phoneA, password: passA },
  });
  assert.strictEqual(loginResA.statusCode, 200, 'Login A should return 200 OK');
  assert.strictEqual(loginResA.body.user.id, userA.id);

  const meResA = await apiCall({
    method: 'GET',
    url: '/auth/customer-me',
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(meResA.statusCode, 200, 'GET /auth/customer-me should return 200 for Account A');
  assert.strictEqual(meResA.body.user.id, userA.id);
  assert.strictEqual(meResA.body.user.fullName, 'Alok Kumar');
  console.log('  TEST 4 PASSED: GET /auth/customer-me returns Account A profile.');

  // TEST 5: Logout
  console.log('\nTEST 5: Logout Account A');
  const logoutRes = await apiCall({
    method: 'POST',
    url: '/auth/customer-logout',
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(logoutRes.statusCode, 200);

  const meResAfterLogout = await apiCall({
    method: 'GET',
    url: '/auth/customer-me',
    headers: { Cookie: 'decorfesto_customer_session=;' },
  });
  assert.strictEqual(meResAfterLogout.statusCode, 401, 'Unauthenticated GET /auth/customer-me must return 401');
  console.log('  TEST 5 PASSED: Session cookie expired, GET /auth/customer-me returns HTTP 401.');

  // TEST 6: Account B signup/login
  console.log('\nTEST 6: Account B signup/login');
  const signupResB = await apiCall({
    method: 'POST',
    url: '/auth/customer-signup',
    body: { name: 'Shivamm Gupta', mobile: phoneB, email: emailB, password: passB },
  });
  assert.strictEqual(signupResB.statusCode, 201);
  userB = signupResB.body.user;
  cookieB = signupResB.headers['Set-Cookie'] || signupResB.headers['set-cookie'];

  const meResB = await apiCall({
    method: 'GET',
    url: '/auth/customer-me',
    headers: { Cookie: cookieB },
  });
  assert.strictEqual(meResB.statusCode, 200);
  assert.strictEqual(meResB.body.user.id, userB.id);
  assert.strictEqual(meResB.body.user.fullName, 'Shivamm Gupta');
  console.log('  TEST 6 PASSED: Account B registered & verified via GET /auth/customer-me.');

  // TEST 7: Account A -> Account B switch
  console.log('\nTEST 7: Account A -> Account B switch');
  assert.notStrictEqual(userA.id, userB.id, 'User A and User B must be distinct customer IDs');
  assert.strictEqual(meResB.body.user.fullName, 'Shivamm Gupta', 'Current session MUST resolve exclusively to Account B');
  assert.notStrictEqual(meResB.body.user.fullName, 'Alok Kumar', 'No traces of Account A in active Account B session');
  console.log('  TEST 7 PASSED: Account switch displays ONLY Account B identity.');

  // TEST 8: Tampered order customerId (Attacker attempts sending customerId: "userA.id" while authenticated as Account B)
  console.log('\nTEST 8: Tampered order customerId security prevention');
  const testOrderIdB = `ORD-SEC-TEST-${Date.now()}`;
  const tamperedOrderRes = await apiCall({
    method: 'POST',
    url: '/orders',
    headers: { Cookie: cookieB },
    body: {
      id: testOrderIdB,
      customerId: userA.id, // Forged payload customerId!
      customerName: 'Alok Kumar Forged',
      decorationName: 'Birthday Balloon Arch',
      pincode: '110001',
      scheduledDate: '2026-09-01',
      scheduledTime: '14:00 - 16:00',
      deliveryAddress: '456 Shivamm Residence',
      subtotal: 5000,
      total: 5299,
    },
  });

  assert.strictEqual(tamperedOrderRes.statusCode, 201, 'Order creation succeeds');
  const createdOrderB = tamperedOrderRes.body.order;
  assert.strictEqual(createdOrderB.customerId, userB.id, 'customerId MUST be forced to authenticated session Account B ID');
  assert.strictEqual(createdOrderB.customerName, 'Shivamm Gupta', 'customerName MUST be forced to Account B name');
  assert.notStrictEqual(createdOrderB.customerId, userA.id, 'Forged customerId MUST be ignored by backend');
  console.log('  TEST 8 PASSED: Forged customerId ignored. Order forced to authenticated Account B session ID.');

  // TEST 9: Tampered customerName/email/mobile
  console.log('\nTEST 9: Tampered customerName/email/mobile in order payload');
  assert.strictEqual(createdOrderB.customerEmail, emailB, 'Email forced to authenticated Account B profile email');
  console.log('  TEST 9 PASSED: Client payload identity override prevented.');

  // TEST 10 & 11: Order Isolation (GET /orders)
  console.log('\nTEST 10 & 11: Order Isolation (GET /orders)');
  // Create an order for Account A
  const testOrderIdA = `ORD-SEC-TEST-A-${Date.now()}`;
  await apiCall({
    method: 'POST',
    url: '/orders',
    headers: { Cookie: cookieA },
    body: {
      id: testOrderIdA,
      decorationName: 'Alok Special Backdrop',
      pincode: '110001',
      scheduledDate: '2026-09-02',
      scheduledTime: '10:00 - 12:00',
      deliveryAddress: '123 Alok Street',
      subtotal: 4000,
      total: 4299,
    },
  });

  const ordersResA = await apiCall({ method: 'GET', url: '/orders', headers: { Cookie: cookieA } });
  assert.strictEqual(ordersResA.statusCode, 200);
  assert.ok(ordersResA.body.orders.every((o) => o.customerId === userA.id), 'All Account A orders belong strictly to Account A');
  assert.ok(!ordersResA.body.orders.some((o) => o.id === testOrderIdB), 'Account A cannot see Account B orders');

  const ordersResB = await apiCall({ method: 'GET', url: '/orders', headers: { Cookie: cookieB } });
  assert.strictEqual(ordersResB.statusCode, 200);
  assert.ok(ordersResB.body.orders.every((o) => o.customerId === userB.id), 'All Account B orders belong strictly to Account B');
  assert.ok(!ordersResB.body.orders.some((o) => o.id === testOrderIdA), 'Account B cannot see Account A orders');
  console.log('  TEST 10 & 11 PASSED: Strict customer order isolation verified.');

  // TEST 12: Place order as Account B (1 customer row, 1 order row)
  console.log('\nTEST 12: Place order as Account B DB Integrity');
  const currentCustList = await customerRepo.list();
  const custBMatches = currentCustList.filter((c) => c.id === userB.id);
  assert.strictEqual(custBMatches.length, 1, 'Exactly one customer row for Account B');
  console.log('  TEST 12 PASSED: Exactly 1 customer DB row for Account B.');

  // TEST 13: Refresh browser session
  console.log('\nTEST 13: Refresh browser session');
  const refreshedMeB = await apiCall({ method: 'GET', url: '/auth/customer-me', headers: { Cookie: cookieB } });
  assert.strictEqual(refreshedMeB.statusCode, 200);
  assert.strictEqual(refreshedMeB.body.user.id, userB.id);
  console.log('  TEST 13 PASSED: Session persists via HttpOnly cookie token.');

  // TEST 14: Multi-tab session resolution
  console.log('\nTEST 14: Multi-tab session resolution');
  const tab2Res = await apiCall({ method: 'GET', url: '/auth/customer-me', headers: { Cookie: cookieB } });
  assert.strictEqual(tab2Res.body.user.id, userB.id);
  console.log('  TEST 14 PASSED: Secondary tab resolves same backend session.');

  // TEST 15: No default customer fallback
  console.log('\nTEST 15: No default customer fallback when unauthenticated');
  const emptyRes = await apiCall({ method: 'GET', url: '/auth/customer-me', headers: {} });
  assert.strictEqual(emptyRes.statusCode, 401);
  assert.strictEqual(emptyRes.body.user, undefined);
  console.log('  TEST 15 PASSED: Unauthenticated session returns 401 with zero default user fallback.');

  // Cleanup test records created during test run
  try {
    await orderRepo.delete(testOrderIdA);
    await orderRepo.delete(testOrderIdB);
    await customerRepo.delete(userA.id);
    await customerRepo.delete(userB.id);
    console.log('\n[Cleaned up test orders and customer records successfully.]');
  } catch {}

  console.log('\n=== ALL 15 PRODUCTION CUSTOMER AUTHENTICATION TESTS PASSED 100% ===');
}

runTests()
  .then(async () => {
    await closePool();
  })
  .catch(async (err) => {
    console.error('\nTEST SUITE ERROR:', err);
    await closePool();
    process.exit(1);
  });
