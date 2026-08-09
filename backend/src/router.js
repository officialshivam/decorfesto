import { createRepository } from './dataAccess/repository.js';
import { listDecorations, getDecoration } from './handlers/decorations.js';
import { createCustomer, getCustomer } from './handlers/customers.js';
import { listVendors, getVendor, createVendor } from './handlers/vendors.js';
import { createServiceArea, getServiceArea, listServiceAreaVendors } from './handlers/serviceAreas.js';
import { createOrder, getOrder, listOrders, updateOrderStatus } from './handlers/orders.js';
import { checkAvailability } from './handlers/availability.js';
import { getDashboard } from './handlers/dashboard.js';
import { seedBackendData } from './seedData.js';

async function healthCheck() {
  const resourceNames = ['orders', 'customers', 'vendors', 'service-areas', 'service-area-vendors', 'decorations', 'availability-checks'];
  const resourceStatuses = {};

  let degraded = false;
  for (const resourceName of resourceNames) {
    const repository = createRepository(resourceName);
    try {
      const items = await repository.list();
      resourceStatuses[resourceName] = { ok: true, count: items.length };
    } catch (error) {
      degraded = true;
      resourceStatuses[resourceName] = { ok: false, error: error.message };
    }
  }

  return {
    statusCode: degraded ? 503 : 200,
    body: {
      status: degraded ? 'degraded' : 'ok',
      api: 'healthy',
      backend: degraded ? 'degraded' : 'healthy',
      repositories: resourceStatuses,
      uptimeSeconds: Math.floor(process.uptime()),
      checkedAt: new Date().toISOString(),
    },
  };
}

const routeHandlers = {
  GET: {
    '/health': healthCheck,
    '/admin/dashboard': getDashboard,
    '/decorations': listDecorations,
    '/decorations/:id': getDecoration,
    '/customers/:id': getCustomer,
    '/vendors': listVendors,
    '/vendors/:id': getVendor,
    '/service-areas/:pincode': getServiceArea,
    '/service-areas/:pincode/vendors': listServiceAreaVendors,
    '/orders': listOrders,
    '/orders/:id': getOrder,
  },
  POST: {
    '/customers': createCustomer,
    '/vendors': createVendor,
    '/service-areas': createServiceArea,
    '/availability/check': checkAvailability,
    '/orders': createOrder,
  },
  PATCH: {
    '/orders/:id/status': updateOrderStatus,
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
  await seedBackendData();
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

  if (method === 'OPTIONS') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-User-Role' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const route = matchRoute(pathname, method, routeHandlers[method] || {});
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Route not found.' }));
    return;
  }

  const { handler, params } = route;
  const body = await parseRequestBody(req);
  req.body = body;

  const context = {
    req,
    res,
    params,
    query: Object.fromEntries(url.searchParams.entries()),
  };

  try {
    const response = await handler(context);
    if (!response) {
      res.writeHead(204, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end();
      return;
    }

    const statusCode = response.statusCode || 200;
    const body = response.body;
    res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(body));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: error.message || 'Internal server error.' }));
  }
}
