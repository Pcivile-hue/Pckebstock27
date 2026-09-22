import { useEffect, useState } from 'react';
import { FileBarChart, Printer, Download, Search } from 'lucide-react';
import {
  getMaterialsWithStock,
  getCategories,
  getPurchases,
  getStockMovements,
  getStockMovementsByMonth,
  getConsumptionItemsByMonth,
  getSettings,
} from '@/lib/db';
import { exportInventoryToExcel, exportPurchasesToExcel, exportStockMovementsToExcel } from '@/lib/excel';
import { printInventory, printReport } from '@/lib/print';
import { formatCurrency, formatNumber, ARABIC_MONTHS, formatDate } from '@/lib/format';
import { MEAL_LABELS, MOVEMENT_LABELS } from '@/types';
import type {
  MaterialWithStock,
  Category,
  Purchase,
  StockMovement,
  ConsumptionItem,
  Settings as SettingsType,
} from '@/types';

type ReportType =
  | 'inventory'
  | 'daily'
  | 'monthly'
  | 'material'
  | 'category'
  | 'purchases'
  | 'movements'
  | 'stockcard';

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('inventory');
  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [monthItems, setMonthItems] = useState<ConsumptionItem[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (reportType === 'monthly' || reportType === 'movements' || reportType === 'purchases') {
      loadMonthData();
    }
  }, [reportType, month, year]);

  const loadBaseData = async () => {
    try {
      const [mats, cats, sett] = await Promise.all([
        getMaterialsWithStock(),
        getCategories(),
        getSettings(),
      ]);
      setMaterials(mats);
      setCategories(cats);
      setSettings(sett);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthData = async () => {
    try {
      const [purs, movs, items] = await Promise.all([
        getPurchases(month, year),
        getStockMovementsByMonth(month, year),
        getConsumptionItemsByMonth(month, year),
      ]);
      setPurchases(purs);
      setMovements(movs);
      setMonthItems(items);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">جاري التحميل...</div>;
  }

  const reportTypes: { key: ReportType; label: string }[] = [
    { key: 'inventory', label: 'تقرير المخزون' },
    { key: 'daily', label: 'تقرير الاستهلاك اليومي' },
    { key: 'monthly', label: 'تقرير شهري' },
    { key: 'material', label: 'تقرير حسب المادة' },
    { key: 'category', label: 'تقرير حسب التصنيف' },
    { key: 'purchases', label: 'تقرير المشتريات' },
    { key: 'movements', label: 'تقرير حركات المخزون' },
    { key: 'stockcard', label: 'بطاقة متابعة المخزون' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileBarChart className="w-7 h-7 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-800">التقارير</h1>
      </div>

      {/* Report type selector */}
      <div className="flex flex-wrap gap-2">
        {reportTypes.map((rt) => (
          <button
            key={rt.key}
            onClick={() => setReportType(rt.key)}
            className={`btn ${
              reportType === rt.key ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {/* Month/Year filter for monthly reports */}
      {(reportType === 'monthly' || reportType === 'purchases' || reportType === 'movements') && (
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="select w-auto">
            {ARABIC_MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="select w-auto">
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {/* Report content */}
      <ReportContent
        reportType={reportType}
        materials={materials}
        categories={categories}
        purchases={purchases}
        movements={movements}
        monthItems={monthItems}
        settings={settings}
        month={month}
        year={year}
        selectedMaterial={selectedMaterial}
        selectedCategory={selectedCategory}
        onSelectMaterial={setSelectedMaterial}
        onSelectCategory={setSelectedCategory}
      />
    </div>
  );
}

interface ReportContentProps {
  reportType: ReportType;
  materials: MaterialWithStock[];
  categories: Category[];
  purchases: Purchase[];
  movements: StockMovement[];
  monthItems: ConsumptionItem[];
  settings: SettingsType | null;
  month: number;
  year: number;
  selectedMaterial: string;
  selectedCategory: string;
  onSelectMaterial: (id: string) => void;
  onSelectCategory: (id: string) => void;
}

function ReportContent({
  reportType,
  materials,
  categories,
  purchases,
  movements,
  monthItems,
  settings,
  month,
  year,
  selectedMaterial,
  selectedCategory,
  onSelectMaterial,
  onSelectCategory,
}: ReportContentProps) {
  if (reportType === 'inventory') {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => printInventory(materials, settings)}
            className="btn btn-primary"
          >
            <Printer className="w-4 h-4" /> طباعة
          </button>
          <button
            onClick={() => exportInventoryToExcel(materials)}
            className="btn btn-secondary"
          >
            <Download className="w-4 h-4" /> تصدير Excel
          </button>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header text-right">
                  <th className="p-3">رقم</th>
                  <th className="p-3">المادة</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">السعر</th>
                  <th className="p-3">الافتتاحي</th>
                  <th className="p-3">المشتريات</th>
                  <th className="p-3">الاستهلاك</th>
                  <th className="p-3">المتبقي</th>
                  <th className="p-3">القيمة</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="p-3 text-slate-400">{i + 1}</td>
                    <td className="p-3 font-medium text-slate-800">{m.name_ar}</td>
                    <td className="p-3 text-slate-600">{m.category?.name_ar || '—'}</td>
                    <td className="p-3 text-slate-600">{formatCurrency(m.unit_price)}</td>
                    <td className="p-3 text-slate-600">{formatNumber(m.opening_quantity, 3)}</td>
                    <td className="p-3 text-emerald-600">{formatNumber(m.total_purchases, 3)}</td>
                    <td className="p-3 text-red-600">{formatNumber(m.total_consumption, 3)}</td>
                    <td className="p-3 font-bold text-slate-800">{formatNumber(m.remaining_quantity, 3)}</td>
                    <td className="p-3 text-slate-700">{formatCurrency(m.remaining_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (reportType === 'monthly') {
    const breakfastItems = monthItems.filter((i) => i.meal_type === 'breakfast');
    const lunchItems = monthItems.filter((i) => i.meal_type === 'lunch');
    const dinnerItems = monthItems.filter((i) => i.meal_type === 'dinner');
    const breakfastTotal = breakfastItems.reduce((s, i) => s + Number(i.amount), 0);
    const lunchTotal = lunchItems.reduce((s, i) => s + Number(i.amount), 0);
    const dinnerTotal = dinnerItems.reduce((s, i) => s + Number(i.amount), 0);
    const monthTotal = breakfastTotal + lunchTotal + dinnerTotal;

    const rows: string[][] = [
      ['الفطور', formatCurrency(breakfastTotal), String(breakfastItems.length)],
      ['الغداء', formatCurrency(lunchTotal), String(lunchItems.length)],
      ['العشاء', formatCurrency(dinnerTotal), String(dinnerItems.length)],
    ];
    const totals = ['المجموع', formatCurrency(monthTotal), String(monthItems.length)];

    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => printReport(`تقرير شهري - ${ARABIC_MONTHS[month - 1]} ${year}`, ['الوجبة', 'المصاريف', 'عدد المواد'], rows, totals, settings)}
            className="btn btn-primary"
          >
            <Printer className="w-4 h-4" /> طباعة
          </button>
        </div>
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            تقرير شهري - {ARABIC_MONTHS[month - 1]} {year}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header text-right">
                <th className="p-3">الوجبة</th>
                <th className="p-3">المصاريف</th>
                <th className="p-3">عدد المواد</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{r[0]}</td>
                  <td className="p-3 text-slate-700">{r[1]}</td>
                  <td className="p-3 text-slate-700">{r[2]}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-800">
                <td className="p-3">{totals[0]}</td>
                <td className="p-3">{totals[1]}</td>
                <td className="p-3">{totals[2]}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  if (reportType === 'material') {
    const mat = materials.find((m) => m.id === selectedMaterial);
    return (
      <div className="space-y-3">
        <select value={selectedMaterial} onChange={(e) => onSelectMaterial(e.target.value)} className="select max-w-md">
          <option value="">— اختر مادة —</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.name_ar} ({m.name_fr})</option>
          ))}
        </select>
        {mat && (
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">تقرير المادة: {mat.name_ar}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-500">الرصيد الافتتاحي</div>
                <div className="text-lg font-bold text-slate-800 mt-1">{formatNumber(mat.opening_quantity, 3)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-500">المشتريات</div>
                <div className="text-lg font-bold text-emerald-600 mt-1">{formatNumber(mat.total_purchases, 3)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-500">الاستهلاك</div>
                <div className="text-lg font-bold text-red-600 mt-1">{formatNumber(mat.total_consumption, 3)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-500">المتبقي</div>
                <div className="text-lg font-bold text-slate-800 mt-1">{formatNumber(mat.remaining_quantity, 3)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-500">القيمة</div>
                <div className="text-lg font-bold text-teal-600 mt-1">{formatCurrency(mat.remaining_value)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (reportType === 'category') {
    const cat = categories.find((c) => c.id === selectedCategory);
    const catMaterials = cat ? materials.filter((m) => m.category_id === cat.id) : [];
    const catValue = catMaterials.reduce((s, m) => s + m.remaining_value, 0);
    const catConsumption = catMaterials.reduce((s, m) => s + m.total_consumption * m.unit_price, 0);
    return (
      <div className="space-y-3">
        <select value={selectedCategory} onChange={(e) => onSelectCategory(e.target.value)} className="select max-w-md">
          <option value="">— اختر تصنيف —</option>
          {categories.filter((c) => c.is_active).map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar}</option>
          ))}
        </select>
        {cat && (
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">تقرير التصنيف: {cat.name_ar}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-500">عدد المواد</div>
                <div className="text-lg font-bold text-slate-800 mt-1">{catMaterials.length}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-500">قيمة المخزون</div>
                <div className="text-lg font-bold text-teal-600 mt-1">{formatCurrency(catValue)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-500">قيمة الاستهلاك</div>
                <div className="text-lg font-bold text-red-600 mt-1">{formatCurrency(catConsumption)}</div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header text-right">
                  <th className="p-3">المادة</th>
                  <th className="p-3">المتبقي</th>
                  <th className="p-3">القيمة</th>
                </tr>
              </thead>
              <tbody>
                {catMaterials.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="p-3 font-medium text-slate-800">{m.name_ar}</td>
                    <td className="p-3 text-slate-600">{formatNumber(m.remaining_quantity, 3)}</td>
                    <td className="p-3 text-slate-700">{formatCurrency(m.remaining_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (reportType === 'purchases') {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button onClick={() => exportPurchasesToExcel(purchases)} className="btn btn-secondary">
            <Download className="w-4 h-4" /> تصدير Excel
          </button>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header text-right">
                  <th className="p-3">رقم</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">المادة</th>
                  <th className="p-3">الكمية</th>
                  <th className="p-3">السعر</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">المورد</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p, i) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="p-3 text-slate-400">{i + 1}</td>
                    <td className="p-3 text-slate-600">{p.purchase_date}</td>
                    <td className="p-3 font-medium text-slate-800">{p.material?.name_ar || '—'}</td>
                    <td className="p-3 text-slate-600">{formatNumber(p.quantity, 3)}</td>
                    <td className="p-3 text-slate-600">{formatCurrency(p.unit_price)}</td>
                    <td className="p-3 font-medium text-slate-800">{formatCurrency(p.amount)}</td>
                    <td className="p-3 text-slate-600">{p.supplier || '—'}</td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">لا توجد مشتريات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (reportType === 'movements') {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button onClick={() => exportStockMovementsToExcel(movements)} className="btn btn-secondary">
            <Download className="w-4 h-4" /> تصدير Excel
          </button>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header text-right">
                  <th className="p-3">رقم</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">المادة</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">نوع العملية</th>
                  <th className="p-3">الكمية</th>
                  <th className="p-3">السعر</th>
                  <th className="p-3">القيمة</th>
                  <th className="p-3">اليوم</th>
                  <th className="p-3">الوجبة</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="p-3 text-slate-400">{i + 1}</td>
                    <td className="p-3 text-slate-600">{formatDate(m.created_at)}</td>
                    <td className="p-3 font-medium text-slate-800">{m.material?.name_ar || '—'}</td>
                    <td className="p-3 text-slate-600">{m.material?.category?.name_ar || '—'}</td>
                    <td className="p-3 text-slate-600">{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</td>
                    <td className="p-3 text-slate-600">{formatNumber(m.quantity, 3)}</td>
                    <td className="p-3 text-slate-600">{formatCurrency(m.unit_price)}</td>
                    <td className="p-3 text-slate-700">{formatCurrency(m.value)}</td>
                    <td className="p-3 text-slate-600">{m.day_number || '—'}</td>
                    <td className="p-3 text-slate-600">{m.meal_type ? MEAL_LABELS[m.meal_type] : '—'}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-400">لا توجد حركات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (reportType === 'daily') {
    return (
      <div className="card p-5">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">تقرير الاستهلاك اليومي</h3>
        <p className="text-sm text-slate-500">
          لعرض تقرير الاستهلاك اليومي، انتقل إلى صفحة الاستهلاك اليومي واختر اليوم، ثم استخدم أزرار الطباعة.
        </p>
      </div>
    );
  }

  if (reportType === 'stockcard') {
    return (
      <div className="card p-5">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">بطاقة متابعة المخزون</h3>
        <p className="text-sm text-slate-500">
          لعرض وطباعة بطاقة متابعة المخزون، انتقل إلى صفحة "بطاقة متابعة المخزون" من القائمة الرئيسية.
        </p>
      </div>
    );
  }

  return null;
}
