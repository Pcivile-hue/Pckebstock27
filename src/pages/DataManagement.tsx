import { useEffect, useState } from 'react';
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  History,
  Trash2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  getMaterials,
  getCategories,
  getUnits,
  getPurchases,
  getStockMovements,
  getSettings,
  getOperationLogs,
  addOperationLog,
} from '@/lib/db';
import {
  exportAllData,
  exportMaterialsToExcel,
  exportInventoryToExcel,
  exportPurchasesToExcel,
  exportStockMovementsToExcel,
  parseExcelFile,
  downloadMaterialTemplate,
} from '@/lib/excel';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Material, Category, Unit, Purchase, StockMovement, Settings as SettingsType, OperationLog } from '@/types';
import { getMaterialsWithStock } from '@/lib/db';

export default function DataManagement() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const l = await getOperationLogs(50);
      setLogs(l);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      const [materials, categories, units, purchases, stockMovements, settings] = await Promise.all([
        getMaterials(),
        getCategories(),
        getUnits(),
        getPurchases(),
        getStockMovements(),
        getSettings(),
      ]);

      const { data: consumptionItems } = await supabase.from('consumption_items').select('*');
      const { data: consumptionDays } = await supabase.from('consumption_days').select('*');

      exportAllData({
        materials,
        categories,
        units,
        purchases,
        stockMovements,
        consumptionItems: consumptionItems || [],
        consumptionDays: consumptionDays || [],
        settings,
      });

      await addOperationLog('نسخ احتياطي', 'تم تصدير نسخة احتياطية Excel');
      setMessage({ type: 'success', text: 'تم إنشاء النسخة الاحتياطية بنجاح.' });
      loadLogs();
    } catch (err) {
      setMessage({ type: 'error', text: 'فشل النسخ الاحتياطي: ' + (err as Error).message });
    }
  };

  const handleExportAll = async () => {
    try {
      const [materials, materialsWithStock, purchases, movements] = await Promise.all([
        getMaterials(),
        getMaterialsWithStock(),
        getPurchases(),
        getStockMovements(),
      ]);

      exportMaterialsToExcel(materials);
      exportInventoryToExcel(materialsWithStock);
      exportPurchasesToExcel(purchases);
      exportStockMovementsToExcel(movements);

      await addOperationLog('تصدير Excel', 'تم تصدير جميع البيانات');
      setMessage({ type: 'success', text: 'تم تصدير جميع البيانات بنجاح.' });
      loadLogs();
    } catch (err) {
      setMessage({ type: 'error', text: 'فشل التصدير: ' + (err as Error).message });
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('هل أنت متأكد من حذف سجل العمليات؟')) return;
    try {
      await supabase.from('operation_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setMessage({ type: 'success', text: 'تم حذف سجل العمليات.' });
      loadLogs();
    } catch (err) {
      setMessage({ type: 'error', text: 'فشل الحذف: ' + (err as Error).message });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Database className="w-7 h-7 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-800">استيراد / تصدير Excel</h1>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Backup section */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800">النسخ الاحتياطي والتصدير</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={handleBackup} className="btn btn-primary justify-start">
            <Download className="w-4 h-4" />
            نسخة احتياطية كاملة (Excel)
          </button>
          <button onClick={handleExportAll} className="btn btn-secondary justify-start">
            <Download className="w-4 h-4" />
            تصدير جميع البيانات (ملفات منفصلة)
          </button>
          <button onClick={downloadMaterialTemplate} className="btn btn-secondary justify-start">
            <FileSpreadsheet className="w-4 h-4" />
            تحميل نموذج Excel للمواد
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          ملاحظة: لاستيراد المواد من Excel، انتقل إلى صفحة "إدارة المواد" واستخدم زر "استيراد من Excel".
        </p>
      </div>

      {/* Operation log */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-800">سجل العمليات</h3>
          </div>
          {logs.length > 0 && (
            <button onClick={handleClearLogs} className="btn btn-danger">
              <Trash2 className="w-4 h-4" />
              حذف السجل
            </button>
          )}
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header text-right sticky top-0">
                <th className="p-3">رقم</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">العملية</th>
                <th className="p-3">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="p-3 text-slate-400">{i + 1}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="p-3 font-medium text-slate-800">{log.operation}</td>
                  <td className="p-3 text-slate-600">{log.details || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">لا توجد عمليات مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
