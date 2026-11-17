-- =====================================================================
-- HomeHaat — MySQL 8 schema (target for DATA_PROVIDER=mysql)
-- Mirrors the JSON documents in /data. Money is stored in INR with 2 decimals,
-- prices are GST-inclusive. Run:  mysql -u root -p < db/mysql/schema.sql
-- =====================================================================
CREATE DATABASE IF NOT EXISTS homehaat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE homehaat;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------- Catalogue ----------
CREATE TABLE IF NOT EXISTS categories (
  id            VARCHAR(40)  PRIMARY KEY,
  parent_id     VARCHAR(40)  NULL,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(120) NOT NULL UNIQUE,
  icon          VARCHAR(16)  NULL,
  color         VARCHAR(16)  NULL,
  image_url     VARCHAR(500) NULL,
  sort_order    INT          NOT NULL DEFAULT 0,
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id                  VARCHAR(40)   PRIMARY KEY,
  sku                 VARCHAR(40)   NOT NULL UNIQUE,
  slug                VARCHAR(160)  NOT NULL UNIQUE,
  name                VARCHAR(200)  NOT NULL,
  brand               VARCHAR(80)   NOT NULL,
  category_id         VARCHAR(40)   NOT NULL,
  subcategory_id      VARCHAR(40)   NOT NULL,
  description         TEXT          NULL,
  highlights          JSON          NULL,
  mrp                 DECIMAL(10,2) NOT NULL,
  price               DECIMAL(10,2) NOT NULL,
  sale_price          DECIMAL(10,2) NULL,
  sale_start          DATETIME      NULL,
  sale_end            DATETIME      NULL,
  gst_rate            DECIMAL(4,2)  NOT NULL DEFAULT 18.00,
  hsn                 VARCHAR(10)   NULL,
  stock               INT           NOT NULL DEFAULT 0,
  low_stock_threshold INT           NOT NULL DEFAULT 5,
  rating              DECIMAL(2,1)  NOT NULL DEFAULT 0,
  rating_count        INT           NOT NULL DEFAULT 0,
  featured            TINYINT(1)    NOT NULL DEFAULT 0,
  weight_kg           DECIMAL(6,2)  NULL,
  active              TINYINT(1)    NOT NULL DEFAULT 1,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_cat FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_prod_sub FOREIGN KEY (subcategory_id) REFERENCES categories(id),
  CONSTRAINT chk_price CHECK (price > 0 AND price <= mrp),
  INDEX idx_prod_cat (category_id, subcategory_id),
  INDEX idx_prod_brand (brand),
  FULLTEXT INDEX ft_prod (name, brand, description)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_images (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id  VARCHAR(40)  NOT NULL,
  url         VARCHAR(500) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_img_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_tags (
  product_id VARCHAR(40) NOT NULL,
  tag        ENUM('new-arrival','on-offer','best-seller') NOT NULL,
  PRIMARY KEY (product_id, tag),
  CONSTRAINT fk_tag_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Customers ----------
CREATE TABLE IF NOT EXISTS users (
  id             VARCHAR(40)  PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(190) NOT NULL UNIQUE,
  phone          VARCHAR(15)  NULL,
  role           ENUM('user','admin') NOT NULL DEFAULT 'user',
  password_hash  VARCHAR(100) NOT NULL,
  status         ENUM('active','blocked','inactive') NOT NULL DEFAULT 'active',
  reset_token_hash CHAR(64)   NULL,
  reset_expires  DATETIME     NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS addresses (
  id          VARCHAR(40)  PRIMARY KEY,
  user_id     VARCHAR(40)  NOT NULL,
  label       VARCHAR(20)  NOT NULL DEFAULT 'Home',
  name        VARCHAR(120) NOT NULL,
  phone       CHAR(10)     NOT NULL,
  line1       VARCHAR(200) NOT NULL,
  line2       VARCHAR(200) NULL,
  landmark    VARCHAR(120) NULL,
  city        VARCHAR(80)  NOT NULL,
  state       VARCHAR(60)  NOT NULL,
  pincode     CHAR(6)      NOT NULL,
  lat         DECIMAL(9,6) NULL,
  lng         DECIMAL(9,6) NULL,
  maps_url    VARCHAR(300) NULL,
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_pin CHECK (pincode REGEXP '^[1-9][0-9]{5}$'),
  INDEX idx_addr_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carts (
  user_id     VARCHAR(40) PRIMARY KEY,
  coupon_code VARCHAR(20) NULL,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart_items (
  user_id    VARCHAR(40) NOT NULL,
  product_id VARCHAR(40) NOT NULL,
  qty        INT         NOT NULL,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_ci_cart FOREIGN KEY (user_id) REFERENCES carts(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT chk_qty CHECK (qty BETWEEN 1 AND 10)
) ENGINE=InnoDB;

-- ---------- Marketing ----------
CREATE TABLE IF NOT EXISTS coupons (
  id             VARCHAR(40)  PRIMARY KEY,
  code           VARCHAR(20)  NOT NULL UNIQUE,
  description    VARCHAR(255) NULL,
  type           ENUM('percent','flat') NOT NULL,
  value          DECIMAL(10,2) NOT NULL,
  min_order      DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_discount   DECIMAL(10,2) NULL,
  start_at       DATETIME     NULL,
  end_at         DATETIME     NULL,
  usage_limit    INT          NULL,
  per_user_limit INT          NULL,
  used_count     INT          NOT NULL DEFAULT 0,
  active         TINYINT(1)   NOT NULL DEFAULT 1,
  highlight      TINYINT(1)   NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coupon_categories (
  coupon_id   VARCHAR(40) NOT NULL,
  category_id VARCHAR(40) NOT NULL,
  PRIMARY KEY (coupon_id, category_id),
  CONSTRAINT fk_cc_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promotions (
  id             VARCHAR(40)  PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  scope          ENUM('category','product') NOT NULL,
  category_id    VARCHAR(40)  NULL,
  discount_type  ENUM('percent','flat') NOT NULL,
  value          DECIMAL(10,2) NOT NULL,
  badge          VARCHAR(30)  NULL,
  start_at       DATETIME     NOT NULL,
  end_at         DATETIME     NOT NULL,
  deal_of_day    TINYINT(1)   NOT NULL DEFAULT 0,
  active         TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_promo_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_promo_window (active, start_at, end_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promotion_products (
  promotion_id VARCHAR(40) NOT NULL,
  product_id   VARCHAR(40) NOT NULL,
  PRIMARY KEY (promotion_id, product_id),
  CONSTRAINT fk_pp_promo FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  CONSTRAINT fk_pp_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Orders & payments ----------
CREATE TABLE IF NOT EXISTS orders (
  id               VARCHAR(40)  PRIMARY KEY,
  order_no         VARCHAR(20)  NOT NULL UNIQUE,
  user_id          VARCHAR(40)  NOT NULL,
  customer_name    VARCHAR(120) NOT NULL,
  customer_email   VARCHAR(190) NOT NULL,
  customer_phone   VARCHAR(15)  NULL,
  shipping_address JSON         NOT NULL,   -- snapshot at order time
  billing_address  JSON         NOT NULL,
  gstin            VARCHAR(15)  NULL,
  delivery_method  ENUM('standard','express') NOT NULL,
  payment_method   ENUM('COD','ONLINE') NOT NULL,
  payment_status   ENUM('pending','awaiting','paid','failed','refunded','partially-refunded','cancelled','refund-due') NOT NULL,
  status           ENUM('Pending Payment','Placed','Confirmed','Packed','Shipped','Out for delivery','Delivered','Cancelled','Returned') NOT NULL,
  mrp_total        DECIMAL(10,2) NOT NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  discount         DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_code      VARCHAR(20)  NULL,
  gst_total        DECIMAL(10,2) NOT NULL,
  delivery_charge  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL,
  gateway_provider VARCHAR(20)  NULL,
  gateway_order_id VARCHAR(60)  NULL,
  courier          VARCHAR(80)  NULL,
  awb              VARCHAR(40)  NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_order_status (status), INDEX idx_order_created (created_at), INDEX idx_order_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id    VARCHAR(40)  NOT NULL,
  product_id  VARCHAR(40)  NULL,
  sku         VARCHAR(40)  NOT NULL,
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(160) NULL,
  image_url   VARCHAR(500) NULL,
  category    VARCHAR(120) NULL,
  hsn         VARCHAR(10)  NULL,
  mrp         DECIMAL(10,2) NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  qty         INT          NOT NULL,
  gst_rate    DECIMAL(4,2) NOT NULL,
  line_total  DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_status_history (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id   VARCHAR(40) NOT NULL,
  status     VARCHAR(30) NOT NULL,
  note       VARCHAR(300) NULL,
  changed_by VARCHAR(120) NULL,
  at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_notes (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id  VARCHAR(40)  NOT NULL,
  text      VARCHAR(500) NOT NULL,
  author    VARCHAR(120) NULL,
  internal  TINYINT(1)   NOT NULL DEFAULT 1,
  at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_on_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id                VARCHAR(40)  PRIMARY KEY,        -- razorpay_payment_id
  order_id          VARCHAR(40)  NOT NULL,
  gateway_order_id  VARCHAR(60)  NOT NULL,           -- razorpay_order_id
  provider          VARCHAR(20)  NOT NULL,
  method            ENUM('UPI','CARD','NETBANKING','WALLET') NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  currency          CHAR(3)      NOT NULL DEFAULT 'INR',
  status            ENUM('created','authorised','captured','failed','refunded') NOT NULL,
  vpa               VARCHAR(100) NULL,
  card_last4        CHAR(4)      NULL,
  card_network      VARCHAR(20)  NULL,
  failure_reason    VARCHAR(255) NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_pay_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_events (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  payment_id VARCHAR(40) NOT NULL,
  status     VARCHAR(30) NOT NULL,
  detail     VARCHAR(255) NULL,
  at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pe_pay FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refunds (
  id         VARCHAR(40)  PRIMARY KEY,               -- razorpay refund id
  payment_id VARCHAR(40)  NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  reason     VARCHAR(255) NULL,
  created_by VARCHAR(120) NULL,
  at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ref_pay FOREIGN KEY (payment_id) REFERENCES payments(id)
) ENGINE=InnoDB;

-- ---------- Reviews (ReviewsService MySQL adapter target) ----------
CREATE TABLE IF NOT EXISTS reviews (
  id          VARCHAR(40)  PRIMARY KEY,
  product_id  VARCHAR(40)  NOT NULL,
  user_id     VARCHAR(40)  NULL,
  name        VARCHAR(80)  NOT NULL,
  rating      TINYINT      NOT NULL,
  title       VARCHAR(80)  NULL,
  body        TEXT         NOT NULL,
  verified    TINYINT(1)   NOT NULL DEFAULT 0,
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reply_text  VARCHAR(500) NULL,
  reply_at    DATETIME     NULL,
  helpful     INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rev_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
  INDEX idx_rev_prod (product_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_notes (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id   VARCHAR(40)  NOT NULL,
  text      VARCHAR(300) NOT NULL,
  author    VARCHAR(120) NULL,
  at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- CMS, settings, enquiries, email outbox ----------
CREATE TABLE IF NOT EXISTS cms_banners (
  id         VARCHAR(40)  PRIMARY KEY,
  title      VARCHAR(160) NOT NULL,
  subtitle   VARCHAR(255) NULL,
  cta_text   VARCHAR(60)  NULL,
  cta_link   VARCHAR(300) NULL,
  image_url  VARCHAR(500) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  start_at   DATETIME     NULL,
  end_at     DATETIME     NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cms_blocks (
  block_key  VARCHAR(40)  PRIMARY KEY,
  type       VARCHAR(30)  NOT NULL,
  title      VARCHAR(120) NOT NULL,
  subtitle   VARCHAR(255) NULL,
  item_limit INT          NULL,
  cta_text   VARCHAR(60)  NULL,
  cta_link   VARCHAR(300) NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  active     TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cms_pages (
  slug       VARCHAR(80)  PRIMARY KEY,
  title      VARCHAR(160) NOT NULL,
  content    MEDIUMTEXT   NOT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- store identity, announcement, footer, contact — and store settings (delivery, cod, tax, email) — as JSON documents
CREATE TABLE IF NOT EXISTS site_config (
  config_key VARCHAR(40) PRIMARY KEY,   -- 'store' | 'announcement' | 'footer' | 'contact' | 'settings'
  value      JSON        NOT NULL,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contact_messages (
  id         VARCHAR(40)  PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(190) NOT NULL,
  phone      VARCHAR(15)  NULL,
  topic      VARCHAR(40)  NULL,
  order_no   VARCHAR(20)  NULL,
  message    TEXT         NOT NULL,
  status     ENUM('new','resolved') NOT NULL DEFAULT 'new',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_outbox (
  id         VARCHAR(40)  PRIMARY KEY,
  type       VARCHAR(40)  NOT NULL,
  to_email   VARCHAR(190) NOT NULL,
  subject    VARCHAR(255) NOT NULL,
  file_name  VARCHAR(255) NULL,
  order_no   VARCHAR(20)  NULL,
  status     ENUM('outbox','sent','failed') NOT NULL,
  error      VARCHAR(255) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_order (order_no)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
