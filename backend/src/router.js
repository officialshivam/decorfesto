import { listDecorations, getDecoration, createAdminDecoration, updateAdminDecoration, toggleAdminDecorationStatus, deleteAdminDecoration } from './handlers/decorations.js';
import { listCategories, createAdminCategory, updateAdminCategory, toggleAdminCategoryStatus, deleteAdminCategory } from './handlers/categories.js';
import { createCustomer, getCustomer } from './handlers/customers.js';
import { listVendors, getVendor, createVendor, updateVendor } from './handlers/vendors.js';
import { createServiceArea, getServiceArea, listServiceAreaVendors, listServiceAreas, deleteServiceArea } from './handlers/serviceAreas.js';
import { createOrder, getOrder, listOrders, listAdminOrders, getAdminOrderDetails, updateOrderStatus, regenerateOrderOtp } from './handlers/orders.js';
import { checkAvailability } from './handlers/availability.js';
import { getDashboard } from './handlers/dashboard.js';
import { seedBackendData } from './seedData.js';
import { adminLogin, adminLogout, getAdminMe, vendorLogin, validateActiveUserSession, customerSignup, customerLogin, customerLogout, getCustomerMe, updateCustomerProfile } from './auth.js';
import { getCorsHeaders } from './config.js';
import { listEnabledCharges, listAdminCharges, createAdminCharge, updateAdminCharge, deleteAdminCharge } from './handlers/charges.js';
import { listAdminUsers, createAdminUserRecord, toggleAdminUserStatus, resetAdminUserPassword } from './handlers/users.js';
import { createRepository } from './dataAccess/repository.js';
import { createRazorpayOrder, verifyRazorpayPayment, razorpayWebhook } from './handlers/payments.js';
import { getVendorOrders, getVendorOrderDetails, updateVendorOrderStatus, getVendorProfile, updateVendorProfile, changeVendorPassword, verifyStartOtp } from './handlers/vendorPortal.js';
import { migrateOtpEncryption } from './otp.js';
import { uploadAiSpaceImage, analyzeAiSpace, generateAiDecoration } from './handlers/aiAssistant.js';



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
    '/auth/customer-me': getCustomerMe,
    '/auth/admin-me': getAdminMe,
    '/admin/me': getAdminMe,
    '/admin/dashboard': getDashboard,
    '/admin/charges': listAdminCharges,
    '/admin/users': listAdminUsers,
    '/admin/orders': listAdminOrders,
    '/admin/orders/:id': getAdminOrderDetails,
    '/charges/enabled': listEnabledCharges,
    '/decorations': listDecorations,
    '/decorations/:id': getDecoration,
    '/categories': listCategories,
    '/customers/:id': getCustomer,
    '/vendors': listVendors,
    '/vendors/:id': getVendor,
    '/service-areas': listServiceAreas,
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
    '/auth/customer-signup': customerSignup,
    '/auth/customer-login': customerLogin,
    '/auth/customer-logout': customerLogout,
    '/auth/admin-login': adminLogin,
    '/auth/admin-logout': adminLogout,
    '/auth/vendor-login': vendorLogin,
    '/admin/charges': createAdminCharge,
    '/admin/users': createAdminUserRecord,
    '/admin/decorations': createAdminDecoration,
    '/admin/categories': createAdminCategory,
    '/customers': createCustomer,
    '/vendors': createVendor,
    '/service-areas': createServiceArea,
    '/availability/check': checkAvailability,
    '/orders': createOrder,
    '/payments/create-razorpay-order': createRazorpayOrder,
    '/payments/verify-razorpay-payment': verifyRazorpayPayment,
    '/payments/razorpay-webhook': razorpayWebhook,
    '/vendor/change-password': changeVendorPassword,
    '/vendor/orders/:id/verify-start-otp': verifyStartOtp,
    '/admin/orders/:id/regenerate-otp': regenerateOrderOtp,
    '/ai-assistant/upload': uploadAiSpaceImage,
    '/ai-assistant/analyze-space': analyzeAiSpace,
    '/ai-assistant/generate-decoration': generateAiDecoration,
  },
  PUT: {
    '/admin/charges/:id': updateAdminCharge,
    '/admin/decorations/:id': updateAdminDecoration,
    '/admin/categories/:id': updateAdminCategory,
  },
  PATCH: {
    '/auth/customer-profile': updateCustomerProfile,
    '/admin/charges/:id': updateAdminCharge,
    '/admin/users/:id/status': toggleAdminUserStatus,
    '/admin/users/:id/password': resetAdminUserPassword,
    '/admin/decorations/:id/status': toggleAdminDecorationStatus,
    '/admin/categories/:id/status': toggleAdminCategoryStatus,
    '/orders/:id/status': updateOrderStatus,
    '/vendors/:id': updateVendor,
    '/vendor/orders/:id/status': updateVendorOrderStatus,
    '/vendor/profile': updateVendorProfile,
  },
  DELETE: {
    '/admin/charges/:id': deleteAdminCharge,
    '/admin/decorations/:id': deleteAdminDecoration,
    '/admin/categories/:id': deleteAdminCategory,
    '/service-areas/:pincode': deleteServiceArea,
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

let isInitialized = false;

export async function initializeBackend() {
  if (isInitialized) return;
  isInitialized = true;

  try {
    const { getPool } = await import('./dataAccess/mysqlConnection.js');
    const { useMysql, tablePrefix } = await import('./config.js');
    if (useMysql) {
      const pool = getPool();
      const prefix = tablePrefix || 'decorfesto-dev';
      const ordersTable = `${prefix}-orders`;

      await pool.query(`
        CREATE TABLE IF NOT EXISTS charges (
          id          VARCHAR(64)  NOT NULL PRIMARY KEY,
          name        VARCHAR(255) NOT NULL,
          amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
          description TEXT         NULL,
          type        VARCHAR(64)  NOT NULL DEFAULT 'FIXED',
          is_enabled  TINYINT(1)   NOT NULL DEFAULT 1,
          created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_charges_enabled (is_enabled)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `).catch((err) => console.warn('Charges table init notice:', err.message));

      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id            VARCHAR(64)  NOT NULL PRIMARY KEY,
          name          VARCHAR(128) NOT NULL,
          display_order INT          NOT NULL DEFAULT 0,
          active        TINYINT(1)   NOT NULL DEFAULT 1,
          created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_categories_name (name),
          INDEX idx_categories_active (active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `).catch((err) => console.warn('Categories table init notice:', err.message));

      await pool.query(`ALTER TABLE \`${ordersTable}\` ADD COLUMN IF NOT EXISTS remarks TEXT NULL`).catch(() => {});
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS remarks TEXT NULL`).catch(() => {});
      await pool.query(`ALTER TABLE \`${ordersTable}\` ADD COLUMN IF NOT EXISTS landmark VARCHAR(255) NULL`).catch(() => {});
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS landmark VARCHAR(255) NULL`).catch(() => {});
      await pool.query(`ALTER TABLE decorations MODIFY COLUMN image_url LONGTEXT NULL, MODIFY COLUMN image_assets LONGTEXT NULL, MODIFY COLUMN gallery_urls LONGTEXT NULL, MODIFY COLUMN images LONGTEXT NULL, MODIFY COLUMN image LONGTEXT NULL`).catch(() => {});
    }
  } catch (e) {
    console.warn('DB Column Migration Notice:', e?.message || e);
  }

  try {
    await seedBackendData();
    await migrateOtpEncryption().catch(() => {});
  } catch (error) {
    console.warn('Backend data seed warning (using fallback repository):', error.message);
  }

}

async function parseRequestBody(req) {
  if (req.method === 'GET' || req.method === 'DELETE') {
    return null;
  }

  return new Promise((resolve, reject) => {
    let chunks = [];
    let totalBytes = 0;
    const MAX_PAYLOAD_BYTES = 15 * 1024 * 1024; // 15 MB limit

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_PAYLOAD_BYTES) {
        req.destroy();
        reject(new Error('Request payload size exceeds maximum limit.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(null);
        return;
      }

      const buffer = Buffer.concat(chunks);
      const str = buffer.toString('utf8');

      if (!str) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(str));
      } catch {
        resolve(str);
      }
    });
    req.on('error', reject);
  });
}

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;
  if (pathname.startsWith('/api/')) {
    pathname = pathname.slice(4);
  } else if (pathname === '/api') {
    pathname = '/';
  }
  const method = req.method.toUpperCase();
  const corsHeaders = getCorsHeaders(req.headers);

  if (method === 'OPTIONS') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  await initializeBackend().catch(() => {});

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
