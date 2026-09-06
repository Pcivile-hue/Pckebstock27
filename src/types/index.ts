export interface Category {
  id: string;
  name_ar: string;
  name_fr: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  name_ar: string;
  name_fr: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Material {
  id: string;
  name_fr: string;
  name_ar: string;
  category_id: string | null;
  unit_id: string | null;
  unit_price: number;
  opening_quantity: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  unit?: Unit | null;
}

export type MovementType =
  | 'opening'
  | 'purchase'
  | 'consumption'
  | 'return'
  | 'adjustment'
  | 'correction';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface StockMovement {
  id: string;
  material_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_price: number;
  value: number;
  reference_id: string | null;
  reference_type: string | null;
  day_number: number | null;
  meal_type: MealType | null;
  month: number | null;
  year: number | null;
  notes: string | null;
  created_at: string;
  material?: Material | null;
}

export interface Purchase {
  id: string;
  material_id: string;
  quantity: number;
  unit_price: number;
  amount: number;
  document_number: string | null;
  supplier: string | null;
  purchase_date: string;
  month: number;
  year: number;
  notes: string | null;
  created_at: string;
  material?: Material | null;
}

export interface ConsumptionDay {
  id: string;
  day_number: number;
  month: number;
  year: number;
  date: string;
  unit_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsumptionItem {
  id: string;
  consumption_day_id: string;
  meal_type: MealType;
  material_id: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at: string;
  material?: Material | null;
  consumption_day?: { day_number: number; month: number; year: number; date: string } | null;
}

export interface MealPeopleCount {
  id: string;
  consumption_day_id: string;
  meal_type: MealType;
  people_count: number;
}

export interface Settings {
  id: string;
  header_republic: string;
  header_ministry: string;
  header_directorate: string;
  header_unit: string;
  header_department: string;
  card_title: string;
  logo_url: string | null;
  logo_size: number;
  show_signatures: boolean;
  signature1_label: string;
  signature2_label: string;
  signature3_label: string;
  allow_negative_stock: boolean;
  low_stock_threshold: number;
  total_budget: number;
  paper_size: string;
  paper_orientation: string;
  margins: string;
  unit_name: string;
  directorate: string;
  wilaya: string;
  department: string;
  created_at: string;
  updated_at: string;
}

export interface OperationLog {
  id: string;
  user_name: string;
  operation: string;
  details: string | null;
  created_at: string;
}

export interface MaterialWithStock extends Material {
  total_purchases: number;
  total_consumption: number;
  remaining_quantity: number;
  remaining_value: number;
}

export const DEFAULT_SETTINGS: Settings = {
  id: '',
  header_republic: 'الجمهورية الجزائرية الديمقراطية الشعبية',
  header_ministry: 'وزارة الداخلية والجماعات المحلية والتهيئة والعمران',
  header_directorate: 'المديرية العامة للحماية المدنية',
  header_unit: 'مديرية الحماية المدنية لولاية المدية',
  header_department: 'وحدة سبت عزيز',
  card_title: 'بطاقة متابعة المشتريات واستهلاك مختلف المواد الغذائية',
  logo_url: null,
  logo_size: 80,
  show_signatures: true,
  signature1_label: 'مسير المخزون',
  signature2_label: 'رئيس المصلحة',
  signature3_label: 'المسؤول الإداري',
  allow_negative_stock: false,
  low_stock_threshold: 10,
  total_budget: 0,
  paper_size: 'A4',
  paper_orientation: 'portrait',
  margins: '15mm',
  unit_name: 'وحدة سبت عزيز',
  directorate: 'مديرية الحماية المدنية لولاية المدية',
  wilaya: 'المدية',
  department: 'المصلحة الإدارية',
  created_at: '',
  updated_at: '',
};

export const ARABIC_MONTHS = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'الفطور',
  lunch: 'الغداء',
  dinner: 'العشاء',
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  opening: 'رصيد افتتاحي',
  purchase: 'شراء',
  consumption: 'استهلاك',
  return: 'إرجاع',
  adjustment: 'تعديل',
  correction: 'تصحيح',
};
