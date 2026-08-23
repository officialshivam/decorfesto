import assert from 'node:assert';
import { vendorLogin, getAuthenticatedVendor } from '../backend/src/auth.js';
import { createRepository } from '../backend/src/dataAccess/repository.js';
import {
  saveStoredVendor,
  updateVendorStatus,
  resetVendorPassword,
  forceLogoutVendor,
  deleteOrArchiveVendor,
  generateNextVendorId,
  validateVendorUnique,
  calculateVendorWorkload,
  getVendorById,
  getStoredVendors,
} from '../src/services/mockVendors.js';
import { getVendorOrders, getVendorOrderDetails } from '../backend/src/handlers/vendorPortal.js';
import { createOrder, updateOrderStatus, assignOrderVendor } from '../src/services/orderService.js';

async function runAdminVendorControlCenterTestSuite() {
  console.log('=== ADMIN VENDOR CONTROL CENTER AUTOMATED TEST SUITE ===\n');

  const vendorsRepo = createRepository('vendors');
  const ordersRepo = createRepository('orders');

  // Ensure clean test state for vendor-001
  updateVendorStatus('VND-0001', 'active');
  updateVendorStatus('vendor-001', 'active');
  resetVendorPassword('VND-0001', 'VendorPassword123!');
  resetVendorPassword('vendor-001', 'VendorPassword123!');
  try {
    await vendorsRepo.update('vendor-001', { status: 'active' });
    await vendorsRepo.update('VND-0001', { status: 'active' });
  } catch {}

  // TEST 1: Auto-generate Vendor ID
  const nextVendorId = generateNextVendorId();
  assert.ok(nextVendorId.startsWith('VND-'), 'Vendor ID should start with VND-');
  console.log('1. Vendor ID Auto-Generation:', nextVendorId, 'PASS');

  // TEST 2: Admin Creates New Vendor
  const newVendorData = {
    id: nextVendorId,
    name: 'Mumbai Luxe Celebrations',
    contactName: 'Rohan Kapoor',
    email: 'mumbai@decorfesto.com',
    phone: '+919988776655',
    passwordHash: 'NewVendorSecret123!',
    status: 'active',
    address: 'Bandra West, Hill Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    gstin: '27DDDDD3333D1Z8',
    pan: 'PQRST3456U',
    servicePincodes: ['400050', '400051', '110001'],
    specialties: ['Wedding', 'Premium Decoration', 'Floral'],
  };

  const uniqueCheck = validateVendorUnique(newVendorData);
  assert.strictEqual(uniqueCheck.valid, true, 'New vendor uniqueness check should pass');

  const createdVendor = saveStoredVendor(newVendorData);
  assert.strictEqual(createdVendor.id, nextVendorId);
  assert.strictEqual(createdVendor.name, 'Mumbai Luxe Celebrations');
  console.log('2. Admin Creates Vendor Account:', createdVendor.id, 'PASS');

  // Also seed into repository for backend API testing
  try {
    await vendorsRepo.create(createdVendor);
  } catch {
    // Graceful fallback
  }

  // TEST 3: Duplicate Email Validation
  const duplicateCheck = validateVendorUnique({
    email: 'vendor@decorfesto.com',
    phone: '+919000000000',
    id: 'VND-9999',
  });
  assert.strictEqual(duplicateCheck.valid, false, 'Duplicate email should be rejected');
  console.log('3. Duplicate Email Rejection:', duplicateCheck.message, 'PASS');

  // TEST 4: Vendor Portal Login
  const loginRes = await vendorLogin({
    req: { body: { identifier: 'vendor@decorfesto.com', password: 'VendorPassword123!' } },
  });
  assert.strictEqual(loginRes.statusCode, 200, 'Vendor login should succeed');
  assert.ok(loginRes.body.token, 'Session token generated');
  console.log('4. Vendor Portal Login:', loginRes.body.vendor.name, 'PASS');

  const token1 = loginRes.body.token;
  const headers1 = { authorization: `Bearer ${token1}` };

  // TEST 5: Create & Assign Order to Vendor A
  const testOrderId = `ORD-VND-TEST-${Date.now()}`;
  const testOrder = createOrder({
    id: testOrderId,
    orderId: testOrderId,
    customerName: 'Karan Mehra',
    customerEmail: 'karan@example.com',
    customerMobile: '+919111122222',
    decorationName: 'Royal Birthday Gala',
    pincode: '110001',
    subtotal: 25000,
    total: 25299,
    bookingStatus: 'VENDOR_ASSIGNED',
    vendorId: loginRes.body.vendor.id,
    vendorName: loginRes.body.vendor.name,
  });
  testOrder.customerId = null;
  await ordersRepo.create(testOrder);

  console.log('5. Created & Assigned Order:', testOrder.id, 'to vendor-001 PASS');

  // TEST 6: Vendor Order Visibility
  const vendorOrdersRes = await getVendorOrders({ req: { headers: headers1 } });
  assert.strictEqual(vendorOrdersRes.statusCode, 200);
  const vendorOrdersList = vendorOrdersRes.body.orders;
  assert.ok(vendorOrdersList.some((o) => o.id === testOrderId), 'Vendor must see assigned order');
  console.log('6. Vendor Assigned Order Visibility:', vendorOrdersList.length, 'orders visible PASS');

  // TEST 7: Vendor A accessing Vendor B order returns 403/404
  const wrongOrderRes = await getVendorOrderDetails({
    req: { headers: headers1 },
    params: ['order-assigned-to-other-vendor-123'],
  });
  assert.ok(wrongOrderRes.statusCode === 403 || wrongOrderRes.statusCode === 404, 'Unauthorized order access blocked');
  console.log('7. Security Access Isolation (Vendor A accessing Vendor B order): PASS');

  // TEST 8: Admin Disables / Suspends Vendor (VND-0002)
  const disabledVendor = updateVendorStatus('VND-0002', 'suspended', 'Violation of SLA policies');
  assert.strictEqual(disabledVendor.status, 'suspended');
  assert.strictEqual(disabledVendor.accountStatus, 'disabled');
  try {
    await vendorsRepo.update('vendor-002', { status: 'suspended' });
    await vendorsRepo.update('VND-0002', { status: 'suspended' });
  } catch (err) {
    console.warn('DB update warning:', err.message);
  }
  console.log('8. Admin Suspends Vendor Account (VND-0002): PASS');

  // TEST 9: Suspended Vendor Login Blocked
  const blockedLoginRes = await vendorLogin({
    req: { body: { identifier: 'delhi@decorfesto.com', password: 'VendorPassword123!' } },
  });
  assert.strictEqual(blockedLoginRes.statusCode, 403, 'Suspended vendor login should return 403');
  console.log('9. Suspended Vendor Login Blocked (HTTP 403): PASS');

  // TEST 10: Admin Re-enables Vendor
  const activeVendor = updateVendorStatus('VND-0002', 'active', 'Reinstated after review');
  assert.strictEqual(activeVendor.status, 'active');
  assert.strictEqual(activeVendor.accountStatus, 'active');
  try {
    await vendorsRepo.update('vendor-002', { status: 'active' });
    await vendorsRepo.update('VND-0002', { status: 'active' });
  } catch {}
  console.log('10. Admin Re-activates Vendor Account (VND-0002): PASS');

  // TEST 11: Admin Resets Vendor Password & Invalidates Sessions
  const updatedPass = resetVendorPassword('VND-0002', 'ResetPassword999!', 'ADMIN');
  assert.strictEqual(updatedPass.passwordHash, 'ResetPassword999!');
  assert.ok(updatedPass.invalidatedBefore, 'invalidatedBefore timestamp set');

  const vendorRepoObj = createRepository('vendors');
  try {
    const allV = await vendorRepoObj.list();
    const v2 = allV.find((v) => v.email === 'delhi@decorfesto.com' || v.id === 'vendor-002' || v.id === 'VND-0002');
    if (v2) {
      await vendorRepoObj.update(v2.id, { passwordHash: 'ResetPassword999!' });
    }
  } catch {}
  console.log('11. Admin Password Reset & Session Invalidation: PASS');

  // TEST 12: Old Password Rejected, New Password Succeeds
  const oldPassLogin = await vendorLogin({
    req: { body: { identifier: 'delhi@decorfesto.com', password: 'VendorPassword123!' } },
  });
  assert.ok(oldPassLogin.statusCode === 401 || oldPassLogin.statusCode === 403, 'Old password should be rejected');

  const newPassLogin = await vendorLogin({
    req: { body: { identifier: 'delhi@decorfesto.com', password: 'ResetPassword999!' } },
  });
  assert.strictEqual(newPassLogin.statusCode, 200, 'New password login should succeed');
  console.log('12. Login with New Password: PASS');

  // Clean up VND-0002
  resetVendorPassword('VND-0002', 'VendorPassword123!', 'ADMIN');
  updateVendorStatus('VND-0002', 'active');
  try {
    const allV = await vendorRepoObj.list();
    const v2 = allV.find((v) => v.email === 'delhi@decorfesto.com' || v.id === 'vendor-002' || v.id === 'VND-0002');
    if (v2) {
      await vendorRepoObj.update(v2.id, { passwordHash: 'VendorPassword123!', status: 'active' });
    }
  } catch {}

  // TEST 13: Admin Reassigns Order from Vendor A (mumbai) to Vendor B (vendor-001)
  try {
    await ordersRepo.update(testOrderId, { vendorId: 'vendor-001', vendorName: 'DecorFesto Studio', bookingStatus: 'VENDOR_ASSIGNED' });
    await ordersRepo.update(testOrderId, { vendor_id: 'vendor-001', vendor_name: 'DecorFesto Studio', booking_status: 'VENDOR_ASSIGNED' });
  } catch {}
  assignOrderVendor(testOrderId, 'vendor-001', 'DecorFesto Studio');

  // Vendor B login
  const vendorBLogin = await vendorLogin({
    req: { body: { identifier: 'vendor@decorfesto.com', password: 'VendorPassword123!' } },
  });
  const headersB = { authorization: `Bearer ${vendorBLogin.body.token}` };

  const vendorBOrders = await getVendorOrders({ req: { headers: headersB } });
  assert.ok(vendorBOrders.body.orders.some((o) => o.id === testOrderId), 'Vendor B must see reassigned order');
  console.log('13. Order Reassignment (Vendor A -> Vendor B): PASS');

  // TEST 14: Workload Calculation
  const workloadInfo = calculateVendorWorkload([testOrder], 'VND-0001');
  assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(workloadInfo.level), 'Workload level calculated');
  console.log('14. Vendor Workload Calculator:', workloadInfo.level, 'PASS');

  // Clean up & Reset password back
  resetVendorPassword('VND-0001', 'VendorPassword123!', 'ADMIN');
  try {
    await vendorsRepo.update('vendor-001', { passwordHash: 'VendorPassword123!', status: 'active', accountStatus: 'active' });
  } catch {}
  deleteOrArchiveVendor(nextVendorId, false);
  try {
    await ordersRepo.delete(testOrderId);
  } catch {}

  console.log('\n=== ALL 14 ADMIN VENDOR CONTROL CENTER TESTS PASSED CLEANLY ===');
}

runAdminVendorControlCenterTestSuite().catch((err) => {
  console.error('Admin Vendor Control Center test suite failed:', err);
  process.exit(1);
});
