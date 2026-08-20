-- DecorFesto Production Database Schema
-- Canonical relational schema for MySQL / MariaDB / PostgreSQL compatible engines

-- 1. Users / Customers Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(32) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  saved_address TEXT NULL,
  default_pincode VARCHAR(16) NULL,
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_phone (phone),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Products / Decorations Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  product_id VARCHAR(64) NULL,
  name VARCHAR(255) NOT NULL,
  occasion VARCHAR(128) NOT NULL DEFAULT 'Celebration',
  category VARCHAR(128) NOT NULL DEFAULT 'Theme',
  description TEXT NULL,
  base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount VARCHAR(64) NULL,
  images TEXT NULL,
  image_url TEXT NULL,
  rating DECIMAL(3,1) NOT NULL DEFAULT 4.9,
  review_count INT NOT NULL DEFAULT 120,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_status (status),
  INDEX idx_products_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Product Customization Options Table
CREATE TABLE IF NOT EXISTS customizations (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  group_name VARCHAR(128) NOT NULL,
  option_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customizations_product (product_id),
  CONSTRAINT fk_customizations_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Product Add-ons Table
CREATE TABLE IF NOT EXISTS addons (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  product_id VARCHAR(64) NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(128) NOT NULL DEFAULT 'Add-on',
  image_url TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_addons_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Service Areas Table
CREATE TABLE IF NOT EXISTS service_areas (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  pincode VARCHAR(16) NOT NULL UNIQUE,
  city VARCHAR(255) NOT NULL DEFAULT 'Delhi NCR',
  state VARCHAR(255) NOT NULL DEFAULT 'Delhi',
  is_serviceable TINYINT(1) NOT NULL DEFAULT 1,
  delivery_charge DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service_areas_pincode (pincode),
  INDEX idx_service_areas_serviceable (is_serviceable)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Charges & Fees Table
CREATE TABLE IF NOT EXISTS charges (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  type VARCHAR(32) NOT NULL DEFAULT 'FIXED',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_charges_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL UNIQUE,
  customer_id VARCHAR(64) NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL DEFAULT '',
  customer_mobile VARCHAR(32) NOT NULL DEFAULT '',
  product_id VARCHAR(64) NULL,
  decoration_name VARCHAR(255) NOT NULL DEFAULT '',
  pincode VARCHAR(16) NOT NULL DEFAULT '',
  address TEXT NULL,
  city VARCHAR(255) NOT NULL DEFAULT 'Delhi NCR',
  state VARCHAR(255) NOT NULL DEFAULT 'Delhi',
  event_date VARCHAR(16) NOT NULL DEFAULT '',
  time_slot VARCHAR(64) NOT NULL DEFAULT '',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  service_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(64) NOT NULL DEFAULT 'Paid via UPI / Mock',
  booking_status VARCHAR(64) NOT NULL DEFAULT 'Order Received',
  vendor_id VARCHAR(64) NULL,
  vendor_name VARCHAR(255) NULL,
  remarks TEXT NULL,
  review_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_customer (customer_id),
  INDEX idx_orders_status (booking_status),
  INDEX idx_orders_pincode (pincode),
  INDEX idx_orders_created (created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Historical Order Items Snapshot Table
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NULL,
  snapshot_product_name VARCHAR(255) NOT NULL,
  snapshot_base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  snapshot_item_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order_rel FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Historical Order Customizations Snapshot Table
CREATE TABLE IF NOT EXISTS order_customizations (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_item_id BIGINT NOT NULL,
  snapshot_group_name VARCHAR(128) NOT NULL,
  snapshot_option_name VARCHAR(255) NOT NULL,
  snapshot_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX idx_order_cust_item (order_item_id),
  CONSTRAINT fk_order_cust_item_rel FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Historical Order Add-ons Snapshot Table
CREATE TABLE IF NOT EXISTS order_addons (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_item_id BIGINT NOT NULL,
  snapshot_addon_name VARCHAR(255) NOT NULL,
  snapshot_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX idx_order_addons_item (order_item_id),
  CONSTRAINT fk_order_addons_item_rel FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Historical Order Charges Snapshot Table
CREATE TABLE IF NOT EXISTS order_charges (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  snapshot_charge_name VARCHAR(255) NOT NULL,
  snapshot_charge_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX idx_order_charges_order (order_id),
  CONSTRAINT fk_order_charges_order_rel FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
