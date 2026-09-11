process.env.DECORFESTO_USE_MYSQL = 'false';
process.env.USE_MYSQL = 'false';
delete process.env.DECORFESTO_DB_HOST;

import assert from 'node:assert';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;
let serverUrl;
let createRepository;

async function startServer() {
  const routerModule = await import('../backend/src/router.js');
  await routerModule.initializeBackend();

  const repoModule = await import('../backend/src/dataAccess/repository.js');
  createRepository = repoModule.createRepository;

  const serverModule = await import('../backend/server.js');
  // backend/server.js creates an HTTP server or exports request handler
}

async function runRoutingTests() {
  process.env.DECORFESTO_USE_MYSQL = 'false';
  process.env.USE_MYSQL = 'false';
  delete process.env.DECORFESTO_DB_HOST;

  const { initializeBackend, handleApiRequest } = await import('../backend/src/router.js');
  const { createRepository } = await import('../backend/src/dataAccess/repository.js');
  const authModule = await import('../backend/src/auth.js');
  
  await initializeBackend();

  // Import backend/server.js routing logic check
  const fs = await import('node:fs');
  const serverJsContent = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');

  // Verify explicitApiPrefixes contains '/coupons'
  assert.ok(serverJsContent.includes("'/coupons'"), "backend/server.js explicitApiPrefixes must contain '/coupons'");

  // Start HTTP server using handleApiRequest & server routing logic
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;

    const explicitApiPrefixes = [
      '/health',
      '/auth',
      '/payments',
      '/decorations',
      '/categories',
      '/customers',
      '/vendors',
      '/service-areas',
      '/charges',
      '/availability',
      '/ai-assistant',
      '/coupons',
    ];

    const isApi = explicitApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
                  pathname.startsWith('/admin/');

    if (isApi) {
      await handleApiRequest(req, res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><html><body>React SPA Fallback</body></html>');
    }
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      serverUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  console.log(`Server listening for API routing tests at ${serverUrl}\n`);

  const couponRepo = createRepository('coupons');
  const testCode = `ROUTE_TEST_${Date.now()}`;
  await couponRepo.create({
    id: `c_route_1`,
    code: testCode,
    name: 'Routing Test Coupon',
    discountType: 'FIXED',
    discountValue: 150,
    minOrderAmount: 500,
    active: true,
    visibleToCustomers: true,
    createdAt: new Date().toISOString(),
  });

  try {
    // ----------------------------------------------------
    // TEST 1: GET /coupons/available
    // ----------------------------------------------------
    console.log('--- TEST 1: GET /coupons/available ---');
    const res1 = await fetch(`${serverUrl}/coupons/available`);
    const contentType1 = res1.headers.get('content-type') || '';
    console.log('Content-Type:', contentType1);
    assert.ok(contentType1.includes('application/json'), `Content-Type should be application/json, got ${contentType1}`);
    assert.ok(!contentType1.includes('text/html'), 'Content-Type must NOT be text/html');
    const data1 = await res1.json();
    assert.ok(Array.isArray(data1.coupons), 'Response body must contain coupons array');
    console.log('✅ PASS: GET /coupons/available returned application/json');

    // ----------------------------------------------------
    // TEST 2: POST /coupons/validate (Invalid Coupon)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: POST /coupons/validate (Invalid Coupon) ---');
    const res2 = await fetch(`${serverUrl}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'INVALID_NON_EXISTENT_CODE_123', subtotal: 1000 }),
    });
    const contentType2 = res2.headers.get('content-type') || '';
    console.log('Status:', res2.status);
    console.log('Content-Type:', contentType2);
    assert.ok(contentType2.includes('application/json'), `Content-Type should be application/json, got ${contentType2}`);
    assert.ok(!contentType2.includes('text/html'), 'Content-Type must NOT be text/html');
    const data2 = await res2.json();
    assert.strictEqual(data2.valid, false, 'Invalid code must return valid: false');
    assert.ok(data2.message, 'Response body must include error message');
    console.log('✅ PASS: POST /coupons/validate invalid code returned application/json');

    // ----------------------------------------------------
    // TEST 3: POST /coupons/validate (Valid Coupon)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: POST /coupons/validate (Valid Coupon) ---');
    const res3 = await fetch(`${serverUrl}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode, subtotal: 1000 }),
    });
    const contentType3 = res3.headers.get('content-type') || '';
    console.log('Status:', res3.status);
    console.log('Content-Type:', contentType3);
    assert.ok(contentType3.includes('application/json'), `Content-Type should be application/json, got ${contentType3}`);
    const data3 = await res3.json();
    assert.strictEqual(data3.valid, true, 'Valid code must return valid: true');
    assert.strictEqual(data3.discountAmount, 150, 'Discount amount should be 150');
    assert.strictEqual(data3.finalSubtotal, 850, 'Final subtotal should be 850');
    console.log('✅ PASS: POST /coupons/validate valid code returned expected discount & application/json');

    // ----------------------------------------------------
    // TEST 4: GET /admin/coupons
    // ----------------------------------------------------
    console.log('\n--- TEST 4: GET /admin/coupons ---');
    const adminToken = authModule.createAdminSessionToken();
    const res4 = await fetch(`${serverUrl}/admin/coupons`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const contentType4 = res4.headers.get('content-type') || '';
    console.log('Status:', res4.status);
    console.log('Content-Type:', contentType4);
    assert.ok(contentType4.includes('application/json'), `Content-Type should be application/json, got ${contentType4}`);
    const data4 = await res4.json();
    assert.ok(Array.isArray(data4.coupons), 'Response body must contain coupons array');
    console.log('✅ PASS: GET /admin/coupons returned application/json');

    console.log('\n🎉 ALL API ROUTING TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ API Routing Test Failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runRoutingTests();
