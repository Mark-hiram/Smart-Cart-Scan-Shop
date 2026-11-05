-- ============================================================================
-- SMARTCART — SUPERMARKET SCAN & SHOP SYSTEM
-- Database Schema & Initial Data for MySQL 8+ / MariaDB (XAMPP Compatible)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `smartcart` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smartcart`;

-- ----------------------------------------------------------------------------
-- Table: supermarkets
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `shopping_items`;
DROP TABLE IF EXISTS `shopping_sessions`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `supermarket_users`;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `supermarkets`;

CREATE TABLE `supermarkets` (
  `id` VARCHAR(64) NOT NULL,
  `supermarket_code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `branch` VARCHAR(100) DEFAULT NULL,
  `location` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'KSh',
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `low_stock_threshold` INT NOT NULL DEFAULT 15,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_supermarket_code` (`supermarket_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `role` ENUM('CUSTOMER', 'SUPERMARKET_ADMIN', 'SYSTEM_ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  `supermarket_id` VARCHAR(64) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_email` (`email`),
  KEY `idx_user_supermarket` (`supermarket_id`),
  CONSTRAINT `fk_user_supermarket` FOREIGN KEY (`supermarket_id`) REFERENCES `supermarkets` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: categories
-- ----------------------------------------------------------------------------
CREATE TABLE `categories` (
  `id` VARCHAR(64) NOT NULL,
  `supermarket_id` VARCHAR(64) DEFAULT NULL,
  `name` VARCHAR(80) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cat_supermarket` (`supermarket_id`),
  CONSTRAINT `fk_category_supermarket` FOREIGN KEY (`supermarket_id`) REFERENCES `supermarkets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: products
-- IMPORTANT: Barcode is UNIQUE per supermarket: UNIQUE(supermarket_id, barcode)
-- ----------------------------------------------------------------------------
CREATE TABLE `products` (
  `id` VARCHAR(64) NOT NULL,
  `supermarket_id` VARCHAR(64) NOT NULL,
  `barcode` VARCHAR(64) NOT NULL,
  `product_name` VARCHAR(150) NOT NULL,
  `brand` VARCHAR(80) NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `unit` VARCHAR(40) NOT NULL,
  `selling_price` DECIMAL(10, 2) NOT NULL,
  `discount_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `image` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_supermarket_barcode` (`supermarket_id`, `barcode`),
  KEY `idx_product_name` (`product_name`),
  KEY `idx_category` (`category`),
  CONSTRAINT `fk_product_supermarket` FOREIGN KEY (`supermarket_id`) REFERENCES `supermarkets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: shopping_sessions
-- ----------------------------------------------------------------------------
CREATE TABLE `shopping_sessions` (
  `id` VARCHAR(64) NOT NULL,
  `customer_id` VARCHAR(64) NOT NULL,
  `supermarket_id` VARCHAR(64) NOT NULL,
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` DATETIME DEFAULT NULL,
  `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `estimated_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `budget` DECIMAL(10, 2) DEFAULT NULL,
  `receipt_code` VARCHAR(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_session_customer` (`customer_id`),
  KEY `idx_session_supermarket` (`supermarket_id`),
  CONSTRAINT `fk_session_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_session_supermarket` FOREIGN KEY (`supermarket_id`) REFERENCES `supermarkets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: shopping_items
-- Stores price and product name snapshots so receipts stay accurate forever
-- ----------------------------------------------------------------------------
CREATE TABLE `shopping_items` (
  `id` VARCHAR(64) NOT NULL,
  `session_id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `barcode` VARCHAR(64) NOT NULL,
  `product_name_snapshot` VARCHAR(150) NOT NULL,
  `brand_snapshot` VARCHAR(80) NOT NULL,
  `unit_snapshot` VARCHAR(40) NOT NULL,
  `unit_price_snapshot` DECIMAL(10, 2) NOT NULL,
  `discount_price_snapshot` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `effective_price` DECIMAL(10, 2) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `image_snapshot` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item_session` (`session_id`),
  KEY `idx_item_product` (`product_id`),
  CONSTRAINT `fk_item_session` FOREIGN KEY (`session_id`) REFERENCES `shopping_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: activity_logs
-- ----------------------------------------------------------------------------
CREATE TABLE `activity_logs` (
  `id` VARCHAR(64) NOT NULL,
  `supermarket_id` VARCHAR(64) DEFAULT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `action` VARCHAR(80) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_supermarket` (`supermarket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- 1. Insert Demo Supermarkets
INSERT INTO `supermarkets` (`id`, `supermarket_code`, `name`, `branch`, `location`, `phone`, `email`, `currency`, `status`, `low_stock_threshold`) VALUES
('sm_1', 'SM001', 'SmartMart Nyeri', 'CBD Main Branch', 'Kimathi Way, Nyeri Town, Kenya', '+254 712 345 678', 'admin@smartmartnyeri.co.ke', 'KSh', 'ACTIVE', 15),
('sm_2', 'QS002', 'QuickShop Westlands', 'Westlands Hub', 'Waiyaki Way, Nairobi, Kenya', '+254 722 987 654', 'admin@quickshop.co.ke', 'KSh', 'ACTIVE', 20);

-- 2. Insert Standard Categories
INSERT INTO `categories` (`id`, `supermarket_id`, `name`) VALUES
('cat_1', NULL, 'Bakery'),
('cat_2', NULL, 'Dairy'),
('cat_3', NULL, 'Food & Groceries'),
('cat_4', NULL, 'Beverages'),
('cat_5', NULL, 'Personal Care'),
('cat_6', NULL, 'Cleaning Products'),
('cat_7', NULL, 'Fresh Produce'),
('cat_8', NULL, 'Household');

-- 3. Insert Initial Users
-- Passwords are hashed with standard bcrypt (e.g. password_hash('pass123', PASSWORD_BCRYPT))
INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `role`, `supermarket_id`, `phone`) VALUES
('usr_cust_1', 'customer@smartcart.co.ke', '$2y$10$eO0V4hS4iN6wD19f66j2nOhpZ0V4hS4iN6wD19f66j2nOhpZ0V4hS', 'Jane Wanjiku', 'CUSTOMER', NULL, '+254 712 345 678'),
('usr_adm_1', 'admin@smartmart.co.ke', '$2y$10$eO0V4hS4iN6wD19f66j2nOhpZ0V4hS4iN6wD19f66j2nOhpZ0V4hS', 'Nyeri Store Manager', 'SUPERMARKET_ADMIN', 'sm_1', '+254 722 111 222'),
('usr_adm_2', 'admin@quickshop.co.ke', '$2y$10$eO0V4hS4iN6wD19f66j2nOhpZ0V4hS4iN6wD19f66j2nOhpZ0V4hS', 'Westlands Hub Manager', 'SUPERMARKET_ADMIN', 'sm_2', '+254 733 444 555'),
('usr_sys_1', 'sysadmin@smartcart.co.ke', '$2y$10$eO0V4hS4iN6wD19f66j2nOhpZ0V4hS4iN6wD19f66j2nOhpZ0V4hS', 'System Administrator', 'SYSTEM_ADMIN', NULL, '+254 700 000 000');

-- 4. Products for Supermarket A: SmartMart Nyeri (SM001)
INSERT INTO `products` (`id`, `supermarket_id`, `barcode`, `product_name`, `brand`, `category`, `description`, `unit`, `selling_price`, `discount_price`, `stock_quantity`, `status`) VALUES
('p_sm1_1', 'sm_1', '6161234567890', 'White Bread', 'ABC', 'Bakery', 'Freshly baked sliced soft white bread', '500g', 80.00, 0.00, 150, 'ACTIVE'),
('p_sm1_2', 'sm_1', '6161234567891', 'Fresh Milk', 'ABC', 'Dairy', 'Pasteurized homogenized whole cow milk', '500ml', 70.00, 0.00, 200, 'ACTIVE'),
('p_sm1_3', 'sm_1', '6161234567892', 'Pure Cane Sugar', 'ABC', 'Food & Groceries', 'Refined sweet white crystal sugar', '1kg', 160.00, 150.00, 100, 'ACTIVE'),
('p_sm1_4', 'sm_1', '6161234567893', 'Pishori Rice', 'ABC', 'Food & Groceries', 'Fragrant premium grade Mwea pishori rice', '2kg', 320.00, 0.00, 95, 'ACTIVE'),
('p_sm1_5', 'sm_1', '6161234567894', 'Pure Vegetable Cooking Oil', 'ABC', 'Food & Groceries', 'Fortified vegetable oil with vitamins A & D', '1L', 250.00, 240.00, 80, 'ACTIVE'),
('p_sm1_6', 'sm_1', '6161234567895', 'Gentle Bath Soap', 'ABC', 'Personal Care', 'Moisturizing beauty cleansing bar soap', '125g', 120.00, 0.00, 110, 'ACTIVE'),
('p_sm1_7', 'sm_1', '6161234567896', 'Sparkling Soda', 'ABC', 'Beverages', 'Refreshing carbonated citrus soft drink', '500ml', 70.00, 0.00, 180, 'ACTIVE'),
('p_sm1_8', 'sm_1', '6161234567897', 'Premium Maize Flour', 'Jogoo', 'Food & Groceries', 'Grade 1 sifted maize meal for delicious ugali', '2kg', 175.00, 0.00, 140, 'ACTIVE'),
('p_sm1_9', 'sm_1', '6161234567898', 'Pure Kenyan Black Tea', 'Kericho Gold', 'Beverages', 'Highland export quality fine tea leaves', '250g', 210.00, 195.00, 60, 'ACTIVE'),
('p_sm1_10', 'sm_1', '6161234567899', 'Instant Hand Sanitizer', 'Dettol', 'Cleaning Products', 'Kills 99.9% of germs without water', '200ml', 290.00, 0.00, 35, 'ACTIVE'),
('p_sm1_11', 'sm_1', '6161234567800', 'Iodized Table Salt', 'Kensalt', 'Food & Groceries', 'Free flowing purified mineral sea salt', '1kg', 45.00, 0.00, 300, 'ACTIVE'),
('p_sm1_12', 'sm_1', '6161234567801', 'Natural Strawberry Yoghurt', 'Bio', 'Dairy', 'Probiotic fruit stirred premium yoghurt', '450g', 165.00, 0.00, 45, 'ACTIVE');

-- 5. Products for Supermarket B: QuickShop Westlands (QS002)
-- Demonstrates independent supermarket pricing for identical barcodes!
INSERT INTO `products` (`id`, `supermarket_id`, `barcode`, `product_name`, `brand`, `category`, `description`, `unit`, `selling_price`, `discount_price`, `stock_quantity`, `status`) VALUES
('p_sm2_1', 'sm_2', '6161234567890', 'White Bread', 'ABC', 'Bakery', 'Freshly baked sliced soft white bread', '500g', 85.00, 0.00, 80, 'ACTIVE'),
('p_sm2_2', 'sm_2', '6161234567891', 'Fresh Milk', 'ABC', 'Dairy', 'Pasteurized homogenized whole cow milk', '500ml', 75.00, 0.00, 120, 'ACTIVE'),
('p_sm2_3', 'sm_2', '6161234567892', 'Pure Cane Sugar', 'ABC', 'Food & Groceries', 'Refined sweet white crystal sugar', '1kg', 175.00, 0.00, 60, 'ACTIVE'),
('p_sm2_4', 'sm_2', '6161234567894', 'Pure Vegetable Cooking Oil', 'ABC', 'Food & Groceries', 'Fortified vegetable oil with vitamins A & D', '1L', 265.00, 0.00, 50, 'ACTIVE'),
('p_sm2_5', 'sm_2', '6161234567896', 'Sparkling Soda', 'ABC', 'Beverages', 'Refreshing carbonated citrus soft drink', '500ml', 80.00, 0.00, 90, 'ACTIVE');
