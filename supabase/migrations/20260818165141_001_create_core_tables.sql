/*
# Core schema for food inventory management system

## Overview
Creates the foundational tables for a food inventory and consumption management
system for a civil protection unit. This is a single-tenant app with no sign-in,
so all policies allow anon + authenticated access.

## New Tables

1. **categories** - Food categories (meat, vegetables, etc.)
   - id, name_ar, name_fr, sort_order, is_active, created_at

2. **units** - Measurement units (kg, L, piece, etc.)
   - id, name_ar, name_fr, is_active, created_at

3. **materials** - Food materials with multilingual names
   - id, name_fr, name_ar, category_id, unit_id, unit_price, opening_quantity,
     min_stock, is_active, created_at, updated_at

4. **stock_movements** - Log of all stock movements
   - id, material_id, movement_type, quantity, unit_price, value,
     reference_id, reference_type, day_number, meal_type, month, year,
     notes, created_at
   - movement_type: 'opening' | 'purchase' | 'consumption' | 'return' | 'adjustment' | 'correction'

5. **purchases** - Purchase records
   - id, material_id, quantity, unit_price, amount, document_number,
     supplier, purchase_date, month, year, notes, created_at

6. **consumption_days** - Daily consumption records (one per day per month)
   - id, day_number, month, year, date, unit_name, notes, created_at, updated_at

7. **consumption_items** - Individual items in meals
   - id, consumption_day_id, meal_type, material_id, quantity, unit_price,
     amount, created_at
   - meal_type: 'breakfast' | 'lunch' | 'dinner'

8. **meal_people_count** - Number of people per meal per day
   - id, consumption_day_id, meal_type, people_count

9. **settings** - Application settings (single row)
   - id, header_republic, header_ministry, header_directorate,
     header_unit, header_department, card_title, logo_url, logo_size,
     show_signatures, signature1_label, signature2_label, signature3_label,
     allow_negative_stock, low_stock_threshold, total_budget,
     paper_size, paper_orientation, margins, unit_name, directorate, wilaya,
     department, created_at, updated_at

10. **operation_log** - Audit trail of operations
    - id, user_name, operation, details, created_at

## Security
- RLS enabled on all tables
- All tables allow anon + authenticated full CRUD (single-tenant, no sign-in)
*/

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_fr text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

-- Units
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_fr text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_units" ON units;
CREATE POLICY "anon_select_units" ON units FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_units" ON units;
CREATE POLICY "anon_insert_units" ON units FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_units" ON units;
CREATE POLICY "anon_update_units" ON units FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_units" ON units;
CREATE POLICY "anon_delete_units" ON units FOR DELETE
  TO anon, authenticated USING (true);

-- Materials
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr text NOT NULL,
  name_ar text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  opening_quantity numeric(14,3) NOT NULL DEFAULT 0,
  min_stock numeric(14,3) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_materials" ON materials;
CREATE POLICY "anon_select_materials" ON materials FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_materials" ON materials;
CREATE POLICY "anon_insert_materials" ON materials FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_materials" ON materials;
CREATE POLICY "anon_update_materials" ON materials FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_materials" ON materials;
CREATE POLICY "anon_delete_materials" ON materials FOR DELETE
  TO anon, authenticated USING (true);

-- Stock movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('opening','purchase','consumption','return','adjustment','correction')),
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  value numeric(14,2) NOT NULL DEFAULT 0,
  reference_id uuid,
  reference_type text,
  day_number integer,
  meal_type text CHECK (meal_type IN ('breakfast','lunch','dinner') OR meal_type IS NULL),
  month integer,
  year integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_stock_movements" ON stock_movements;
CREATE POLICY "anon_select_stock_movements" ON stock_movements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_stock_movements" ON stock_movements;
CREATE POLICY "anon_insert_stock_movements" ON stock_movements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_stock_movements" ON stock_movements;
CREATE POLICY "anon_update_stock_movements" ON stock_movements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_stock_movements" ON stock_movements;
CREATE POLICY "anon_delete_stock_movements" ON stock_movements FOR DELETE
  TO anon, authenticated USING (true);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  document_number text,
  supplier text,
  purchase_date date NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_purchases" ON purchases;
CREATE POLICY "anon_select_purchases" ON purchases FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_purchases" ON purchases;
CREATE POLICY "anon_insert_purchases" ON purchases FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_purchases" ON purchases;
CREATE POLICY "anon_update_purchases" ON purchases FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_purchases" ON purchases;
CREATE POLICY "anon_delete_purchases" ON purchases FOR DELETE
  TO anon, authenticated USING (true);

-- Consumption days
CREATE TABLE IF NOT EXISTS consumption_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number integer NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  date date NOT NULL,
  unit_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (day_number, month, year)
);

ALTER TABLE consumption_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_consumption_days" ON consumption_days;
CREATE POLICY "anon_select_consumption_days" ON consumption_days FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_consumption_days" ON consumption_days;
CREATE POLICY "anon_insert_consumption_days" ON consumption_days FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_consumption_days" ON consumption_days;
CREATE POLICY "anon_update_consumption_days" ON consumption_days FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_consumption_days" ON consumption_days;
CREATE POLICY "anon_delete_consumption_days" ON consumption_days FOR DELETE
  TO anon, authenticated USING (true);

-- Consumption items
CREATE TABLE IF NOT EXISTS consumption_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumption_day_id uuid NOT NULL REFERENCES consumption_days(id) ON DELETE CASCADE,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consumption_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_consumption_items" ON consumption_items;
CREATE POLICY "anon_select_consumption_items" ON consumption_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_consumption_items" ON consumption_items;
CREATE POLICY "anon_insert_consumption_items" ON consumption_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_consumption_items" ON consumption_items;
CREATE POLICY "anon_update_consumption_items" ON consumption_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_consumption_items" ON consumption_items;
CREATE POLICY "anon_delete_consumption_items" ON consumption_items FOR DELETE
  TO anon, authenticated USING (true);

-- Meal people count
CREATE TABLE IF NOT EXISTS meal_people_count (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumption_day_id uuid NOT NULL REFERENCES consumption_days(id) ON DELETE CASCADE,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  people_count integer NOT NULL DEFAULT 0,
  UNIQUE (consumption_day_id, meal_type)
);

ALTER TABLE meal_people_count ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_meal_people_count" ON meal_people_count;
CREATE POLICY "anon_select_meal_people_count" ON meal_people_count FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_meal_people_count" ON meal_people_count;
CREATE POLICY "anon_insert_meal_people_count" ON meal_people_count FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_meal_people_count" ON meal_people_count;
CREATE POLICY "anon_update_meal_people_count" ON meal_people_count FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_meal_people_count" ON meal_people_count;
CREATE POLICY "anon_delete_meal_people_count" ON meal_people_count FOR DELETE
  TO anon, authenticated USING (true);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  header_republic text NOT NULL DEFAULT 'الجمهورية الجزائرية الديمقراطية الشعبية',
  header_ministry text NOT NULL DEFAULT 'وزارة الداخلية والجماعات المحلية والتهيئة والعمران',
  header_directorate text NOT NULL DEFAULT 'المديرية العامة للحماية المدنية',
  header_unit text NOT NULL DEFAULT 'مديرية الحماية المدنية لولاية المدية',
  header_department text NOT NULL DEFAULT 'وحدة سبت عزيز',
  card_title text NOT NULL DEFAULT 'بطاقة متابعة المشتريات واستهلاك مختلف المواد الغذائية',
  logo_url text,
  logo_size integer NOT NULL DEFAULT 80,
  show_signatures boolean NOT NULL DEFAULT true,
  signature1_label text NOT NULL DEFAULT 'مسير المخزون',
  signature2_label text NOT NULL DEFAULT 'رئيس المصلحة',
  signature3_label text NOT NULL DEFAULT 'المسؤول الإداري',
  allow_negative_stock boolean NOT NULL DEFAULT false,
  low_stock_threshold numeric(14,3) NOT NULL DEFAULT 10,
  total_budget numeric(14,2) NOT NULL DEFAULT 0,
  paper_size text NOT NULL DEFAULT 'A4',
  paper_orientation text NOT NULL DEFAULT 'portrait',
  margins text NOT NULL DEFAULT '15mm',
  unit_name text NOT NULL DEFAULT 'وحدة سبت عزيز',
  directorate text NOT NULL DEFAULT 'مديرية الحماية المدنية لولاية المدية',
  wilaya text NOT NULL DEFAULT 'المدية',
  department text NOT NULL DEFAULT 'المصلحة الإدارية',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

-- Operation log
CREATE TABLE IF NOT EXISTS operation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL DEFAULT 'المستخدم',
  operation text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE operation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_operation_log" ON operation_log;
CREATE POLICY "anon_select_operation_log" ON operation_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_operation_log" ON operation_log;
CREATE POLICY "anon_insert_operation_log" ON operation_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_operation_log" ON operation_log;
CREATE POLICY "anon_update_operation_log" ON operation_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_operation_log" ON operation_log;
CREATE POLICY "anon_delete_operation_log" ON operation_log FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_month_year ON stock_movements(month, year);
CREATE INDEX IF NOT EXISTS idx_purchases_material ON purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_purchases_month_year ON purchases(month, year);
CREATE INDEX IF NOT EXISTS idx_consumption_days_month_year ON consumption_days(month, year);
CREATE INDEX IF NOT EXISTS idx_consumption_items_day ON consumption_items(consumption_day_id);
CREATE INDEX IF NOT EXISTS idx_consumption_items_material ON consumption_items(material_id);

-- Insert default settings row if none exists
INSERT INTO settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Insert default categories
INSERT INTO categories (name_ar, name_fr, sort_order)
VALUES
  ('لحوم حمراء', 'Viandes rouges', 1),
  ('لحوم بيضاء وبيض', 'Volailles et œufs', 2),
  ('خضر', 'Légumes', 3),
  ('فواكه', 'Fruits', 4),
  ('خضر وفواكه', 'Légumes et fruits', 5),
  ('مواد غذائية عامة', 'Produits alimentaires généraux', 6),
  ('بقوليات', 'Légumineuses', 7),
  ('حبوب', 'Céréales', 8),
  ('توابل', 'Épices', 9),
  ('زيوت', 'Huiles', 10),
  ('معلبات', 'Conserves', 11),
  ('حليب ومشتقاته', 'Lait et dérivés', 12),
  ('خبز وحلويات', 'Pain et pâtisseries', 13),
  ('أسماك وقشريات', 'Poissons et crustacés', 14),
  ('مشروبات', 'Boissons', 15),
  ('تصنيف آخر', 'Autre', 16)
ON CONFLICT DO NOTHING;

-- Insert default units
INSERT INTO units (name_ar, name_fr)
VALUES
  ('كغ', 'kg'),
  ('غرام', 'g'),
  ('لتر', 'L'),
  ('مليلتر', 'mL'),
  ('قطعة', 'pièce'),
  ('علبة', 'boîte'),
  ('كيس', 'sac'),
  ('صفيحة', 'plateau'),
  ('وحدة', 'unité')
ON CONFLICT DO NOTHING;
