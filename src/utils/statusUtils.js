/**
 * Centralized Booking Status Mapping & Display Formatter
 * Formats internal database / API booking status strings into standardized customer, admin, and vendor display labels.
 */
export const BOOKING_STATUS_DISPLAY_MAP = {
  'ORDER RECEIVED': 'Booking Placed',
  'ORDER_RECEIVED': 'Booking Placed',
  'CREATED': 'Booking Placed',
  'PAYMENT_INITIATED': 'Booking Placed',
  'BOOKING PLACED': 'Booking Placed',
  'BOOKING_PLACED': 'Booking Placed',
  'ADMIN_APPROVED': 'Booking Approved',
  'APPROVED': 'Booking Approved',
  'VENDOR_ASSIGNED': 'Vendor Assigned',
  'ASSIGNED_TO_VENDOR': 'Vendor Assigned',
  'VENDOR_ACCEPTED': 'Vendor Assigned',
  'ACCEPTED': 'Vendor Assigned',
  'IN_PROGRESS': 'Decoration In Progress',
  'START_PREPARATION': 'Decoration In Progress',
  'READY_FOR_SETUP': 'Decoration In Progress',
  'COMPLETED': 'Celebration Completed',
  'CANCELLED': 'Cancelled',
  'REJECTED': 'Declined',
};

/**
 * Returns standardized user-facing display text for any booking status code or legacy status string.
 *
 * @param {string} rawStatus
 * @returns {string}
 */
export function formatBookingStatus(rawStatus) {
  if (!rawStatus) return 'Booking Placed';
  const key = String(rawStatus).trim().toUpperCase();
  return BOOKING_STATUS_DISPLAY_MAP[key] || rawStatus;
}
