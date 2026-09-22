import { supabase } from './supabase';
import type {
  Category,
  Unit,
  Material,
  StockMovement,
  Purchase,
  ConsumptionDay,
  ConsumptionItem,
  MealPeopleCount,
  Settings,
  OperationLog,
  MaterialWithStock,
  MealType,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

// ---------- Settings ----------

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ...DEFAULT_SETTINGS };
  return data as Settings;
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const { data: existing } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (existing) {
    const { data, error } = await supabase
      .from('settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Settings;
  }
  const { data, error } = await supabase
    .from('settings')
    .insert({ ...DEFAULT_SETTINGS, ...settings })
    .select('*')
    .single();
  if (error) throw error;
  return data as Settings;
}

// ---------- Categories ----------

export async function getCategories(activeOnly = false): Promise<Category[]> {
  let query = supabase.from('categories').select('*').order('sort_order');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(cat: Partial<Category>): Promise<Category> {
  const { data, error } = await supabase.from('categories').insert(cat).select('*').single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: string, cat: Partial<Category>): Promise<Category> {
  const { data, error } = await supabase.from('categories').update(cat).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Units ----------

export async function getUnits(activeOnly = false): Promise<Unit[]> {
  let query = supabase.from('units').select('*').order('name_ar');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data as Unit[];
}

export async function createUnit(unit: Partial<Unit>): Promise<Unit> {
  const { data, error } = await supabase.from('units').insert(unit).select('*').single();
  if (error) throw error;
  return data as Unit;
}

export async function updateUnit(id: string, unit: Partial<Unit>): Promise<Unit> {
  const { data, error } = await supabase.from('units').update(unit).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Unit;
}

export async function deleteUnit(id: string): Promise<void> {
  const { error } = await supabase.from('units').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Materials ----------

export async function getMaterials(activeOnly = false): Promise<Material[]> {
  let query = supabase
    .from('materials')
    .select('*, category:categories(*), unit:units(*)')
    .order('name_ar');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data as Material[];
}

export async function createMaterial(mat: Partial<Material>): Promise<Material> {
  const { data, error } = await supabase.from('materials').insert(mat).select('*').single();
  if (error) throw error;
  return data as Material;
}

export async function updateMaterial(id: string, mat: Partial<Material>): Promise<Material> {
  const { data, error } = await supabase
    .from('materials')
    .update({ ...mat, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Material;
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) throw error;
}

export async function findMaterialByName(nameFr: string, nameAr: string): Promise<Material | null> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .or(`name_fr.eq.${nameFr},name_ar.eq.${nameAr}`)
    .maybeSingle();
  if (error) throw error;
  return data as Material | null;
}

// ---------- Stock Movements ----------

export async function getStockMovements(materialId?: string): Promise<StockMovement[]> {
  let query = supabase
    .from('stock_movements')
    .select('*, material:materials(*, category:categories(*), unit:units(*))')
    .order('created_at', { ascending: false });
  if (materialId) query = query.eq('material_id', materialId);
  const { data, error } = await query.limit(500);
  if (error) throw error;
  return data as StockMovement[];
}

export async function getStockMovementsByMonth(month: number, year: number): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*, material:materials(*, category:categories(*), unit:units(*))')
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as StockMovement[];
}

export async function addStockMovement(movement: Partial<StockMovement>): Promise<StockMovement> {
  const { data, error } = await supabase.from('stock_movements').insert(movement).select('*').single();
  if (error) throw error;
  return data as StockMovement;
}

// ---------- Purchases ----------

export async function getPurchases(month?: number, year?: number): Promise<Purchase[]> {
  let query = supabase
    .from('purchases')
    .select('*, material:materials(*, category:categories(*), unit:units(*))')
    .order('purchase_date', { ascending: false });
  if (month !== undefined) query = query.eq('month', month);
  if (year !== undefined) query = query.eq('year', year);
  const { data, error } = await query;
  if (error) throw error;
  return data as Purchase[];
}

export async function createPurchase(p: Partial<Purchase>): Promise<Purchase> {
  const { data, error } = await supabase.from('purchases').insert(p).select('*').single();
  if (error) throw error;
  return data as Purchase;
}

export async function deletePurchase(id: string): Promise<void> {
  const { error } = await supabase.from('purchases').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Consumption Days ----------

export async function getConsumptionDays(month: number, year: number): Promise<ConsumptionDay[]> {
  const { data, error } = await supabase
    .from('consumption_days')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .order('day_number');
  if (error) throw error;
  return data as ConsumptionDay[];
}

export async function getOrCreateConsumptionDay(
  dayNumber: number,
  month: number,
  year: number
): Promise<ConsumptionDay> {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
  const { data: existing } = await supabase
    .from('consumption_days')
    .select('*')
    .eq('day_number', dayNumber)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();
  if (existing) return existing as ConsumptionDay;
  const { data, error } = await supabase
    .from('consumption_days')
    .insert({
      day_number: dayNumber,
      month,
      year,
      date: dateStr,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ConsumptionDay;
}

export async function updateConsumptionDay(id: string, day: Partial<ConsumptionDay>): Promise<void> {
  const { error } = await supabase
    .from('consumption_days')
    .update({ ...day, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------- Consumption Items ----------

export async function getConsumptionItems(dayId: string): Promise<ConsumptionItem[]> {
  const { data, error } = await supabase
    .from('consumption_items')
    .select('*, material:materials(*, category:categories(*), unit:units(*))')
    .eq('consumption_day_id', dayId)
    .order('created_at');
  if (error) throw error;
  return data as ConsumptionItem[];
}

export async function getConsumptionItemsByMonth(month: number, year: number): Promise<ConsumptionItem[]> {
  const { data, error } = await supabase
    .from('consumption_items')
    .select('*, material:materials(*, category:categories(*), unit:units(*)), consumption_day:consumption_days(*)')
    .eq('consumption_day.month', month)
    .eq('consumption_day.year', year)
    .order('created_at');
  if (error) throw error;
  return data as ConsumptionItem[];
}

export async function addConsumptionItem(item: Partial<ConsumptionItem>): Promise<ConsumptionItem> {
  const { data, error } = await supabase.from('consumption_items').insert(item).select('*').single();
  if (error) throw error;
  return data as ConsumptionItem;
}

export async function updateConsumptionItem(id: string, item: Partial<ConsumptionItem>): Promise<ConsumptionItem> {
  const { data, error } = await supabase.from('consumption_items').update(item).eq('id', id).select('*').single();
  if (error) throw error;
  return data as ConsumptionItem;
}

export async function deleteConsumptionItem(id: string): Promise<void> {
  const { error } = await supabase.from('consumption_items').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteConsumptionItems(ids: string[]): Promise<void> {
  const { error } = await supabase.from('consumption_items').delete().in('id', ids);
  if (error) throw error;
}

// ---------- Meal People Count ----------

export async function getMealPeopleCounts(dayId: string): Promise<MealPeopleCount[]> {
  const { data, error } = await supabase
    .from('meal_people_count')
    .select('*')
    .eq('consumption_day_id', dayId);
  if (error) throw error;
  return data as MealPeopleCount[];
}

export async function getConsumptionItemsByYear(year: number): Promise<ConsumptionItem[]> {
  const { data, error } = await supabase
    .from('consumption_items')
    .select('*, material:materials(*, category:categories(*), unit:units(*)), consumption_day:consumption_days(*)')
    .eq('consumption_day.year', year)
    .order('created_at');
  if (error) throw error;
  return data as ConsumptionItem[];
}

export async function getMealPeopleCountsByYear(year: number): Promise<{ month: number; day_number: number; meal_type: MealType; people_count: number }[]> {
  const { data, error } = await supabase
    .from('meal_people_count')
    .select('people_count, meal_type, consumption_day:consumption_days(day_number, month, year)')
    .eq('consumption_day.year', year);
  if (error) throw error;
  return (data || []).map((d: any) => ({
    month: d.consumption_day?.month || 0,
    day_number: d.consumption_day?.day_number || 0,
    meal_type: d.meal_type as MealType,
    people_count: d.people_count,
  }));
}

export async function getMealPeopleCountsByMonth(month: number, year: number): Promise<{ day_number: number; meal_type: MealType; people_count: number }[]> {
  const { data, error } = await supabase
    .from('meal_people_count')
    .select('people_count, meal_type, consumption_day:consumption_days(day_number, month, year)')
    .eq('consumption_day.month', month)
    .eq('consumption_day.year', year);
  if (error) throw error;
  return (data || []).map((d: any) => ({
    day_number: d.consumption_day?.day_number || 0,
    meal_type: d.meal_type as MealType,
    people_count: d.people_count,
  }));
}

export async function upsertMealPeopleCount(
  dayId: string,
  mealType: MealType,
  count: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('meal_people_count')
    .select('*')
    .eq('consumption_day_id', dayId)
    .eq('meal_type', mealType)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from('meal_people_count')
      .update({ people_count: count })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('meal_people_count')
      .insert({ consumption_day_id: dayId, meal_type: mealType, people_count: count });
    if (error) throw error;
  }
}

// ---------- Operation Log ----------

export async function getOperationLogs(limit = 100): Promise<OperationLog[]> {
  const { data, error } = await supabase
    .from('operation_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as OperationLog[];
}

export async function addOperationLog(operation: string, details: string): Promise<void> {
  const { error } = await supabase.from('operation_log').insert({
    user_name: 'المستخدم',
    operation,
    details,
  });
  if (error) console.error('Failed to log operation:', error);
}

// ---------- Computed Stock ----------

export async function getMaterialsWithStock(): Promise<MaterialWithStock[]> {
  const materials = await getMaterials();
  const { data: movements, error } = await supabase
    .from('stock_movements')
    .select('material_id, movement_type, quantity');
  if (error) throw error;

  const stockMap = new Map<string, { purchases: number; consumption: number }>();

  for (const m of movements || []) {
    if (!stockMap.has(m.material_id)) {
      stockMap.set(m.material_id, { purchases: 0, consumption: 0 });
    }
    const entry = stockMap.get(m.material_id)!;
    if (m.movement_type === 'purchase') {
      entry.purchases += Number(m.quantity);
    } else if (m.movement_type === 'consumption') {
      entry.consumption += Number(m.quantity);
    } else if (m.movement_type === 'return') {
      entry.purchases += Number(m.quantity);
    } else if (m.movement_type === 'adjustment' || m.movement_type === 'correction') {
      entry.purchases += Number(m.quantity);
    }
  }

  return materials.map((m) => {
    const stock = stockMap.get(m.id) || { purchases: 0, consumption: 0 };
    const remaining = Number(m.opening_quantity) + stock.purchases - stock.consumption;
    return {
      ...m,
      total_purchases: stock.purchases,
      total_consumption: stock.consumption,
      remaining_quantity: remaining,
      remaining_value: remaining * Number(m.unit_price),
    };
  });
}

export async function getRemainingQuantity(materialId: string): Promise<number> {
  const { data: material } = await supabase
    .from('materials')
    .select('opening_quantity')
    .eq('id', materialId)
    .maybeSingle();
  if (!material) return 0;
  const { data: movements, error } = await supabase
    .from('stock_movements')
    .select('movement_type, quantity')
    .eq('material_id', materialId);
  if (error) throw error;
  let purchases = 0;
  let consumption = 0;
  for (const m of movements || []) {
    if (m.movement_type === 'purchase' || m.movement_type === 'return' || m.movement_type === 'adjustment' || m.movement_type === 'correction') {
      purchases += Number(m.quantity);
    } else if (m.movement_type === 'consumption') {
      consumption += Number(m.quantity);
    }
  }
  return Number(material.opening_quantity) + purchases - consumption;
}
