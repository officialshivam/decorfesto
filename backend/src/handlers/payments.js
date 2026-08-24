import crypto from 'node:crypto';
import { createRepository } from '../dataAccess/repository.js';
import { razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret } from '../config.js';

export async function createRazorpayOrder({ req }) {
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const orderId = payload.orderId || payload.id;

  if (!orderId) {
    return { statusCode: 400, body: { success: false, error: 'Order ID is required to create a Razorpay payment order.' } };
  }

  if (!razorpayKeyId || !razorpayKeySecret) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Razorpay API credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are missing. Payment initialization aborted.' },
    };
  }

  const orderRepo = createRepository('orders');
  let order = null;
  try {
    order = await orderRepo.getById(orderId);
    if (!order) {
      const allOrders = await orderRepo.list();
      order = (allOrders || []).find((o) => o.id === orderId || o.orderId === orderId) || null;
    }
  } catch {
    order = null;
  }

  const amountNumber = order ? Number(order.total || order.totalAmount || 0) : Number(payload.total || 0);
  if (!amountNumber || amountNumber <= 0) {
    return { statusCode: 400, body: { success: false, error: 'Invalid order amount.' } };
  }

  const amountInPaise = Math.round(amountNumber * 100);
  let razorpayOrderId = null;

  try {
    const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: String(orderId),
      }),
    });

    const resData = await response.json();
    if (response.ok && resData.id) {
      razorpayOrderId = resData.id;
    } else {
      const rzpApiError = resData.error || resData;
      console.warn('Razorpay API Order Creation Failed:', rzpApiError);
      return {
        statusCode: 400,
        body: {
          success: false,
          error: rzpApiError.description || rzpApiError.message || 'Razorpay order creation failed at Razorpay API.',
        },
      };
    }
  } catch (err) {
    console.error('Unable to connect to Razorpay API:', err.message);
    return {
      statusCode: 500,
      body: { success: false, error: `Razorpay connection error: ${err.message}` },
    };
  }

  if (order) {
    await orderRepo.update(orderId, {
      razorpayOrderId,
      paymentStatus: 'PAYMENT_INITIATED',
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      keyId: razorpayKeyId,
      razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      orderId,
    },
  };
}

export async function verifyRazorpayPayment({ req }) {
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Missing required Razorpay payment verification parameters (orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature).' },
    };
  }

  if (!razorpayKeySecret) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Razorpay secret key is not configured on server. Verification rejected.' },
    };
  }

  const orderRepo = createRepository('orders');
  let order = null;
  try {
    order = await orderRepo.getById(orderId);
    if (!order) {
      const allOrders = await orderRepo.list();
      order = (allOrders || []).find((o) => o.id === orderId || o.orderId === orderId) || null;
    }
  } catch {
    order = null;
  }

  if (!order) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Order not found in database repository for payment verification.' },
    };
  }

  // Require request razorpay_order_id to match the persisted razorpayOrderId
  if (order.razorpayOrderId && order.razorpayOrderId !== razorpay_order_id) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Mismatched Razorpay order ID. Expected persisted order ID.' },
    };
  }

  // Idempotency Check: Return cached success if order is already PAID with same payment ID
  if (order.paymentStatus === 'PAID' && order.razorpayPaymentId === razorpay_payment_id) {
    return {
      statusCode: 200,
      body: {
        success: true,
        message: 'Payment already verified (idempotent response).',
        order,
      },
    };
  }

  // Safe rejection if already PAID with a different payment ID
  if (order.paymentStatus === 'PAID' && order.razorpayPaymentId && order.razorpayPaymentId !== razorpay_payment_id) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Order has already been paid with a different payment ID.' },
    };
  }

  // HMAC-SHA256 Signature Verification
  let isSignatureValid = false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const bufSig = Buffer.from(String(razorpay_signature));
    const bufExp = Buffer.from(expectedSignature);

    if (bufSig.length === bufExp.length) {
      isSignatureValid = crypto.timingSafeEqual(bufSig, bufExp);
    }
  } catch (err) {
    console.warn('HMAC Signature verification error:', err.message);
  }

  if (!isSignatureValid) {
    await orderRepo.update(orderId, {
      paymentStatus: 'PAYMENT_FAILED',
      updatedAt: new Date().toISOString(),
    });
    return {
      statusCode: 400,
      body: { success: false, error: 'Invalid payment signature. Payment verification failed.' },
    };
  }

  // Mark payment as verified & update canonical order status in database repository
  const updatedOrder = await orderRepo.update(orderId, {
    paymentStatus: 'PAID',
    bookingStatus: 'Order Received',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    updatedAt: new Date().toISOString(),
  });

  return {
    statusCode: 200,
    body: {
      success: true,
      message: 'Razorpay payment verified successfully.',
      paymentStatus: 'PAID',
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      order: updatedOrder || order,
    },
  };
}

export async function razorpayWebhook({ req }) {
  const signature = req.headers['x-razorpay-signature'];
  const payloadRaw = req.body && typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

  if (!signature) {
    return { statusCode: 400, body: { error: 'Missing Razorpay webhook signature header.' } };
  }

  const expectedSignature = crypto
    .createHmac('sha256', razorpayWebhookSecret)
    .update(payloadRaw)
    .digest('hex');

  const bufSig = Buffer.from(String(signature));
  const bufExp = Buffer.from(expectedSignature);

  if (bufSig.length !== bufExp.length || !crypto.timingSafeEqual(bufSig, bufExp)) {
    return { statusCode: 400, body: { error: 'Invalid webhook signature.' } };
  }

  const event = typeof req.body === 'object' ? req.body : JSON.parse(payloadRaw);
  const eventName = event.event || 'payment.captured';

  return {
    statusCode: 200,
    body: { status: 'ok', receivedEvent: eventName },
  };
}
