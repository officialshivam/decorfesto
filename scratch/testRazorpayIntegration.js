import crypto from 'node:crypto';
import { createOrder, getOrderById } from '../src/services/orderService.js';
import { createRazorpayOrder, verifyRazorpayPayment, razorpayWebhook } from '../backend/src/handlers/payments.js';
import { razorpayKeySecret } from '../backend/src/config.js';

console.log('=== RAZORPAY STANDARD CHECKOUT TEST MODE INTEGRATION SUITE ===');

// 1. Create a Test Order
const testOrderData = {
  id: `DFC-RZP-${Date.now().toString().slice(-6)}`,
  customerName: 'Shivam Gupta',
  customerMobile: '+919876543210',
  customerEmail: 'shivam@decorfesto.com',
  address: 'B-402, Green Park, New Delhi',
  pincode: '110032',
  items: [{ productName: 'Romantic Birthday Balloon Decoration', totalPrice: 17999, quantity: 1 }],
  subtotal: 17999,
  serviceCharges: 1,
  total: 18000,
  paymentStatus: 'Pending',
  bookingStatus: 'Order Received',
  eventDate: '2026-08-25',
  timeSlot: '12:00 PM – 2:00 PM',
};

const createdOrder = createOrder(testOrderData);
console.log('1. Created Canonical Order:', createdOrder.id, 'Total:', createdOrder.total);

// 2. Server-Side Razorpay Order Creation
const orderReq = { body: { orderId: createdOrder.id } };
const razorpayOrderRes = await createRazorpayOrder({ req: orderReq });
console.log('2. Server Razorpay Order Response:', razorpayOrderRes.statusCode, razorpayOrderRes.body);

if (razorpayOrderRes.statusCode !== 200 || !razorpayOrderRes.body.razorpayOrderId) {
  throw new Error('FAIL: Razorpay order creation failed.');
}

const { razorpayOrderId, keyId } = razorpayOrderRes.body;
console.log('Key ID (Public):', keyId, 'Razorpay Order ID:', razorpayOrderId);

// 3. Valid Payment Signature Verification Test
const mockPaymentId = `pay_test_${Date.now().toString().slice(-8)}`;
const validSignature = crypto
  .createHmac('sha256', razorpayKeySecret)
  .update(`${razorpayOrderId}|${mockPaymentId}`)
  .digest('hex');

const verifyReq = {
  body: {
    orderId: createdOrder.id,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: mockPaymentId,
    razorpay_signature: validSignature,
  },
};

const verifyRes = await verifyRazorpayPayment({ req: verifyReq });
console.log('3. Valid Signature Verification Response:', verifyRes.statusCode, verifyRes.body);

if (verifyRes.statusCode !== 200 || verifyRes.body.paymentStatus !== 'PAID') {
  throw new Error('FAIL: Valid signature verification failed!');
}

// 4. Check Order Status Updated to PAID
const paidOrder = getOrderById(createdOrder.id);
console.log('4. Order Payment Status Updated in Repository:', paidOrder.paymentStatus, paidOrder.razorpayPaymentId);
if (paidOrder.paymentStatus !== 'PAID') {
  throw new Error('FAIL: Order status was not updated to PAID');
}

// 5. Idempotency Check (Duplicate Payment Verification Request)
const duplicateVerifyRes = await verifyRazorpayPayment({ req: verifyReq });
console.log('5. Idempotent Duplicate Response:', duplicateVerifyRes.statusCode, duplicateVerifyRes.body.message);
if (duplicateVerifyRes.statusCode !== 200 || !duplicateVerifyRes.body.message.includes('idempotent')) {
  throw new Error('FAIL: Idempotency check failed for duplicate payment callback.');
}

// 6. Invalid Signature Security Rejection Test
const invalidVerifyReq = {
  body: {
    orderId: createdOrder.id,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: `pay_fake_${Date.now()}`,
    razorpay_signature: 'invalid_forged_signature_123',
  },
};

const invalidRes = await verifyRazorpayPayment({ req: invalidVerifyReq });
console.log('6. Invalid Signature Response:', invalidRes.statusCode, invalidRes.body.error);
if (invalidRes.statusCode !== 400) {
  throw new Error('FAIL: Invalid signature was NOT rejected by server!');
}

// 7. Webhook Handler Test
const webhookPayload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: mockPaymentId } } } });
const webhookSig = crypto.createHmac('sha256', 'decorfesto_webhook_secret').update(webhookPayload).digest('hex');

const webhookReq = {
  headers: { 'x-razorpay-signature': webhookSig },
  body: webhookPayload,
};

const webhookRes = await razorpayWebhook({ req: webhookReq });
console.log('7. Webhook Response:', webhookRes.statusCode, webhookRes.body);
if (webhookRes.statusCode !== 200) {
  throw new Error('FAIL: Webhook verification failed!');
}

console.log('=== ALL RAZORPAY TEST MODE INTEGRATION TESTS PASSED ===');
