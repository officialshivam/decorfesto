/**
 * Centralized Booking Status Mapping & Display Formatter
 * Formats internal database / API booking status strings into standardized customer, admin, and vendor display labels.
 *
 * CANONICAL INTERNAL WORKFLOW:
 * ORDER_RECEIVED -> VENDOR_ASSIGNED -> VENDOR_ACCEPTED -> IN_PROGRESS -> COMPLETED (or CANCELLED)
 */

export const BOOKING_STATUS_DISPLAY_MAP = {
  'ORDER RECEIVED': 'Booking Placed',
  'ORDER_RECEIVED': 'Booking Placed',
  'CREATED': 'Booking Placed',
  'PAYMENT_INITIATED': 'Booking Placed',
  'BOOKING PLACED': 'Booking Placed',
  'BOOKING_PLACED': 'Booking Placed',
  'ADMIN_APPROVED': 'Vendor Assigned',
  'APPROVED': 'Vendor Assigned',
  'VENDOR_ASSIGNED': 'Vendor Assigned',
  'ASSIGNED_TO_VENDOR': 'Vendor Assigned',
  'VENDOR_ACCEPTED': 'Decoration Pending',
  'ACCEPTED': 'Decoration Pending',
  'IN_PROGRESS': 'Decoration In Progress',
  'START_PREPARATION': 'Decoration In Progress',
  'READY_FOR_SETUP': 'Decoration In Progress',
  'COMPLETED': 'Decoration Completed',
  'CANCELLED': 'Cancelled',
  'REJECTED': 'Declined',
};

/**
 * Returns customer-facing display text for an order.
 *
 * @param {string} rawStatus
 * @param {string} paymentStatus
 * @returns {string}
 */
export function formatCustomerBookingStatus(rawStatus, paymentStatus = '') {
  if (!rawStatus) return 'Booking Placed';
  const status = String(rawStatus).trim().toUpperCase();
  const payment = String(paymentStatus || '').trim().toUpperCase();
  const isPaid = payment.includes('PAID') || payment.includes('SUCCESS');

  if (status === 'ORDER_RECEIVED' || status === 'ORDER RECEIVED' || status === 'CREATED' || status === 'PAYMENT_INITIATED') {
    return isPaid ? 'Vendor Assignment Pending' : 'Booking Placed';
  }
  if (status === 'VENDOR_ASSIGNED' || status === 'ASSIGNED_TO_VENDOR' || status === 'APPROVED' || status === 'ADMIN_APPROVED') {
    return 'Decoration Pending';
  }
  if (status === 'VENDOR_ACCEPTED' || status === 'ACCEPTED') {
    return 'Decoration Pending';
  }
  if (status === 'IN_PROGRESS' || status === 'START_PREPARATION' || status === 'READY_FOR_SETUP') {
    return 'Decoration In Progress';
  }
  if (status === 'COMPLETED') {
    return 'Decoration Completed';
  }
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return 'Booking Cancelled';
  }
  return BOOKING_STATUS_DISPLAY_MAP[status] || rawStatus;
}

/**
 * Returns admin-facing display text for an order.
 *
 * @param {string} rawStatus
 * @param {string} paymentStatus
 * @returns {string}
 */
export function formatAdminBookingStatus(rawStatus, paymentStatus = '') {
  if (!rawStatus) return 'Booking Placed';
  const status = String(rawStatus).trim().toUpperCase();
  const payment = String(paymentStatus || '').trim().toUpperCase();
  const isPaid = payment.includes('PAID') || payment.includes('SUCCESS');

  if (status === 'ORDER_RECEIVED' || status === 'ORDER RECEIVED' || status === 'CREATED' || status === 'PAYMENT_INITIATED') {
    return isPaid ? 'Vendor Assignment Pending' : 'Booking Placed';
  }
  if (status === 'VENDOR_ASSIGNED' || status === 'ASSIGNED_TO_VENDOR' || status === 'APPROVED' || status === 'ADMIN_APPROVED') {
    return 'Vendor Assigned';
  }
  if (status === 'VENDOR_ACCEPTED' || status === 'ACCEPTED') {
    return 'Decoration Pending';
  }
  if (status === 'IN_PROGRESS' || status === 'START_PREPARATION' || status === 'READY_FOR_SETUP') {
    return 'Decoration In Progress';
  }
  if (status === 'COMPLETED') {
    return 'Decoration Completed';
  }
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return 'Cancelled';
  }
  return BOOKING_STATUS_DISPLAY_MAP[status] || rawStatus;
}

/**
 * Returns vendor-facing display text for an order.
 *
 * @param {string} rawStatus
 * @returns {string}
 */
export function formatVendorBookingStatus(rawStatus) {
  if (!rawStatus) return 'Pending Acceptance';
  const status = String(rawStatus).trim().toUpperCase();

  if (status === 'VENDOR_ASSIGNED' || status === 'ASSIGNED_TO_VENDOR' || status === 'APPROVED' || status === 'ORDER_RECEIVED') {
    return 'Pending Acceptance';
  }
  if (status === 'VENDOR_ACCEPTED' || status === 'ACCEPTED') {
    return 'Accepted / Ready to Start';
  }
  if (status === 'IN_PROGRESS' || status === 'START_PREPARATION' || status === 'READY_FOR_SETUP') {
    return 'Decoration In Progress';
  }
  if (status === 'COMPLETED') {
    return 'Decoration Completed';
  }
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return 'Cancelled';
  }
  return BOOKING_STATUS_DISPLAY_MAP[status] || rawStatus;
}

/**
 * Main context-aware format function.
 *
 * @param {string} rawStatus
 * @param {string} context - 'admin' | 'customer' | 'vendor'
 * @param {string} paymentStatus
 * @returns {string}
 */
export function formatBookingStatus(rawStatus, context = 'admin', paymentStatus = '') {
  if (context === 'customer') {
    return formatCustomerBookingStatus(rawStatus, paymentStatus);
  }
  if (context === 'vendor') {
    return formatVendorBookingStatus(rawStatus);
  }
  return formatAdminBookingStatus(rawStatus, paymentStatus);
}
