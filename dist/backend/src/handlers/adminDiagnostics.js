/*
 * TEMPORARY READ-ONLY PRODUCTION DIAGNOSTIC ENDPOINT
 * 
 * Target: GET /admin/diagnostics/customer-duplicates
 * Purpose: Inspect duplicate customers and associated orders in production MySQL database.
 * Safety: Strictly SELECT queries ONLY. No INSERT, UPDATE, DELETE, ALTER, DROP, or TRUNCATE.
 * Auth: Admin-authenticated session required (HTTP 403 if unauthorized).
 * Data Privacy: Excludes passwords, hashes, salts, auth secrets, and session tokens.
 */

import { getUserRole } from '../auth.js';
import { useMysql } from '../config.js';
import { createRepository } from '../dataAccess/repository.js';
import { getPool, pingMySql } from '../dataAccess/mysqlConnection.js';

export async function getCustomerDuplicatesDiagnostic({ req }) {
  // Enforce Admin Authentication (Customer/Vendor accounts return 403)
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin authentication required.' },
    };
  }

  // Enforce MySQL check: When DECORFESTO_USE_MYSQL=true, MySQL MUST connect.
  // If unavailable, return clear diagnostic error rather than silently reporting local fallback data.
  if (useMysql) {
    try {
      const pingRes = await pingMySql();
      if (!pingRes || !pingRes.ok) {
        return {
          statusCode: 500,
          body: {
            error: 'MYSQL_CONNECTION_FAILED',
            message: 'Unable to connect to production MySQL database. Local JSON fallback suppressed.',
          },
        };
      }
    } catch (err) {
      return {
        statusCode: 500,
        body: {
          error: 'MYSQL_CONNECTION_FAILED',
          message: `Production MySQL ping error: ${err.message}`,
        },
      };
    }
  }

  let allCustomers = [];
  let allOrders = [];

  if (useMysql) {
    const pool = getPool();
    // SELECT ONLY data-minimized customer columns (id, full_name, email, phone, created_at)
    const [custRows] = await pool.query(
      'SELECT id, full_name, email, phone, created_at FROM customers ORDER BY created_at ASC'
    );
    allCustomers = (custRows || []).map((row) => ({
      id: String(row.id),
      fullName: String(row.full_name || 'Customer').trim(),
      name: String(row.full_name || 'Customer').trim(),
      email: String(row.email || '').trim().toLowerCase(),
      phone: String(row.phone || '').trim(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    }));

    const [orderRows] = await pool.query(
      'SELECT id, order_id, customer_id, booking_status, payment_status, total_amount, total, created_at FROM orders'
    );
    allOrders = (orderRows || []).map((row) => ({
      id: String(row.id || row.order_id),
      customerId: String(row.customer_id || '').trim(),
      status: String(row.booking_status || row.payment_status || 'Order Received'),
      total: Number(row.total_amount || row.total || 0),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    }));
  } else {
    const customerRepo = createRepository('customers');
    const orderRepo = createRepository('orders');
    allCustomers = await customerRepo.list();
    allOrders = await orderRepo.list();
  }

  // Group by normalized 10-digit mobile number
  const phoneMap = new Map();
  // Group by normalized lowercase non-empty email
  const emailMap = new Map();

  for (const c of allCustomers) {
    const rawPhone = String(c.phone || c.mobile || '').replace(/\D/g, '').slice(-10);
    if (rawPhone.length === 10) {
      if (!phoneMap.has(rawPhone)) phoneMap.set(rawPhone, []);
      phoneMap.get(rawPhone).push(c);
    }

    const rawEmail = String(c.email || '').trim().toLowerCase();
    if (rawEmail) {
      if (!emailMap.has(rawEmail)) emailMap.set(rawEmail, []);
      emailMap.get(rawEmail).push(c);
    }
  }

  // Filter groups where count > 1
  const duplicatePhones = [];
  const duplicateCustomerIds = new Set();

  for (const [normalizedPhone, customers] of phoneMap.entries()) {
    if (customers.length > 1) {
      duplicatePhones.push({
        normalizedPhone: `+91${normalizedPhone}`,
        count: customers.length,
        customers: customers.map((c) => {
          duplicateCustomerIds.add(String(c.id));
          return {
            id: String(c.id),
            name: String(c.fullName || c.name || 'Customer').trim(),
            phone: String(c.phone || c.mobile || ''),
            email: String(c.email || '').trim().toLowerCase(),
            createdAt: c.createdAt || null,
          };
        }),
      });
    }
  }

  const duplicateEmails = [];
  for (const [normalizedEmail, customers] of emailMap.entries()) {
    if (customers.length > 1) {
      duplicateEmails.push({
        normalizedEmail,
        count: customers.length,
        customers: customers.map((c) => {
          duplicateCustomerIds.add(String(c.id));
          return {
            id: String(c.id),
            name: String(c.fullName || c.name || 'Customer').trim(),
            phone: String(c.phone || c.mobile || ''),
            email: String(c.email || '').trim().toLowerCase(),
            createdAt: c.createdAt || null,
          };
        }),
      });
    }
  }

  // Query associated orders strictly for duplicate customer IDs
  const duplicateCustomerOrders = [];
  for (const custId of duplicateCustomerIds) {
    const custOrders = allOrders.filter((o) => String(o.customerId || '').trim() === custId);
    if (custOrders.length > 0) {
      duplicateCustomerOrders.push({
        customerId: custId,
        orderCount: custOrders.length,
        orders: custOrders.map((o) => ({
          id: String(o.id),
          orderDate: o.createdAt || null,
          status: o.status || 'Order Received',
          total: Number(o.total || 0),
        })),
      });
    }
  }

  return {
    statusCode: 200,
    body: {
      databaseBackend: useMysql ? 'mysql' : 'local-json',
      mysqlConnected: useMysql ? true : false,
      totalCustomers: allCustomers.length,
      duplicatePhoneGroupCount: duplicatePhones.length,
      duplicateEmailGroupCount: duplicateEmails.length,
      duplicatePhones,
      duplicateEmails,
      duplicateCustomerOrders,
    },
  };
}
