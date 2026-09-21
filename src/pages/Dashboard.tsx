import { useEffect, useState } from 'react';
import {
  Package,
  Boxes,
  ShoppingCart,
  UtensilsCrossed,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Calendar,
  ArrowLeft,
  LayoutDashboard,
  ClipboardList,
  FileBarChart,
  Printer,
  Database,
  Settings as SettingsIcon,
} from 'lucide-react';
import { getMaterialsWithStock, getConsumptionItemsByMonth, getPurchases, getSettings } from '@/lib/db';
import { formatCurrency, formatNumber, daysInMonth } from '@/lib/format';
import { ARABIC_MONTHS, type Settings as SettingsType } from '@/types';
import type { PageKey } from '@/App';

interface DashboardProps {
  onNavigate: (page: PageKey) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    materialCount: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    todayConsumption: 0,
    monthConsumption: 0,
    breakfastCost: 0,
    lunchCost: 0,
    dinnerCost: 0,
    monthPurchases: 0,
    totalPurchases: 0,
    budget: 0,
    budgetRemaining: 0,
    recordedDays: 0,
    lastDay: 0,
    missingDays: 0,
  });
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [currentDay] = useState(new Date().getDate());

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const materials = await getMaterialsWithStock();
      const monthItems = await getConsumptionItemsByMonth(currentMonth, currentYear);
      const purchases = await getPurchases(currentMonth, currentYear);
      const allPurchases = await getPurchases();
      const settings = await getSettings();

      const todayItems = monthItems.filter((item: any) => {
        if (!item.consumption_day) return false;
        return item.consumption_day.day_number === currentDay;
      });

      const monthConsumption = monthItems.reduce((s: number, i: any) => s + Number(i.amount), 0);
      const todayConsumption = todayItems.reduce((s: number, i: any) => s + Number(i.amount), 0);
      const breakfastCost = monthItems
        .filter((i: any) => i.meal_type === 'breakfast')
        .reduce((s: number, i: any) => s + Number(i.amount), 0);
      const lunchCost = monthItems
        .filter((i: any) => i.meal_type === 'lunch')
        .reduce((s: number, i: any) => s + Number(i.amount), 0);
      const dinnerCost = monthItems
        .filter((i: any) => i.meal_type === 'dinner')
        .reduce((s: number, i: any) => s + Number(i.amount), 0);

      const monthPurchases = purchases.reduce((s: number, p: any) => s + Number(p.amount), 0);
      const totalPurchases = allPurchases.reduce((s: number, p: any) => s + Number(p.amount), 0);

      const lowStock = materials.filter((m) => m.remaining_quantity > 0 && m.remaining_quantity < m.min_stock).length;
      const outOfStock = materials.filter((m) => m.remaining_quantity <= 0).length;
      const totalValue = materials.reduce((s, m) => s + m.remaining_value, 0);

      const recordedDays = new Set(
        monthItems
          .filter((i: any) => i.consumption_day)
          .map((i: any) => i.consumption_day.day_number)
      ).size;
      const totalDaysInMonth = daysInMonth(currentMonth, currentYear);
      const missingDays = totalDaysInMonth - recordedDays;

      setStats({
        materialCount: materials.length,
        totalValue,
        lowStockCount: lowStock,
        outOfStockCount: outOfStock,
        todayConsumption,
        monthConsumption,
        breakfastCost,
        lunchCost,
        dinnerCost,
        monthPurchases,
        totalPurchases,
        budget: settings.total_budget,
        budgetRemaining: settings.total_budget - monthPurchases,
        recordedDays,
        lastDay: recordedDays,
        missingDays: Math.max(0, missingDays),
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400 text-lg">جاري التحميل...</div>
      </div>
    );
  }

  const shortcuts: { key: PageKey; label: string; icon: typeof Package; color: string }[] = [
    { key: 'materials', label: 'إدارة المواد', icon: Package, color: 'bg-blue-50 text-blue-600' },
    { key: 'inventory', label: 'المخزون', icon: Boxes, color: 'bg-teal-50 text-teal-600' },
    { key: 'purchases', label: 'المشتريات', icon: ShoppingCart, color: 'bg-amber-50 text-amber-600' },
    { key: 'consumption', label: 'الاستهلاك اليومي', icon: UtensilsCrossed, color: 'bg-emerald-50 text-emerald-600' },
    { key: 'stockcard', label: 'بطاقة متابعة المخزون', icon: ClipboardList, color: 'bg-purple-50 text-purple-600' },
    { key: 'reports', label: 'التقارير', icon: FileBarChart, color: 'bg-indigo-50 text-indigo-600' },
    { key: 'print', label: 'الطباعة', icon: Printer, color: 'bg-slate-50 text-slate-600' },
    { key: 'data', label: 'استيراد / تصدير Excel', icon: Database, color: 'bg-cyan-50 text-cyan-600' },
    { key: 'settings', label: 'الإعدادات', icon: SettingsIcon, color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <LayoutDashboard className="w-7 h-7 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-800">لوحة التحكم</h1>
        <span className="text-sm text-slate-500 mr-2">
          {ARABIC_MONTHS[currentMonth - 1]} {currentYear}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Material count */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-slate-400">المخزون</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.materialCount}</div>
          <div className="text-sm text-slate-500 mt-1">عدد المواد</div>
        </div>

        {/* Total value */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
              <Boxes className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-xs text-slate-400">المخزون</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalValue)}</div>
          <div className="text-sm text-slate-500 mt-1">القيمة الإجمالية للمخزون</div>
        </div>

        {/* Low stock */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs text-slate-400">المخزون</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.lowStockCount}</div>
          <div className="text-sm text-slate-500 mt-1">مواد منخفضة المخزون</div>
        </div>

        {/* Out of stock */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-xs text-slate-400">المخزون</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.outOfStockCount}</div>
          <div className="text-sm text-slate-500 mt-1">مواد منتهية</div>
        </div>

        {/* Today consumption */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs text-slate-400">الاستهلاك</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.todayConsumption)}</div>
          <div className="text-sm text-slate-500 mt-1">إجمالي استهلاك اليوم</div>
        </div>

        {/* Month consumption */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs text-slate-400">الاستهلاك</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.monthConsumption)}</div>
          <div className="text-sm text-slate-500 mt-1">إجمالي استهلاك الشهر</div>
        </div>

        {/* Breakfast cost */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs text-slate-400">الاستهلاك</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.breakfastCost)}</div>
          <div className="text-sm text-slate-500 mt-1">تكلفة الفطور</div>
        </div>

        {/* Lunch cost */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs text-slate-400">الاستهلاك</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.lunchCost)}</div>
          <div className="text-sm text-slate-500 mt-1">تكلفة الغداء</div>
        </div>

        {/* Dinner cost */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs text-slate-400">الاستهلاك</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.dinnerCost)}</div>
          <div className="text-sm text-slate-500 mt-1">تكلفة العشاء</div>
        </div>

        {/* Month purchases */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-cyan-600" />
            </div>
            <span className="text-xs text-slate-400">المشتريات</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.monthPurchases)}</div>
          <div className="text-sm text-slate-500 mt-1">مشتريات الشهر</div>
        </div>

        {/* Total purchases */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-slate-400">المشتريات</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalPurchases)}</div>
          <div className="text-sm text-slate-500 mt-1">إجمالي المشتريات</div>
        </div>

        {/* Budget remaining */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-xs text-slate-400">المشتريات</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.budgetRemaining)}</div>
          <div className="text-sm text-slate-500 mt-1">المتبقي من الميزانية</div>
        </div>
      </div>

      {/* Days section */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">الأيام</h2>
          <span className="text-sm text-slate-500">
            {ARABIC_MONTHS[currentMonth - 1]} {currentYear}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-800">{stats.recordedDays}</div>
            <div className="text-sm text-slate-500 mt-1">عدد الأيام المسجلة</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-800">{stats.lastDay || '—'}</div>
            <div className="text-sm text-slate-500 mt-1">آخر يوم تم تسجيله</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-800">{stats.missingDays}</div>
            <div className="text-sm text-slate-500 mt-1">أيام لم يسجل فيها الاستهلاك</div>
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">اختصارات</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => onNavigate(s.key)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-slate-600 text-center">{s.label}</span>
                <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
