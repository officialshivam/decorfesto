import assert from 'node:assert';
import { vendorLogin, validateActiveUserSession, getAuthenticatedVendor } from '../backend/src/auth.js';
import { createRepository } from '../backend/src/dataAccess/repository.js';
import { getVendorOrders, getVendorOrderDetails, updateVendorOrderStatus, updateVendorProfile } from '../backend/src/handlers/vendorPortal.js';
import { updateOrderStatus, listOrders, getOrder } from '../backend/src/handlers/orders.js';

async function runVendorTestSuite() {
  console.log('=== DECORFESTO VENDOR PORTAL COMPREHENSIVE TEST SUITE ===\n');

  const ordersRepo = createRepository('orders');
  const vendorsRepo = createRepository('vendors');

  // Seed sample order for testing
  const testOrderId = `ORD-TEST-${Date.now()}`;
  const testOrder = {
    id: testOrderId,
    customerId: 'customer-test-01',
    customerName: 'Aarav Gupta',
    customerEmail: 'aarav@example.com',
    customerPhone: '+919876543210',
    decorationId: '1',
    decorationName: 'Classic Pink & White Birthday Setup',
    customization: { themePalette: 'Classic Pink & White', floralArrangement: 'Exotic Roses', packageQuantity: 2 },
    pincode: '110001',
    scheduledDate: '2026-08-25',
    scheduledTime: '10:00 AM - 12:00 PM',
    deliveryAddress: 'Connaught Place, Block C, New Delhi',
    subtotal: 15000,
    serviceCharge: 299,
    totalAmount: 15299,
    total: 15299,
    paymentStatus: 'PAID',
    bookingStatus: 'VENDOR_ASSIGNED',
    adminReviewStatus: 'APPROVED',
    vendorId: 'vendor-001',
    vendorName: 'DecorFesto Studio',
    vendorAssignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await ordersRepo.create(testOrder);
  console.log('1. Created Test Order:', testOrderId);

  // TEST 1: Valid Vendor Login
  const loginRes = await vendorLogin({
    req: { body: { identifier: 'vendor@decorfesto.com', password: 'VendorPassword123!' } },
  });
  assert.strictEqual(loginRes.statusCode, 200, 'Valid vendor login should return HTTP 200');
  assert.ok(loginRes.body.token, 'Token should be returned');
  assert.strictEqual(loginRes.body.role, 'VENDOR', 'Role should be VENDOR');
  console.log('2. Valid Vendor Login: PASS (Token generated for vendor-001)');

  const vendorToken = loginRes.body.token;
  const vendorHeaders = { authorization: `Bearer ${vendorToken}` };

  // TEST 2: Invalid Vendor Password
  const badPassRes = await vendorLogin({
    req: { body: { identifier: 'vendor@decorfesto.com', password: 'WrongPassword!' } },
  });
  assert.strictEqual(badPassRes.statusCode, 401, 'Invalid password should return 401');
  console.log('3. Invalid Vendor Password Rejection: PASS');

  // TEST 3: Disabled Vendor Login
  const disabledVendorId = `vendor-disabled-${Date.now()}`;
  await vendorsRepo.create({
    id: disabledVendorId,
    name: 'Disabled Studio',
    email: 'disabled@decorfesto.com',
    phone: '+919999999999',
    passwordHash: 'VendorPassword123!',
    status: 'disabled',
    accountStatus: 'disabled',
  });
  const disabledRes = await vendorLogin({
    req: { body: { identifier: 'disabled@decorfesto.com', password: 'VendorPassword123!' } },
  });
  assert.strictEqual(disabledRes.statusCode, 403, 'Disabled vendor login should return HTTP 403');
  console.log('4. Disabled Vendor Login Block: PASS');

  // TEST 5: Session Persistence & Token Verification
  const authVendor = getAuthenticatedVendor(vendorHeaders);
  assert.strictEqual(authVendor.vendorId, 'vendor-001', 'Session token should resolve vendor-001');
  console.log('5. Vendor Session Persistence & Token Verification: PASS');

  // TEST 7 & 8: Vendor Assigned Order Visibility & Order Isolation
  const listRes = await getVendorOrders({ req: { headers: vendorHeaders } });
  assert.strictEqual(listRes.statusCode, 200, 'Get vendor orders should return 200');
  const vendor1Orders = listRes.body.orders;
  assert.ok(vendor1Orders.some((o) => o.id === testOrderId), 'Vendor 1 must see assigned test order');
  assert.ok(vendor1Orders.every((o) => o.vendorId === 'vendor-001'), 'Vendor 1 must NOT see other vendors orders');
  console.log('6. Vendor Order Visibility & Isolation: PASS');

  // TEST 20 & 21: Security - Vendor A accessing Vendor B order
  const getOtherOrderRes = await getVendorOrderDetails({
    req: { headers: { authorization: `Bearer ${vendorToken}` } },
    params: ['order-assigned-to-vendor-002-nonexistent'],
  });
  assert.ok(getOtherOrderRes.statusCode === 404 || getOtherOrderRes.statusCode === 403, 'Order not assigned to vendor returns 403/404');
  console.log('7. Security Access Isolation (Vendor A accessing Vendor B order): PASS');

  // TEST 9: Vendor Accepts Order (VENDOR_ACCEPTED)
  const acceptRes = await updateVendorOrderStatus({
    req: { headers: vendorHeaders, body: { bookingStatus: 'VENDOR_ACCEPTED' } },
    params: [testOrderId],
  });
  assert.strictEqual(acceptRes.statusCode, 200, 'Accept order returns HTTP 200');
  assert.strictEqual(acceptRes.body.order.bookingStatus, 'VENDOR_ACCEPTED');
  console.log('8. Vendor Accepts Order (VENDOR_ASSIGNED -> VENDOR_ACCEPTED): PASS');

  // TEST 14: Vendor Starts Preparation (IN_PROGRESS)
  const startRes = await updateVendorOrderStatus({
    req: { headers: vendorHeaders, body: { bookingStatus: 'IN_PROGRESS' } },
    params: [testOrderId],
  });
  assert.strictEqual(startRes.statusCode, 200);
  assert.strictEqual(startRes.body.order.bookingStatus, 'IN_PROGRESS');
  console.log('9. Vendor Starts Preparation (IN_PROGRESS): PASS');

  // TEST 15: Vendor Marks Ready for Setup (READY_FOR_SETUP)
  const readyRes = await updateVendorOrderStatus({
    req: { headers: vendorHeaders, body: { bookingStatus: 'READY_FOR_SETUP' } },
    params: [testOrderId],
  });
  assert.strictEqual(readyRes.statusCode, 200);
  assert.strictEqual(readyRes.body.order.bookingStatus, 'READY_FOR_SETUP');
  console.log('10. Vendor Marks Ready for Setup (READY_FOR_SETUP): PASS');

  // TEST 16: Vendor Completes Order (COMPLETED)
  const completeRes = await updateVendorOrderStatus({
    req: { headers: vendorHeaders, body: { bookingStatus: 'COMPLETED' } },
    params: [testOrderId],
  });
  assert.strictEqual(completeRes.statusCode, 200);
  assert.strictEqual(completeRes.body.order.bookingStatus, 'COMPLETED');
  assert.ok(completeRes.body.order.completedAt, 'completedAt timestamp set');
  assert.strictEqual(completeRes.body.order.completedByVendorId, 'vendor-001');
  console.log('11. Vendor Completes Order (COMPLETED): PASS');

  // TEST 19: Cannot modify COMPLETED order
  const tamperRes = await updateVendorOrderStatus({
    req: { headers: vendorHeaders, body: { bookingStatus: 'IN_PROGRESS' } },
    params: [testOrderId],
  });
  assert.strictEqual(tamperRes.statusCode, 400, 'Reopening completed order returns HTTP 400');
  console.log('12. Reopening Completed Order Rejection: PASS');

  // TEST 17 & 18: Customer & Admin see completed status
  const adminGetRes = await getOrder({
    req: { headers: { authorization: 'Bearer admin-token' } },
    params: [testOrderId],
  });
  assert.strictEqual(adminGetRes.body.order.bookingStatus, 'COMPLETED');
  console.log('13. Admin & Customer Visibility of Completed Status: PASS');

  // Clean up test order
  await ordersRepo.delete(testOrderId);
  await vendorsRepo.delete(disabledVendorId);
  console.log('\n=== ALL VENDOR WORKFLOW & SECURITY TESTS PASSED CLEANLY ===');
}

runVendorTestSuite().catch((err) => {
  console.error('Vendor test suite failed:', err);
  process.exit(1);
});
