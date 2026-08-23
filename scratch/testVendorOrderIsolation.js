import assert from 'node:assert';
import { vendorLogin } from '../backend/src/auth.js';
import { createRepository } from '../backend/src/dataAccess/repository.js';
import { getVendorOrders, getVendorOrderDetails, updateVendorOrderStatus } from '../backend/src/handlers/vendorPortal.js';
import { isOrderAssignedToVendor } from '../src/services/vendorOrderService.js';

async function runVendorOrderIsolationTestSuite() {
  console.log('=== VENDOR ORDER ISOLATION & DECORFESTO STUDIO ASSIGNMENTS SUITE ===\n');

  const ordersRepo = createRepository('orders');
  const vendorsRepo = createRepository('vendors');

  // TEST 1: Vendor A & Vendor B Logins
  const loginResA = await vendorLogin({
    req: { body: { identifier: 'vendor@decorfesto.com', password: 'VendorPassword123!' } },
  });
  assert.strictEqual(loginResA.statusCode, 200, 'Vendor A login should succeed');
  const tokenA = loginResA.body.token;
  const headersA = { authorization: `Bearer ${tokenA}` };
  const vendorA = loginResA.body.vendor;

  const loginResB = await vendorLogin({
    req: { body: { identifier: 'delhi@decorfesto.com', password: 'VendorPassword123!' } },
  });
  assert.strictEqual(loginResB.statusCode, 200, 'Vendor B login should succeed');
  const tokenB = loginResB.body.token;
  const headersB = { authorization: `Bearer ${tokenB}` };
  const vendorB = loginResB.body.vendor;

  console.log('1. Vendor Logins: Vendor A =', vendorA.name, `(${vendorA.id})`, '| Vendor B =', vendorB.name, `(${vendorB.id})`, 'PASS');

  // TEST 2: Seed Order 1 (Vendor A) & Order 2 (Vendor B)
  const order1Id = `ORD-ISOLATION-A-${Date.now()}`;
  const order1 = {
    id: order1Id,
    customerId: null,
    customerName: 'Aarav Gupta',
    customerEmail: 'aarav@example.com',
    customerPhone: '+919876543210',
    decorationName: 'Birthday Arch Delight',
    pincode: '110001',
    scheduledDate: '2026-08-25',
    scheduledTime: '16:00',
    total: 12000,
    bookingStatus: 'VENDOR_ASSIGNED',
    vendorId: 'vendor-001',
    vendorName: 'DecorFesto Studio',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const order2Id = `ORD-ISOLATION-B-${Date.now()}`;
  const order2 = {
    id: order2Id,
    customerId: null,
    customerName: 'Neha Sharma',
    customerEmail: 'neha@example.com',
    customerPhone: '+919812345678',
    decorationName: 'Anniversary Floral Canopy',
    pincode: '110032',
    scheduledDate: '2026-08-26',
    scheduledTime: '18:00',
    total: 18000,
    bookingStatus: 'VENDOR_ASSIGNED',
    vendorId: 'vendor-002',
    vendorName: 'Delhi Celebrations Co.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await ordersRepo.create(order1);
    await ordersRepo.create(order2);
  } catch (err) {
    console.warn('Order seed note:', err.message);
  }

  console.log('2. Created Order 1 -> Vendor A and Order 2 -> Vendor B: PASS');

  // TEST 3: Vendor A Order Visibility & Isolation
  const resOrdersA = await getVendorOrders({ req: { headers: headersA } });
  assert.strictEqual(resOrdersA.statusCode, 200);
  const ordersListA = resOrdersA.body.orders;
  assert.ok(ordersListA.some((o) => o.id === order1Id), 'Vendor A MUST see Order 1');
  assert.ok(!ordersListA.some((o) => o.id === order2Id), 'Vendor A MUST NOT see Order 2');
  console.log('3. Vendor A Orders Query Isolation (Sees Order 1, Cannot see Order 2): PASS');

  // TEST 4: Vendor B Order Visibility & Isolation
  const resOrdersB = await getVendorOrders({ req: { headers: headersB } });
  assert.strictEqual(resOrdersB.statusCode, 200);
  const ordersListB = resOrdersB.body.orders;
  assert.ok(ordersListB.some((o) => o.id === order2Id), 'Vendor B MUST see Order 2');
  assert.ok(!ordersListB.some((o) => o.id === order1Id), 'Vendor B MUST NOT see Order 1');
  console.log('4. Vendor B Orders Query Isolation (Sees Order 2, Cannot see Order 1): PASS');

  // TEST 5: Direct Detail Access Security Check (Vendor A accessing Order 2)
  const directResAOnOrder2 = await getVendorOrderDetails({
    req: { headers: headersA },
    params: [order2Id],
  });
  assert.strictEqual(directResAOnOrder2.statusCode, 403, 'Vendor A accessing Order 2 MUST return 403 Forbidden');
  console.log('5. Direct Order Detail Access Security (Vendor A accessing Order 2 -> HTTP 403 Forbidden): PASS');

  // TEST 6: Direct Status Update Security Check (Vendor A updating Order 2)
  const directUpdateAOnOrder2 = await updateVendorOrderStatus({
    req: { headers: headersA, body: JSON.stringify({ bookingStatus: 'VENDOR_ACCEPTED' }) },
    params: [order2Id],
  });
  assert.strictEqual(directUpdateAOnOrder2.statusCode, 403, 'Vendor A updating Order 2 MUST return 403 Forbidden');
  console.log('6. Direct Order Status Update Security (Vendor A updating Order 2 -> HTTP 403 Forbidden): PASS');

  // TEST 7: Legacy Assignment Compatibility & DecorFesto Studio Assigned Count > 0
  const decorFestoStudioAssignedOrders = ordersListA.filter((o) =>
    isOrderAssignedToVendor(o, { id: 'VND-0001', name: 'DecorFesto Studio' })
  );
  assert.ok(decorFestoStudioAssignedOrders.length > 0, 'DecorFesto Studio assigned orders count must be > 0');
  console.log('7. Existing DecorFesto Studio Assigned Orders Count:', decorFestoStudioAssignedOrders.length, '> 0 PASS');

  // Clean up test orders
  try {
    await ordersRepo.delete(order1Id);
    await ordersRepo.delete(order2Id);
  } catch {}

  console.log('\n=== ALL VENDOR ORDER ISOLATION & ASSIGNMENT TESTS PASSED CLEANLY ===');
}

runVendorOrderIsolationTestSuite().catch((err) => {
  console.error('Vendor order isolation test suite failed:', err);
  process.exit(1);
});
