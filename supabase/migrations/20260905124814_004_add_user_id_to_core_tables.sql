/*
# Add per-account data isolation to all core tables

## Purpose
Each new account must start with completely empty worksheets — no materials,
no purchases, no consumption, no categories, no units, no settings. Every
account's data is stored separately and invisible to other accounts.

## Changes

### 1. Add `user_id` column to all core tables
- categories: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)
- units: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)
- materials: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)
- stock_movements: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)
- purchases: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)
- consumption_days: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)
- consumption_items: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)
- meal_people_count: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)
- settings: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)
- operation_log: + user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK -> auth.users)

### 2. Update unique constraints for per-user uniqueness
- consumption_days: change UNIQUE (day_number, month, year) to UNIQUE (user_id, day_number, month, year)
- meal_people_count: change UNIQUE (consumption_day_id, meal_type) to UNIQUE (consumption_day_id, meal_type, user_id)

### 3. Update RLS policies
- Replace all anon-open policies with authenticated-only, owner-scoped policies.
- Each table gets 4 policies (SELECT/INSERT/UPDATE/DELETE) scoped to auth.uid() = user_id.
- This ensures each account only sees and modifies its own data.

### 4. Data migration
- Existing rows get user_id = NULL initially. Since the app is multi-user now,
  any pre-existing test data will be invisible to new accounts (NULL user_id
  won't match any auth.uid()). New accounts start fresh with zero rows.

## Security
- All tables: only authenticated users can CRUD their own rows.
- No anon access — the app requires sign-in.
- user_id defaults to auth.uid() so frontend inserts that omit user_id still work.
*/

-- ===================== CATEGORIES =====================
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE categories ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;

DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== UNITS =====================
ALTER TABLE units ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE units ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_units" ON units;
DROP POLICY IF EXISTS "anon_insert_units" ON units;
DROP POLICY IF EXISTS "anon_update_units" ON units;
DROP POLICY IF EXISTS "anon_delete_units" ON units;

DROP POLICY IF EXISTS "select_own_units" ON units;
CREATE POLICY "select_own_units" ON units FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_units" ON units;
CREATE POLICY "insert_own_units" ON units FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_units" ON units;
CREATE POLICY "update_own_units" ON units FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_units" ON units;
CREATE POLICY "delete_own_units" ON units FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== MATERIALS =====================
ALTER TABLE materials ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE materials ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_materials" ON materials;
DROP POLICY IF EXISTS "anon_insert_materials" ON materials;
DROP POLICY IF EXISTS "anon_update_materials" ON materials;
DROP POLICY IF EXISTS "anon_delete_materials" ON materials;

DROP POLICY IF EXISTS "select_own_materials" ON materials;
CREATE POLICY "select_own_materials" ON materials FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_materials" ON materials;
CREATE POLICY "insert_own_materials" ON materials FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_materials" ON materials;
CREATE POLICY "update_own_materials" ON materials FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_materials" ON materials;
CREATE POLICY "delete_own_materials" ON materials FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== STOCK_MOVEMENTS =====================
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE stock_movements ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "anon_insert_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "anon_update_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "anon_delete_stock_movements" ON stock_movements;

DROP POLICY IF EXISTS "select_own_stock_movements" ON stock_movements;
CREATE POLICY "select_own_stock_movements" ON stock_movements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_stock_movements" ON stock_movements;
CREATE POLICY "insert_own_stock_movements" ON stock_movements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_stock_movements" ON stock_movements;
CREATE POLICY "update_own_stock_movements" ON stock_movements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_stock_movements" ON stock_movements;
CREATE POLICY "delete_own_stock_movements" ON stock_movements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== PURCHASES =====================
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE purchases ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_purchases" ON purchases;
DROP POLICY IF EXISTS "anon_insert_purchases" ON purchases;
DROP POLICY IF EXISTS "anon_update_purchases" ON purchases;
DROP POLICY IF EXISTS "anon_delete_purchases" ON purchases;

DROP POLICY IF EXISTS "select_own_purchases" ON purchases;
CREATE POLICY "select_own_purchases" ON purchases FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_purchases" ON purchases;
CREATE POLICY "insert_own_purchases" ON purchases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_purchases" ON purchases;
CREATE POLICY "update_own_purchases" ON purchases FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_purchases" ON purchases;
CREATE POLICY "delete_own_purchases" ON purchases FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== CONSUMPTION_DAYS =====================
ALTER TABLE consumption_days ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE consumption_days ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop old unique constraint and create per-user one
ALTER TABLE consumption_days DROP CONSTRAINT IF EXISTS consumption_days_day_number_month_year_key;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consumption_days_user_day_month_year_key'
  ) THEN
    ALTER TABLE consumption_days
      ADD CONSTRAINT consumption_days_user_day_month_year_key
      UNIQUE (user_id, day_number, month, year);
  END IF;
END $$;

DROP POLICY IF EXISTS "anon_select_consumption_days" ON consumption_days;
DROP POLICY IF EXISTS "anon_insert_consumption_days" ON consumption_days;
DROP POLICY IF EXISTS "anon_update_consumption_days" ON consumption_days;
DROP POLICY IF EXISTS "anon_delete_consumption_days" ON consumption_days;

DROP POLICY IF EXISTS "select_own_consumption_days" ON consumption_days;
CREATE POLICY "select_own_consumption_days" ON consumption_days FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_consumption_days" ON consumption_days;
CREATE POLICY "insert_own_consumption_days" ON consumption_days FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_consumption_days" ON consumption_days;
CREATE POLICY "update_own_consumption_days" ON consumption_days FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_consumption_days" ON consumption_days;
CREATE POLICY "delete_own_consumption_days" ON consumption_days FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== CONSUMPTION_ITEMS =====================
ALTER TABLE consumption_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE consumption_items ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_consumption_items" ON consumption_items;
DROP POLICY IF EXISTS "anon_insert_consumption_items" ON consumption_items;
DROP POLICY IF EXISTS "anon_update_consumption_items" ON consumption_items;
DROP POLICY IF EXISTS "anon_delete_consumption_items" ON consumption_items;

DROP POLICY IF EXISTS "select_own_consumption_items" ON consumption_items;
CREATE POLICY "select_own_consumption_items" ON consumption_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_consumption_items" ON consumption_items;
CREATE POLICY "insert_own_consumption_items" ON consumption_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_consumption_items" ON consumption_items;
CREATE POLICY "update_own_consumption_items" ON consumption_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_consumption_items" ON consumption_items;
CREATE POLICY "delete_own_consumption_items" ON consumption_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== MEAL_PEOPLE_COUNT =====================
ALTER TABLE meal_people_count ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE meal_people_count ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop old unique constraint and create per-user one
ALTER TABLE meal_people_count DROP CONSTRAINT IF EXISTS meal_people_count_consumption_day_id_meal_type_key;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_people_count_user_day_meal_key'
  ) THEN
    ALTER TABLE meal_people_count
      ADD CONSTRAINT meal_people_count_user_day_meal_key
      UNIQUE (consumption_day_id, meal_type, user_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "anon_select_meal_people_count" ON meal_people_count;
DROP POLICY IF EXISTS "anon_insert_meal_people_count" ON meal_people_count;
DROP POLICY IF EXISTS "anon_update_meal_people_count" ON meal_people_count;
DROP POLICY IF EXISTS "anon_delete_meal_people_count" ON meal_people_count;

DROP POLICY IF EXISTS "select_own_meal_people_count" ON meal_people_count;
CREATE POLICY "select_own_meal_people_count" ON meal_people_count FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_meal_people_count" ON meal_people_count;
CREATE POLICY "insert_own_meal_people_count" ON meal_people_count FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_meal_people_count" ON meal_people_count;
CREATE POLICY "update_own_meal_people_count" ON meal_people_count FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_meal_people_count" ON meal_people_count;
CREATE POLICY "delete_own_meal_people_count" ON meal_people_count FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== SETTINGS =====================
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE settings ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
DROP POLICY IF EXISTS "anon_update_settings" ON settings;
DROP POLICY IF EXISTS "anon_delete_settings" ON settings;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON settings;
CREATE POLICY "delete_own_settings" ON settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== OPERATION_LOG =====================
ALTER TABLE operation_log ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE operation_log ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_operation_log" ON operation_log;
DROP POLICY IF EXISTS "anon_insert_operation_log" ON operation_log;
DROP POLICY IF EXISTS "anon_update_operation_log" ON operation_log;
DROP POLICY IF EXISTS "anon_delete_operation_log" ON operation_log;

DROP POLICY IF EXISTS "select_own_operation_log" ON operation_log;
CREATE POLICY "select_own_operation_log" ON operation_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_operation_log" ON operation_log;
CREATE POLICY "insert_own_operation_log" ON operation_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_operation_log" ON operation_log;
CREATE POLICY "update_own_operation_log" ON operation_log FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_operation_log" ON operation_log;
CREATE POLICY "delete_own_operation_log" ON operation_log FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_units_user ON units(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_consumption_days_user ON consumption_days(user_id);
CREATE INDEX IF NOT EXISTS idx_consumption_items_user ON consumption_items(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_people_count_user ON meal_people_count(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_log_user ON operation_log(user_id);