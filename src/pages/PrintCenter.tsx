import { useEffect, useState } from 'react';
import { Printer, FileText } from 'lucide-react';
import { getMaterialsWithStock, getSettings, getConsumptionItemsByMonth, getMealPeopleCounts, getOrCreateConsumptionDay } from '@/lib/db';
import { printInventory, printReport } from '@/lib/print';
import { formatCurrency, formatNumber, ARABIC_MONTHS } from '@/lib/format';
import { MEAL_LABELS } from '@/types';
import type { MaterialWithStock, Settings as SettingsType, ConsumptionItem, MealType } from '@/types';

export default function PrintCenter() {
  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [day, setDay] = useState(new Date().getDate());
  const [monthItems, setMonthItems] = useState<ConsumptionItem[]>([]);
  const [peopleCounts, setPeopleCounts] = useState<Record<MealType, number>>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadDayData();
  }, [day, month, year]);

  const loadData = async () => {
    try {
      const [mats, sett] = await Promise.all([getMaterialsWithStock(), getSettings()]);
      setMaterials(mats);
      setSettings(sett);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDayData = async () => {
    try {
      const items = await getConsumptionItemsByMonth(month, year);
      setMonthItems(items);
      const dayRecord = await getOrCreateConsumptionDay(day, month, year);
      const counts = await getMealPeopleCounts(dayRecord.id);
      const countsMap: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0 };
      for (const c of counts) {
        countsMap[c.meal_type] = c.people_count;
      }
      setPeopleCounts(countsMap);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">جاري التحميل...</div>;
  }

  const dayItems = monthItems.filter((i) => {
    if (!i.consumption_day) return false;
    return i.consumption_day.day_number === day;
  });

  const handlePrintInventory = () => {
    printInventory(materials, settings);
  };

  const handlePrintMeal = (meal: MealType) => {
    const items = dayItems.filter((i) => i.meal_type === meal);
    import('@/lib/print').then((m) =>
      m.printMeal(items, meal, day, month, year, peopleCounts[meal], settings)
    );
  };

  const handlePrintDay = () => {
    import('@/lib/print').then((m) =>
      m.printDay(dayItems, day, month, year, peopleCounts, settings)
    );
  };

  const handlePrintMonthlySummary = () => {
    const breakfastTotal = monthItems.filter((i) => i.meal_type === 'breakfast').reduce((s, i) => s + Number(i.amount), 0);
    const lunchTotal = monthItems.filter((i) => i.meal_type === 'lunch').reduce((s, i) => s + Number(i.amount), 0);
    const dinnerTotal = monthItems.filter((i) => i.meal_type === 'dinner').reduce((s, i) => s + Number(i.amount), 0);
    const total = breakfastTotal + lunchTotal + dinnerTotal;
    const rows: string[][] = [
      ['الفطور', formatCurrency(breakfastTotal)],
      ['الغداء', formatCurrency(lunchTotal)],
      ['العشاء', formatCurrency(dinnerTotal)],
    ];
    printReport(`تقرير شهري - ${ARABIC_MONTHS[month - 1]} ${year}`, ['الوجبة', 'المصاريف'], rows, ['المجموع', formatCurrency(total)], settings);
  };

  const totalDays = new Date(year, month, 0).getDate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Printer className="w-7 h-7 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-800">مركز الطباعة</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inventory report */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-800">تقرير المخزون</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">طباعة تقرير المخزون الكامل مع جميع المواد والكميات والقيم.</p>
          <button onClick={handlePrintInventory} className="btn btn-primary w-full justify-center">
            <Printer className="w-4 h-4" /> طباعة تقرير المخزون
          </button>
        </div>

        {/* Daily consumption */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-800">طباعة الاستهلاك اليومي</h3>
          </div>
          <div className="flex gap-2 mb-3">
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="select">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>يوم {d}</option>
              ))}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="select">
              {ARABIC_MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="select">
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handlePrintMeal('breakfast')} className="btn btn-secondary justify-center">
              طباعة الفطور
            </button>
            <button onClick={() => handlePrintMeal('lunch')} className="btn btn-secondary justify-center">
              طباعة الغداء
            </button>
            <button onClick={() => handlePrintMeal('dinner')} className="btn btn-secondary justify-center">
              طباعة العشاء
            </button>
            <button onClick={handlePrintDay} className="btn btn-primary justify-center">
              طباعة اليوم كاملاً
            </button>
          </div>
        </div>

        {/* Monthly summary */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-800">تقرير شهري</h3>
          </div>
          <div className="flex gap-2 mb-3">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="select">
              {ARABIC_MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="select">
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button onClick={handlePrintMonthlySummary} className="btn btn-primary w-full justify-center">
            <Printer className="w-4 h-4" /> طباعة التقرير الشهري
          </button>
        </div>

        {/* Stock card */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-800">بطاقة متابعة المخزون</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            لطباعة بطاقة متابعة المخزون، انتقل إلى صفحة "بطاقة متابعة المخزون" واستخدم زر الطباعة هناك.
          </p>
        </div>
      </div>
    </div>
  );
}
