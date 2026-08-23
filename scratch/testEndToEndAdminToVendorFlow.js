import assert from 'node:assert';
import { vendorLogin } from '../backend/src/auth.js';
import { createRepository } from '../backend/src/dataAccess/repository.js';
import { updateOrderStatus } from '../backend/src/handlers/orders.js';
import { getVendorOrders, updateVendorOrderStatus } from '../backend/src/handlers/vendorPortal.js';
import { isOrderAssignedToVendor } from '../src/services/vendorOrderService.js';

async function runEndToEndAdminToVendorFlow() {
  console.log('=== END-TO-END ADMIN ASSIGNMENT TO VENDOR WORKFLOW TEST ===\n');

  const ordersRepo = createRepository('orders');

  // 1. Create new customer booking
  const testOrderId = `ORD-E2E-${Date.now()}`;
  const newBooking = {
    id: testOrderId,
    customerId: null,
    customerName: 'Shivam Gupta',
    customerEmail: 'shivam@example.com',
    customerPhone: '+919876543210',
    decorationName: 'Premium Birthday Theme Decoration',
    pincode: '110001',
    scheduledDate: '2026-08-28',
    scheduledTime: '17:00',
    total: 19048,
    bookingStatus: 'Order Received',
    adminReviewStatus: 'PENDING',
    vendorId: null,
    vendorName: 'Unassigned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await ordersRepo.create(newBooking);
  console.log('STEP 1: Created New Booking:', testOrderId, 'PASS');

  // 2. Admin assigns vendor "DecorFesto Studio" (vendor-001)
  const adminAssignRes = await updateOrderStatus({
    req: {
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        vendorId: 'vendor-001',
        vendorName: 'DecorFesto Studio',
        bookingStatus: 'VENDOR_ASSIGNED',
        adminReviewStatus: 'APPROVED',
      }),
    },
    params: [testOrderId],
  });

  assert.strictEqual(adminAssignRes.statusCode, 200, 'Admin assignment should return HTTP 200');
  assert.strictEqual(adminAssignRes.body.order.vendorId, 'vendor-001');
  assert.strictEqual(adminAssignRes.body.order.vendorName, 'DecorFesto Studio');
  assert.strictEqual(adminAssignRes.body.order.bookingStatus, 'VENDOR_ASSIGNED');
  console.log('STEP 2: Admin Assigned Vendor (vendor-001 / DecorFesto Studio): PASS');

  // 3. Verify Order Persistence in DB
  const persistedOrder = await ordersRepo.getById(testOrderId);
  assert.strictEqual(persistedOrder.vendorId, 'vendor-001', 'vendorId must be persisted in database');
  assert.strictEqual(persistedOrder.vendorName, 'DecorFesto Studio', 'vendorName must be persisted in database');
  assert.strictEqual(persistedOrder.bookingStatus, 'VENDOR_ASSIGNED');
  console.log('STEP 3: Order Persistence Verified in Backend Repository: PASS');

  // 4. Vendor Login as "DecorFesto Studio"
  const loginRes = await vendorLogin({
    req: { body: { identifier: 'vendor@decorfesto.com', password: 'VendorPassword123!' } },
  });
  assert.strictEqual(loginRes.statusCode, 200, 'Vendor login should succeed');
  const token = loginRes.body.token;
  const headers = { authorization: `Bearer ${token}` };
  console.log('STEP 4: Vendor Login (DecorFesto Studio): PASS');

  // 5. Vendor API Query Orders
  const vendorOrdersRes = await getVendorOrders({ req: { headers } });
  assert.strictEqual(vendorOrdersRes.statusCode, 200);
  const vendorOrders = vendorOrdersRes.body.orders;
  const targetOrder = vendorOrders.find((o) => o.id === testOrderId);
  assert.ok(targetOrder, 'Assigned order MUST be present in Vendor API response');
  assert.strictEqual(targetOrder.bookingStatus, 'VENDOR_ASSIGNED');
  assert.ok(vendorOrders.length > 0, 'Assigned orders count > 0');
  console.log('STEP 5: Vendor Orders API Returned Assigned Order (Count:', vendorOrders.length, '): PASS');

  // 6. Vendor Dashboard Counter Calculations
  const pendingCount = vendorOrders.filter((o) => {
    const s = String(o.bookingStatus || '').toUpperCase();
    return s === 'VENDOR_ASSIGNED' || s === 'ASSIGNED_TO_VENDOR' || s === 'CONFIRMED' || s === 'CREATED' || s === 'ORDER RECEIVED';
  }).length;
  assert.ok(pendingCount > 0, 'Pending Acceptance count must be > 0');
  console.log('STEP 6: Vendor Dashboard Pending Count Calculation (Count:', pendingCount, '): PASS');

  // 7. Vendor Accepts Order
  const acceptRes = await updateVendorOrderStatus({
    req: {
      headers,
      body: JSON.stringify({ bookingStatus: 'VENDOR_ACCEPTED' }),
    },
    params: [testOrderId],
  });
  assert.strictEqual(acceptRes.statusCode, 200, 'Vendor accept order should return 200');
  assert.strictEqual(acceptRes.body.order.bookingStatus, 'VENDOR_ACCEPTED');
  console.log('STEP 7: Vendor Accepts Order (VENDOR_ASSIGNED -> VENDOR_ACCEPTED): PASS');

  // Clean up test order
  try {
    await ordersRepo.delete(testOrderId);
  } catch {}

  console.log('\n=== END-TO-END ADMIN ASSIGNMENT TO VENDOR WORKFLOW PASSED 100% CLEANLY ===');
}

runEndToEndAdminToVendorFlow().catch((err) => {
  console.error('End-to-End test failed:', err);
  process.exit(1);
});
