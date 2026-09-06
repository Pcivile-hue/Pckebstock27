import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  UtensilsCrossed,
  ClipboardList,
  FileBarChart,
  Printer,
  Settings,
  Database,
  Menu,
  X,
  LogOut,
  Clock,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Dashboard from '@/pages/Dashboard';
import Materials from '@/pages/Materials';
import Inventory from '@/pages/Inventory';
import Purchases from '@/pages/Purchases';
import Consumption from '@/pages/Consumption';
import StockCard from '@/pages/StockCard';
import Reports from '@/pages/Reports';
import PrintCenter from '@/pages/PrintCenter';
import SettingsPage from '@/pages/Settings';
import DataManagement from '@/pages/DataManagement';
import AuthPage from '@/pages/AuthPage';
import ActivationGate from '@/pages/ActivationGate';
import { useLicense } from '@/lib/license';

export type PageKey =
  | 'dashboard'
  | 'materials'
  | 'inventory'
  | 'purchases'
  | 'consumption'
  | 'stockcard'
  | 'reports'
  | 'print'
  | 'data'
  | 'settings';

const NAV_ITEMS: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { key: 'materials', label: 'إدارة المواد', icon: Package },
  { key: 'inventory', label: 'المخزون', icon: Boxes },
  { key: 'purchases', label: 'المشتريات', icon: ShoppingCart },
  { key: 'consumption', label: 'الاستهلاك اليومي', icon: UtensilsCrossed },
  { key: 'stockcard', label: 'بطاقة متابعة المخزون', icon: ClipboardList },
  { key: 'reports', label: 'التقارير', icon: FileBarChart },
  { key: 'print', label: 'الطباعة', icon: Printer },
  { key: 'data', label: 'استيراد / تصدير Excel', icon: Database },
  { key: 'settings', label: 'الإعدادات', icon: Settings },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showActivation, setShowActivation] = useState(false);
  const license = useLicense(session);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPage]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center" dir="rtl">
        <div className="text-slate-400 text-lg">جاري التحميل...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (license.status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center" dir="rtl">
        <div className="text-slate-400 text-lg">جاري التحميل...</div>
      </div>
    );
  }

  if (license.status === 'error') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">تعذر الاتصال بالخادم</h2>
          <p className="text-slate-500">الرجاء التحقق من اتصال الإنترنت والمحاولة مرة أخرى.</p>
        </div>
      </div>
    );
  }

  if (license.status === 'expired') {
    return (
      <ActivationGate
        status={license.status}
        trialDaysLeft={license.trialDaysLeft}
        onActivated={() => window.location.reload()}
        onLogout={() => window.location.reload()}
      />
    );
  }

  if (license.status === 'trial' && showActivation) {
    return (
      <ActivationGate
        status={license.status}
        trialDaysLeft={license.trialDaysLeft}
        onActivated={() => window.location.reload()}
        onLogout={() => window.location.reload()}
        onBack={() => setShowActivation(false)}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'materials':
        return <Materials />;
      case 'inventory':
        return <Inventory />;
      case 'purchases':
        return <Purchases />;
      case 'consumption':
        return <Consumption />;
      case 'stockcard':
        return <StockCard />;
      case 'reports':
        return <Reports />;
      case 'print':
        return <PrintCenter />;
      case 'data':
        return <DataManagement />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 right-0 h-screen w-72 bg-slate-800 text-slate-100 z-40 transition-transform duration-300 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">نظام تسيير المخزون</h1>
              <p className="text-xs text-slate-400">المواد الغذائية</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setCurrentPage(item.key)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-600 text-white border-r-4 border-teal-300'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white border-r-4 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
          <div className="text-xs text-slate-500 text-center mt-2">
            الحماية المدنية - وحدة سبت عزيز
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden bg-slate-800 text-white p-4 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-700 rounded-lg">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-medium text-sm">نظام تسيير المخزون</span>
          <button onClick={handleLogout} className="p-2 hover:bg-slate-700 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {license.status === 'trial' && (
          <button
            onClick={() => setShowActivation(true)}
            className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 hover:bg-amber-100 transition-colors text-right"
          >
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-700 font-medium">
              فترة تجريبية - متبقي {license.trialDaysLeft} يوم
            </span>
          </button>
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{renderPage()}</main>
      </div>
    </div>
  );
}
