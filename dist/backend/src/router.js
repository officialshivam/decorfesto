import { listDecorations, getDecoration } from './handlers/decorations.js';
import { createCustomer, getCustomer } from './handlers/customers.js';
import { listVendors, getVendor, createVendor } from './handlers/vendors.js';
import { createServiceArea, getServiceArea, listServiceAreaVendors } from './handlers/serviceAreas.js';
import { createOrder, getOrder, listOrders, updateOrderStatus } from './handlers/orders.js';
import { checkAvailability } from './handlers/availability.js';
import { getDashboard } from './handlers/dashboard.js';
import { seedBackendData } from './seedData.js';
import { adminLogin, vendorLogin, validateActiveUserSession } from './auth.js';
import { getCorsHeaders } from './config.js';
import { listEnabledCharges, listAdminCharges, createAdminCharge, updateAdminCharge, deleteAdminCharge } from './handlers/charges.js';
import { listAdminUsers, createAdminUserRecord, toggleAdminUserStatus, resetAdminUserPassword } from './handlers/users.js';
import { createRepository } from './dataAccess/repository.js';
import { createRazorpayOrder, verifyRazorpayPayment, razorpayWebhook } from './handlers/payments.js';
import { getVendorOrders, getVendorOrderDetails, updateVendorOrderStatus, getVendorProfile, updateVendorProfile, changeVendorPassword } from './handlers/vendorPortal.js';

function healthCheck() {
  return {
    statusCode: 200,
    body: {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
    },
  };
}

const routeHandlers = {
  GET: {
    '/health': healthCheck,
    '/admin/dashboard': getDashboard,
    '/admin/charges': listAdminCharges,
    '/admin/users': listAdminUsers,
    '/charges/enabled': listEnabledCharges,
    '/decorations': listDecorations,
    '/decorations/:id': getDecoration,
    '/customers/:id': getCustomer,
    '/vendors': listVendors,
    '/vendors/:id': getVendor,
    '/service-areas/:pincode': getServiceArea,
    '/service-areas/:pincode/vendors': listServiceAreaVendors,
    '/orders': listOrders,
    '/orders/:id': getOrder,
    '/vendor/me': getVendorProfile,
    '/vendor/orders': getVendorOrders,
    '/vendor/orders/:id': getVendorOrderDetails,
    '/vendor/profile': getVendorProfile,
  },
  POST: {
    '/auth/admin-login': adminLogin,
    '/auth/vendor-login': vendorLogin,
    '/admin/charges': createAdminCharge,
    '/admin/users': createAdminUserRecord,
    '/customers': createCustomer,
    '/vendors': createVendor,
    '/service-areas': createServiceArea,
    '/availability/check': checkAvailability,
    '/orders': createOrder,
    '/payments/create-razorpay-order': createRazorpayOrder,
    '/payments/verify-razorpay-payment': verifyRazorpayPayment,
    '/payments/razorpay-webhook': razorpayWebhook,
    '/vendor/change-password': changeVendorPassword,
  },
  PATCH: {
    '/admin/charges/:id': updateAdminCharge,
    '/admin/users/:id/status': toggleAdminUserStatus,
    '/admin/users/:id/password': resetAdminUserPassword,
    '/orders/:id/status': updateOrderStatus,
    '/vendor/orders/:id/status': updateVendorOrderStatus,
    '/vendor/profile': updateVendorProfile,
  },
  DELETE: {
    '/admin/charges/:id': deleteAdminCharge,
  },
};

function matchRoute(pathname, method, routes) {
  const routeEntries = Object.entries(routes);
  for (const [pattern, handler] of routeEntries) {
    const regexPattern = new RegExp(`^${pattern.replace(/:[^/]+/g, '([^/]+)')}$`);
    const match = pathname.match(regexPattern);
    if (match) {
      return { handler, params: match.slice(1) };
    }
  }

  return null;
}

export async function initializeBackend() {
  try {
    await seedBackendData();
  } catch (error) {
    console.warn('Backend data seed warning (using fallback repository):', error.message);
  }
}

async function parseRequestBody(req) {
  if (req.method === 'GET' || req.method === 'DELETE') {
    return null;
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(body);
      }
    });
    req.on('error', reject);
  });
}

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();
  const corsHeaders = getCorsHeaders(req.headers);

  if (method === 'OPTIONS') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  try {
    const route = matchRoute(pathname, method, routeHandlers[method] || {});
    if (!route) {
      if (method === 'GET' && !pathname.startsWith('/api')) {
        return false;
      }
      res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Route not found.' }));
      return true;
    }

    const { handler, params } = route;

    const sessionCheck = await validateActiveUserSession(req.headers);
    if (!sessionCheck.valid) {
      res.writeHead(sessionCheck.statusCode || 403, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: sessionCheck.error, message: sessionCheck.message }));
      return true;
    }

    const body = await parseRequestBody(req);
    req.body = body;

    const context = {
      req,
      res,
      params,
      query: Object.fromEntries(url.searchParams.entries()),
    };

    const response = await handler(context);
    if (!response) {
      res.writeHead(204, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end();
      return true;
    }

    const statusCode = response.statusCode || 200;
    const responseBody = response.body;
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...response.headers,
    });
    res.end(JSON.stringify(responseBody));
    return true;
  } catch (error) {
    console.error('API Router Exception:', error);
    try {
      res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: error.message || 'Internal server error.' }));
    } catch {}
    return true;
  }
}
