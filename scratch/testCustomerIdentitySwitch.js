import assert from 'node:assert';

function sanitize10DigitMobile(value) {
  if (!value) return '';
  let clean = String(value).replace(/\D/g, '');
  if (clean.startsWith('91') && clean.length > 10) {
    clean = clean.slice(2);
  }
  return clean.slice(-10);
}

// 1. Mock Users
const userAlok = {
  id: 'customer-alok-101',
  fullName: 'Alok Kumar',
  name: 'Alok Kumar',
  mobile: '+919876543210',
  phone: '+919876543210',
  email: 'alok@example.com',
  savedAddress: '123 Alok Street, Sector 15',
  address: '123 Alok Street, Sector 15',
  role: 'CUSTOMER',
};

const userShivamm = {
  id: 'customer-shivamm-202',
  fullName: 'Shivamm Gupta',
  name: 'Shivamm Gupta',
  mobile: '+919999988888',
  phone: '+919999988888',
  email: 'shivamm@example.com',
  savedAddress: '456 Shivamm Avenue, Block B',
  address: '456 Shivamm Avenue, Block B',
  role: 'CUSTOMER',
};

// 2. Initial Cart Setup
const mockCartItems = [
  {
    key: 'item-1',
    productId: 'prod-001',
    productName: 'Birthday Grand Backdrop',
    basePrice: 5000,
    price: 5000,
    quantity: 1,
    pincode: '110001',
    date: '2026-09-01',
    time: '14:00 - 16:00',
    remarks: 'Please use blue balloons',
  },
];

// Helper to simulate Checkout component state machine
function createCheckoutState(initialUser, cartItems) {
  let user = initialUser;
  let currentUserId = user?.id || user?.email || user?.mobile || null;
  let prevUserId = currentUserId;

  let form = {
    fullName: user?.name || user?.fullName || '',
    mobile: sanitize10DigitMobile(user?.mobile || user?.phone || ''),
    email: user?.email || '',
    address: user?.savedAddress || user?.address || '',
    city: 'Delhi NCR',
    state: 'Delhi',
    pincode: cartItems[0]?.pincode || '',
  };

  const items = [...cartItems];

  function onUserChange(newUser) {
    user = newUser;
    currentUserId = user?.id || user?.email || user?.mobile || null;

    if (currentUserId) {
      const userChanged = prevUserId !== currentUserId;
      prevUserId = currentUserId;

      if (userChanged) {
        form = {
          ...form,
          fullName: user.name || user.fullName || '',
          mobile: sanitize10DigitMobile(user.mobile || user.phone || ''),
          email: user.email || '',
          address: user.savedAddress || user.address || '',
        };
      }
    } else {
      prevUserId = null;
    }
  }

  function updateFormField(field, value) {
    form[field] = value;
  }

  function buildOrderPayload() {
    const mobileVal = sanitize10DigitMobile(form.mobile);
    const orderId = `DFC-${Date.now().toString().slice(-6)}`;
    return {
      id: orderId,
      orderId,
      customerId: user?.id || `customer-${Date.now()}`,
      customerName: form.fullName.trim(),
      customerMobile: mobileVal ? `+91${mobileVal}` : '',
      customerEmail: form.email.trim(),
      address: `${form.address.trim()}, ${form.city}, ${form.state}`,
      pincode: form.pincode.trim(),
      items: JSON.parse(JSON.stringify(items)),
      total: 5000,
    };
  }

  return {
    get form() { return form; },
    get items() { return items; },
    get user() { return user; },
    onUserChange,
    updateFormField,
    buildOrderPayload,
  };
}

async function runTests() {
  console.log('=== CHECKOUT CUSTOMER IDENTITY SWITCH TEST SUITE ===\n');

  // TEST A & B: Alok logged in -> switch to Shivamm -> form refreshes to Shivamm, no Alok trace
  const state = createCheckoutState(userAlok, mockCartItems);

  console.log('STEP 1: Initial State (Alok Logged In)');
  assert.strictEqual(state.form.fullName, 'Alok Kumar');
  assert.strictEqual(state.form.mobile, '9876543210');
  assert.strictEqual(state.form.email, 'alok@example.com');
  assert.strictEqual(state.form.address, '123 Alok Street, Sector 15');
  console.log('  Alok state verified: PASS');

  console.log('\nSTEP 2: Identity Switch (Signup / Login as Shivamm)');
  state.onUserChange(userShivamm);

  assert.strictEqual(state.form.fullName, 'Shivamm Gupta', 'FullName must update to Shivamm');
  assert.strictEqual(state.form.mobile, '9999988888', 'Mobile must update to Shivamm');
  assert.strictEqual(state.form.email, 'shivamm@example.com', 'Email must update to Shivamm');
  assert.strictEqual(state.form.address, '456 Shivamm Avenue, Block B', 'Address must update to Shivamm');

  assert.notStrictEqual(state.form.fullName, 'Alok Kumar', 'Must not retain Alok name');
  assert.notStrictEqual(state.form.mobile, '9876543210', 'Must not retain Alok mobile');
  assert.notStrictEqual(state.form.email, 'alok@example.com', 'Must not retain Alok email');
  assert.notStrictEqual(state.form.address, '123 Alok Street, Sector 15', 'Must not retain Alok address');
  console.log('  Identity switch to Shivamm verified & Alok trace cleared: PASS');

  // TEST C: Cart remains intact
  console.log('\nSTEP 3: Verify Cart Intact');
  assert.strictEqual(state.items.length, 1, 'Cart length must remain 1');
  assert.strictEqual(state.items[0].productId, 'prod-001');
  assert.strictEqual(state.items[0].pincode, '110001');
  assert.strictEqual(state.items[0].date, '2026-09-01');
  assert.strictEqual(state.items[0].time, '14:00 - 16:00');
  assert.strictEqual(state.form.pincode, '110001', 'Pincode preserved');
  console.log('  Cart and non-identity fields preserved: PASS');

  // TEST D: Order submission uses Shivamm's customerId and customer details
  console.log('\nSTEP 4: Inspect Order Payload');
  const payload = state.buildOrderPayload();
  console.log('  Resulting Order Payload:', JSON.stringify(payload, null, 2));

  assert.strictEqual(payload.customerId, 'customer-shivamm-202', 'customerId must be Shivamm ID');
  assert.strictEqual(payload.customerName, 'Shivamm Gupta', 'customerName must be Shivamm');
  assert.strictEqual(payload.customerMobile, '+919999988888', 'customerMobile must be Shivamm');
  assert.strictEqual(payload.customerEmail, 'shivamm@example.com', 'customerEmail must be Shivamm');
  assert.ok(payload.address.includes('456 Shivamm Avenue'), 'address must be Shivamm address');
  console.log('  Order payload customer details verified: PASS');

  // TEST E: Normal editing of checkout fields after login continues to work
  console.log('\nSTEP 5: Editing Checkout Fields Post-Login');
  state.updateFormField('address', 'Flat 101, New Shivamm Residence');
  state.onUserChange(userShivamm); // re-trigger effect with same user
  assert.strictEqual(state.form.address, 'Flat 101, New Shivamm Residence', 'Manual edit preserved across re-renders for same user');
  console.log('  Field editing post-login preserved: PASS');

  console.log('\n=== ALL CHECKOUT IDENTITY SWITCH TESTS PASSED 100% ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
