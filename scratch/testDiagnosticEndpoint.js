import assert from 'node:assert';
import { handleApiRequest } from '../backend/src/router.js';
import { createAdminSessionToken } from '../backend/src/auth.js';
import { EventEmitter } from 'node:events';

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
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = { ...this.headers, ...headers };
  }

  end(content) {
    if (content) this.body = content;
  }

  get json() {
    try {
      return JSON.parse(this.body);
    } catch {
      return this.body;
    }
  }
}

async function run() {
  console.log('Testing GET /admin/diagnostics/customer-duplicates...');

  // Test 1: Unauthenticated request should return 403
  const reqUnauth = new MockRequest({ method: 'GET', url: '/admin/diagnostics/customer-duplicates' });
  const resUnauth = new MockResponse();
  await handleApiRequest(reqUnauth, resUnauth);
  assert.strictEqual(resUnauth.statusCode, 403, 'Unauthenticated request must return 403');
  console.log('  Unauthenticated check PASSED: HTTP 403');

  // Test 2: Admin-authenticated request should return 200
  const adminToken = createAdminSessionToken({ username: 'admin', role: 'ADMIN' });
  const cookie = `decorfesto_admin_session=${adminToken}`;

  const reqAuth = new MockRequest({ method: 'GET', url: '/admin/diagnostics/customer-duplicates', headers: { Cookie: cookie } });
  const resAuth = new MockResponse();
  await handleApiRequest(reqAuth, resAuth);

  assert.strictEqual(resAuth.statusCode, 200, 'Admin request must return 200');
  assert.strictEqual(typeof resAuth.json.totalCustomers, 'number');
  assert.ok(Array.isArray(resAuth.json.duplicatePhones));
  assert.ok(Array.isArray(resAuth.json.duplicateEmails));
  assert.ok(Array.isArray(resAuth.json.duplicateCustomerOrders));

  // Confirm no sensitive fields are present
  const jsonStr = JSON.stringify(resAuth.json);
  assert.ok(!jsonStr.includes('password'), 'Must not leak passwords');
  assert.ok(!jsonStr.includes('authSecret'), 'Must not leak secrets');

  console.log('  Admin authorized check PASSED: HTTP 200');
  console.log('  JSON Response Structure:', {
    databaseBackend: resAuth.json.databaseBackend,
    mysqlConnected: resAuth.json.mysqlConnected,
    totalCustomers: resAuth.json.totalCustomers,
    duplicatePhoneCount: resAuth.json.duplicatePhoneCount,
    duplicateEmailCount: resAuth.json.duplicateEmailCount,
  });
}

run().catch((err) => {
  console.error('Diagnostic Test Failed:', err);
  process.exit(1);
});
