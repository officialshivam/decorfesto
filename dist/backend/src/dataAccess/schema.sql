-- DecorFesto MySQL schema (Hostinger)
-- Column names are snake_case; the MySQL repository maps them to/from the
-- camelCase shapes used by the existing JSON repositories and API handlers.

-- 1. Customers table
CREATE TABLE IF NOT EXISTS customers (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL DEFAULT '',
  phone         VARCHAR(32)  NOT NULL DEFAULT '',
  addresses     TEXT         NULL,
  default_pincode VARCHAR(16) NULL,
  cognito_sub   VARCHAR(128) NULL,
  password      VARCHAR(255) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_email (email),
  INDEX idx_customers_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL DEFAULT '',
  email        VARCHAR(255) NOT NULL DEFAULT '',
  phone        VARCHAR(32)  NOT NULL DEFAULT '',
  specialties  TEXT         NULL,
  service_pincodes TEXT     NULL,
  status       VARCHAR(32)  NOT NULL DEFAULT 'active',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendors_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Service Areas table
CREATE TABLE IF NOT EXISTS service_areas (
  id             VARCHAR(32)  NOT NULL PRIMARY KEY,
  pincode        VARCHAR(16)  NOT NULL,
  city           VARCHAR(255) NOT NULL DEFAULT '',
  serviceable    TINYINT(1)   NOT NULL DEFAULT 1,
  active         TINYINT(1)   NOT NULL DEFAULT 1,
  lead_time_hours INT         NOT NULL DEFAULT 24,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_areas_pincode (pincode),
  INDEX idx_service_areas_serviceable (serviceable, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Service Area Vendors table
CREATE TABLE IF NOT EXISTS service_area_vendors (
  id         VARCHAR(128)  NOT NULL PRIMARY KEY,
  pincode    VARCHAR(16)   NOT NULL,
  vendor_id  VARCHAR(64)   NOT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_area_vendor (pincode, vendor_id),
  INDEX idx_service_area_vendors_pincode (pincode),
  INDEX idx_service_area_vendors_vendor (vendor_id),
  CONSTRAINT fk_sav_pincode FOREIGN KEY (pincode) REFERENCES service_areas (pincode) ON DELETE CASCADE,
  CONSTRAINT fk_sav_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Decorations table
CREATE TABLE IF NOT EXISTS decorations (
  id                   VARCHAR(128) NOT NULL PRIMARY KEY,
  decoration_id        VARCHAR(128) NULL DEFAULT NULL,
  name                 VARCHAR(255) NOT NULL,
  occasion             VARCHAR(128) NOT NULL DEFAULT '',
  category             VARCHAR(128) NOT NULL DEFAULT '',
  base_price           DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_price       DECIMAL(12,2) NOT NULL DEFAULT 0,
  rating               DECIMAL(3,1) NOT NULL DEFAULT 0,
  review_count         INT          NOT NULL DEFAULT 0,
  location             VARCHAR(255) NOT NULL DEFAULT '',
  short_description    TEXT         NULL,
  description          TEXT         NULL,
  highlights           TEXT         NULL,
  included_items       TEXT         NULL,
  customization_options TEXT        NULL,
  add_ons              TEXT         NULL,
  image_url            TEXT         NULL,
  image_assets         TEXT         NULL,
  gallery_urls         TEXT         NULL,
  images               TEXT         NULL,
  image                TEXT         NULL,
  excluded_items       TEXT         NULL,
  duration             VARCHAR(64)  NOT NULL DEFAULT '',
  setup_requirements   TEXT         NULL,
  featured             TINYINT(1)   NOT NULL DEFAULT 0,
  active               TINYINT(1)   NOT NULL DEFAULT 1,
  display_order        INT          NOT NULL DEFAULT 0,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_decorations_active (active),
  INDEX idx_decorations_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id                 VARCHAR(64)  NOT NULL PRIMARY KEY,
  customer_id        VARCHAR(64)  NULL DEFAULT NULL,
  customer_name      VARCHAR(255) NOT NULL,
  customer_email     VARCHAR(255) NOT NULL DEFAULT '',
  customer_phone     VARCHAR(32)  NOT NULL DEFAULT '',
  decoration_id      VARCHAR(64)  NULL DEFAULT NULL,
  decoration_name    VARCHAR(255) NOT NULL DEFAULT '',
  customization      TEXT         NULL,
  pincode            VARCHAR(16)  NOT NULL DEFAULT '',
  scheduled_date     VARCHAR(16)  NOT NULL DEFAULT '',
  scheduled_time     VARCHAR(64)  NOT NULL DEFAULT '',
  delivery_address   TEXT         NULL,
  subtotal           DECIMAL(12,2) NOT NULL DEFAULT 0,
  service_charge     DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total              DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status     VARCHAR(64)  NOT NULL DEFAULT 'Pending',
  booking_status     VARCHAR(64)  NOT NULL DEFAULT 'Created',
  admin_review_status VARCHAR(64) NULL DEFAULT NULL,
  vendor_id          VARCHAR(64)  NULL DEFAULT NULL,
  vendor_name        VARCHAR(255) NULL DEFAULT NULL,
  vendor_assigned_at DATETIME     NULL DEFAULT NULL,
  vendor_notification_sent_at DATETIME NULL DEFAULT NULL,
  date               VARCHAR(16)  NULL DEFAULT NULL,
  time               VARCHAR(64)  NULL DEFAULT NULL,
  address            TEXT         NULL,
  review_message     TEXT         NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_customer (customer_id),
  INDEX idx_orders_vendor (vendor_id),
  INDEX idx_orders_status (booking_status),
  INDEX idx_orders_pincode (pincode),
  INDEX idx_orders_created (created_at),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id              BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id        VARCHAR(64)  NOT NULL,
  product_id      VARCHAR(64)  NULL DEFAULT NULL,
  product_name    VARCHAR(255) NOT NULL DEFAULT '',
  image           TEXT         NULL,
  customization   TEXT         NULL,
  pincode         VARCHAR(16)  NOT NULL DEFAULT '',
  scheduled_date  VARCHAR(16)  NOT NULL DEFAULT '',
  scheduled_time  VARCHAR(64)  NOT NULL DEFAULT '',
  base_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_on_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity        INT          NOT NULL DEFAULT 1,
  item_key        VARCHAR(255) NULL DEFAULT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Availability Checks table
CREATE TABLE IF NOT EXISTS availability_checks (
  id           VARCHAR(64) NOT NULL PRIMARY KEY,
  pincode      VARCHAR(16) NOT NULL,
  available    TINYINT(1)  NOT NULL DEFAULT 0,
  vendor_count INT         NOT NULL DEFAULT 0,
  checked_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_checks_pincode (pincode),
  INDEX idx_checks_checked (checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
