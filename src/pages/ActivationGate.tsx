import { useState } from 'react';
import { ShieldCheck, Clock, Lock, Phone, Mail, User, CreditCard, KeyRound, CheckCircle, AlertCircle, LogOut, ArrowRight } from 'lucide-react';
import { activateLicense } from '@/lib/license';
import { supabase } from '@/lib/supabase';

interface ActivationGateProps {
  status: 'trial' | 'expired';
  trialDaysLeft: number;
  onActivated: () => void;
  onLogout: () => void;
  onBack?: () => void;
}

export default function ActivationGate({ status, trialDaysLeft, onActivated, onLogout, onBack }: ActivationGateProps) {
  const [code, setCode] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleActivate = async () => {
    if (!code.trim()) {
      setResult({ success: false, message: 'الرجاء إدخال رمز التفعيل' });
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await activateLicense(code.trim());
    setLoading(false);
    setResult(res);
    if (res.success) {
      setTimeout(() => onActivated(), 1500);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const isExpired = status === 'expired';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-lg w-full">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">نظام تسيير المخزون</h1>
          <p className="text-sm text-slate-500 mt-1">المواد الغذائية - الحماية المدنية</p>
        </div>

        {/* Trial banner */}
        {status === 'trial' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-amber-800">فترة تجريبية</div>
              <div className="text-sm text-amber-700">
                متبقي {trialDaysLeft} يوم. للاستمرار في استخدام الموقع، يرجى تفعيل الرمز.
              </div>
            </div>
          </div>
        )}

        {/* Expired banner */}
        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <Lock className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-800">انتهت الفترة التجريبية</div>
              <div className="text-sm text-red-700">
                يجب تفعيل الموقع بالرمز لمواصلة الاستخدام. قيمة التفعيل: 5000 دج.
              </div>
            </div>
          </div>
        )}

        {/* Activation form — only shown during trial, NOT when expired */}
        {!isExpired && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-800">تفعيل الموقع</h2>
            </div>

            <label className="block text-sm font-medium text-slate-600 mb-2">رمز التفعيل</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="أدخل رمز التفعيل"
              className="input w-full text-center text-lg font-mono tracking-wider mb-3"
              dir="ltr"
              onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
            />

            <button
              onClick={handleActivate}
              disabled={loading}
              className="btn btn-primary w-full justify-center mb-3"
            >
              {loading ? 'جاري التحقق...' : 'تفعيل'}
            </button>

            {result && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm">{result.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact info — shown in both trial and expired */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mt-4">
          <button
            onClick={() => setShowContact(!showContact)}
            className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            {showContact ? 'إخفاء معلومات الاتصال' : 'تفعيل العمل - معلومات الاتصال'}
          </button>

          {showContact && (
            <div className="mt-4 bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <div className="text-center mb-3">
                <User className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                <div className="font-semibold text-slate-800">صاحب العمل: السيد هواري عبد الرزاق</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Phone className="w-4 h-4 text-teal-600" />
                <span>الهاتف: 0670077309</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Mail className="w-4 h-4 text-teal-600" />
                <span>الإيميل: haouariabdrezak@gmail.com</span>
              </div>
              <hr className="border-slate-200 my-2" />
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <div>
                  <div>رقم الحساب الجاري البريدي لشراء الرمز:</div>
                  <div className="font-bold text-slate-800 mt-1">7464530</div>
                  <div className="text-xs text-slate-500 mt-1">Cle: 27</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Back to app button — only during trial */}
        {status === 'trial' && onBack && (
          <div className="text-center mt-4">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى الفترة التجريبية
            </button>
          </div>
        )}

        {/* Logout button */}
        <div className="text-center mt-4">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </div>
    </div>
  );
}
