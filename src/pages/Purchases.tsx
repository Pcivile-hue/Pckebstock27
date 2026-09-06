import { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Download,
  X,
  Save,
  Search,
} from 'lucide-react';
import {
  getPurchases,
  createPurchase,
  deletePurchase,
  getMaterials,
  addStockMovement,
  addOperationLog,
} from '@/lib/db';
import { exportPurchasesToExcel } from '@/lib/excel';
import { formatCurrency, formatNumber, ARABIC_MONTHS } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Purchase, Material } from '@/types';

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [filterMonth, filterYear]);

  const loadData = async () => {
    try {
      const [purs, mats] = await Promise.all([
        getPurchases(filterMonth, filterYear),
        getMaterials(true),
      ]);
      setPurchases(purs);
      setMaterials(mats);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, purchase: Purchase) => {
    if (!confirm('هل أنت متأكد من حذف هذا الشراء؟ سيتم إعادة الكمية للمخزون.')) return;
    try {
      await deletePurchase(id);
      await supabase.from('stock_movements').delete().eq('reference_id', id).eq('reference_type', 'purchase');
      await addOperationLog('حذف شراء', `تم حذف شراء: ${purchase.material?.name_ar || ''}`);
      loadData();
    } catch (err) {
      alert('فشل الحذف: ' + (err as Error).message);
    }
  };

  const totalAmount = purchases.reduce((s, p) => s + Number(p.amount), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-7 h-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-slate-800">المشتريات</h1>
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {purchases.length} عملية
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            إضافة شراء
          </button>
          <button onClick={() => exportPurchasesToExcel(purchases)} className="btn btn-secondary">
            <Download className="w-4 h-4" />
            تصدير Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="select w-auto">
          {ARABIC_MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="select w-auto">
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header text-right">
                <th className="p-3">الرقم</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">المادة</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">الكمية</th>
                <th className="p-3">سعر الوحدة</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">رقم الوثيقة</th>
                <th className="p-3">المورد</th>
                <th className="p-3">ملاحظات</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p, i) => (
                <tr key={p.id} className="table-row border-b border-slate-100">
                  <td className="p-3 text-slate-400">{i + 1}</td>
                  <td className="p-3 text-slate-600">{p.purchase_date}</td>
                  <td className="p-3 font-medium text-slate-800">{p.material?.name_ar || '—'}</td>
                  <td className="p-3 text-slate-600">{p.material?.category?.name_ar || '—'}</td>
                  <td className="p-3 text-slate-600">{formatNumber(p.quantity, 3)}</td>
                  <td className="p-3 text-slate-600">{formatCurrency(p.unit_price)}</td>
                  <td className="p-3 font-medium text-slate-800">{formatCurrency(p.amount)}</td>
                  <td className="p-3 text-slate-600">{p.document_number || '—'}</td>
                  <td className="p-3 text-slate-600">{p.supplier || '—'}</td>
                  <td className="p-3 text-slate-600 max-w-32 truncate">{p.notes || '—'}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(p.id, p)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    لا توجد مشتريات في هذا الشهر.
                  </td>
                </tr>
              )}
            </tbody>
            {purchases.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-800">
                  <td colSpan={6} className="p-3 text-left">المجموع</td>
                  <td className="p-3">{formatCurrency(totalAmount)}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showModal && (
        <PurchaseModal
          materials={materials}
          month={filterMonth}
          year={filterYear}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function PurchaseModal({
  materials,
  month,
  year,
  onClose,
  onSaved,
}: {
  materials: Material[];
  month: number;
  year: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [search, setSearch] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
  );
  const [documentNumber, setDocumentNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = materials.filter((m) =>
    m.name_ar.toLowerCase().includes(search.toLowerCase()) ||
    m.name_fr.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMaterial = materials.find((m) => m.id === materialId);
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || (selectedMaterial?.unit_price ?? 0);
  const amount = qty * price;

  const handleSave = async () => {
    if (!materialId) {
      alert('الرجاء اختيار مادة');
      return;
    }
    if (qty <= 0) {
      alert('الرجاء إدخال كمية صحيحة');
      return;
    }
    setSaving(true);
    try {
      const purchase = await createPurchase({
        material_id: materialId,
        quantity: qty,
        unit_price: price,
        amount,
        document_number: documentNumber || null,
        supplier: supplier || null,
        purchase_date: purchaseDate,
        month,
        year,
        notes: notes || null,
      });
      await addStockMovement({
        material_id: materialId,
        movement_type: 'purchase',
        quantity: qty,
        unit_price: price,
        value: amount,
        reference_id: purchase.id,
        reference_type: 'purchase',
        month,
        year,
        notes: `شراء: ${supplier || ''}`,
      });
      await addOperationLog('إضافة شراء', `تم إضافة شراء: ${selectedMaterial?.name_ar || ''} - ${qty} ${selectedMaterial?.unit?.name_ar || ''}`);
      onSaved();
    } catch (err) {
      alert('فشل الحفظ: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">إضافة شراء جديد</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">المادة</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <input
                type="text"
                placeholder="بحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pr-10 mb-2"
              />
            </div>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="select">
              <option value="">— اختر مادة —</option>
              {filtered.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name_ar} ({m.name_fr})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">الكمية</label>
              <input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">سعر الوحدة (دج)</label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder={selectedMaterial?.unit_price?.toString() || ''}
                className="input"
              />
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <span className="text-slate-500">المبلغ: </span>
            <span className="font-bold text-slate-800">{formatCurrency(amount)}</span>
          </div>
          <div>
            <label className="label">التاريخ</label>
            <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">رقم الوثيقة/الفاتورة</label>
              <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">المورد</label>
              <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 justify-center">
            <Save className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
