import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../router.js';
import { createRepository } from './repository.js';
import { closePool } from './mysqlConnection.js';
import { projectRoot } from '../config.js';

class MockRequest extends EventEmitter {
  constructor({ method = 'GET', url = '/', headers = {}, body = null }) {
    super();
    this.method = method;
    this.url = url;
    this.headers = headers;
    this.body = body;
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

async function simulateApiCall({ method = 'GET', url = '/', headers = {}, body = null }) {
  const req = new MockRequest({ method, url, headers, body });
  const res = new MockResponse();

  const apiPromise = handleApiRequest(req, res);
  if (body !== null) {
    const payloadStr = typeof body === 'object' ? JSON.stringify(body) : String(body);
    req.emit('data', payloadStr);
  }
  req.emit('end');

  await apiPromise;
  return { statusCode: res.statusCode, headers: res.headers, body: res.json };
}

async function testMode(modeName, useMysql) {
  process.env.DECORFESTO_USE_MYSQL = useMysql ? 'true' : 'false';

  console.log(`\n==================================================`);
  console.log(` Testing API Endpoints & Admin Security in ${modeName} (useMysql=${useMysql})`);
  console.log(`==================================================\n`);

  const results = [];
  const testOrderId = `TEST-ORD-${useMysql ? 'MYSQL' : 'JSON'}-001`;
  const testCustomerId = `TEST-CUST-${useMysql ? 'MYSQL' : 'JSON'}-001`;

  // Create prerequisite test customer record for FK satisfaction
  try {
    const custRepo = createRepository('customers');
    const existingCust = await custRepo.getById(testCustomerId);
    if (!existingCust) {
      await custRepo.create({
        id: testCustomerId,
        fullName: 'Stage4 Test User',
        email: 'stage4test@decorfesto.com',
        phone: '+919999988888',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn(`[Pre-test Warning] Could not ensure test customer: ${err.message}`);
  }

  // 1. SECURITY TEST: CORS Production Origin & Wildcard Absence Test
  try {
    const resProd = await simulateApiCall({
      method: 'GET',
      url: '/health',
      headers: { Origin: 'https://decorfesto.com' },
    });

    const resLocal = await simulateApiCall({
      method: 'GET',
      url: '/health',
      headers: { Origin: 'http://localhost:5173' },
    });

    const prodOriginOk = resProd.headers['Access-Control-Allow-Origin'] === 'https://decorfesto.com';
    const localOriginOk = resLocal.headers['Access-Control-Allow-Origin'] === 'http://localhost:5173';
    const noWildcard = resProd.headers['Access-Control-Allow-Origin'] !== '*';

    results.push({
      Endpoint: 'CORS: Production & Local Dev Origin',
      Status: resProd.statusCode,
      Passed: prodOriginOk && localOriginOk && noWildcard,
      Details: `Prod: ${resProd.headers['Access-Control-Allow-Origin']}, Local: ${resLocal.headers['Access-Control-Allow-Origin']} (No Wildcard)`,
    });
  } catch (err) {
    results.push({ Endpoint: 'CORS: Production & Local Dev Origin', Status: 500, Passed: false, Details: err.message });
  }

  // 2. SECURITY TEST: Unauthenticated request attempting X-User-Role: admin spoofing (MUST FAIL with 403)
  try {
    const res = await simulateApiCall({
      method: 'GET',
      url: '/admin/dashboard',
      headers: { 'X-User-Role': 'admin' },
    });

    results.push({
      Endpoint: 'SECURITY: X-User-Role: admin alone',
      Status: res.statusCode,
      Passed: res.statusCode === 403,
      Details: res.statusCode === 403 ? 'REJECTED with 403 Forbidden (PASSED)' : `FAILED: Allowed with status ${res.statusCode}`,
    });
  } catch (err) {
    results.push({ Endpoint: 'SECURITY: X-User-Role: admin alone', Status: 500, Passed: false, Details: err.message });
  }

  // 2. SECURITY TEST: Request without Authorization or Cookie session (MUST FAIL with 403)
  try {
    const res = await simulateApiCall({
      method: 'GET',
      url: '/admin/dashboard',
      headers: {},
    });

    results.push({
      Endpoint: 'SECURITY: No Authorization/session header',
      Status: res.statusCode,
      Passed: res.statusCode === 403,
      Details: res.statusCode === 403 ? 'REJECTED with 403 Forbidden (PASSED)' : `FAILED: Status ${res.statusCode}`,
    });
  } catch (err) {
    results.push({ Endpoint: 'SECURITY: No Authorization/session header', Status: 500, Passed: false, Details: err.message });
  }

  // 3. SECURITY TEST: Invalid admin credentials POST /auth/admin-login (MUST FAIL with 401)
  try {
    const res = await simulateApiCall({
      method: 'POST',
      url: '/auth/admin-login',
      body: { username: 'admin', password: 'WrongPassword123' },
    });

    results.push({
      Endpoint: 'SECURITY: Invalid Admin Credentials',
      Status: res.statusCode,
      Passed: res.statusCode === 401 && res.body.error === 'Invalid admin credentials.',
      Details: res.statusCode === 401 ? 'REJECTED with 401 Unauthorized (PASSED)' : `FAILED: Status ${res.statusCode}`,
    });
  } catch (err) {
    results.push({ Endpoint: 'SECURITY: Invalid Admin Credentials', Status: 500, Passed: false, Details: err.message });
  }

  // 4. SECURITY TEST: Valid admin login POST /auth/admin-login (MUST SUCCEED 200 & return session token)
  let adminSessionToken = null;
  let adminCookieHeader = null;
  try {
    const res = await simulateApiCall({
      method: 'POST',
      url: '/auth/admin-login',
      body: { username: 'admin', password: 'AdminPassword2026!' },
    });

    adminSessionToken = res.body.token;
    adminCookieHeader = res.headers['Set-Cookie'] || res.headers['set-cookie'];

    results.push({
      Endpoint: 'SECURITY: Valid Admin Login',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && res.body.success === true && Boolean(adminSessionToken),
      Details: res.statusCode === 200 ? 'AUTHENTICATED 200 OK & Session Token Issued' : `FAILED: Status ${res.statusCode}`,
    });
  } catch (err) {
    results.push({ Endpoint: 'SECURITY: Valid Admin Login', Status: 500, Passed: false, Details: err.message });
  }

  const authHeaders = { Authorization: `Bearer ${adminSessionToken}` };

  // 5. GET /health
  try {
    const res = await simulateApiCall({ method: 'GET', url: '/health' });
    results.push({
      Endpoint: 'GET /health',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && res.body.status === 'ok',
      Details: `api: ${res.body.api}, backend: ${res.body.backend}`,
    });
  } catch (err) {
    results.push({ Endpoint: 'GET /health', Status: 500, Passed: false, Details: err.message });
  }

  // 6. GET /decorations
  try {
    const res = await simulateApiCall({ method: 'GET', url: '/decorations' });
    const count = Array.isArray(res.body.decorations) ? res.body.decorations.length : 0;
    results.push({
      Endpoint: 'GET /decorations',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && count > 0,
      Details: `Returned ${count} decorations`,
    });
  } catch (err) {
    results.push({ Endpoint: 'GET /decorations', Status: 500, Passed: false, Details: err.message });
  }

  // 7. GET /decorations/:id
  try {
    const res = await simulateApiCall({ method: 'GET', url: '/decorations/decoration-1' });
    results.push({
      Endpoint: 'GET /decorations/:id',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && Boolean(res.body.decoration),
      Details: res.body.decoration ? `Found: ${res.body.decoration.name}` : 'Not found',
    });
  } catch (err) {
    results.push({ Endpoint: 'GET /decorations/:id', Status: 500, Passed: false, Details: err.message });
  }

  // 8. GET /service-areas/110001
  try {
    const res = await simulateApiCall({ method: 'GET', url: '/service-areas/110001' });
    results.push({
      Endpoint: 'GET /service-areas/110001',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && res.body.serviceArea?.pincode === '110001',
      Details: res.body.serviceArea ? `City: ${res.body.serviceArea.city}, Serviceable: ${res.body.serviceArea.serviceable}` : 'Not found',
    });
  } catch (err) {
    results.push({ Endpoint: 'GET /service-areas/110001', Status: 500, Passed: false, Details: err.message });
  }

  // 9. POST /availability/check
  try {
    const res = await simulateApiCall({
      method: 'POST',
      url: '/availability/check',
      body: { pincode: '110001' },
    });
    results.push({
      Endpoint: 'POST /availability/check',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && res.body.available === true,
      Details: `Available: ${res.body.available}, Vendors: ${res.body.vendorCount}`,
    });
  } catch (err) {
    results.push({ Endpoint: 'POST /availability/check', Status: 500, Passed: false, Details: err.message });
  }

  // 10. GET /vendors (Authenticated Session Admin Header)
  try {
    const res = await simulateApiCall({
      method: 'GET',
      url: '/vendors',
      headers: authHeaders,
    });
    const count = Array.isArray(res.body.vendors) ? res.body.vendors.length : 0;
    results.push({
      Endpoint: 'GET /vendors (Auth Admin)',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && count > 0,
      Details: `Returned ${count} vendors`,
    });
  } catch (err) {
    results.push({ Endpoint: 'GET /vendors', Status: 500, Passed: false, Details: err.message });
  }

  // 11. POST /orders (Create Test Order)
  try {
    const testOrderPayload = {
      orderId: testOrderId,
      customerId: testCustomerId,
      customerName: 'Stage4 Test User',
      customerEmail: 'stage4test@decorfesto.com',
      customerPhone: '+919999988888',
      decorationId: 'decoration-1',
      decorationName: 'Romantic Birthday Balloon Decoration',
      customization: { theme: 'Gold & Black' },
      pincode: '110001',
      scheduledDate: '2026-09-01',
      scheduledTime: '14:00 - 16:00',
      deliveryAddress: '123 Test Street, Delhi 110001',
      subtotal: 12999,
      serviceCharge: 299,
      totalAmount: 13298,
    };

    const res = await simulateApiCall({
      method: 'POST',
      url: '/orders',
      body: testOrderPayload,
    });

    results.push({
      Endpoint: 'POST /orders',
      Status: res.statusCode,
      Passed: res.statusCode === 201 && res.body.order?.id === testOrderId,
      Details: res.body.order ? `Order Created: ${res.body.order.id}` : res.body.error,
    });
  } catch (err) {
    results.push({ Endpoint: 'POST /orders', Status: 500, Passed: false, Details: err.message });
  }

  // 12. GET /orders (Authenticated Session Admin)
  try {
    const res = await simulateApiCall({
      method: 'GET',
      url: '/orders',
      headers: authHeaders,
    });
    const count = Array.isArray(res.body.orders) ? res.body.orders.length : 0;
    results.push({
      Endpoint: 'GET /orders (Auth Admin)',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && count > 0,
      Details: `Returned ${count} orders`,
    });
  } catch (err) {
    results.push({ Endpoint: 'GET /orders', Status: 500, Passed: false, Details: err.message });
  }

  // 13. GET /orders/:id (Authenticated Session Admin)
  try {
    const res = await simulateApiCall({
      method: 'GET',
      url: `/orders/${testOrderId}`,
      headers: authHeaders,
    });
    results.push({
      Endpoint: 'GET /orders/:id (Auth Admin)',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && res.body.order?.id === testOrderId,
      Details: res.body.order ? `Fetched Order: ${res.body.order.id}` : 'Not found',
    });
  } catch (err) {
    results.push({ Endpoint: 'GET /orders/:id', Status: 500, Passed: false, Details: err.message });
  }

  // 14. PATCH /orders/:id/status (Authenticated Session Admin Update)
  try {
    const res = await simulateApiCall({
      method: 'PATCH',
      url: `/orders/${testOrderId}/status`,
      headers: authHeaders,
      body: { bookingStatus: 'APPROVED', adminReviewStatus: 'APPROVED', vendorId: 'vendor-001' },
    });

    results.push({
      Endpoint: 'PATCH /orders/:id/status (Auth Admin)',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && res.body.order?.bookingStatus === 'APPROVED',
      Details: res.body.order ? `Status: ${res.body.order.bookingStatus}, Vendor: ${res.body.order.vendorId}` : res.body.error,
    });
  } catch (err) {
    results.push({ Endpoint: 'PATCH /orders/:id/status', Status: 500, Passed: false, Details: err.message });
  }

  // 15. GET /admin/dashboard (Authenticated Session Admin Cookie)
  try {
    const res = await simulateApiCall({
      method: 'GET',
      url: '/admin/dashboard',
      headers: { Cookie: adminCookieHeader },
    });
    results.push({
      Endpoint: 'GET /admin/dashboard (Auth Cookie)',
      Status: res.statusCode,
      Passed: res.statusCode === 200 && Boolean(res.body.orders),
      Details: res.body.orders ? `Total Orders: ${res.body.orders.total}, Revenue: ${res.body.orders.revenue}` : 'Failed',
    });
  } catch (err) {
    results.push({ Endpoint: 'GET /admin/dashboard (Auth Cookie)', Status: 500, Passed: false, Details: err.message });
  }

  // Clean up ONLY test records
  try {
    const orderRepo = createRepository('orders');
    await orderRepo.delete(testOrderId);
    const custRepo = createRepository('customers');
    await custRepo.delete(testCustomerId);
    console.log(`[Cleanup] Successfully removed test records (${testOrderId}, ${testCustomerId}) from ${modeName} repository.`);
  } catch (err) {
    console.warn(`[Cleanup Warning] Could not delete test records: ${err.message}`);
  }

  console.table(results);
  return results;
}

function verifyNoSecretsInFrontendAssets() {
  console.log(`\n==================================================`);
  console.log(` Verifying Zero Secrets in Frontend Assets & Source`);
  console.log(`==================================================\n`);

  const forbiddenTerms = [
    'decorfesto-admin-secret',
    'DECORFESTO_ADMIN_KEY',
    '__DECORFESTO_ADMIN_TOKEN__',
    'AdminPassword2026!',
    'decorfesto-session-secret-key',
  ];

  let violations = 0;

  // Check src/ files
  const srcDir = path.join(projectRoot, 'src');
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && /\.(js|jsx|css|html|json)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const term of forbiddenTerms) {
          if (content.includes(term)) {
            console.error(`[SECRET LEAK VIOLATION] Found forbidden secret '${term}' in frontend file: ${fullPath}`);
            violations++;
          }
        }
      }
    }
  }

  scanDir(srcDir);

  // Check dist/assets/ files if present
  const distAssetsDir = path.join(projectRoot, 'dist', 'assets');
  if (fs.existsSync(distAssetsDir)) {
    const entries = fs.readdirSync(distAssetsDir);
    for (const file of entries) {
      const fullPath = path.join(distAssetsDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const term of forbiddenTerms) {
        if (content.includes(term)) {
          console.error(`[SECRET LEAK VIOLATION] Found forbidden secret '${term}' in built dist asset: ${fullPath}`);
          violations++;
        }
      }
    }
  }

  if (violations === 0) {
    console.log('[SECURITY VERIFIED] Zero secrets or static admin tokens exist in frontend source or dist/assets!');
    return true;
  } else {
    console.error(`[SECURITY FAILURE] Total secret violations: ${violations}`);
    return false;
  }
}

async function runStage4Verification() {
  console.log('=== Stage 4: API CRUD & Security Verification ===\n');

  // Verify Frontend Bundle Security
  const zeroSecrets = verifyNoSecretsInFrontendAssets();

  // Test 1: JSON Fallback Mode
  const jsonResults = await testMode('Local JSON Mode', false);

  // Test 2: Hostinger MySQL Mode
  const mysqlResults = await testMode('Hostinger MySQL Mode', true);

  const jsonPassed = jsonResults.every((r) => r.Passed);
  const mysqlPassed = mysqlResults.every((r) => r.Passed);

  console.log('\n=== Stage 4 Final Result Summary ===');
  console.log(`Frontend Secret Scan: ${zeroSecrets ? 'PASSED (0 Secrets Found)' : 'FAILED'}`);
  console.log(`Local JSON Mode: ${jsonPassed ? 'ALL PASSED (15/15)' : 'SOME FAILED'}`);
  console.log(`Hostinger MySQL Mode: ${mysqlPassed ? 'ALL PASSED (15/15)' : 'SOME FAILED'}`);

  if (zeroSecrets && jsonPassed && mysqlPassed) {
    console.log('\n[Stage 4 SUCCESS] Both Local JSON mode and Hostinger MySQL mode verified 100% successfully including security & secret scan tests!');
  } else {
    console.warn('\n[Stage 4 WARNING] One or more endpoints or security checks did not pass verification.');
    process.exitCode = 1;
  }
}

runStage4Verification()
  .then(async () => {
    process.env.DECORFESTO_USE_MYSQL = 'false';
    await closePool();
  })
  .catch(async (err) => {
    console.error('[Stage 4 Error]', err);
    process.env.DECORFESTO_USE_MYSQL = 'false';
    await closePool();
    process.exit(1);
  });
