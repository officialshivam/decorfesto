import { getStoredOrders, updateOrderStatus } from './orderService';

export async function fetchVendorOrdersApi(vendorId) {
  try {
    const res = await fetch('/vendor/orders', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, orders: data.orders || [] };
    }
  } catch {
    // Local mock fallback
  }

  // Filter local stored orders strictly by vendorId
  const allOrders = getStoredOrders();
  const filtered = allOrders.filter((order) => order.vendorId === vendorId);
  return { ok: true, orders: filtered };
}

export async function fetchVendorOrderDetailApi(orderId, vendorId) {
  try {
    const res = await fetch(`/vendor/orders/${orderId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, order: data.order };
    }
    if (res.status === 403) {
      return { ok: false, error: 'Forbidden: Order assigned to another vendor.', statusCode: 403 };
    }
  } catch {
    // Local mock fallback
  }

  const allOrders = getStoredOrders();
  const order = allOrders.find((o) => o.id === orderId);

  if (!order) {
    return { ok: false, error: 'Order not found.' };
  }

  if (order.vendorId !== vendorId) {
    return { ok: false, error: 'Forbidden: Access denied to orders assigned to another vendor.', statusCode: 403 };
  }

  return { ok: true, order };
}

export async function updateVendorOrderStatusApi(orderId, vendorId, vendorName, nextBookingStatus, reason = '') {
  try {
    const res = await fetch(`/vendor/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingStatus: nextBookingStatus, reason }),
    });

    if (res.ok) {
      const data = await res.json();
      return { ok: true, order: data.order };
    }

    const errData = await res.json().catch(() => ({}));
    return { ok: false, error: errData.error || 'Status update failed.' };
  } catch {
    // Local mock fallback for dev/client-only environment
    const allOrders = getStoredOrders();
    const order = allOrders.find((o) => o.id === orderId);

    if (!order) {
      return { ok: false, error: 'Order not found.' };
    }

    if (order.vendorId !== vendorId) {
      return { ok: false, error: 'Forbidden: Cannot update order assigned to another vendor.' };
    }

    if (order.bookingStatus === 'COMPLETED') {
      return { ok: false, error: 'Completed orders cannot be modified.' };
    }

    const now = new Date().toISOString();
    const updates = {
      bookingStatus: nextBookingStatus,
      updatedAt: now,
    };

    if (nextBookingStatus === 'VENDOR_ACCEPTED') {
      updates.vendorAcceptedAt = now;
    } else if (nextBookingStatus === 'VENDOR_DECLINED') {
      updates.vendorDeclineReason = reason || 'Declined by vendor';
    } else if (nextBookingStatus === 'IN_PROGRESS') {
      updates.vendorStartedAt = now;
    } else if (nextBookingStatus === 'READY_FOR_SETUP') {
      updates.vendorReadyAt = now;
    } else if (nextBookingStatus === 'COMPLETED') {
      updates.completedAt = now;
      updates.completedByVendorId = vendorId;
      updates.completedByVendorName = vendorName || 'Vendor';
    }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    updates.statusHistory = [
      ...history,
      {
        status: nextBookingStatus,
        updatedByRole: 'VENDOR',
        updatedByName: vendorName || 'Vendor',
        updatedById: vendorId,
        timestamp: now,
        note: reason,
      },
    ];

    const updated = updateOrderStatus(orderId, updates);
    return { ok: true, order: updated };
  }
}
