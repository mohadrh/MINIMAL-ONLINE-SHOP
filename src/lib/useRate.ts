'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_USD_RATE, fetchUsdRate, type RateState } from './rate';

/**
 * نرخ دلار برای کامپوننت‌ها.
 *
 * اول با نرخِ ثابت شروع می‌کند و بعد اگر منبعِ زنده تعریف شده
 * باشد به‌روزش می‌کند. ترتیبش عمدی است: قیمت باید از همان رندرِ
 * اول روی صفحه باشد، نه بعد از یک چرخه‌ی انتظار.
 *
 * چون مقدارِ اولیه همان چیزی است که سرور هم حساب کرده، رندرِ سرور
 * و کلاینت یکی است و هشدارِ hydration نمی‌دهد.
 */
export function useUsdRate(): RateState {
  const [state, setState] = useState<RateState>({ rate: DEFAULT_USD_RATE, live: false });

  useEffect(() => {
    let alive = true;
    fetchUsdRate().then((r) => {
      /* اگر کامپوننت رفته، setState نکن */
      if (alive && r.live) setState(r);
    });
    return () => { alive = false; };
  }, []);

  return state;
}
