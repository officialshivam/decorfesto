import { getApiBaseUrl } from './apiConfig.js';
import { getCustomerAuthHeaders } from './customerAuthService.js';

const API_BASE_URL = getApiBaseUrl();

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function initiateRazorpayPayment({ order, customer, onSuccess, onError, onDismiss }) {
  try {
    const headers = getCustomerAuthHeaders({ 'Content-Type': 'application/json' });
    // 1. Create Razorpay order server-side
    const res = await fetch(`${API_BASE_URL}/payments/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId: order.id, total: order.total }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      onError(errData.error || 'Razorpay payment initialization failed at server.');
      return;
    }

    const paymentData = await res.json();
    if (!paymentData.success || !paymentData.razorpayOrderId) {
      onError(paymentData.error || 'Razorpay order creation failed. Unable to initialize Razorpay checkout.');
      return;
    }

    // 2. Load Razorpay script
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded || !window.Razorpay) {
      onError('Unable to load Razorpay SDK. Please check your network connection and retry.');
      return;
    }

    // 3. Configure Razorpay Standard Options
    const options = {
      key: paymentData.keyId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      order_id: paymentData.razorpayOrderId,
      name: 'DecorFesto Celebrations',
      description: `Booking #${order.id} - ${order.decorationName || 'Decoration Package'}`,
      image: '/favicon.svg',
      handler: async function (response) {
        if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
          onError('Payment response missing required verification fields.');
          return;
        }

        const verifyRes = await verifyPaymentOnServer({
          orderId: order.id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });

        if (verifyRes.success) {
          onSuccess(verifyRes);
        } else {
          onError(verifyRes.error || 'Signature verification failed.');
        }
      },
      prefill: {
        name: customer.fullName || customer.name || 'Shivam Gupta',
        email: customer.email || 'shivam@decorfesto.com',
        contact: customer.mobile || customer.phone || '',
      },
      notes: {
        orderId: order.id,
        pincode: order.pincode || '110032',
      },
      theme: {
        color: '#e76f51',
      },
      modal: {
        ondismiss: function () {
          console.log('Razorpay modal dismissed by user.');
          if (onDismiss) onDismiss();
        },
      },
    };

    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', function (response) {
      const err = response.error || {};
      console.error('Razorpay Payment Failed Detailed Error:', {
        code: err.code,
        description: err.description,
        reason: err.reason,
        source: err.source,
        step: err.step,
      });
      onError(`Payment Failed: ${err.description || err.reason || 'Transaction could not be completed.'}`);
    });

    rzp.open();
  } catch (err) {
    console.error('Razorpay Error:', err);
    onError(err.message || 'Unable to initialize Razorpay checkout.');
  }
}

async function verifyPaymentOnServer(payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/payments/verify-razorpay-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData.error || 'Server rejected payment verification.' };
  } catch {
    return { success: false, error: 'Network error connecting to payment verification server.' };
  }
}
