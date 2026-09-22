import { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, UserPlus, AlertCircle, Mail, ArrowRight, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setInfo(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('الرجاء إدخال البريد الإلكتروني');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      setError(null);
      setInfo(null);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setInfo('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.');
      } catch (err: any) {
        setError(err.message || 'حدث خطأ');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      setError('الرجاء إدخال كلمة المرور');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">نظام تسيير المخزون</h1>
          <p className="text-sm text-slate-500 mt-1">المواد الغذائية - الحماية المدنية</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {mode !== 'forgot' && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${mode === 'login' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <LogIn className="w-4 h-4" />
                تسجيل الدخول
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${mode === 'signup' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <UserPlus className="w-4 h-4" />
                إنشاء حساب
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="flex items-center gap-2 mb-6">
              <KeyRound className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-800">استعادة كلمة المرور</h2>
            </div>
          )}

          {mode === 'signup' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm text-emerald-700">
              إنشاء حساب جديد يمنحك فترة تجريبية مجانية لمدة 30 يوماً.
            </div>
          )}

          {mode === 'forgot' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
              أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="input w-full"
                dir="ltr"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="input w-full"
                  dir="ltr"
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {info && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700">
                <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{info}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center"
            >
              {loading
                ? 'جاري المعالجة...'
                : mode === 'login'
                ? 'دخول'
                : mode === 'signup'
                ? 'إنشاء حساب'
                : 'إرسال رابط الاستعادة'}
            </button>
          </form>

          {mode === 'login' && (
            <button
              onClick={() => setMode('forgot')}
              className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium mt-4"
            >
              نسيت كلمة المرور؟
            </button>
          )}

          {mode === 'forgot' && (
            <button
              onClick={() => setMode('login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium mt-4"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى تسجيل الدخول
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
