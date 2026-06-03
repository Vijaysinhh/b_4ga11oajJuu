-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES (mirroring IndexedDB structure)
-- ============================================

-- 1. Shops
CREATE TABLE IF NOT EXISTS shops (
    id BIGSERIAL PRIMARY KEY,
    owner_name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone_number VARCHAR(50) NOT NULL,
    password TEXT NOT NULL,
    is_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users (super admin, owner, worker)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'owner', 'worker')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_marathi VARCHAR(255),
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Units
CREATE TABLE IF NOT EXISTS units (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_marathi VARCHAR(255),
    short_form VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Items
CREATE TABLE IF NOT EXISTS items (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_marathi VARCHAR(255),
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    buy_price NUMERIC NOT NULL,
    sell_price NUMERIC NOT NULL,
    margin_amount NUMERIC,
    margin_percent NUMERIC,
    low_stock_limit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Price Tiers
CREATE TABLE IF NOT EXISTS price_tiers (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Sales
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_quantity_items NUMERIC,
    subtotal NUMERIC NOT NULL,
    total_cost NUMERIC NOT NULL,
    total_profit NUMERIC NOT NULL,
    profit_margin_percent NUMERIC,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'partial', 'udhari')),
    credit_customer_id BIGINT,
    credit_customer_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL,
    unit_short_form VARCHAR(50),
    price_tier_id BIGINT,
    price_per_unit NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    cost_per_unit NUMERIC NOT NULL,
    total_cost NUMERIC NOT NULL,
    profit NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Stock History
CREATE TABLE IF NOT EXISTS stock_history (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'damage', 'expiry')),
    quantity_changed NUMERIC NOT NULL,
    quantity_before NUMERIC NOT NULL,
    quantity_after NUMERIC NOT NULL,
    reason TEXT,
    cost_per_unit NUMERIC,
    reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Batches
CREATE TABLE IF NOT EXISTS batches (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(255),
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    quantity_received NUMERIC NOT NULL,
    quantity_sold NUMERIC DEFAULT 0,
    quantity_available NUMERIC NOT NULL,
    cost_per_unit NUMERIC NOT NULL,
    supplier_id TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'expiring', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_stock', 'expiring', 'slow_moving', 'expired')),
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Credit Customers
CREATE TABLE IF NOT EXISTS credit_customers (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    balance NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Credit Entries
CREATE TABLE IF NOT EXISTS credit_entries (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES credit_customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('credit', 'payment')),
    amount NUMERIC NOT NULL,
    note TEXT,
    sale_id BIGINT REFERENCES sales(id) ON DELETE SET NULL,
    bill_items JSONB,
    date DATE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. App Settings (per shop)
CREATE TABLE IF NOT EXISTS app_settings (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL DEFAULT 'mr' CHECK (language IN ('en', 'mr')),
    theme VARCHAR(20) NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    setup_complete BOOLEAN DEFAULT TRUE,
    last_backup TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INSERT SUPER ADMIN USER
-- ============================================
INSERT INTO users (username, password, role) 
VALUES ('vijaysinhjadhav23@gmail.com', 'Vijaysinh@23', 'super_admin')
ON CONFLICT DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shops_owner_name ON shops(owner_name);
CREATE INDEX IF NOT EXISTS idx_shops_phone_number ON shops(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON users(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_items_shop_id ON items(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_credit_customers_shop_id ON credit_customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_credit_entries_shop_id ON credit_entries(shop_id);
CREATE INDEX IF NOT EXISTS idx_credit_entries_customer_id ON credit_entries(customer_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's shop ID (simplified for now)
-- For this app, we'll use permissive policies since we're using custom auth
-- In production, you'd want to integrate with Supabase Auth properly

-- Shops: Allow all operations (adjust as needed)
CREATE POLICY "Allow all operations on shops" ON shops FOR ALL USING (true) WITH CHECK (true);

-- Users: Allow all operations
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Categories: Allow all operations
CREATE POLICY "Allow all operations on categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Units: Allow all operations
CREATE POLICY "Allow all operations on units" ON units FOR ALL USING (true) WITH CHECK (true);

-- Items: Allow all operations
CREATE POLICY "Allow all operations on items" ON items FOR ALL USING (true) WITH CHECK (true);

-- Price Tiers: Allow all operations
CREATE POLICY "Allow all operations on price_tiers" ON price_tiers FOR ALL USING (true) WITH CHECK (true);

-- Sales: Allow all operations
CREATE POLICY "Allow all operations on sales" ON sales FOR ALL USING (true) WITH CHECK (true);

-- Sale Items: Allow all operations
CREATE POLICY "Allow all operations on sale_items" ON sale_items FOR ALL USING (true) WITH CHECK (true);

-- Stock History: Allow all operations
CREATE POLICY "Allow all operations on stock_history" ON stock_history FOR ALL USING (true) WITH CHECK (true);

-- Batches: Allow all operations
CREATE POLICY "Allow all operations on batches" ON batches FOR ALL USING (true) WITH CHECK (true);

-- Alerts: Allow all operations
CREATE POLICY "Allow all operations on alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);

-- Credit Customers: Allow all operations
CREATE POLICY "Allow all operations on credit_customers" ON credit_customers FOR ALL USING (true) WITH CHECK (true);

-- Credit Entries: Allow all operations
CREATE POLICY "Allow all operations on credit_entries" ON credit_entries FOR ALL USING (true) WITH CHECK (true);

-- App Settings: Allow all operations
CREATE POLICY "Allow all operations on app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
