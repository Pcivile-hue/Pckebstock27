import { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Plus,
  Trash2,
  Edit2,
  X,
  Upload,
  Building2,
  FileImage,
  Printer,
  Boxes,
  Package,
  CheckCircle,
} from 'lucide-react';
import {
  getSettings,
  updateSettings,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  addOperationLog,
} from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { DEFAULT_SETTINGS, type Settings as SettingsType, type Category, type Unit } from '@/types';
import { supabase } from '@/lib/supabase';

type Tab = 'unit' | 'header' | 'print' | 'stock' | 'materials';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('unit');
  const [settings, setSettings] = useState<SettingsType>({ ...DEFAULT_SETTINGS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [sett, cats, uns] = await Promise.all([getSettings(), getCategories(), getUnits()]);
      setSettings(sett);
      setCategories(cats);
      setUnits(uns);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      await addOperationLog('تعديل الإعدادات', 'تم تحديث إعدادات البرنامج');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('فشل الحفظ: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        setSettings({ ...settings, logo_url: dataUrl });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('فشل رفع الصورة: ' + (err as Error).message);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: 'unit', label: 'إعدادات الوحدة', icon: Building2 },
    { key: 'header', label: 'إعدادات الرأسية', icon: FileImage },
    { key: 'print', label: 'إعدادات الطباعة', icon: Printer },
    { key: 'stock', label: 'إعدادات المخزون', icon: Boxes },
    { key: 'materials', label: 'إعدادات المواد', icon: Package },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-slate-800">الإعدادات</h1>
        </div>
        {tab !== 'materials' && (
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            <Save className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'unit' && (
        <div className="card p-5 space-y-3 max-w-2xl">
          <div>
            <label className="label">اسم الوحدة</label>
            <input
              type="text"
              value={settings.unit_name}
              onChange={(e) => setSettings({ ...settings, unit_name: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">المديرية</label>
            <input
              type="text"
              value={settings.directorate}
              onChange={(e) => setSettings({ ...settings, directorate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">الولاية</label>
            <input
              type="text"
              value={settings.wilaya}
              onChange={(e) => setSettings({ ...settings, wilaya: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">المصلحة</label>
            <input
              type="text"
              value={settings.department}
              onChange={(e) => setSettings({ ...settings, department: e.target.value })}
              className="input"
            />
          </div>
        </div>
      )}

      {tab === 'header' && (
        <div className="card p-5 space-y-3 max-w-2xl">
          <div>
            <label className="label">الجمهورية</label>
            <input
              type="text"
              value={settings.header_republic}
              onChange={(e) => setSettings({ ...settings, header_republic: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">الوزارة</label>
            <input
              type="text"
              value={settings.header_ministry}
              onChange={(e) => setSettings({ ...settings, header_ministry: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">المديرية</label>
            <input
              type="text"
              value={settings.header_directorate}
              onChange={(e) => setSettings({ ...settings, header_directorate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">الوحدة</label>
            <input
              type="text"
              value={settings.header_unit}
              onChange={(e) => setSettings({ ...settings, header_unit: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">المصلحة</label>
            <input
              type="text"
              value={settings.header_department}
              onChange={(e) => setSettings({ ...settings, header_department: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">عنوان البطاقة</label>
            <input
              type="text"
              value={settings.card_title}
              onChange={(e) => setSettings({ ...settings, card_title: e.target.value })}
              className="input"
            />
          </div>

          {/* Logo */}
          <div className="pt-3 border-t border-slate-200">
            <label className="label">الشعار / الصورة</label>
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="logo"
                  style={{ width: settings.logo_size, height: 'auto' }}
                  className="rounded-lg border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <FileImage className="w-8 h-8" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="btn btn-secondary cursor-pointer">
                  <Upload className="w-4 h-4" />
                  رفع صورة
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {settings.logo_url && (
                  <button
                    onClick={() => setSettings({ ...settings, logo_url: null })}
                    className="btn btn-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف الصورة
                  </button>
                )}
              </div>
            </div>
            {settings.logo_url && (
              <div className="mt-3">
                <label className="label">حجم الصورة (px)</label>
                <input
                  type="number"
                  value={settings.logo_size}
                  onChange={(e) => setSettings({ ...settings, logo_size: Number(e.target.value) || 80 })}
                  className="input w-32"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'print' && (
        <div className="card p-5 space-y-3 max-w-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">حجم الورق</label>
              <select
                value={settings.paper_size}
                onChange={(e) => setSettings({ ...settings, paper_size: e.target.value })}
                className="select"
              >
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="Letter">Letter</option>
              </select>
            </div>
            <div>
              <label className="label">اتجاه الورقة</label>
              <select
                value={settings.paper_orientation}
                onChange={(e) => setSettings({ ...settings, paper_orientation: e.target.value })}
                className="select"
              >
                <option value="portrait">Portrait (عمودي)</option>
                <option value="landscape">Landscape (أفقي)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">الهوامش</label>
            <input
              type="text"
              value={settings.margins}
              onChange={(e) => setSettings({ ...settings, margins: e.target.value })}
              className="input w-32"
              placeholder="15mm"
            />
          </div>

          <div className="pt-3 border-t border-slate-200">
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={settings.show_signatures}
                onChange={(e) => setSettings({ ...settings, show_signatures: e.target.checked })}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm font-medium text-slate-700">إظهار التوقيعات في الطباعة</span>
            </label>
            {settings.show_signatures && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="label">التوقيع الأول</label>
                  <input
                    type="text"
                    value={settings.signature1_label}
                    onChange={(e) => setSettings({ ...settings, signature1_label: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">التوقيع الثاني</label>
                  <input
                    type="text"
                    value={settings.signature2_label}
                    onChange={(e) => setSettings({ ...settings, signature2_label: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">التوقيع الثالث</label>
                  <input
                    type="text"
                    value={settings.signature3_label}
                    onChange={(e) => setSettings({ ...settings, signature3_label: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'stock' && (
        <div className="card p-5 space-y-3 max-w-2xl">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.allow_negative_stock}
              onChange={(e) => setSettings({ ...settings, allow_negative_stock: e.target.checked })}
              className="w-4 h-4 accent-teal-600"
            />
            <span className="text-sm font-medium text-slate-700">السماح بالمخزون السالب</span>
          </label>
          <div>
            <label className="label">حد التنبيه الافتراضي للمخزون المنخفض</label>
            <input
              type="number"
              step="0.001"
              value={settings.low_stock_threshold}
              onChange={(e) => setSettings({ ...settings, low_stock_threshold: Number(e.target.value) || 0 })}
              className="input w-40"
            />
          </div>
          <div>
            <label className="label">الميزانية الإجمالية (دج)</label>
            <input
              type="number"
              step="0.01"
              value={settings.total_budget}
              onChange={(e) => setSettings({ ...settings, total_budget: Number(e.target.value) || 0 })}
              className="input w-48"
            />
            <p className="text-xs text-slate-500 mt-1">المتبقي: {formatCurrency(settings.total_budget)}</p>
          </div>
        </div>
      )}

      {tab === 'materials' && (
        <div className="space-y-4">
          {/* Categories */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">التصنيفات</h3>
              <button
                onClick={() => {
                  setEditingCat(null);
                  setShowCatModal(true);
                }}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                إضافة تصنيف
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header text-right">
                    <th className="p-3">الاسم بالعربية</th>
                    <th className="p-3">الاسم بالفرنسية</th>
                    <th className="p-3">الترتيب</th>
                    <th className="p-3">نشط</th>
                    <th className="p-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="p-3 font-medium text-slate-800">{c.name_ar}</td>
                      <td className="p-3 text-slate-600">{c.name_fr || '—'}</td>
                      <td className="p-3 text-slate-600">{c.sort_order}</td>
                      <td className="p-3">
                        <span className={`badge ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingCat(c);
                              setShowCatModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
                              try {
                                await deleteCategory(c.id);
                                loadAll();
                              } catch (err) {
                                alert('فشل الحذف: ' + (err as Error).message);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Units */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">الوحدات</h3>
              <button
                onClick={() => {
                  setEditingUnit(null);
                  setShowUnitModal(true);
                }}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                إضافة وحدة
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header text-right">
                    <th className="p-3">الاسم بالعربية</th>
                    <th className="p-3">الاسم بالفرنسية</th>
                    <th className="p-3">نشط</th>
                    <th className="p-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100">
                      <td className="p-3 font-medium text-slate-800">{u.name_ar}</td>
                      <td className="p-3 text-slate-600">{u.name_fr || '—'}</td>
                      <td className="p-3">
                        <span className={`badge ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {u.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingUnit(u);
                              setShowUnitModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;
                              try {
                                await deleteUnit(u.id);
                                loadAll();
                              } catch (err) {
                                alert('فشل الحذف: ' + (err as Error).message);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Category modal */}
      {showCatModal && (
        <CategoryModal
          category={editingCat}
          onClose={() => setShowCatModal(false)}
          onSaved={() => {
            setShowCatModal(false);
            loadAll();
          }}
        />
      )}

      {/* Unit modal */}
      {showUnitModal && (
        <UnitModal
          unit={editingUnit}
          onClose={() => setShowUnitModal(false)}
          onSaved={() => {
            setShowUnitModal(false);
            loadAll();
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nameAr, setNameAr] = useState(category?.name_ar || '');
  const [nameFr, setNameFr] = useState(category?.name_fr || '');
  const [sortOrder, setSortOrder] = useState(category?.sort_order || 0);
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nameAr.trim()) {
      alert('الرجاء إدخال اسم التصنيف');
      return;
    }
    setSaving(true);
    try {
      if (category) {
        await updateCategory(category.id, { name_ar: nameAr, name_fr: nameFr, sort_order: sortOrder, is_active: isActive });
      } else {
        await createCategory({ name_ar: nameAr, name_fr: nameFr, sort_order: sortOrder, is_active: isActive });
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
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">{category ? 'تعديل تصنيف' : 'إضافة تصنيف'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">الاسم بالعربية</label>
            <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">الاسم بالفرنسية</label>
            <input type="text" value={nameFr} onChange={(e) => setNameFr(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">الترتيب</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="input w-32" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-teal-600" />
            <span className="text-sm text-slate-700">نشط</span>
          </label>
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

function UnitModal({
  unit,
  onClose,
  onSaved,
}: {
  unit: Unit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nameAr, setNameAr] = useState(unit?.name_ar || '');
  const [nameFr, setNameFr] = useState(unit?.name_fr || '');
  const [isActive, setIsActive] = useState(unit?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nameAr.trim()) {
      alert('الرجاء إدخال اسم الوحدة');
      return;
    }
    setSaving(true);
    try {
      if (unit) {
        await updateUnit(unit.id, { name_ar: nameAr, name_fr: nameFr, is_active: isActive });
      } else {
        await createUnit({ name_ar: nameAr, name_fr: nameFr, is_active: isActive });
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
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">{unit ? 'تعديل وحدة' : 'إضافة وحدة'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">الاسم بالعربية</label>
            <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">الاسم بالفرنسية</label>
            <input type="text" value={nameFr} onChange={(e) => setNameFr(e.target.value)} className="input" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-teal-600" />
            <span className="text-sm text-slate-700">نشط</span>
          </label>
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
