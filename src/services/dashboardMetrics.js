import { getStoredOrders } from './mockAuth';
import { getStoredVendors } from './mockVendors';
import { getStoredServiceAreas } from './mockServiceAreas';
import { getStoredDecorations } from './mockDecorations';

const _PENDING_STATUSES = new Set(['ORDER RECEIVED', 'CREATED', 'PENDING']);
const CONFIRMED_STATUSES = new Set(['APPROVED', 'ASSIGNED_TO_VENDOR', 'CONFIRMED', 'CONFIRM']);
const COMPLETED_STATUSES = new Set(['COMPLETED', 'DELIVERED', 'FULFILLED']);
const CANCELLED_STATUSES = new Set(['REJECTED', 'CANCELLED', 'CANCELED']);

export function statusBucket(status) {
  const key = String(status || 'Order Received').toUpperCase();
  if (CANCELLED_STATUSES.has(key)) return 'cancelled';
  if (CONFIRMED_STATUSES.has(key)) return 'confirmed';
  if (COMPLETED_STATUSES.has(key)) return 'completed';
  return 'pending';
}

export function toLocalDateKey(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dedupeById(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item) continue;
    const key = item.id || item.decorationId;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function normalizeOrder(order) {
  return {
    ...order,
    createdAt: order.createdAt || new Date().toISOString(),
    scheduledDate: order.scheduledDate || order.date || '',
    scheduledTime: order.scheduledTime || order.time || '',
    amount: Number(order.totalAmount ?? order.total ?? 0),
    status: order.bookingStatus || 'Order Received',
    decoration: order.decorationName || order.items?.[0]?.productName || 'DecorFesto package',
    pincode: order.pincode || '',
    customerName: order.customerName || 'Guest Customer',
    customerEmail: order.customerEmail || order.email || '',
    vendor: order.vendorName || 'Unassigned',
  };
}

export function mergeOrders(clientOrders, backendOrders) {
  let sourceOrders;
  if (Array.isArray(backendOrders)) {
    sourceOrders = backendOrders;
  } else if (Array.isArray(clientOrders)) {
    sourceOrders = clientOrders;
  } else {
    sourceOrders = [];
  }
  const merged = dedupeById(sourceOrders.map(normalizeOrder));
  return merged.sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0));
}

export function buildOverTimeSeries(orders, days = 7) {
  const today = new Date();
  const labels = [];
  const orderCounts = [];
  const revenue = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index);
    const key = toLocalDateKey(day.toISOString());
    labels.push(day.toLocaleDateString('en-IN', { weekday: 'short' }));
    const scopedOrders = orders.filter((order) => toLocalDateKey(order.createdAt) === key);
    orderCounts.push(scopedOrders.length);
    revenue.push(scopedOrders.reduce((sum, order) => sum + order.amount, 0));
  }

  return { labels, orders: orderCounts, revenue };
}

export function computeOrderStats(orders) {
  const total = orders.length;
  const todayKey = toLocalDateKey(new Date().toISOString());
  const today = orders.filter((order) => toLocalDateKey(order.createdAt) === todayKey).length;

  const buckets = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  const statusNames = new Map();

  for (const order of orders) {
    const bucket = statusBucket(order.status);
    buckets[bucket] += 1;
    statusNames.set(order.status, (statusNames.get(order.status) || 0) + 1);
  }

  const statusDistribution = [...statusNames.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((first, second) => second.value - first.value);

  const revenue = orders.reduce((sum, order) => sum + order.amount, 0);

  return {
    total,
    today,
    pending: buckets.pending,
    confirmed: buckets.confirmed,
    completed: buckets.completed,
    cancelled: buckets.cancelled,
    revenue,
    statusDistribution,
    overTime: buildOverTimeSeries(orders),
  };
}

function mergeVendors(clientVendors, backendCoverage) {
  const coverageByVendorId = new Map();
  for (const entry of backendCoverage || []) {
    coverageByVendorId.set(entry.id, entry);
  }

  const mergedMap = new Map();
  for (const vendor of clientVendors || []) {
    const coverage = coverageByVendorId.get(vendor.id);
    mergedMap.set(vendor.id, {
      ...vendor,
      coveragePincodes: coverage?.pincodes || vendor.servicePincodes || [],
    });
  }

  for (const entry of backendCoverage || []) {
    if (!mergedMap.has(entry.id)) {
      mergedMap.set(entry.id, {
        id: entry.id,
        name: entry.name,
        contactName: '',
        status: 'active',
        coveragePincodes: entry.pincodes || [],
      });
    }
  }

  return [...mergedMap.values()];
}

function mergeServiceAreas(clientAreas, backendAreas) {
  const mergedMap = new Map();

  for (const area of backendAreas || []) {
    mergedMap.set(area.pincode, {
      id: area.id || area.pincode,
      pincode: area.pincode,
      city: area.city || '',
      serviceable: area.serviceable === true,
      active: area.active !== false,
      leadTimeHours: Number(area.leadTimeHours || 0),
    });
  }

  for (const area of clientAreas || []) {
    const existing = mergedMap.get(area.pincode);
    if (!existing) {
      mergedMap.set(area.pincode, {
        id: area.id || area.pincode,
        pincode: area.pincode,
        city: area.city || '',
        serviceable: area.serviceable !== false,
        active: area.active !== false,
        leadTimeHours: Number(area.leadTimeHours || 0),
      });
    }
  }

  return [...mergedMap.values()].sort((first, second) => String(first.pincode).localeCompare(String(second.pincode)));
}

export function mostBookedDecorations(orders, limit = 5) {
  const counts = new Map();
  for (const order of orders) {
    const key = order.decoration || 'DecorFesto package';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, bookings]) => ({ name, bookings }))
    .sort((first, second) => second.bookings - first.bookings)
    .slice(0, limit);
}

export function upcomingBookings(orders) {
  const today = toLocalDateKey(new Date().toISOString());
  return orders
    .filter((order) => {
      const bucket = statusBucket(order.status);
      if (bucket === 'cancelled' || bucket === 'completed') return false;
      const date = toLocalDateKey(order.scheduledDate ? new Date(order.scheduledDate).toISOString() : null);
      return date && date >= today;
    })
    .sort((first, second) => String(first.scheduledDate).localeCompare(String(second.scheduledDate)));
}

export function unassignedOrders(orders) {
  const today = toLocalDateKey(new Date().toISOString());
  return orders
    .filter((order) => {
      const bucket = statusBucket(order.status);
      if (bucket === 'cancelled' || bucket === 'completed') return false;
      const date = toLocalDateKey(order.scheduledDate ? new Date(order.scheduledDate).toISOString() : null);
      return date && date >= today;
    })
    .filter((order) => !order.vendorId && !order.vendorName)
    .sort((first, second) => String(first.scheduledDate).localeCompare(String(second.scheduledDate)));
}

export function deriveDashboard(payload) {
  const { client, backend, health, fetchedAt } = payload;

  const orders = mergeOrders(client.orders, backend?.orders?.list);
  const orderStats = computeOrderStats(orders);

  const clientVendors = client.vendors || getStoredVendors();
  const vendors = mergeVendors(clientVendors, backend?.serviceCoverage?.vendorCoverage);
  const activeVendors = vendors.filter((vendor) => vendor.status === 'active' || vendor.status === undefined);

  const clientAreas = client.serviceAreas || getStoredServiceAreas();
  const serviceAreas = mergeServiceAreas(clientAreas, backend?.serviceAreas?.areas);
  const serviceableAreas = serviceAreas.filter((area) => area.serviceable && area.active);

  const clientDecorations = client.decorations || getStoredDecorations();
  const decorations = dedupeById([...clientDecorations, ...(Array.isArray(clientDecorations) ? [] : [])]);
  const activeDecorations = decorations.filter((decoration) => decoration.active !== false);

  const categories = client.categories || [];
  const customerCount = backend?.customers?.total ?? 0;

  const availability = backend?.availability || { totalChecks: 0, successful: 0, failed: 0, recent: [], mostRequested: [] };
  const system = backend?.system || null;
  const healthStatus = health?.status || (health ? 'unknown' : 'down');

  const coverageMappings = new Map();
  for (const mapping of backend?.serviceCoverage?.mappings || []) {
    const entries = coverageMappings.get(mapping.pincode) || [];
    entries.push(mapping.vendorId);
    coverageMappings.set(mapping.pincode, entries);
  }
  const uncoveredPincodes = serviceableAreas
    .filter((area) => !coverageMappings.has(area.pincode))
    .map((area) => area.pincode);

  const coverageByVendor = new Map();
  for (const vendor of vendors) {
    coverageByVendor.set(vendor.id, new Set(vendor.coveragePincodes || []));
  }
  for (const entry of backend?.serviceCoverage?.vendorCoverage || []) {
    const set = coverageByVendor.get(entry.id) || new Set();
    (entry.pincodes || []).forEach((pincode) => set.add(pincode));
    coverageByVendor.set(entry.id, set);
  }

  const vendorsWithUpcoming = vendors.filter((vendor) => orders.some((order) => (order.vendorId === vendor.id || order.vendorName === vendor.name) && statusBucket(order.status) === 'confirmed'));
  const vendorsRequiringAttention = vendors.filter((vendor) => vendor.status === 'inactive' || (coverageByVendor.get(vendor.id)?.size || 0) === 0);

  const booked = mostBookedDecorations(orders);
  const upcoming = upcomingBookings(orders);
  const unassigned = unassignedOrders(orders);
  const recentConfirmed = orders.filter((order) => statusBucket(order.status) === 'confirmed').slice(0, 5);
  const cancelledOrders = orders.filter((order) => statusBucket(order.status) === 'cancelled');
  const pendingOrders = orders.filter((order) => statusBucket(order.status) === 'pending');

  const statusLabels = {
    pending: { label: 'Pending', color: 'var(--dash-amber)' },
    confirmed: { label: 'Confirmed', color: 'var(--dash-blue)' },
    completed: { label: 'Completed', color: 'var(--dash-green)' },
    cancelled: { label: 'Cancelled', color: 'var(--dash-red)' },
  };

  return {
    fetchedAt,
    healthStatus,
    orders: { ...orderStats, raw: orders, pendingOrders, recentConfirmed, upcoming, unassigned, cancelledOrders },
    customers: { total: customerCount },
    vendors: { total: vendors.length, active: activeVendors.length, all: vendors, withUpcoming: vendorsWithUpcoming, requiringAttention: vendorsRequiringAttention },
    serviceAreas: {
      total: serviceAreas.length,
      serviceable: serviceableAreas.length,
      inactive: serviceAreas.length - serviceableAreas.length,
      all: serviceAreas,
      uncovered: uncoveredPincodes,
    },
    decorations: {
      total: decorations.length,
      active: activeDecorations.length,
      all: decorations,
    },
    categories,
    availability,
    system,
    health,
    booked,
    statusLabels,
    platform: {
      env: 'Production',
      deployment: 'Hostinger',
    },
  };
}
