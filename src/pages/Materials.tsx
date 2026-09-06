import { useEffect, useState, useRef } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Search,
  Upload,
  Download,
  CheckSquare,
  Square,
  X,
  AlertCircle,
  CheckCircle,
  Edit2,
} from 'lucide-react';
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getCategories,
  getUnits,
  findMaterialByName,
  addStockMovement,
  addOperationLog,
} from '@/lib/db';
import { parseExcelFile, downloadMaterialTemplate, exportMaterialsToExcel } from '@/lib/excel';
import { formatNumber, formatCurrency } from '@/lib/format';
import type { Material, Category, Unit } from '@/types';
import type { ImportResult, ImportedMaterialRow } from '@/lib/excel';

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mats, cats, uns] = await Promise.all([
        getMaterials(),
        getCategories(),
        getUnits(),
      ]);
      setMaterials(mats);
      setCategories(cats);
      setUnits(uns);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = materials.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name_ar.toLowerCase().includes(q) ||
      m.name_fr.toLowerCase().includes(q) ||
      (m.category?.name_ar || '').toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} مادة؟`)) return;
    try {
      for (const id of selectedIds) {
        await deleteMaterial(id);
      }
      await addOperationLog('حذف مواد', `تم حذف ${selectedIds.size} مادة`);
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      alert('فشل الحذف: ' + (err as Error).message);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const result = await parseExcelFile(file);
      setImportResult(result);
      if (result.missingColumns.length > 0) {
        setImportMessage({
          type: 'error',
          text: `ملف Excel غير صالح: العمود "${result.missingColumns[0]}" مفقود.`,
        });
      } else {
        setImportMessage(null);
      }
    } catch (err) {
      setImportMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!importResult) return;
    setImporting(true);
    let added = 0;
    let updated = 0;
    let skipped = 0;

    try {
      for (const row of importResult.rows) {
        if (row.errors.length > 0) {
          skipped++;
          continue;
        }

        let category = categories.find((c) => c.name_ar === row.category || c.name_fr === row.category);
        if (!category) {
          // Create category if it doesn't exist
          const { data: newCat } = await import('@/lib/supabase').then((m) =>
            m.supabase.from('categories').insert({ name_ar: row.category, name_fr: row.category }).select('*').single()
          );
          category = newCat as Category;
          if (category) setCategories((prev) => [...prev, category!]);
        }

        let unit = units.find((u) => u.name_ar === row.unit || u.name_fr === row.unit);
        if (!unit) {
          const { data: newUnit } = await import('@/lib/supabase').then((m) =>
            m.supabase.from('units').insert({ name_ar: row.unit, name_fr: row.unit }).select('*').single()
          );
          unit = newUnit as Unit;
          if (unit) setUnits((prev) => [...prev, unit!]);
        }

        const existing = await findMaterialByName(row.name_fr, row.name_ar);
        if (existing) {
          await updateMaterial(existing.id, {
            unit_price: row.price,
            opening_quantity: row.quantity,
            category_id: category?.id,
            unit_id: unit?.id,
          });
          updated++;
        } else {
          const newMat = await createMaterial({
            name_fr: row.name_fr,
            name_ar: row.name_ar,
            category_id: category?.id,
            unit_id: unit?.id,
            unit_price: row.price,
            opening_quantity: row.quantity,
          });
          await addStockMovement({
            material_id: newMat.id,
            movement_type: 'opening',
            quantity: row.quantity,
            unit_price: row.price,
            value: row.quantity * row.price,
            notes: 'رصيد افتتاحي من استيراد Excel',
          });
          added++;
        }
      }

      await addOperationLog('استيراد مواد', `تم استيراد ${added} مادة جديدة، تحديث ${updated}، تجاهل ${skipped}`);
      setImportMessage({
        type: 'success',
        text: `تم الاستيراد بنجاح: ${added} مادة جديدة، ${updated} محدثة، ${skipped} متجاهلة.`,
      });
      setImportResult(null);
      loadData();
    } catch (err) {
      setImportMessage({ type: 'error', text: 'فشل الاستيراد: ' + (err as Error).message });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-slate-800">إدارة المواد</h1>
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {materials.length} مادة
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            إضافة مادة
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-success" disabled={importing}>
            <Upload className="w-4 h-4" />
            استيراد من Excel
          </button>
          <button onClick={downloadMaterialTemplate} className="btn btn-secondary">
            <Download className="w-4 h-4" />
            تحميل نموذج Excel
          </button>
          <button onClick={() => exportMaterialsToExcel(materials)} className="btn btn-secondary">
            <Download className="w-4 h-4" />
            تصدير Excel
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import message */}
      {importMessage && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            importMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {importMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm">{importMessage.text}</span>
          <button onClick={() => setImportMessage(null)} className="mr-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Import preview */}
      {importResult && (
        <div className="card p-5 border-2 border-teal-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">معاينة الاستيراد</h3>
              <p className="text-sm text-slate-500">
                تم العثور على {importResult.totalFound} مادة — {importResult.validCount} صالحة، {importResult.errorCount} بها أخطاء
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleImport} className="btn btn-primary" disabled={importing}>
                <CheckCircle className="w-4 h-4" />
                تأكيد الاستيراد
              </button>
              <button onClick={() => setImportResult(null)} className="btn btn-secondary">
                <X className="w-4 h-4" />
                إلغاء
              </button>
            </div>
          </div>

          {importResult.missingColumns.length > 0 ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
              ملف Excel غير صالح: العمود "{importResult.missingColumns.join('، ')}" مفقود.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header text-right">
                    <th className="p-2">الصف</th>
                    <th className="p-2">الاسم الفرنسي</th>
                    <th className="p-2">الاسم العربي</th>
                    <th className="p-2">التصنيف</th>
                    <th className="p-2">الوحدة</th>
                    <th className="p-2">السعر</th>
                    <th className="p-2">الكمية</th>
                    <th className="p-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.rows.map((row: ImportedMaterialRow, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${row.errors.length > 0 ? 'bg-red-50' : ''}`}>
                      <td className="p-2 text-slate-400">{row.rowIndex}</td>
                      <td className="p-2">{row.name_fr}</td>
                      <td className="p-2">{row.name_ar}</td>
                      <td className="p-2">{row.category}</td>
                      <td className="p-2">{row.unit}</td>
                      <td className="p-2">{formatNumber(row.price)}</td>
                      <td className="p-2">{formatNumber(row.quantity, 3)}</td>
                      <td className="p-2">
                        {row.errors.length > 0 ? (
                          <span className="text-red-600 text-xs">{row.errors.join('، ')}</span>
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Search and bulk actions */}
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
        <button onClick={toggleSelectAll} className="btn btn-secondary">
          {selectedIds.size === filtered.length && filtered.length > 0 ? (
            <>
              <Square className="w-4 h-4" />
              إلغاء تحديد الكل
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4" />
              تحديد الكل
            </>
          )}
        </button>
        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected} className="btn btn-danger">
            <Trash2 className="w-4 h-4" />
            حذف المحدد ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Materials table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header text-right">
                <th className="p-3 w-10"></th>
                <th className="p-3">الرقم</th>
                <th className="p-3">الاسم بالفرنسية</th>
                <th className="p-3">الاسم بالعربية</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">الوحدة</th>
                <th className="p-3">السعر</th>
                <th className="p-3">الكمية الافتتاحية</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className="table-row border-b border-slate-100">
                  <td className="p-3 text-center">
                    <button onClick={() => toggleSelect(m.id)}>
                      {selectedIds.has(m.id) ? (
                        <CheckSquare className="w-5 h-5 text-teal-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-slate-400">{i + 1}</td>
                  <td className="p-3 font-medium text-slate-700">{m.name_fr}</td>
                  <td className="p-3 font-medium text-slate-800">{m.name_ar}</td>
                  <td className="p-3 text-slate-600">{m.category?.name_ar || '—'}</td>
                  <td className="p-3 text-slate-600">{m.unit?.name_ar || '—'}</td>
                  <td className="p-3 text-slate-600">{formatCurrency(m.unit_price)}</td>
                  <td className="p-3 text-slate-600">{formatNumber(m.opening_quantity, 3)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingMaterial(m)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    لا توجد مواد. استورد ملف Excel أو أضف مادة يدوياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit modal */}
      {(showAddModal || editingMaterial) && (
        <MaterialModal
          material={editingMaterial}
          categories={categories}
          units={units}
          onClose={() => {
            setShowAddModal(false);
            setEditingMaterial(null);
          }}
          onSaved={() => {
            setShowAddModal(false);
            setEditingMaterial(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function MaterialModal({
  material,
  categories,
  units,
  onClose,
  onSaved,
}: {
  material: Material | null;
  categories: Category[];
  units: Unit[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nameFr, setNameFr] = useState(material?.name_fr || '');
  const [nameAr, setNameAr] = useState(material?.name_ar || '');
  const [categoryId, setCategoryId] = useState(material?.category_id || '');
  const [unitId, setUnitId] = useState(material?.unit_id || '');
  const [price, setPrice] = useState(material?.unit_price?.toString() || '');
  const [quantity, setQuantity] = useState(material?.opening_quantity?.toString() || '');
  const [minStock, setMinStock] = useState(material?.min_stock?.toString() || '0');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nameFr.trim() || !nameAr.trim()) {
      alert('الرجاء إدخال اسم المادة بالعربية والفرنسية');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name_fr: nameFr.trim(),
        name_ar: nameAr.trim(),
        category_id: categoryId || null,
        unit_id: unitId || null,
        unit_price: Number(price) || 0,
        opening_quantity: Number(quantity) || 0,
        min_stock: Number(minStock) || 0,
      };
      if (material) {
        await updateMaterial(material.id, data);
        await addOperationLog('تعديل مادة', `تم تعديل المادة: ${nameAr}`);
      } else {
        const newMat = await createMaterial(data);
        await addStockMovement({
          material_id: newMat.id,
          movement_type: 'opening',
          quantity: Number(quantity) || 0,
          unit_price: Number(price) || 0,
          value: (Number(quantity) || 0) * (Number(price) || 0),
          notes: 'رصيد افتتاحي',
        });
        await addOperationLog('إضافة مادة', `تم إضافة المادة: ${nameAr}`);
      }
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
          <h2 className="text-lg font-bold text-slate-800">
            {material ? 'تعديل مادة' : 'إضافة مادة جديدة'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">اسم المادة بالفرنسية</label>
            <input type="text" value={nameFr} onChange={(e) => setNameFr(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">الاسم بالعربية</label>
            <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">التصنيف</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="select">
                <option value="">— اختر —</option>
                {categories.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">الوحدة</label>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="select">
                <option value="">— اختر —</option>
                {units.filter((u) => u.is_active).map((u) => (
                  <option key={u.id} value={u.id}>{u.name_ar}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">السعر (دج)</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">الكمية الافتتاحية</label>
              <input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">حد التنبيه</label>
              <input type="number" step="0.001" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="input" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 justify-center">
            <CheckCircle className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
