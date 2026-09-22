import { useEffect, useState, useMemo } from 'react';
import { ClipboardList, Printer, Download, FileText } from 'lucide-react';
import { getMaterialsWithStock, getCategories, getPurchases, getSettings, getStockMovementsByMonth, getStockMovements } from '@/lib/db';
import { exportStockCardToExcel } from '@/lib/excel';
import { printStockCard, printMaterialMonthlySheet } from '@/lib/print';
import { formatCurrency, formatNumber, ARABIC_MONTHS } from '@/lib/format';
import type { MaterialWithStock, Category, Purchase, Settings as SettingsType, StockMovement } from '@/types';

interface CategoryRow {
  name: string;
  previous: number;
  purchases: number;
  consumption: number;
  remaining: number;
}

interface MaterialDayRow {
  day: number;
  date: string;
  reference: string;
  source: string;
  input: number;
  output: number;
  balance: number;
  notes: string;
}

export default function StockCard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'category' | 'material'>('category');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    try {
      const [cats, mats, purs, movs, allMovs, sett] = await Promise.all([
        getCategories(),
        getMaterialsWithStock(),
        getPurchases(month, year),
        getStockMovementsByMonth(month, year),
        getStockMovements(),
        getSettings(),
      ]);
      setCategories(cats);
      setMaterials(mats);
      setPurchases(purs);
      setMovements(movs);
      setAllMovements(allMovs);
      setSettings(sett);
      if (!selectedMaterialId && mats.length > 0) setSelectedMaterialId(mats[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildCategoryRows = (): CategoryRow[] => {
    const activeCats = categories.filter((c) => c.is_active);
    return activeCats.map((cat) => {
      const catMaterials = materials.filter((m) => m.category_id === cat.id);
      const previous = catMaterials.reduce((s, m) => s + m.remaining_value, 0);

      const catPurchases = purchases
        .filter((p) => p.material?.category_id === cat.id)
        .reduce((s, p) => s + Number(p.amount), 0);

      const catConsumption = movements
        .filter((m) => m.movement_type === 'consumption' && m.material?.category_id === cat.id)
        .reduce((s, m) => s + Number(m.value), 0);

      const remaining = previous + catPurchases - catConsumption;

      return {
        name: cat.name_ar,
        previous,
        purchases: catPurchases,
        consumption: catConsumption,
        remaining,
      };
    });
  };

  const buildMaterialDayRows = (): MaterialDayRow[] => {
    if (!selectedMaterialId) return [];
    const material = materials.find((m) => m.id === selectedMaterialId);
    if (!material) return [];

    const openingQty = Number(material.opening_quantity);

    const priorMovements = allMovements.filter(
      (m) => m.material_id === selectedMaterialId && m.year !== null && m.year !== undefined &&
        (m.year < year || (m.year === year && (m.month ?? 0) < month))
    );
    let priorBalance = openingQty;
    for (const m of priorMovements) {
      if (m.movement_type === 'consumption') priorBalance -= Number(m.quantity);
      else priorBalance += Number(m.quantity);
    }

    const monthMovements = movements
      .filter((m) => m.material_id === selectedMaterialId)
      .sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0) || (a.created_at < b.created_at ? -1 : 1));

    const rows: MaterialDayRow[] = [];
    let balance = priorBalance;

    rows.push({
      day: 0,
      date: '',
      reference: 'رصيد مفتتح',
      source: '',
      input: 0,
      output: 0,
      balance,
      notes: `الرصيد السابق: ${formatNumber(balance, 3)}`,
    });

    for (const m of monthMovements) {
      const qty = Number(m.quantity);
      let input = 0;
      let output = 0;
      let source = '';

      if (m.movement_type === 'consumption') {
        output = qty;
        source = m.meal_type ? `استهلاك - ${m.meal_type}` : 'استهلاك';
      } else if (m.movement_type === 'purchase') {
        input = qty;
        const purchase = purchases.find((p) => p.id === m.reference_id);
        source = purchase?.supplier || 'شراء';
      } else if (m.movement_type === 'opening') {
        input = qty;
        source = 'رصيد افتتاحي';
      } else if (m.movement_type === 'return') {
        input = qty;
        source = 'إرجاع';
      } else {
        input = qty;
        source = m.movement_type;
      }

      balance += input - output;

      rows.push({
        day: m.day_number ?? 0,
        date: m.day_number ? `${m.day_number}/${month}/${year}` : '',
        reference: m.reference_type === 'purchase' ? (purchases.find((p) => p.id === m.reference_id)?.document_number || '') : (m.reference_type || ''),
        source,
        input,
        output,
        balance,
        notes: m.notes || '',
      });
    }

    return rows;
  };

  const rows = buildCategoryRows();
  const totalPrevious = rows.reduce((s, r) => s + r.previous, 0);
  const totalPurchases = rows.reduce((s, r) => s + r.purchases, 0);
  const totalConsumption = rows.reduce((s, r) => s + r.consumption, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);
  const budget = settings?.total_budget || 0;
  const remainingBudget = budget - totalPurchases;

  const materialRows = useMemo(() => buildMaterialDayRows(), [selectedMaterialId, movements, purchases, materials, allMovements, month, year]);
  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">جاري التحميل...</div>;
  }

  const handlePrint = () => {
    printStockCard(rows, month, year, budget, totalPurchases, remainingBudget, settings);
  };

  const handleExport = () => {
    exportStockCardToExcel(rows, month, year, budget);
  };

  const handleMaterialPrint = () => {
    if (!selectedMaterial) return;
    printMaterialMonthlySheet(
      selectedMaterial.name_ar,
      selectedMaterial.unit?.name_ar || '',
      materialRows,
      month,
      year,
      settings
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-slate-800">بطاقة متابعة المخزون</h1>
        </div>
        <div className="flex flex-wrap gap-2">
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
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('category')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'category' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          بطاقة التصنيفات
        </button>
        <button
          onClick={() => setActiveTab('material')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'material' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          ورقة المادة في الشهر
        </button>
      </div>

      {activeTab === 'category' && (
        <>
          {/* Budget summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="text-sm text-slate-500">الميزانية الإجمالية</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(budget)}</div>
            </div>
            <div className="stat-card">
              <div className="text-sm text-slate-500">المشتريات الشهرية</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(totalPurchases)}</div>
            </div>
            <div className="stat-card">
              <div className="text-sm text-slate-500">المتبقي من الميزانية</div>
              <div className="text-2xl font-bold text-teal-600 mt-1">{formatCurrency(remainingBudget)}</div>
            </div>
          </div>

          {/* Card header preview */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button onClick={handlePrint} className="btn btn-primary">
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>
                <button onClick={handleExport} className="btn btn-secondary">
                  <Download className="w-4 h-4" />
                  تصدير Excel
                </button>
              </div>
            </div>
            <div className="text-center mb-4">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="logo" style={{ width: settings.logo_size, height: 'auto' }} className="mx-auto mb-2" />
              )}
              <div className="font-semibold text-sm">{settings?.header_republic}</div>
              <div className="text-xs text-slate-600">{settings?.header_ministry}</div>
              <div className="text-xs text-slate-600">{settings?.header_directorate}</div>
              <div className="text-xs text-slate-600">{settings?.header_unit}</div>
              <div className="text-xs text-slate-600">{settings?.header_department}</div>
              <hr className="my-2 border-slate-300" />
              <h2 className="text-lg font-bold text-slate-800">{settings?.card_title}</h2>
              <div className="text-sm text-slate-500">
                شهر: {ARABIC_MONTHS[month - 1]} {year}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header text-right">
                    <th className="p-3">المادة / التصنيف</th>
                    <th className="p-3">المبلغ المتبقي من الشهر السابق</th>
                    <th className="p-3">المشتريات خلال الشهر</th>
                    <th className="p-3">الاستهلاك خلال الشهر</th>
                    <th className="p-3">المبلغ المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{row.name}</td>
                      <td className="p-3 text-slate-600">{formatCurrency(row.previous)}</td>
                      <td className="p-3 text-emerald-600">{formatCurrency(row.purchases)}</td>
                      <td className="p-3 text-red-600">{formatCurrency(row.consumption)}</td>
                      <td className="p-3 font-bold text-slate-800">{formatCurrency(row.remaining)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">لا توجد بيانات</td>
                    </tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-800">
                      <td className="p-3">المجموع</td>
                      <td className="p-3">{formatCurrency(totalPrevious)}</td>
                      <td className="p-3">{formatCurrency(totalPurchases)}</td>
                      <td className="p-3">{formatCurrency(totalConsumption)}</td>
                      <td className="p-3">{formatCurrency(totalRemaining)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {settings?.show_signatures && (
              <div className="flex justify-around mt-8">
                <div className="text-center">
                  <div className="font-semibold text-sm">{settings.signature1_label}</div>
                  <div className="mt-10 border-t border-slate-400 w-36"></div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{settings.signature2_label}</div>
                  <div className="mt-10 border-t border-slate-400 w-36"></div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{settings.signature3_label}</div>
                  <div className="mt-10 border-t border-slate-400 w-36"></div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'material' && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-teal-600" />
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="select w-auto min-w-64"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name_ar}</option>
                ))}
              </select>
            </div>
            <button onClick={handleMaterialPrint} className="btn btn-primary">
              <Printer className="w-4 h-4" />
              طباعة
            </button>
          </div>

          {selectedMaterial && (
            <>
              <div className="text-center mb-4">
                {settings?.logo_url && (
                  <img src={settings.logo_url} alt="logo" style={{ width: settings.logo_size, height: 'auto' }} className="mx-auto mb-2" />
                )}
                <div className="font-semibold text-sm">{settings?.header_republic}</div>
                <div className="text-xs text-slate-600">{settings?.header_ministry}</div>
                <div className="text-xs text-slate-600">{settings?.header_directorate}</div>
                <div className="text-xs text-slate-600">{settings?.header_unit}</div>
                <hr className="my-2 border-slate-300" />
                <h2 className="text-lg font-bold text-slate-800">ورقة المادة في الشهر</h2>
                <div className="text-sm text-slate-600 mt-1">
                  المادة: <strong>{selectedMaterial.name_ar}</strong> | الوحدة: {selectedMaterial.unit?.name_ar || '—'} | شهر: {ARABIC_MONTHS[month - 1]} {year}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header text-right">
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">المرجع</th>
                      <th className="p-3">المورد / المصدر</th>
                      <th className="p-3 text-center">دخول</th>
                      <th className="p-3 text-center">خروج</th>
                      <th className="p-3 text-center">الرصيد</th>
                      <th className="p-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialRows.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${row.day === 0 ? 'bg-slate-50 font-medium' : ''}`}>
                        <td className="p-3 text-slate-700">{row.day === 0 ? '—' : row.date}</td>
                        <td className="p-3 text-slate-600">{row.reference || '—'}</td>
                        <td className="p-3 text-slate-600">{row.source || '—'}</td>
                        <td className="p-3 text-center text-emerald-600">{row.input > 0 ? formatNumber(row.input, 3) : '—'}</td>
                        <td className="p-3 text-center text-red-600">{row.output > 0 ? formatNumber(row.output, 3) : '—'}</td>
                        <td className="p-3 text-center font-bold text-slate-800">{formatNumber(row.balance, 3)}</td>
                        <td className="p-3 text-slate-500 text-xs">{row.notes || '—'}</td>
                      </tr>
                    ))}
                    {materialRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">لا توجد بيانات لهذه المادة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {settings?.show_signatures && (
                <div className="flex justify-around mt-8">
                  <div className="text-center">
                    <div className="font-semibold text-sm">{settings.signature1_label}</div>
                    <div className="mt-10 border-t border-slate-400 w-36"></div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">{settings.signature2_label}</div>
                    <div className="mt-10 border-t border-slate-400 w-36"></div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">{settings.signature3_label}</div>
                    <div className="mt-10 border-t border-slate-400 w-36"></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
