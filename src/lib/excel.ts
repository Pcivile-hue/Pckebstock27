import * as XLSX from 'xlsx';
import type { Material, Category, Unit } from '@/types';

export interface ImportedMaterialRow {
  name_fr: string;
  name_ar: string;
  category: string;
  unit: string;
  price: number;
  quantity: number;
  rowIndex: number;
  errors: string[];
}

export interface ImportResult {
  rows: ImportedMaterialRow[];
  totalFound: number;
  validCount: number;
  errorCount: number;
  missingColumns: string[];
}

const REQUIRED_COLUMNS = [
  { keys: ['اسم المادة بالفرنسية', 'nom francais', 'name_fr', 'Nom français', 'nom français'], label: 'اسم المادة بالفرنسية' },
  { keys: ['الاسم بالعربية', 'nom arabe', 'name_ar', 'الاسم العربي'], label: 'الاسم بالعربية' },
  { keys: ['التصنيف', 'category', 'catégorie', 'Categorie'], label: 'التصنيف' },
  { keys: ['الوحدة', 'unit', 'unité', 'Unite'], label: 'الوحدة' },
  { keys: ['السعر', 'price', 'prix', 'Prix'], label: 'السعر' },
  { keys: ['الكمية', 'quantity', 'quantité', 'Quantite', 'Quantité'], label: 'الكمية' },
];

export function parseExcelFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        resolve(processImportData(json));
      } catch (err) {
        reject(new Error('فشل في قراءة ملف Excel: ' + (err as Error).message));
      }
    };
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

function findColumnKey(row: Record<string, unknown>, possibleKeys: string[]): string | null {
  const rowKeys = Object.keys(row);
  for (const key of possibleKeys) {
    const found = rowKeys.find((rk) => rk.trim().toLowerCase() === key.trim().toLowerCase());
    if (found) return found;
  }
  return null;
}

function processImportData(json: Record<string, unknown>[]): ImportResult {
  if (json.length === 0) {
    return { rows: [], totalFound: 0, validCount: 0, errorCount: 0, missingColumns: ['الملف فارغ'] };
  }

  const firstRow = json[0];
  const columnKeys = REQUIRED_COLUMNS.map((col) => ({
    ...col,
    actualKey: findColumnKey(firstRow, col.keys),
  }));

  const missingColumns = columnKeys
    .filter((c) => !c.actualKey)
    .map((c) => c.label);

  const rows: ImportedMaterialRow[] = json.map((row, index) => {
    const errors: string[] = [];
    const nameFr = columnKeys[0].actualKey ? String(row[columnKeys[0].actualKey] || '').trim() : '';
    const nameAr = columnKeys[1].actualKey ? String(row[columnKeys[1].actualKey] || '').trim() : '';
    const category = columnKeys[2].actualKey ? String(row[columnKeys[2].actualKey] || '').trim() : '';
    const unit = columnKeys[3].actualKey ? String(row[columnKeys[3].actualKey] || '').trim() : '';
    const priceVal = columnKeys[4].actualKey ? row[columnKeys[4].actualKey] : 0;
    const qtyVal = columnKeys[5].actualKey ? row[columnKeys[5].actualKey] : 0;

    const price = Number(priceVal);
    const quantity = Number(qtyVal);

    if (!nameFr && !nameAr) errors.push('اسم المادة مفقود');
    if (!category) errors.push('التصنيف مفقود');
    if (!unit) errors.push('الوحدة مفقودة');
    if (isNaN(price)) errors.push('السعر ليس رقماً');
    if (isNaN(quantity)) errors.push('الكمية ليست رقماً');

    return {
      name_fr: nameFr,
      name_ar: nameAr || nameFr,
      category,
      unit,
      price: isNaN(price) ? 0 : price,
      quantity: isNaN(quantity) ? 0 : quantity,
      rowIndex: index + 2,
      errors,
    };
  });

  return {
    rows,
    totalFound: json.length,
    validCount: rows.filter((r) => r.errors.length === 0).length,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
    missingColumns,
  };
}

export function downloadMaterialTemplate(): void {
  const template = [
    {
      'اسم المادة بالفرنسية': 'viande de veau',
      'الاسم بالعربية': 'لحم العجل',
      'التصنيف': 'لحوم حمراء',
      'الوحدة': 'kg',
      'السعر': 1100,
      'الكمية': 172,
    },
    {
      'اسم المادة بالفرنسية': 'pomme de terre',
      'الاسم بالعربية': 'بطاطا',
      'التصنيف': 'خضر',
      'الوحدة': 'kg',
      'السعر': 100,
      'الكمية': 2052.7,
    },
  ];
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المواد');
  XLSX.writeFile(wb, 'نموذج_المواد.xlsx');
}

export function exportMaterialsToExcel(materials: Material[]): void {
  const data = materials.map((m, i) => ({
    'الرقم': i + 1,
    'اسم المادة بالفرنسية': m.name_fr,
    'الاسم بالعربية': m.name_ar,
    'التصنيف': m.category?.name_ar || '',
    'الوحدة': m.unit?.name_ar || '',
    'السعر': Number(m.unit_price),
    'الكمية الافتتاحية': Number(m.opening_quantity),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المواد');
  XLSX.writeFile(wb, 'قائمة_المواد.xlsx');
}

export function exportInventoryToExcel(
  materials: Array<Material & {
    total_purchases: number;
    total_consumption: number;
    remaining_quantity: number;
    remaining_value: number;
  }>
): void {
  const data = materials.map((m, i) => ({
    'الرقم': i + 1,
    'اسم المادة بالفرنسية': m.name_fr,
    'الاسم بالعربية': m.name_ar,
    'التصنيف': m.category?.name_ar || '',
    'الوحدة': m.unit?.name_ar || '',
    'سعر الوحدة': Number(m.unit_price),
    'الكمية الافتتاحية': Number(m.opening_quantity),
    'إجمالي المشتريات': Number(m.total_purchases),
    'إجمالي الاستهلاك': Number(m.total_consumption),
    'الكمية المتبقية': Number(m.remaining_quantity),
    'قيمة المخزون المتبقي': Number(m.remaining_value),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المخزون');
  XLSX.writeFile(wb, 'المخزون.xlsx');
}

export function exportPurchasesToExcel(purchases: Array<import('@/types').Purchase>): void {
  const data = purchases.map((p, i) => ({
    'الرقم': i + 1,
    'التاريخ': p.purchase_date,
    'المادة': p.material?.name_ar || '',
    'التصنيف': p.material?.category?.name_ar || '',
    'الكمية': Number(p.quantity),
    'سعر الوحدة': Number(p.unit_price),
    'المبلغ': Number(p.amount),
    'رقم الوثيقة': p.document_number || '',
    'المورد': p.supplier || '',
    'الملاحظات': p.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المشتريات');
  XLSX.writeFile(wb, 'المشتريات.xlsx');
}

export function exportConsumptionToExcel(
  items: Array<import('@/types').ConsumptionItem>,
  dayNumber: number,
  month: number,
  year: number
): void {
  const wb = XLSX.utils.book_new();
  const mealTypes: Array<{ key: 'breakfast' | 'lunch' | 'dinner'; label: string }> = [
    { key: 'breakfast', label: 'الفطور' },
    { key: 'lunch', label: 'الغداء' },
    { key: 'dinner', label: 'العشاء' },
  ];
  for (const meal of mealTypes) {
    const mealItems = items.filter((i) => i.meal_type === meal.key);
    const data = mealItems.map((item, i) => ({
      'الرقم': i + 1,
      'المادة': item.material?.name_ar || '',
      'التصنيف': item.material?.category?.name_ar || '',
      'الوحدة': item.material?.unit?.name_ar || '',
      'الكمية': Number(item.quantity),
      'سعر الوحدة': Number(item.unit_price),
      'المبلغ': Number(item.amount),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, meal.label);
  }
  const fileName = `استهلاك_${dayNumber}_${month}_${year}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportStockCardToExcel(
  categories: Array<{
    name: string;
    previous: number;
    purchases: number;
    consumption: number;
    remaining: number;
  }>,
  month: number,
  year: number,
  budget: number
): void {
  const data = categories.map((c) => ({
    'المادة/التصنيف': c.name,
    'المبلغ المتبقي من الشهر السابق': c.previous,
    'المشتريات خلال الشهر': c.purchases,
    'الاستهلاك خلال الشهر': c.consumption,
    'المبلغ المتبقي': c.remaining,
  }));
  const totalRow = {
    'المادة/التصنيف': 'المجموع',
    'المبلغ المتبقي من الشهر السابق': categories.reduce((s, c) => s + c.previous, 0),
    'المشتريات خلال الشهر': categories.reduce((s, c) => s + c.purchases, 0),
    'الاستهلاك خلال الشهر': categories.reduce((s, c) => s + c.consumption, 0),
    'المبلغ المتبقي': categories.reduce((s, c) => s + c.remaining, 0),
  };
  data.push(totalRow);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'بطاقة المتابعة');
  XLSX.writeFile(wb, `بطاقة_متابعة_${month}_${year}.xlsx`);
}

export function exportStockMovementsToExcel(movements: Array<import('@/types').StockMovement>): void {
  const data = movements.map((m, i) => ({
    'الرقم': i + 1,
    'التاريخ': m.created_at,
    'المادة': m.material?.name_ar || '',
    'التصنيف': m.material?.category?.name_ar || '',
    'نوع العملية': m.movement_type,
    'الكمية': Number(m.quantity),
    'السعر': Number(m.unit_price),
    'القيمة': Number(m.value),
    'اليوم': m.day_number || '',
    'الوجبة': m.meal_type || '',
    'الملاحظات': m.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'حركات المخزون');
  XLSX.writeFile(wb, 'حركات_المخزون.xlsx');
}

export function exportAllData(data: {
  materials: Material[];
  categories: Category[];
  units: Unit[];
  purchases: Array<import('@/types').Purchase>;
  stockMovements: Array<import('@/types').StockMovement>;
  consumptionItems: Array<import('@/types').ConsumptionItem>;
  consumptionDays: Array<import('@/types').ConsumptionDay>;
  settings: import('@/types').Settings | null;
}): void {
  const wb = XLSX.utils.book_new();

  const materialsWs = XLSX.utils.json_to_sheet(
    data.materials.map((m, i) => ({
      'الرقم': i + 1,
      'اسم المادة بالفرنسية': m.name_fr,
      'الاسم بالعربية': m.name_ar,
      'التصنيف': m.category?.name_ar || '',
      'الوحدة': m.unit?.name_ar || '',
      'السعر': Number(m.unit_price),
      'الكمية الافتتاحية': Number(m.opening_quantity),
    }))
  );
  XLSX.utils.book_append_sheet(wb, materialsWs, 'المواد');

  const categoriesWs = XLSX.utils.json_to_sheet(
    data.categories.map((c) => ({
      'الاسم بالعربية': c.name_ar,
      'الاسم بالفرنسية': c.name_fr || '',
      'ترتيب': c.sort_order,
      'نشط': c.is_active ? 'نعم' : 'لا',
    }))
  );
  XLSX.utils.book_append_sheet(wb, categoriesWs, 'التصنيفات');

  const unitsWs = XLSX.utils.json_to_sheet(
    data.units.map((u) => ({
      'الاسم بالعربية': u.name_ar,
      'الاسم بالفرنسية': u.name_fr || '',
      'نشط': u.is_active ? 'نعم' : 'لا',
    }))
  );
  XLSX.utils.book_append_sheet(wb, unitsWs, 'الوحدات');

  const purchasesWs = XLSX.utils.json_to_sheet(
    data.purchases.map((p, i) => ({
      'الرقم': i + 1,
      'التاريخ': p.purchase_date,
      'المادة': p.material?.name_ar || '',
      'الكمية': Number(p.quantity),
      'سعر الوحدة': Number(p.unit_price),
      'المبلغ': Number(p.amount),
      'المورد': p.supplier || '',
    }))
  );
  XLSX.utils.book_append_sheet(wb, purchasesWs, 'المشتريات');

  const movementsWs = XLSX.utils.json_to_sheet(
    data.stockMovements.map((m, i) => ({
      'الرقم': i + 1,
      'المادة': m.material?.name_ar || '',
      'نوع العملية': m.movement_type,
      'الكمية': Number(m.quantity),
      'السعر': Number(m.unit_price),
      'القيمة': Number(m.value),
    }))
  );
  XLSX.utils.book_append_sheet(wb, movementsWs, 'حركات المخزون');

  const consumptionWs = XLSX.utils.json_to_sheet(
    data.consumptionItems.map((c, i) => ({
      'الرقم': i + 1,
      'اليوم': c.consumption_day_id,
      'الوجبة': c.meal_type,
      'المادة': c.material?.name_ar || '',
      'الكمية': Number(c.quantity),
      'السعر': Number(c.unit_price),
      'المبلغ': Number(c.amount),
    }))
  );
  XLSX.utils.book_append_sheet(wb, consumptionWs, 'الاستهلاك');

  XLSX.writeFile(wb, 'النسخة_الاحتياطية.xlsx');
}
