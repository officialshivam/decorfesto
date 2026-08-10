import { createRepository } from '../dataAccess/repository.js';
import { getUserRole } from '../auth.js';
import { dataDirectory, localPort, tablePrefix, useAws } from '../config.js';

const _PENDING_STATUSES = new Set(['ORDER RECEIVED', 'CREATED', 'PENDING']);
const CONFIRMED_STATUSES = new Set(['APPROVED', 'ASSIGNED_TO_VENDOR', 'CONFIRMED']);
const COMPLETED_STATUSES = new Set(['COMPLETED', 'DELIVERED', 'FULFILLED']);
const CANCELLED_STATUSES = new Set(['REJECTED', 'CANCELLED', 'CANCELED']);

function statusBucket(status) {
  const key = String(status || 'Order Received').toUpperCase();
  if (CANCELLED_STATUSES.has(key)) return 'cancelled';
  if (CONFIRMED_STATUSES.has(key)) return 'confirmed';
  if (COMPLETED_STATUSES.has(key)) return 'completed';
  return 'pending';
}

function toLocalDateKey(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildOverTimeSeries(orders, days = 7) {
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
    revenue.push(scopedOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? order.total ?? 0), 0));
  }

  return { labels, orders: orderCounts, revenue };
}

function summarizeOrders(orders, vendorsById) {
  const total = orders.length;
  const todayKey = toLocalDateKey(new Date().toISOString());
  const today = orders.filter((order) => toLocalDateKey(order.createdAt) === todayKey).length;

  const buckets = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  const statusCounts = new Map();

  for (const order of orders) {
    const status = order.bookingStatus || 'Order Received';
    buckets[statusBucket(status)] += 1;
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  }

  const statusDistribution = [...statusCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((first, second) => second.value - first.value);

  const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount ?? order.total ?? 0), 0);

  const recent = [...orders]
    .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
    .slice(0, 8)
    .map((order) => ({
      id: order.id,
      customerName: order.customerName || 'Guest Customer',
      customerEmail: order.customerEmail || '',
      decoration: order.decorationName || 'DecorFesto package',
      pincode: order.pincode || '',
      scheduledDate: order.scheduledDate || order.date || '',
      scheduledTime: order.scheduledTime || order.time || '',
      amount: Number(order.totalAmount ?? order.total ?? 0),
      vendor: vendorsById.get(order.vendorId)?.name || order.vendorName || 'Unassigned',
      status: order.bookingStatus || 'Order Received',
      createdAt: order.createdAt,
    }));

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
    recent,
  };
}

export async function getDashboard({ req }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin access required.' },
    };
  }

  const startedAt = Date.now();

  const orderRepo = createRepository('orders');
  const customerRepo = createRepository('customers');
  const vendorRepo = createRepository('vendors');
  const serviceAreaRepo = createRepository('service-areas');
  const mappingRepo = createRepository('service-area-vendors');
  const decorationRepo = createRepository('decorations');
  const checkRepo = createRepository('availability-checks');

  const [orders, customers, vendors, serviceAreas, mappings, decorations, checks] = await Promise.all([
    orderRepo.list(),
    customerRepo.list(),
    vendorRepo.list(),
    serviceAreaRepo.list(),
    mappingRepo.list(),
    decorationRepo.list(),
    checkRepo.list(),
  ]);

  const vendorsById = new Map(vendors.map((vendor) => [vendor.id, vendor]));

  const coverageByPincode = new Map();
  for (const mapping of mappings) {
    const entries = coverageByPincode.get(mapping.pincode) || [];
    entries.push(mapping.vendorId);
    coverageByPincode.set(mapping.pincode, entries);
  }

  const vendorCoverage = vendors
    .filter((vendor) => vendor.status === 'active' || vendor.status === undefined)
    .map((vendor) => {
      const coveredPincodes = mappings
        .filter((mapping) => mapping.vendorId === vendor.id)
        .map((mapping) => mapping.pincode);
      return {
        id: vendor.id,
        name: vendor.name,
        pincodes: coveredPincodes,
      };
    });

  const serviceableAreas = serviceAreas.filter((area) => area.serviceable === true && area.active !== false);
  const inactiveAreas = serviceAreas.filter((area) => area.serviceable !== true || area.active === false);
  const uncoveredPincodes = serviceableAreas
    .filter((area) => !coverageByPincode.has(area.pincode))
    .map((area) => area.pincode);
  const areaRecords = serviceAreas.map((area) => ({
    id: area.id,
    pincode: area.pincode,
    city: area.city || '',
    serviceable: area.serviceable === true,
    active: area.active !== false,
    leadTimeHours: area.leadTimeHours || 0,
  }));
  const mappingRecords = mappings.map((mapping) => ({
    pincode: mapping.pincode,
    vendorId: mapping.vendorId,
  }));

  const successfulChecks = checks.filter((check) => check.available === true).length;
  const failedChecks = checks.filter((check) => check.available !== true).length;
  const requestedPincodeCounts = new Map();
  for (const check of checks) {
    if (!check.pincode) continue;
    requestedPincodeCounts.set(check.pincode, (requestedPincodeCounts.get(check.pincode) || 0) + 1);
  }
  const mostRequestedPincodes = [...requestedPincodeCounts.entries()]
    .map(([pincode, count]) => ({ pincode, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 6);

  const recentChecks = [...checks]
    .sort((first, second) => new Date(second.checkedAt || 0) - new Date(first.checkedAt || 0))
    .slice(0, 8)
    .map((check) => ({
      pincode: check.pincode,
      available: check.available === true,
      checkedAt: check.checkedAt,
    }));

  const activeDecorations = decorations.filter((decoration) => decoration.active !== false);

  const orderSummary = summarizeOrders(orders, vendorsById);

  return {
    statusCode: 200,
    body: {
      orders: {
        ...orderSummary,
        list: orders.map((order) => ({
          id: order.id,
          customerId: order.customerId,
          customerName: order.customerName || 'Guest Customer',
          customerEmail: order.customerEmail || '',
          decoration: order.decorationName || 'DecorFesto package',
          pincode: order.pincode || '',
          scheduledDate: order.scheduledDate || '',
          scheduledTime: order.scheduledTime || '',
          amount: Number(order.totalAmount ?? order.total ?? 0),
          vendorId: order.vendorId || null,
          vendorName: order.vendorName || '',
          status: order.bookingStatus || 'Order Received',
          createdAt: order.createdAt,
        })),
      },
      customers: { total: customers.length },
      vendors: {
        total: vendors.length,
        active: vendors.filter((vendor) => vendor.status === 'active' || vendor.status === undefined).length,
      },
      serviceAreas: {
        total: serviceAreas.length,
        serviceable: serviceableAreas.length,
        inactive: inactiveAreas.length,
        areas: areaRecords,
      },
      serviceCoverage: {
        vendorCoverage,
        uncoveredPincodes,
        mappings: mappingRecords,
      },
      decorations: {
        total: decorations.length,
        active: activeDecorations.length,
      },
      availability: {
        totalChecks: checks.length,
        successful: successfulChecks,
        failed: failedChecks,
        recent: recentChecks,
        mostRequested: mostRequestedPincodes,
      },
      system: {
        api: 'healthy',
        backend: 'healthy',
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        node: process.version,
        env: process.env.NODE_ENV || 'development',
        responseTimeMs: Date.now() - startedAt,
        dataDirectory,
        tablePrefix,
        port: localPort,
        useAws,
      },
    },
  };
}
