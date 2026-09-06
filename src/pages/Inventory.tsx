import { useEffect, useState } from 'react';
import {
  Boxes,
  Search,
  Download,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { getMaterialsWithStock, getCategories } from '@/lib/db';
import { exportInventoryToExcel } from '@/lib/excel';
import { formatNumber, formatCurrency, getStockStatus } from '@/lib/format';
import type { MaterialWithStock, Category } from '@/types';

export default function Inventory() {
  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mats, cats] = await Promise.all([getMaterialsWithStock(), getCategories()]);
      setMaterials(mats);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = materials.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      m.name_ar.toLowerCase().includes(q) ||
      m.name_fr.toLowerCase().includes(q);
    const matchCategory = !filterCategory || m.category_id === filterCategory;
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'low' && m.remaining_quantity > 0 && m.remaining_quantity < m.min_stock) ||
      (filterStatus === 'out' && m.remaining_quantity <= 0);
    return matchSearch && matchCategory && matchStatus;
  });

  const totalValue = filtered.reduce((s, m) => s + m.remaining_value, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Boxes className="w-7 h-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-slate-800">المخزون</h1>
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {filtered.length} مادة
          </span>
        </div>
        <button onClick={() => exportInventoryToExcel(materials)} className="btn btn-secondary">
          <Download className="w-4 h-4" />
          تصدير Excel
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="text-sm text-slate-500">القيمة الإجمالية</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(totalValue)}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-slate-500">مواد جيدة</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {materials.filter((m) => m.remaining_quantity > m.min_stock).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-slate-500">مخزون منخفض</div>
          <div className="text-xl font-bold text-amber-600 mt-1">
            {materials.filter((m) => m.remaining_quantity > 0 && m.remaining_quantity < m.min_stock).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-slate-500">نفدت</div>
          <div className="text-xl font-bold text-red-600 mt-1">
            {materials.filter((m) => m.remaining_quantity <= 0).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالعربية أو الفرنسية..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pr-10"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="select w-auto">
          <option value="">كل التصنيفات</option>
          {categories.filter((c) => c.is_active).map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'low' | 'out')} className="select w-auto">
          <option value="all">كل الحالات</option>
          <option value="low">مخزون منخفض</option>
          <option value="out">نفدت</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header text-right">
                <th className="p-3">الرقم</th>
                <th className="p-3">الاسم بالفرنسية</th>
                <th className="p-3">الاسم بالعربية</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">الوحدة</th>
                <th className="p-3">سعر الوحدة</th>
                <th className="p-3">الكمية الافتتاحية</th>
                <th className="p-3">المشتريات</th>
                <th className="p-3">الاستهلاك</th>
                <th className="p-3">المتبقي</th>
                <th className="p-3">قيمة المخزون</th>
                <th className="p-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const status = getStockStatus(m.remaining_quantity, m.min_stock);
                return (
                  <tr key={m.id} className="table-row border-b border-slate-100">
                    <td className="p-3 text-slate-400">{i + 1}</td>
                    <td className="p-3 font-medium text-slate-700">{m.name_fr}</td>
                    <td className="p-3 font-medium text-slate-800">{m.name_ar}</td>
                    <td className="p-3 text-slate-600">{m.category?.name_ar || '—'}</td>
                    <td className="p-3 text-slate-600">{m.unit?.name_ar || '—'}</td>
                    <td className="p-3 text-slate-600">{formatCurrency(m.unit_price)}</td>
                    <td className="p-3 text-slate-600">{formatNumber(m.opening_quantity, 3)}</td>
                    <td className="p-3 text-emerald-600">{formatNumber(m.total_purchases, 3)}</td>
                    <td className="p-3 text-red-600">{formatNumber(m.total_consumption, 3)}</td>
                    <td className="p-3 font-bold text-slate-800">{formatNumber(m.remaining_quantity, 3)}</td>
                    <td className="p-3 font-medium text-slate-700">{formatCurrency(m.remaining_value)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                        <span className={`text-xs ${status.color}`}>{status.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    لا توجد مواد في المخزون.
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-800">
                  <td colSpan={10} className="p-3 text-left">المجموع</td>
                  <td className="p-3">{formatCurrency(totalValue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
