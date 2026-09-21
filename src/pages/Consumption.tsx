import { useEffect, useState, useCallback } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Search,
  Save,
  X,
  CheckCircle,
  Printer,
  Download,
  AlertCircle,
  Calendar,
  Sun,
  CloudSun,
  Moon,
  Layers,
  Table,
  Copy,
  CheckSquare,
  FileText,
  Eye,
} from 'lucide-react';
import {
  getMaterials,
  getOrCreateConsumptionDay,
  getConsumptionItems,
  addConsumptionItem,
  deleteConsumptionItem,
  deleteConsumptionItems,
  updateConsumptionItem,
  getMealPeopleCounts,
  upsertMealPeopleCount,
  addStockMovement,
  getRemainingQuantity,
  getSettings,
  addOperationLog,
} from '@/lib/db';
import { exportConsumptionToExcel } from '@/lib/excel';
import { formatNumber, formatCurrency, daysInMonth, ARABIC_MONTHS } from '@/lib/format';
import { printMeal, printDay, printCategoryConsumption, printMonthlyCategoryConsumption, printMaterialMonthlyConsumption, buildMaterialMonthlyConsumptionHtml } from '@/lib/print';
import { getCategories, getConsumptionItemsByMonth, getMealPeopleCountsByMonth, getConsumptionItemsByYear, getMealPeopleCountsByYear } from '@/lib/db';
import type { Material, ConsumptionItem, MealType, Settings as SettingsType, Category } from '@/types';

const MEAL_CONFIG: { key: MealType; label: string; icon: typeof Sun; color: string; bg: string }[] = [
  { key: 'breakfast', label: 'الفطور', icon: Sun, color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'lunch', label: 'الغداء', icon: CloudSun, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'dinner', label: 'العشاء', icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

export default function Consumption() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [items, setItems] = useState<ConsumptionItem[]>([]);
  const [peopleCounts, setPeopleCounts] = useState<Record<MealType, number>>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [recordedDays, setRecordedDays] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'daily' | 'category' | 'monthly' | 'material'>('daily');
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthItems, setMonthItems] = useState<ConsumptionItem[]>([]);
  const [monthPeopleCounts, setMonthPeopleCounts] = useState<{ day_number: number; meal_type: MealType; people_count: number }[]>([]);
  const [yearItems, setYearItems] = useState<ConsumptionItem[]>([]);
  const [yearPeopleCounts, setYearPeopleCounts] = useState<{ month: number; day_number: number; meal_type: MealType; people_count: number }[]>([]);

  useEffect(() => {
    loadMaterials();
    loadRecordedDays();
    loadCategories();
    loadMonthItems();
    loadMonthPeopleCounts();
  }, [month, year]);

  useEffect(() => {
    loadYearItems();
    loadYearPeopleCounts();
  }, [year]);

  const loadMaterials = async () => {
    try {
      const mats = await getMaterials(true);
      setMaterials(mats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecordedDays = async () => {
    try {
      const { data } = await import('@/lib/supabase').then((m) =>
        m.supabase
          .from('consumption_days')
          .select('day_number')
          .eq('month', month)
          .eq('year', year)
      );
      if (data) setRecordedDays(new Set(data.map((d: any) => d.day_number)));
    } catch (err) {
      console.error(err);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await getCategories(true);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMonthItems = async () => {
    try {
      const items = await getConsumptionItemsByMonth(month, year);
      setMonthItems(items);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMonthPeopleCounts = async () => {
    try {
      const counts = await getMealPeopleCountsByMonth(month, year);
      setMonthPeopleCounts(counts);
    } catch (err) {
      console.error(err);
    }
  };

  const loadYearItems = async () => {
    try {
      const items = await getConsumptionItemsByYear(year);
      setYearItems(items);
    } catch (err) {
      console.error(err);
    }
  };

  const loadYearPeopleCounts = async () => {
    try {
      const counts = await getMealPeopleCountsByYear(year);
      setYearPeopleCounts(counts);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDayData = useCallback(async (day: number) => {
    try {
      const dayRecord = await getOrCreateConsumptionDay(day, month, year);
      const [dayItems, counts] = await Promise.all([
        getConsumptionItems(dayRecord.id),
        getMealPeopleCounts(dayRecord.id),
      ]);
      setItems(dayItems);
      const countsMap: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0 };
      for (const c of counts) {
        countsMap[c.meal_type] = c.people_count;
      }
      setPeopleCounts(countsMap);
      loadMonthItems();
      loadMonthPeopleCounts();
      loadRecordedDays();
      loadYearItems();
      loadYearPeopleCounts();
    } catch (err) {
      console.error(err);
    }
  }, [month, year]);

  useEffect(() => {
    if (selectedDay !== null) {
      loadDayData(selectedDay);
    }
  }, [selectedDay, loadDayData]);

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  const totalDays = daysInMonth(month, year);

  const handleAddItem = async (meal: MealType, materialId: string, quantity: number) => {
    if (!selectedDay) return;
    const material = materials.find((m) => m.id === materialId);
    if (!material) return;

    // Check if material already exists in this meal
    const existing = items.find((i) => i.meal_type === meal && i.material_id === materialId);
    if (existing) {
      const shouldMerge = confirm('المادة موجودة في هذه الوجبة. هل تريد إضافة الكمية إلى الكمية الحالية؟');
      if (shouldMerge) {
        const newQty = Number(existing.quantity) + quantity;
        const newAmount = newQty * Number(existing.unit_price);
        await updateConsumptionItem(existing.id, {
          quantity: newQty,
          amount: newAmount,
        });
        // Update stock movement
        await import('@/lib/supabase').then((m) =>
          m.supabase
            .from('stock_movements')
            .delete()
            .eq('reference_id', existing.id)
            .eq('reference_type', 'consumption')
        );
        const dayRecord = await getOrCreateConsumptionDay(selectedDay, month, year);
        await addStockMovement({
          material_id: materialId,
          movement_type: 'consumption',
          quantity: newQty,
          unit_price: Number(existing.unit_price),
          value: newAmount,
          reference_id: existing.id,
          reference_type: 'consumption',
          day_number: selectedDay,
          meal_type: meal,
          month,
          year,
          notes: `استهلاك ${meal} - يوم ${selectedDay}`,
        });
        loadDayData(selectedDay);
        return;
      }
      return;
    }

    // Check stock
    const remaining = await getRemainingQuantity(materialId);
    const allowNegative = settings?.allow_negative_stock ?? false;
    if (!allowNegative && quantity > remaining) {
      alert(`الكمية المطلوبة (${formatNumber(quantity, 3)}) أكبر من الكمية المتوفرة في المخزون (${formatNumber(remaining, 3)}).`);
      return;
    }

    const unitPrice = Number(material.unit_price);
    const amount = quantity * unitPrice;

    const dayRecord = await getOrCreateConsumptionDay(selectedDay, month, year);
    const newItem = await addConsumptionItem({
      consumption_day_id: dayRecord.id,
      meal_type: meal,
      material_id: materialId,
      quantity,
      unit_price: unitPrice,
      amount,
    });

    await addStockMovement({
      material_id: materialId,
      movement_type: 'consumption',
      quantity,
      unit_price: unitPrice,
      value: amount,
      reference_id: newItem.id,
      reference_type: 'consumption',
      day_number: selectedDay,
      meal_type: meal,
      month,
      year,
      notes: `استهلاك ${meal} - يوم ${selectedDay}`,
    });

    loadDayData(selectedDay);
    loadRecordedDays();
  };

  const handleAddMultipleItems = async (meal: MealType, entries: { materialId: string; quantity: number }[]) => {
    if (!selectedDay) return;
    let added = 0;
    let skipped = 0;
    for (const entry of entries) {
      if (!entry.materialId || entry.quantity <= 0) {
        skipped++;
        continue;
      }
      const material = materials.find((m) => m.id === entry.materialId);
      if (!material) {
        skipped++;
        continue;
      }
      const existing = items.find((i) => i.meal_type === meal && i.material_id === entry.materialId);
      if (existing) {
        const newQty = Number(existing.quantity) + entry.quantity;
        const newAmount = newQty * Number(existing.unit_price);
        await updateConsumptionItem(existing.id, { quantity: newQty, amount: newAmount });
        await import('@/lib/supabase').then((m) =>
          m.supabase.from('stock_movements').delete().eq('reference_id', existing.id).eq('reference_type', 'consumption')
        );
        const dayRecord = await getOrCreateConsumptionDay(selectedDay, month, year);
        await addStockMovement({
          material_id: entry.materialId,
          movement_type: 'consumption',
          quantity: newQty,
          unit_price: Number(existing.unit_price),
          value: newAmount,
          reference_id: existing.id,
          reference_type: 'consumption',
          day_number: selectedDay,
          meal_type: meal,
          month, year,
          notes: `استهلاك ${meal} - يوم ${selectedDay} (إضافة متعددة)`,
        });
        added++;
        continue;
      }
      const remaining = await getRemainingQuantity(entry.materialId);
      const allowNegative = settings?.allow_negative_stock ?? false;
      if (!allowNegative && entry.quantity > remaining) {
        alert(`المادة ${material.name_ar}: الكمية المطلوبة (${formatNumber(entry.quantity, 3)}) أكبر من المتوفر (${formatNumber(remaining, 3)}). تم تخطيها.`);
        skipped++;
        continue;
      }
      const unitPrice = Number(material.unit_price);
      const amount = entry.quantity * unitPrice;
      const dayRecord = await getOrCreateConsumptionDay(selectedDay, month, year);
      const newItem = await addConsumptionItem({
        consumption_day_id: dayRecord.id,
        meal_type: meal,
        material_id: entry.materialId,
        quantity: entry.quantity,
        unit_price: unitPrice,
        amount,
      });
      await addStockMovement({
        material_id: entry.materialId,
        movement_type: 'consumption',
        quantity: entry.quantity,
        unit_price: unitPrice,
        value: amount,
        reference_id: newItem.id,
        reference_type: 'consumption',
        day_number: selectedDay,
        meal_type: meal,
        month, year,
        notes: `استهلاك ${meal} - يوم ${selectedDay} (إضافة متعددة)`,
      });
      added++;
    }
    await addOperationLog('إضافة استهلاك متعدد', `تم إضافة ${added} مادة، تخطي ${skipped} - ${meal} يوم ${selectedDay}`);
    loadDayData(selectedDay);
  };

  const handleDeleteItem = async (item: ConsumptionItem) => {
    if (!confirm('هل أنت متأكد من حذف هذه المادة؟ سيتم إعادة الكمية إلى المخزون.')) return;
    try {
      await deleteConsumptionItem(item.id);
      await import('@/lib/supabase').then((m) =>
        m.supabase
          .from('stock_movements')
          .delete()
          .eq('reference_id', item.id)
          .eq('reference_type', 'consumption')
      );
      await addOperationLog('حذف استهلاك', `تم حذف: ${item.material?.name_ar || ''} من ${item.meal_type}`);
      if (selectedDay) loadDayData(selectedDay);
    } catch (err) {
      alert('فشل الحذف: ' + (err as Error).message);
    }
  };

  const handleDeleteSelected = async (meal: MealType, selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} مادة؟ سيتم إعادة الكميات إلى المخزون.`)) return;
    try {
      for (const id of selectedIds) {
        await import('@/lib/supabase').then((m) =>
          m.supabase.from('stock_movements').delete().eq('reference_id', id).eq('reference_type', 'consumption')
        );
      }
      await deleteConsumptionItems(selectedIds);
      if (selectedDay) loadDayData(selectedDay);
    } catch (err) {
      alert('فشل الحذف: ' + (err as Error).message);
    }
  };

  const handleUpdatePeople = async (meal: MealType, count: number) => {
    if (!selectedDay) return;
    setPeopleCounts((prev) => ({ ...prev, [meal]: count }));
    const dayRecord = await getOrCreateConsumptionDay(selectedDay, month, year);
    await upsertMealPeopleCount(dayRecord.id, meal, count);
  };

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetDays, setCopyTargetDays] = useState<Set<number>>(new Set());

  const handleCopyDay = async () => {
    if (!selectedDay || copyTargetDays.size === 0) return;
    let copied = 0;
    let skipped = 0;
    for (const targetDay of copyTargetDays) {
      if (targetDay === selectedDay) continue;
      try {
        const targetDayRecord = await getOrCreateConsumptionDay(targetDay, month, year);
        const existingTargetItems = await getConsumptionItems(targetDayRecord.id);
        if (existingTargetItems.length > 0) {
          skipped++;
          continue;
        }
        for (const item of items) {
          const newItem = await addConsumptionItem({
            consumption_day_id: targetDayRecord.id,
            meal_type: item.meal_type,
            material_id: item.material_id,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            amount: Number(item.amount),
          });
          await addStockMovement({
            material_id: item.material_id,
            movement_type: 'consumption',
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            value: Number(item.amount),
            reference_id: newItem.id,
            reference_type: 'consumption',
            day_number: targetDay,
            meal_type: item.meal_type,
            month,
            year,
            notes: `نسخ من يوم ${selectedDay} - ${item.meal_type}`,
          });
        }
        for (const meal of ['breakfast', 'lunch', 'dinner'] as MealType[]) {
          const count = peopleCounts[meal];
          if (count > 0) {
            await upsertMealPeopleCount(targetDayRecord.id, meal, count);
          }
        }
        copied++;
      } catch (err) {
        console.error(`Failed to copy to day ${targetDay}:`, err);
        skipped++;
      }
    }
    await addOperationLog('نسخ يوم', `نسخ استهلاك يوم ${selectedDay} إلى ${copied} يوم، تخطي ${skipped}`);
    setShowCopyModal(false);
    setCopyTargetDays(new Set());
    loadRecordedDays();
    loadMonthItems();
    loadMonthPeopleCounts();
    loadYearItems();
    loadYearPeopleCounts();
    alert(`تم نسخ ${copied} يوم بنجاح${skipped > 0 ? `، تخطي ${skipped} يوم (لأنها تحتوي على بيانات)` : ''}`);
  };

  const getMealTotal = (meal: MealType) => {
    return items.filter((i) => i.meal_type === meal).reduce((s, i) => s + Number(i.amount), 0);
  };

  const getMealPerPerson = (meal: MealType) => {
    const total = getMealTotal(meal);
    const count = peopleCounts[meal] || 0;
    return count > 0 ? total / count : 0;
  };

  const dayTotal = items.reduce((s, i) => s + Number(i.amount), 0);
  const dayPerPerson = getMealPerPerson('breakfast') + getMealPerPerson('lunch') + getMealPerPerson('dinner');
  const dayPeopleCount = dayPerPerson > 0 ? dayTotal / dayPerPerson : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">جاري التحميل...</div>;
  }

  if (selectedDay === null) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-7 h-7 text-teal-600" />
            <h1 className="text-2xl font-bold text-slate-800">الاستهلاك اليومي</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setView('daily')}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${view === 'daily' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Calendar className="w-4 h-4" />
                يومي
              </button>
              <button
                onClick={() => setView('category')}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${view === 'category' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Table className="w-4 h-4" />
                صنفي يومي
              </button>
              <button
                onClick={() => setView('monthly')}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${view === 'monthly' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Table className="w-4 h-4" />
                صنفي شهري
              </button>
              <button
                onClick={() => setView('material')}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${view === 'material' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <FileText className="w-4 h-4" />
                بطاقة مادة
              </button>
            </div>
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

        {view === 'daily' ? (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                {ARABIC_MONTHS[month - 1]} {year}
              </h2>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const isRecorded = recordedDays.has(day);
                const isToday = day === new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear();
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative aspect-square rounded-xl border text-lg font-bold transition-all hover:shadow-md hover:scale-105 ${
                      isToday
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : isRecorded
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                    }`}
                  >
                    {day}
                    {isRecorded && (
                      <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : view === 'category' ? (
          <CategoryConsumptionMatrix
            categories={categories}
            monthItems={monthItems}
            monthPeopleCounts={monthPeopleCounts}
            month={month}
            year={year}
            totalDays={totalDays}
            settings={settings}
          />
        ) : view === 'monthly' ? (
          <MonthlyConsumptionMatrix
            categories={categories}
            yearItems={yearItems}
            yearPeopleCounts={yearPeopleCounts}
            year={year}
            settings={settings}
          />
        ) : (
          <MaterialMonthlyConsumptionSheet
            materials={materials}
            monthItems={monthItems}
            month={month}
            year={year}
            settings={settings}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedDay(null)} className="btn btn-ghost">
            <Calendar className="w-5 h-5" />
            رجوع
          </button>
          <h1 className="text-2xl font-bold text-slate-800">
            يوم {selectedDay} - {ARABIC_MONTHS[month - 1]} {year}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCopyModal(true)}
            className="btn btn-secondary"
          >
            <Copy className="w-4 h-4" />
            نسخ اليوم
          </button>
          <button
            onClick={() => printDay(items, selectedDay, month, year, peopleCounts, settings)}
            className="btn btn-secondary"
          >
            <Printer className="w-4 h-4" />
            طباعة اليوم
          </button>
          <button onClick={() => exportConsumptionToExcel(items, selectedDay, month, year)} className="btn btn-secondary">
            <Download className="w-4 h-4" />
            تصدير Excel
          </button>
        </div>
      </div>

      {/* Day summary */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">إجمالي اليوم</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(dayTotal)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">قيمة الوجبة للفرد</div>
            <div className="text-xl font-bold text-teal-600 mt-1">{formatCurrency(dayPerPerson)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">عدد الأشخاص</div>
            <div className="text-xl font-bold text-amber-600 mt-1">{formatNumber(dayPeopleCount, 0)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">التاريخ</div>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {selectedDay}/{month}/{year}
            </div>
          </div>
        </div>
      </div>

      {/* Meals */}
      {MEAL_CONFIG.map((meal) => (
        <MealSection
          key={meal.key}
          meal={meal}
          items={items.filter((i) => i.meal_type === meal.key)}
          materials={materials}
          peopleCount={peopleCounts[meal.key]}
          onAddItem={(matId, qty) => handleAddItem(meal.key, matId, qty)}
          onAddMultipleItems={(entries) => handleAddMultipleItems(meal.key, entries)}
          onDeleteItem={handleDeleteItem}
          onDeleteSelected={(ids) => handleDeleteSelected(meal.key, ids)}
          onUpdatePeople={(count) => handleUpdatePeople(meal.key, count)}
          onPrint={() => printMeal(items.filter((i) => i.meal_type === meal.key), meal.key, selectedDay, month, year, peopleCounts[meal.key], settings)}
          mealTotal={getMealTotal(meal.key)}
          mealPerPerson={getMealPerPerson(meal.key)}
          settings={settings}
        />
      ))}

      {/* Day summary table */}
      <div className="card p-5">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">ملخص اليوم</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header text-right">
              <th className="p-3">الوجبة</th>
              <th className="p-3">المصاريف</th>
              <th className="p-3">عدد الأشخاص</th>
              <th className="p-3">قيمة الوجبة للفرد</th>
            </tr>
          </thead>
          <tbody>
            {MEAL_CONFIG.map((meal) => (
              <tr key={meal.key} className="border-b border-slate-100">
                <td className="p-3 font-medium text-slate-800">{meal.label}</td>
                <td className="p-3 text-slate-700">{formatCurrency(getMealTotal(meal.key))}</td>
                <td className="p-3 text-slate-700">{peopleCounts[meal.key] || 0}</td>
                <td className="p-3 text-slate-700">{formatCurrency(getMealPerPerson(meal.key))}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold text-slate-800">
              <td className="p-3">المجموع</td>
              <td className="p-3">{formatCurrency(dayTotal)}</td>
              <td className="p-3">{formatNumber(dayPeopleCount, 0)}</td>
              <td className="p-3">{formatCurrency(dayPerPerson)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Copy day modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-800">نسخ يوم {selectedDay} إلى أيام أخرى</h3>
              </div>
              <button onClick={() => { setShowCopyModal(false); setCopyTargetDays(new Set()); }} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <p className="text-sm text-slate-500 mb-4">
                اختر الأيام التي تريد نسخ استهلاك يوم {selectedDay} إليها. سيتم نسخ جميع المواد وأعداد الأشخاص. الأيام التي تحتوي على بيانات سيتم تخطيها.
              </p>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    const all = new Set<number>();
                    for (let d = 1; d <= totalDays; d++) { if (d !== selectedDay) all.add(d); }
                    setCopyTargetDays(all);
                  }}
                  className="btn btn-secondary text-sm"
                >
                  <CheckSquare className="w-4 h-4" />
                  تحديد الكل
                </button>
                <button onClick={() => setCopyTargetDays(new Set())} className="btn btn-secondary text-sm">
                  إلغاء التحديد
                </button>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                  if (day === selectedDay) return null;
                  const isSelected = copyTargetDays.has(day);
                  const hasData = recordedDays.has(day);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const next = new Set(copyTargetDays);
                        if (next.has(day)) next.delete(day);
                        else next.add(day);
                        setCopyTargetDays(next);
                      }}
                      className={`aspect-square rounded-lg border text-sm font-bold transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500 text-white'
                          : hasData
                          ? 'border-amber-200 bg-amber-50 text-amber-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between p-5 border-t border-slate-200">
              <span className="text-sm text-slate-500">{copyTargetDays.size} يوم محدد</span>
              <div className="flex gap-2">
                <button onClick={() => { setShowCopyModal(false); setCopyTargetDays(new Set()); }} className="btn btn-ghost">
                  إلغاء
                </button>
                <button
                  onClick={handleCopyDay}
                  disabled={copyTargetDays.size === 0}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy className="w-4 h-4" />
                  نسخ ({copyTargetDays.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MealSectionProps {
  meal: { key: MealType; label: string; icon: typeof Sun; color: string; bg: string };
  items: ConsumptionItem[];
  materials: Material[];
  peopleCount: number;
  onAddItem: (materialId: string, quantity: number) => void;
  onAddMultipleItems: (entries: { materialId: string; quantity: number }[]) => void;
  onDeleteItem: (item: ConsumptionItem) => void;
  onDeleteSelected: (ids: string[]) => void;
  onUpdatePeople: (count: number) => void;
  onPrint: () => void;
  mealTotal: number;
  mealPerPerson: number;
  settings: SettingsType | null;
}

function MealSection({
  meal,
  items,
  materials,
  peopleCount,
  onAddItem,
  onAddMultipleItems,
  onDeleteItem,
  onDeleteSelected,
  onUpdatePeople,
  onPrint,
  mealTotal,
  mealPerPerson,
  settings,
}: MealSectionProps) {
  const [showAddRow, setShowAddRow] = useState(false);
  const [showMultiAdd, setShowMultiAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const Icon = meal.icon;

  const filteredMaterials = materials.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name_ar.toLowerCase().includes(q) || m.name_fr.toLowerCase().includes(q);
  });

  const handleAdd = () => {
    if (!selectedMaterial || !quantity) {
      alert('الرجاء اختيار مادة وإدخال الكمية');
      return;
    }
    onAddItem(selectedMaterial, Number(quantity));
    setSelectedMaterial('');
    setQuantity('');
    setSearch('');
    setShowAddRow(false);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className={`p-4 ${meal.bg} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${meal.color}`} />
          <h3 className={`text-lg font-bold ${meal.color}`}>{meal.label}</h3>
          <span className="text-sm text-slate-500 bg-white/60 px-2 py-0.5 rounded-full">
            {items.length} مادة
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5">
            <label className="text-sm text-slate-600">عدد الأشخاص:</label>
            <input
              type="number"
              min="0"
              value={peopleCount}
              onChange={(e) => onUpdatePeople(Number(e.target.value) || 0)}
              className="w-16 text-sm font-bold text-slate-800 text-center border-b border-slate-300 focus:outline-none focus:border-teal-500"
            />
          </div>
          <button onClick={onPrint} className="btn btn-ghost p-2">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header text-right">
              <th className="p-2 w-10">
                <button onClick={toggleSelectAll}>
                  {selectedIds.size === items.length && items.length > 0 ? (
                    <CheckCircle className="w-4 h-4 text-teal-600" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                  )}
                </button>
              </th>
              <th className="p-2">رقم</th>
              <th className="p-2">المادة</th>
              <th className="p-2">التصنيف</th>
              <th className="p-2">الوحدة</th>
              <th className="p-2">الكمية</th>
              <th className="p-2">سعر الوحدة</th>
              <th className="p-2">المبلغ</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2 text-center">
                  <button onClick={() => toggleSelect(item.id)}>
                    {selectedIds.has(item.id) ? (
                      <CheckCircle className="w-4 h-4 text-teal-600" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                    )}
                  </button>
                </td>
                <td className="p-2 text-slate-400">{i + 1}</td>
                <td className="p-2 font-medium text-slate-800">{item.material?.name_ar || '—'}</td>
                <td className="p-2 text-slate-600">{item.material?.category?.name_ar || '—'}</td>
                <td className="p-2 text-slate-600">{item.material?.unit?.name_ar || '—'}</td>
                <td className="p-2 font-medium text-slate-700">{formatNumber(item.quantity, 3)}</td>
                <td className="p-2 text-slate-600">{formatCurrency(item.unit_price)}</td>
                <td className="p-2 font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                <td className="p-2">
                  <button
                    onClick={() => onDeleteItem(item)}
                    className="p-1 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}

            {/* Add row */}
            {showAddRow && (
              <tr className="bg-teal-50 border-b border-slate-100">
                <td className="p-2"></td>
                <td className="p-2 text-slate-400">{items.length + 1}</td>
                <td className="p-2" colSpan={2}>
                  <div className="relative">
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 z-10" />
                    <input
                      type="text"
                      placeholder="بحث..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input py-1.5 pr-8 text-sm"
                    />
                    {search && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredMaterials.slice(0, 8).map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedMaterial(m.id);
                              setSearch(m.name_ar);
                            }}
                            className="w-full text-right px-3 py-2 hover:bg-slate-50 text-sm"
                          >
                            {m.name_ar} ({m.name_fr})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  {selectedMaterial && (
                    <span className="text-xs text-slate-500">
                      {materials.find((m) => m.id === selectedMaterial)?.unit?.name_ar || ''}
                    </span>
                  )}
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="الكمية"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="input py-1.5 text-sm w-24"
                  />
                </td>
                <td className="p-2 text-slate-600">
                  {selectedMaterial && formatCurrency(materials.find((m) => m.id === selectedMaterial)?.unit_price || 0)}
                </td>
                <td className="p-2 font-medium text-slate-800">
                  {selectedMaterial && quantity
                    ? formatCurrency(Number(quantity) * (materials.find((m) => m.id === selectedMaterial)?.unit_price || 0))
                    : '—'}
                </td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <button onClick={handleAdd} className="p-1 rounded-lg bg-teal-600 text-white hover:bg-teal-700">
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowAddRow(false);
                        setSearch('');
                        setSelectedMaterial('');
                        setQuantity('');
                      }}
                      className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-800">
                <td colSpan={7} className="p-3 text-left">
                  إجمالي {meal.label}
                </td>
                <td className="p-3">{formatCurrency(mealTotal)}</td>
                <td></td>
              </tr>
              <tr className="bg-teal-50 text-teal-700">
                <td colSpan={7} className="p-2 text-left text-sm">
                  قيمة {meal.label} للفرد ({peopleCount || 0} أشخاص)
                </td>
                <td className="p-2 font-bold" colSpan={2}>
                  {formatCurrency(mealPerPerson)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="p-3 flex items-center gap-2 border-t border-slate-100">
        <button onClick={() => setShowAddRow(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          إضافة مادة
        </button>
        <button onClick={() => setShowMultiAdd(true)} className="btn btn-secondary">
          <Layers className="w-4 h-4" />
          إضافة عدة مواد
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={() => {
              onDeleteSelected(Array.from(selectedIds));
              setSelectedIds(new Set());
            }}
            className="btn btn-danger"
          >
            <Trash2 className="w-4 h-4" />
            حذف المحدد ({selectedIds.size})
          </button>
        )}
      </div>

      {showMultiAdd && (
        <MultiAddModal
          materials={materials}
          mealLabel={meal.label}
          consumedMaterialIds={new Set(items.map((i) => i.material_id))}
          onClose={() => setShowMultiAdd(false)}
          onSave={(entries) => {
            onAddMultipleItems(entries);
            setShowMultiAdd(false);
          }}
        />
      )}
    </div>
  );
}

interface MultiAddModalProps {
  materials: Material[];
  mealLabel: string;
  consumedMaterialIds: Set<string>;
  onClose: () => void;
  onSave: (entries: { materialId: string; quantity: number }[]) => void;
}

function MultiAddModal({ materials, mealLabel, consumedMaterialIds, onClose, onSave }: MultiAddModalProps) {
  const [rows, setRows] = useState<{ materialId: string; quantity: string }[]>([{ materialId: '', quantity: '' }]);
  const [search, setSearch] = useState('');
  const [activeRow, setActiveRow] = useState(0);
  const [saving, setSaving] = useState(false);

  const filteredMaterials = materials.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name_ar.toLowerCase().includes(q) || m.name_fr.toLowerCase().includes(q);
  });

  const addRow = () => {
    setRows([...rows, { materialId: '', quantity: '' }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: 'materialId' | 'quantity', value: string) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    setRows(next);
  };

  const handleSave = () => {
    const entries = rows
      .filter((r) => r.materialId && Number(r.quantity) > 0)
      .map((r) => ({ materialId: r.materialId, quantity: Number(r.quantity) }));
    if (entries.length === 0) {
      alert('الرجاء إدخال مادة واحدة على الأقل بكمية صحيحة');
      return;
    }
    setSaving(true);
    onSave(entries);
  };

  const totalAmount = rows.reduce((sum, r) => {
    if (!r.materialId || !r.quantity) return sum;
    const mat = materials.find((m) => m.id === r.materialId);
    if (!mat) return sum;
    return sum + Number(r.quantity) * Number(mat.unit_price);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">إضافة عدة مواد - {mealLabel}</h2>
            <p className="text-sm text-slate-500">اختر عدة مواد وأدخل الكميات دفعة واحدة</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {rows.map((row, index) => {
            const mat = materials.find((m) => m.id === row.materialId);
            const amount = mat && row.quantity ? Number(row.quantity) * Number(mat.unit_price) : 0;
            return (
              <div key={index} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                <span className="w-8 text-center text-slate-400 font-medium">{index + 1}</span>
                <div className="flex-1 relative">
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 z-10" />
                  <input
                    type="text"
                    placeholder="بحث عن مادة..."
                    value={activeRow === index ? search : mat ? `${mat.name_ar} (${mat.name_fr})` : ''}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setActiveRow(index);
                      if (!e.target.value) updateRow(index, 'materialId', '');
                    }}
                    onFocus={() => {
                      setActiveRow(index);
                      setSearch('');
                    }}
                    className="input py-1.5 pr-8 text-sm"
                  />
                  {activeRow === index && search && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredMaterials.slice(0, 10).map((m) => {
                        const consumed = consumedMaterialIds.has(m.id);
                        return (
                        <button
                          key={m.id}
                          onClick={() => {
                            updateRow(index, 'materialId', m.id);
                            setSearch('');
                          }}
                          className={`w-full text-right px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between ${consumed ? 'bg-amber-50' : ''}`}
                        >
                          <span>
                            {m.name_ar} ({m.name_fr}) - {formatCurrency(m.unit_price)}
                          </span>
                          {consumed && (
                            <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              مستهلَكة
                            </span>
                          )}
                        </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="الكمية"
                    value={row.quantity}
                    onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                    className="input py-1.5 text-sm text-center"
                  />
                </div>
                <div className="w-24 text-sm text-slate-600 text-center">
                  {mat ? formatCurrency(mat.unit_price) : '—'}
                </div>
                <div className="w-28 text-sm font-medium text-slate-800 text-center">
                  {amount > 0 ? formatCurrency(amount) : '—'}
                </div>
                <button
                  onClick={() => removeRow(index)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                  disabled={rows.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          <button onClick={addRow} className="btn btn-secondary w-full justify-center">
            <Plus className="w-4 h-4" />
            إضافة سطر آخر
          </button>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between sticky bottom-0 bg-white">
          <div className="text-sm">
            <span className="text-slate-500">إجمالي المبلغ: </span>
            <span className="font-bold text-slate-800 text-lg">{formatCurrency(totalAmount)}</span>
            <span className="text-slate-400 mr-3">({rows.filter((r) => r.materialId && r.quantity).length} مادة)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ الكل'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CategoryConsumptionMatrixProps {
  categories: Category[];
  monthItems: ConsumptionItem[];
  monthPeopleCounts: { day_number: number; meal_type: MealType; people_count: number }[];
  month: number;
  year: number;
  totalDays: number;
  settings: SettingsType | null;
}

function CategoryConsumptionMatrix({ categories, monthItems, monthPeopleCounts, month, year, totalDays, settings }: CategoryConsumptionMatrixProps) {
  const [showAmount, setShowAmount] = useState(true);

  const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

  const getDayCategoryAmount = (day: number, categoryId: string): number => {
    return monthItems
      .filter((item) => item.consumption_day?.day_number === day && item.material?.category_id === categoryId)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const getDayTotalAmount = (day: number): number => {
    return monthItems
      .filter((item) => item.consumption_day?.day_number === day)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const getMealPeople = (day: number, meal: MealType): number => {
    return monthPeopleCounts
      .filter((c) => c.day_number === day && c.meal_type === meal)
      .reduce((s, c) => s + c.people_count, 0);
  };

  const getMealTotal = (day: number, meal: MealType): number => {
    return monthItems
      .filter((item) => item.consumption_day?.day_number === day && item.meal_type === meal)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const getDayPerPerson = (day: number): number => {
    let perPersonSum = 0;
    for (const meal of MEAL_TYPES) {
      const mealTotal = getMealTotal(day, meal);
      const mealPeople = getMealPeople(day, meal);
      if (mealPeople > 0) perPersonSum += mealTotal / mealPeople;
    }
    return perPersonSum;
  };

  const getDayPeopleCount = (day: number): number => {
    const total = getDayTotalAmount(day);
    const perPerson = getDayPerPerson(day);
    return perPerson > 0 ? total / perPerson : 0;
  };

  const getCategoryTotal = (categoryId: string): number => {
    return monthItems
      .filter((item) => item.material?.category_id === categoryId)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const grandTotal = monthItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const recordedDaysCount = new Set(monthItems.map((item) => item.consumption_day?.day_number).filter((d): d is number => d !== undefined)).size;

  const handlePrint = () => {
    const data = categories.map((cat) => {
      const dayValues: number[] = [];
      for (let d = 1; d <= totalDays; d++) {
        dayValues.push(getDayCategoryAmount(d, cat.id));
      }
      return {
        name: cat.name_ar,
        dayValues,
        total: getCategoryTotal(cat.id),
      };
    });
    const dayTotals: number[] = [];
    for (let d = 1; d <= totalDays; d++) {
      dayTotals.push(getDayTotalAmount(d));
    }
    const dayPeopleCounts: number[] = [];
    const dayPerPerson: number[] = [];
    for (let d = 1; d <= totalDays; d++) {
      dayPeopleCounts.push(getDayPeopleCount(d));
      dayPerPerson.push(getDayPerPerson(d));
    }
    printCategoryConsumption(data, dayTotals, dayPeopleCounts, dayPerPerson, month, year, totalDays, settings);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          ورقة الاستهلاك الصنفي - {ARABIC_MONTHS[month - 1]} {year}
        </h2>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setShowAmount(true)} className={`px-3 py-1.5 text-sm ${showAmount ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}>المبلغ</button>
            <button onClick={() => setShowAmount(false)} className={`px-3 py-1.5 text-sm ${!showAmount ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}>عدد الوجبات</button>
          </div>
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer className="w-4 h-4" />
            طباعة
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-header text-right">
                <th className="p-2 sticky right-0 bg-slate-50 z-10 min-w-16">اليوم</th>
                {categories.map((cat) => (
                  <th key={cat.id} className="p-2 text-center min-w-28">{cat.name_ar}</th>
                ))}
                <th className="p-2 text-center bg-teal-50">مجموع اليوم</th>
                <th className="p-2 text-center bg-amber-50">عدد الأشخاص</th>
                <th className="p-2 text-center bg-teal-50">سعر الوجبة للفرد</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const dayTotal = getDayTotalAmount(day);
                const people = getDayPeopleCount(day);
                const perPerson = getDayPerPerson(day);
                return (
                  <tr key={day} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 font-medium text-slate-800 sticky right-0 bg-white z-10 text-center">{day}</td>
                    {categories.map((cat) => {
                      const value = showAmount
                        ? getDayCategoryAmount(day, cat.id)
                        : (getDayCategoryAmount(day, cat.id) > 0 ? 1 : 0);
                      return (
                        <td key={cat.id} className={`p-2 text-center ${value > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {value > 0 ? (showAmount ? formatNumber(value, 0) : value) : '—'}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold text-slate-800 bg-teal-50">
                      {showAmount && dayTotal > 0 ? formatNumber(dayTotal, 0) : '—'}
                    </td>
                    <td className="p-2 text-center bg-amber-50">
                      {people > 0 ? formatNumber(people, 0) : '—'}
                    </td>
                    <td className="p-2 text-center bg-teal-50">
                      {perPerson > 0 ? formatNumber(perPerson, 0) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <td className="p-2 sticky right-0 bg-slate-100 z-10 text-center">الإجمالي</td>
                {categories.map((cat) => (
                  <td key={cat.id} className="p-2 text-center">{showAmount ? formatNumber(getCategoryTotal(cat.id), 0) : '—'}</td>
                ))}
                <td className="p-2 text-center bg-teal-100">{showAmount ? formatNumber(grandTotal, 0) : recordedDaysCount}</td>
                <td className="p-2 text-center bg-amber-100">
                  {(() => {
                    let totalPeople = 0;
                    for (let d = 1; d <= totalDays; d++) totalPeople += getDayPeopleCount(d);
                    return formatNumber(totalPeople, 0);
                  })()}
                </td>
                <td className="p-2 text-center bg-teal-100">
                  {(() => {
                    let totalPeople = 0;
                    for (let d = 1; d <= totalDays; d++) totalPeople += getDayPeopleCount(d);
                    return totalPeople > 0 ? formatNumber(grandTotal / totalPeople, 0) : '—';
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        ملاحظة: القيم بالدينار الجزائري. عدد الأشخاص = مجموع اليوم / سعر الوجبة للفرد (من ورقة الاستهلاك اليومي).
      </div>
    </div>
  );
}

interface MaterialMonthlyConsumptionSheetProps {
  materials: Material[];
  monthItems: ConsumptionItem[];
  month: number;
  year: number;
  settings: SettingsType | null;
}

function MaterialMonthlyConsumptionSheet({ materials, monthItems, month, year, settings }: MaterialMonthlyConsumptionSheetProps) {
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || '');
  const [showPreview, setShowPreview] = useState(false);
  const selectedMaterial = materials.find((material) => material.id === selectedMaterialId);
  const totalDays = daysInMonth(month, year);
  let cumulativeQuantity = 0;
  let cumulativeAmount = 0;

  const rows = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const dayItems = monthItems.filter(
      (item) => item.material_id === selectedMaterialId && item.consumption_day?.day_number === day
    );
    const quantity = dayItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    const amount = dayItems.reduce((sum, item) => sum + Number(item.amount), 0);
    cumulativeQuantity += quantity;
    cumulativeAmount += amount;
    const meals = Array.from(new Set(dayItems.map((item) => item.meal_type)))
      .map((meal) => MEAL_CONFIG.find((config) => config.key === meal)?.label || meal)
      .join(' + ');

    return {
      day,
      date: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
      reference: quantity > 0 ? 'استهلاك' : '—',
      source: meals || '—',
      quantity,
      amount,
      cumulativeQuantity,
      cumulativeAmount,
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">بطاقة استهلاك مادة على طول الشهر</h2>
          <p className="text-xs text-slate-500 mt-1">{settings?.unit_name || ''} — {ARABIC_MONTHS[month - 1]} {year}</p>
        </div>
        <select
          value={selectedMaterialId}
          onChange={(event) => setSelectedMaterialId(event.target.value)}
          className="select w-auto min-w-56"
        >
          {materials.map((material) => (
            <option key={material.id} value={material.id}>{material.name_ar}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-secondary"
          >
            <Eye className="w-4 h-4" />
            معاينة
          </button>
          <button
            onClick={() => printMaterialMonthlyConsumption(
              selectedMaterial?.name_ar || '',
              selectedMaterial?.unit?.name_ar || '',
              rows,
              month,
              year,
              settings
            )}
            className="btn btn-primary"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 text-center">
          <div className="font-semibold text-sm">{settings?.header_republic}</div>
          <div className="text-xs text-slate-600">{settings?.header_ministry}</div>
          <div className="text-xs text-slate-600">{settings?.header_directorate}</div>
          <div className="text-xs text-slate-600">{settings?.header_unit}</div>
          <hr className="my-2 border-slate-300" />
          <h3 className="font-bold text-slate-800">بطاقة استهلاك مادة</h3>
          <div className="text-sm text-slate-600 mt-1">
            المادة: <strong>{selectedMaterial?.name_ar || '—'}</strong> — الوحدة: {selectedMaterial?.unit?.name_ar || '—'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[850px]">
            <thead>
              <tr className="table-header text-right">
                <th className="p-2">التاريخ</th>
                <th className="p-2">المرجع</th>
                <th className="p-2">الوجبة / المصدر</th>
                <th className="p-2 text-center">كمية الاستهلاك</th>
                <th className="p-2 text-center">قيمة الاستهلاك</th>
                <th className="p-2 text-center">التراكمي كمية</th>
                <th className="p-2 text-center">التراكمي قيمة</th>
                <th className="p-2">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.day} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 font-medium text-slate-700">{row.date}</td>
                  <td className="p-2 text-slate-600">{row.reference}</td>
                  <td className="p-2 text-slate-600">{row.source}</td>
                  <td className="p-2 text-center text-red-600">{row.quantity > 0 ? formatNumber(row.quantity, 3) : '—'}</td>
                  <td className="p-2 text-center text-red-600">{row.amount > 0 ? formatCurrency(row.amount) : '—'}</td>
                  <td className="p-2 text-center font-medium text-slate-700">{formatNumber(row.cumulativeQuantity, 3)}</td>
                  <td className="p-2 text-center font-medium text-slate-700">{formatCurrency(row.cumulativeAmount)}</td>
                  <td className="p-2 text-slate-500">{row.quantity > 0 ? `استهلاك ${row.source}` : 'لا يوجد استهلاك'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <td colSpan={3} className="p-2">إجمالي الشهر</td>
                <td className="p-2 text-center">{formatNumber(cumulativeQuantity, 3)}</td>
                <td className="p-2 text-center">{formatCurrency(cumulativeAmount)}</td>
                <td className="p-2 text-center">{formatNumber(cumulativeQuantity, 3)}</td>
                <td className="p-2 text-center">{formatCurrency(cumulativeAmount)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">معاينة بطاقة استهلاك المادة</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => printMaterialMonthlyConsumption(
                    selectedMaterial?.name_ar || '',
                    selectedMaterial?.unit?.name_ar || '',
                    rows,
                    month,
                    year,
                    settings
                  )}
                  className="btn btn-primary"
                >
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>
                <button onClick={() => setShowPreview(false)} className="btn btn-ghost">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-6 bg-slate-50">
              <div
                className="bg-white shadow-md mx-auto p-8"
                style={{ maxWidth: '800px' }}
                dangerouslySetInnerHTML={{
                  __html: buildMaterialMonthlyConsumptionHtml(
                    selectedMaterial?.name_ar || '',
                    selectedMaterial?.unit?.name_ar || '',
                    rows,
                    month,
                    year,
                    settings
                  ),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MonthlyConsumptionMatrixProps {
  categories: Category[];
  yearItems: ConsumptionItem[];
  yearPeopleCounts: { month: number; day_number: number; meal_type: MealType; people_count: number }[];
  year: number;
  settings: SettingsType | null;
}

function MonthlyConsumptionMatrix({ categories, yearItems, yearPeopleCounts, year, settings }: MonthlyConsumptionMatrixProps) {
  const [showAmount, setShowAmount] = useState(true);

  const getMonthCategoryAmount = (month: number, categoryId: string): number => {
    return yearItems
      .filter((item) => {
        if (!item.consumption_day) return false;
        if (item.consumption_day.month !== month) return false;
        return item.material?.category_id === categoryId;
      })
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const getMonthTotalAmount = (month: number): number => {
    return yearItems
      .filter((item) => item.consumption_day?.month === month)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const getMonthMealCount = (month: number): number => {
    return yearPeopleCounts
      .filter((c) => c.month === month)
      .reduce((sum, c) => sum + c.people_count, 0);
  }

  const getMonthPeopleCount = (month: number): number => {
    return yearPeopleCounts
      .filter((c) => c.month === month)
      .reduce((sum, c) => sum + c.people_count, 0);
  };

  const getMonthPerPerson = (month: number): number => {
    const total = getMonthTotalAmount(month);
    const people = getMonthPeopleCount(month);
    return people > 0 ? total / people : 0;
  };

  const getCategoryTotal = (categoryId: string): number => {
    return yearItems
      .filter((item) => item.material?.category_id === categoryId)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const grandTotal = yearItems.reduce((sum, item) => sum + Number(item.amount), 0);

  const handlePrint = () => {
    const data = categories.map((cat) => {
      const monthValues: number[] = [];
      for (let m = 1; m <= 12; m++) {
        monthValues.push(getMonthCategoryAmount(m, cat.id));
      }
      return {
        name: cat.name_ar,
        monthValues,
        total: getCategoryTotal(cat.id),
      };
    });
    const monthTotals: number[] = [];
    const monthMealCounts: number[] = [];
    const monthPerPerson: number[] = [];
    for (let m = 1; m <= 12; m++) {
      monthTotals.push(getMonthTotalAmount(m));
      monthMealCounts.push(getMonthMealCount(m));
      monthPerPerson.push(getMonthPerPerson(m));
    }
    printMonthlyCategoryConsumption(data, monthTotals, monthMealCounts, monthPerPerson, year, settings);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          ورقة الاستهلاك الشهري الصنفي - {year}
        </h2>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowAmount(true)}
              className={`px-3 py-1.5 text-sm ${showAmount ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
            >
              المبلغ
            </button>
            <button
              onClick={() => setShowAmount(false)}
              className={`px-3 py-1.5 text-sm ${!showAmount ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
            >
              عدد الوجبات
            </button>
          </div>
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer className="w-4 h-4" />
            طباعة
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-header text-right">
                <th className="p-2 sticky right-0 bg-slate-50 z-10 min-w-20">الشهر</th>
                {categories.map((cat) => (
                  <th key={cat.id} className="p-2 text-center min-w-28">{cat.name_ar}</th>
                ))}
                <th className="p-2 text-center bg-teal-50">مجموع الأصناف</th>
                <th className="p-2 text-center bg-amber-50">عدد الأشخاص</th>
                <th className="p-2 text-center bg-teal-50">قيمة الوجبة للفرد</th>
              </tr>
            </thead>
            <tbody>
              {ARABIC_MONTHS.map((name, index) => {
                const monthNumber = index + 1;
                const total = getMonthTotalAmount(monthNumber);
                const people = getMonthMealCount(monthNumber);
                const perPerson = getMonthPerPerson(monthNumber);
                return (
                  <tr key={monthNumber} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 font-medium text-slate-800 sticky right-0 bg-white z-10">{name}</td>
                    {categories.map((cat) => {
                      const value = getMonthCategoryAmount(monthNumber, cat.id);
                      return (
                        <td key={cat.id} className={`p-2 text-center ${value > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {value > 0 ? (showAmount ? formatNumber(value, 0) : 1) : '—'}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold bg-teal-50">{showAmount && total > 0 ? formatNumber(total, 0) : '—'}</td>
                    <td className="p-2 text-center bg-amber-50">{people > 0 ? formatNumber(people, 0) : '—'}</td>
                    <td className="p-2 text-center bg-teal-50">{perPerson > 0 ? formatNumber(perPerson, 0) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <td className="p-2 sticky right-0 bg-slate-100 z-10">الإجمالي</td>
                {categories.map((cat) => (
                  <td key={cat.id} className="p-2 text-center">{showAmount ? formatNumber(getCategoryTotal(cat.id), 0) : '—'}</td>
                ))}
                <td className="p-2 text-center bg-teal-100">{showAmount ? formatNumber(grandTotal, 0) : '—'}</td>
                <td className="p-2 text-center bg-amber-100">{formatNumber(yearPeopleCounts.reduce((s, c) => s + c.people_count, 0), 0)}</td>
                <td className="p-2 text-center bg-teal-100">
                  {(() => {
                    const people = yearPeopleCounts.reduce((s, c) => s + c.people_count, 0);
                    return people > 0 ? formatNumber(grandTotal / people, 0) : '—';
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        ملاحظة: القيم بالدينار الجزائري. الخلايا الفارغة تعني عدم وجود استهلاك في ذلك الشهر لذلك التصنيف.
      </div>
    </div>
  );
}
