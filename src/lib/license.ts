import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type LicenseStatus = 'loading' | 'trial' | 'expired' | 'activated' | 'error';

interface LicenseState {
  status: LicenseStatus;
  trialDaysLeft: number;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/license-check`;

async function getHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

export function useLicense(session: Session | null) {
  const [state, setState] = useState<LicenseState>({ status: 'loading', trialDaysLeft: 0 });

  const check = useCallback(async () => {
    if (!session) {
      setState({ status: 'loading', trialDaysLeft: 0 });
      return;
    }
    try {
      const headers = await getHeaders();
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'check' }),
      });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      if (data.status === 'trial') {
        setState({ status: 'trial', trialDaysLeft: data.trial_days_left });
      } else if (data.status === 'expired') {
        setState({ status: 'expired', trialDaysLeft: 0 });
      } else if (data.status === 'activated') {
        setState({ status: 'activated', trialDaysLeft: 0 });
      } else {
        setState({ status: 'error', trialDaysLeft: 0 });
      }
    } catch {
      setState({ status: 'error', trialDaysLeft: 0 });
    }
  }, [session]);

  useEffect(() => {
    check();
  }, [check]);

  return state;
}

export async function activateLicense(code: string): Promise<{ success: boolean; message: string }> {
  try {
    const headers = await getHeaders();
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'activate', code }),
    });
    const data = await res.json();
    if (data.status === 'activated') {
      return { success: true, message: data.message || 'تم التفعيل بنجاح' };
    }
    return { success: false, message: data.message || 'فشل التفعيل' };
  } catch {
    return { success: false, message: 'حدث خطأ في الاتصال' };
  }
}
