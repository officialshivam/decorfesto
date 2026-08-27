import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './mysqlConnection.js';
import { dataDirectory, ensureDataDirectory, useMysql } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
 * Resource name -> MySQL table name. Hyphenated resource names map to
 * underscore table names so no backtick quoting is needed in queries.
 */
const MYSQL_TABLE_MAP = {
  'service-areas': 'service_areas',
  'service-area-vendors': 'service_area_vendors',
  'availability-checks': 'availability_checks',
};

/*
 * Column maps: camelCase (JSON / API shape) -> snake_case (MySQL column).
 * These MUST stay in sync with backend/src/dataAccess/dataMigration.js
 * so migrated rows round-trip through the repository unchanged.
 */
export const columnMaps = {
  customers: {
    id: 'id',
    cognitoSub: 'cognito_sub',
    fullName: 'full_name',
    email: 'email',
    phone: 'phone',
    addresses: 'addresses',
    defaultPincode: 'default_pincode',
    password: 'password',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  orders: {
    id: 'id',
    orderId: 'order_id',
    customerId: 'customer_id',
    customerName: 'customer_name',
    customerEmail: 'customer_email',
    customerPhone: 'customer_phone',
    decorationId: 'decoration_id',
    decorationName: 'decoration_name',
    customization: 'customization',
    pincode: 'pincode',
    scheduledDate: 'scheduled_date',
    scheduledTime: 'scheduled_time',
    deliveryAddress: 'delivery_address',
    subtotal: 'subtotal',
    serviceCharge: 'service_charge',
    totalAmount: 'total_amount',
    total: 'total',
    paymentStatus: 'payment_status',
    bookingStatus: 'booking_status',
    adminReviewStatus: 'admin_review_status',
    vendorId: 'vendor_id',
    vendorName: 'vendor_name',
    vendorAssignedAt: 'vendor_assigned_at',
    vendorNotificationSentAt: 'vendor_notification_sent_at',
    vendorAcceptedAt: 'vendor_accepted_at',
    vendorStartedAt: 'vendor_started_at',
    vendorReadyAt: 'vendor_ready_at',
    completedAt: 'completed_at',
    completedByVendorId: 'completed_by_vendor_id',
    completedByVendorName: 'completed_by_vendor_name',
    vendorDeclineReason: 'vendor_decline_reason',
    statusHistory: 'status_history',
    date: 'date',
    time: 'time',
    address: 'address',
    items: '__ignore__',
    reviewMessage: 'review_message',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  vendors: {
    id: 'id',
    name: 'name',
    contactName: 'contact_name',
    email: 'email',
    phone: 'phone',
    specialties: 'specialties',
    servicePincodes: 'service_pincodes',
    passwordHash: 'password_hash',
    password: 'password_hash',
    role: 'role',
    accountStatus: 'account_status',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  'service-areas': {
    id: 'id',
    pincode: 'pincode',
    city: 'city',
    serviceable: 'serviceable',
    active: 'active',
    leadTimeHours: 'lead_time_hours',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  'service-area-vendors': {
    id: 'id',
    pincode: 'pincode',
    vendorId: 'vendor_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  decorations: {
    id: 'id',
    decorationId: 'decoration_id',
    name: 'name',
    occasion: 'occasion',
    category: 'category',
    basePrice: 'base_price',
    originalPrice: 'original_price',
    rating: 'rating',
    reviewCount: 'review_count',
    location: 'location',
    shortDescription: 'short_description',
    description: 'description',
    highlights: 'highlights',
    includedItems: 'included_items',
    customizationOptions: 'customization_options',
    addOns: 'add_ons',
    imageUrl: 'image_url',
    imageAssets: 'image_assets',
    galleryUrls: 'gallery_urls',
    images: 'images',
    image: 'image',
    excludedItems: 'excluded_items',
    duration: 'duration',
    setupRequirements: 'setup_requirements',
    featured: 'featured',
    active: 'active',
    displayOrder: 'display_order',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  customizations: {
    id: 'id',
    type: 'type',
    name: 'name',
    category: 'category',
    description: 'description',
    adminNotes: 'admin_notes',
    price: 'price',
    active: 'active',
    displayOrder: 'display_order',
    image: 'image',
    colors: 'colors',
    assignedDesigns: 'assigned_designs',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  'availability-checks': {
    id: 'id',
    pincode: 'pincode',
    available: 'available',
    vendorCount: 'vendor_count',
    checkedAt: 'checked_at',
  },
};

const JSON_COLUMNS = new Set([
  'addresses',
  'customization',
  'items',
  'specialties',
  'service_pincodes',
  'highlights',
  'included_items',
  'customization_options',
  'add_ons',
  'image_assets',
  'gallery_urls',
  'images',
  'excluded_items',
  'delivery_address',
  'address',
  'review_message',
  'short_description',
  'description',
  'setup_requirements',
  'colors',
  'assigned_designs',
]);

const DATE_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'vendor_assigned_at',
  'vendor_notification_sent_at',
  'checked_at',
]);

const JSON_FIELD_FALLBACKS = new Map([
  ['addresses', '[]'],
  ['items', '[]'],
  ['specialties', '[]'],
  ['service_pincodes', '[]'],
  ['highlights', '[]'],
  ['included_items', '[]'],
  ['customization_options', '[]'],
  ['add_ons', '[]'],
  ['image_assets', '[]'],
  ['gallery_urls', '[]'],
  ['images', '[]'],
  ['excluded_items', '[]'],
  ['colors', '[]'],
  ['assigned_designs', '[]'],
]);

function deserializeJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

const BOOLEAN_COLUMNS = new Set(['serviceable', 'active', 'featured', 'available']);

const DECIMAL_COLUMNS = new Set([
  'base_price',
  'original_price',
  'rating',
  'subtotal',
  'service_charge',
  'total_amount',
  'total',
  'add_on_price',
  'total_price',
  'price',
]);

function mapForWrite(values, columnMap) {
  const record = {};
  for (const [camelKey, column] of Object.entries(columnMap)) {
    if (column === '__ignore__' || !(camelKey in values)) continue;
    let value = values[camelKey];

    if (BOOLEAN_COLUMNS.has(column)) {
      if (value === null || value === undefined) {
        record[column] = null;
      } else {
        record[column] = value ? 1 : 0;
      }
      continue;
    }

    if (JSON_COLUMNS.has(column)) {
      if (value === undefined || value === null) {
        const fallback = JSON_FIELD_FALLBACKS.get(column);
        if (fallback !== undefined) {
          record[column] = fallback;
        }
        continue;
      }
      if (column === 'items') {
        // order_items are managed separately; skip on the orders row.
        continue;
      }
      record[column] = JSON.stringify(value);
      continue;
    }

    if (value instanceof Date) {
      value = value.toISOString();
    }
    record[column] = value;
  }
  return record;
}

function mapForRead(row, columnMap) {
  const record = {};
  for (const [camelKey, column] of Object.entries(columnMap)) {
    if (column === '__ignore__' || !(column in row)) continue;

    if (BOOLEAN_COLUMNS.has(column)) {
      record[camelKey] = Boolean(row[column]);
      continue;
    }

    if (DECIMAL_COLUMNS.has(column) && row[column] !== null) {
      record[camelKey] = Number(row[column]);
      continue;
    }

    if (JSON_COLUMNS.has(column)) {
      record[camelKey] = deserializeJson(row[column]);
      continue;
    }
    if (DATE_COLUMNS.has(column) && row[column] instanceof Date) {
      record[camelKey] = row[column].toISOString();
      continue;
    }
    record[camelKey] = row[column];
  }
  return record;
}

export class MySqlRepository {
  constructor(table, connection = null) {
    this.resourceName = table;
    this.table = MYSQL_TABLE_MAP[table] || table;
    this.columnMap = columnMaps[table] || columnMaps[this.table];
    this.connection = connection;
    if (!this.columnMap) {
      throw new Error(`MySQL repository: no column map for table '${table}'.`);
    }
  }

  async query(sql, params) {
    const connection = await getPool().getConnection();
    try {
      const [rows] = await connection.execute(sql, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  async list() {
    const rows = await this.query(`SELECT * FROM ${this.table}`);
    return rows.map((row) => mapForRead(row, this.columnMap));
  }

  async getById(id) {
    const rows = await this.query(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
    if (rows.length === 0) return null;
    return mapForRead(rows[0], this.columnMap);
  }

  async create(item) {
    const record = mapForWrite(item, this.columnMap);
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((column) => record[column]);
    const result = await this.query(`INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders})`, values);

    const lookupId = item.id || result.insertId;
    if (lookupId) {
      const persisted = await this.getById(lookupId);
      if (persisted) return persisted;
    }
    return item;
  }

  async update(id, updates) {
    const record = mapForWrite(updates, this.columnMap);
    const columns = Object.keys(record);
    if (columns.length === 0) return null;
    const setClause = columns.map((column) => `${column} = ?`).join(', ');
    const values = [...columns.map((column) => record[column]), id];
    await this.query(`UPDATE ${this.table} SET ${setClause} WHERE id = ?`, values);
    return this.getById(id);
  }

  async delete(id) {
    const result = await this.query(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

  async queryByField(field, value) {
    const column = this.columnMap[field];
    if (!column || column === '__ignore__') {
      return [];
    }
    const rows = await this.query(`SELECT * FROM ${this.table} WHERE ${column} = ?`, [value]);
    return rows.map((row) => mapForRead(row, this.columnMap));
  }

  async scan(predicate) {
    const rows = await this.list();
    return predicate ? rows.filter(predicate) : rows;
  }

  /** Seed helpers used by backend/src/seedData.js (multi-row insert / delete-all). */
  async insertMany(items) {
    if (items.length === 0) return;
    const columnMap = this.columnMap;
    const records = items.map((item) => mapForWrite(item, columnMap));
    const columns = Object.keys(records[0]);
    const placeholders = records.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = records.flatMap((record) => columns.map((column) => record[column]));
    await this.query(`INSERT INTO ${this.table} (${columns.join(', ')}) VALUES ${placeholders}`, values);
  }

  async deleteAll(options = {}) {
    if (options?.confirm !== true) {
      throw new Error(`deleteAll() requires explicit parameter { confirm: true } to prevent accidental data deletion.`);
    }
    await this.query(`DELETE FROM ${this.table}`);
  }

  async count() {
    const rows = await this.query(`SELECT COUNT(*) AS count FROM ${this.table}`);
    return Number(rows[0]?.count || 0);
  }

  async ensureTable(sql) {
    await this.query(sql);
  }

  static async withTransaction(callback) {
    const connection = await getPool().getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback((table) => new MySqlRepository(table, connection), connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async withTransaction(callback) {
    if (this.connection) {
      return callback(this);
    }
    return MySqlRepository.withTransaction((getRepo) => callback(getRepo(this.resourceName)));
  }
}

// ---------------------------------------------------------------------------
// JSON fallback repository with atomic writes, per-file lock, and corruption safety.
// ---------------------------------------------------------------------------
const fileLocks = new Map();

function getFileLock(filePath) {
  if (!fileLocks.has(filePath)) {
    fileLocks.set(filePath, Promise.resolve());
  }
  return fileLocks.get(filePath);
}

async function withFileLock(filePath, operation) {
  const currentLock = getFileLock(filePath);
  let releaseLock;
  const nextLock = new Promise((resolve) => {
    releaseLock = resolve;
  });
  fileLocks.set(filePath, currentLock.then(() => nextLock));

  await currentLock;
  try {
    return await operation();
  } finally {
    releaseLock();
  }
}

export class LocalJsonRepository {
  constructor(table) {
    this.table = table;
    this.filePath = path.join(dataDirectory, `${table}.json`);
  }

  async initializeInternal() {
    await ensureDataDirectory();
    try {
      await fs.access(this.filePath);
    } catch {
      const tmpPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
      await fs.writeFile(tmpPath, '[]', 'utf8');
      await fs.rename(tmpPath, this.filePath);
    }
  }

  async initialize() {
    return withFileLock(this.filePath, () => this.initializeInternal());
  }

  async readAllInternal() {
    await this.initializeInternal();
    let raw = '';
    try {
      raw = await fs.readFile(this.filePath, 'utf8');
    } catch (readErr) {
      if (readErr.code === 'ENOENT') return [];
      throw readErr;
    }

    if (!raw || !raw.trim()) {
      return [];
    }

    try {
      return JSON.parse(raw);
    } catch (err) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.filePath}.corrupted.${timestamp}`;
      console.error(`CRITICAL: Malformed JSON store detected at ${this.filePath}. Preserving original file and creating backup at ${backupPath}. Parse error:`, err.message);

      try {
        await fs.copyFile(this.filePath, backupPath);
      } catch (copyErr) {
        console.error(`Failed to create corrupted backup file at ${backupPath}:`, copyErr.message);
      }

      // DO NOT overwrite this.filePath with '[]'! Preserve original file on disk.
      return [];
    }
  }

  async readAll() {
    return withFileLock(this.filePath, () => this.readAllInternal());
  }

  async writeAllInternal(items) {
    await this.initializeInternal();
    const tmpPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const content = JSON.stringify(items, null, 2);

    const fileHandle = await fs.open(tmpPath, 'w');
    try {
      await fileHandle.writeFile(content, 'utf8');
      if (typeof fileHandle.sync === 'function') {
        await fileHandle.sync();
      }
    } finally {
      await fileHandle.close();
    }

    await fs.rename(tmpPath, this.filePath);
  }

  async writeAll(items) {
    return withFileLock(this.filePath, () => this.writeAllInternal(items));
  }

  async getById(id) {
    const items = await this.readAll();
    return items.find((item) => item.id === id) || null;
  }

  async list() {
    return this.readAll();
  }

  async create(item) {
    return withFileLock(this.filePath, async () => {
      const items = await this.readAllInternal();
      items.push(item);
      await this.writeAllInternal(items);
      return item;
    });
  }

  async update(id, updates) {
    return withFileLock(this.filePath, async () => {
      const items = await this.readAllInternal();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) {
        return null;
      }

      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      await this.writeAllInternal(items);
      return items[index];
    });
  }

  async delete(id) {
    return withFileLock(this.filePath, async () => {
      const items = await this.readAllInternal();
      const filtered = items.filter((item) => item.id !== id);
      await this.writeAllInternal(filtered);
      return filtered.length !== items.length;
    });
  }

  async queryByField(field, value) {
    const items = await this.readAll();
    return items.filter((item) => item[field] === value);
  }

  async scan(predicate) {
    const items = await this.readAll();
    return predicate ? items.filter(predicate) : items;
  }

  async deleteAll(options = {}) {
    if (options?.confirm !== true) {
      throw new Error(`deleteAll() requires explicit parameter { confirm: true } to prevent accidental data deletion.`);
    }
    await this.writeAll([]);
  }

  static async withTransaction(callback) {
    return callback((table) => new LocalJsonRepository(table));
  }

  async withTransaction(callback) {
    return callback(this);
  }
}

export function createRepository(resourceName) {
  if (useMysql) {
    return new MySqlRepository(resourceName);
  }
  return new LocalJsonRepository(resourceName);
}

export function withTransaction(callback) {
  if (useMysql) {
    return MySqlRepository.withTransaction(callback);
  }
  return LocalJsonRepository.withTransaction(callback);
}
