'use client';

import React, {
  createContext, useContext, useEffect, useMemo, useState,
} from 'react';

/* ============================================================
   قیمت زنده روی سایتِ ایستا

   ⚠ مسئله‌ای که حل می‌کند

   سایت خروجی ایستا دارد، پس قیمت‌ها لحظه‌ی بیلد در HTML پخته
   می‌شوند. اگر ادمین در پنل قیمتی را عوض کند و کسی بیلد نزند،
   بازدیدکننده عدد قدیمی می‌بیند.

   پول از دست نمی‌رود — سفارش قیمت را از ووکامرس می‌گیرد نه از
   مرورگر — ولی عددِ صفحه با فاکتور فرق می‌کند، و این بدترین جای
   ممکن برای بی‌اعتمادی است: لحظه‌ی پرداخت.

   راه‌حل: صفحه با همان قیمتِ پخته‌شده بالا می‌آید (پس چیزی خالی
   یا لرزان نیست)، و بلافاصله بعدش قیمت‌های تازه را می‌گیرد و اگر
   فرق داشتند جایشان می‌گذارد.

   ⚠ سه قاعده که این را از یک «بهینه‌سازی خطرناک» جدا می‌کند:

     ۱ اگر درخواست شکست بخورد، هیچ اتفاقی نمی‌افتد. قیمتِ ایستا
       می‌ماند و کاربر خطایی نمی‌بیند. بک‌اندِ خواب نباید فروشگاه
       را از کار بیندازد.

     ۲ یک بار در هر بارگذاری، نه در هر رندر. با کش یک‌دقیقه‌ای
       سمت سرور، بیشترش فایده ندارد.

     ۳ هیچ‌وقت جایگزینِ اعتبارسنجیِ سرور نیست. این فقط نمایش است؛
       قیمتِ واقعی همان است که ووکامرس موقع ثبت سفارش برمی‌دارد.
   ============================================================ */

export interface LivePrice {
  price: number;
  compareAt: number | null;
  stock: number | null;
}

type PriceMap = Record<string, LivePrice>;

const Ctx = createContext<PriceMap>({});

const BASE = (process.env.NEXT_PUBLIC_BRIDGE_URL ?? '').replace(/\/$/, '');

export function LivePriceProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<PriceMap>({});

  useEffect(() => {
    if (!BASE) return;

    let alive = true;
    const ctrl = new AbortController();
    /* مهلت کوتاه: این یک بهبودِ نمایشی است، نه چیزی که ارزش
       منتظر ماندن داشته باشد. */
    const timer = setTimeout(() => ctrl.abort(), 6000);

    fetch(`${BASE}/wp-json/phoenix/v1/prices`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data && typeof data === 'object') setPrices(data as PriceMap);
      })
      .catch(() => {
        /* بی‌صدا. قیمتِ ایستا سر جایش می‌ماند. */
      })
      .finally(() => clearTimeout(timer));

    return () => {
      alive = false;
      ctrl.abort();
      clearTimeout(timer);
    };
  }, []);

  return <Ctx.Provider value={prices}>{children}</Ctx.Provider>;
}

/** کلِ نقشه — برای جایی که چند پلن با هم لازم است */
export function useLivePrices(): PriceMap {
  return useContext(Ctx);
}

/**
 * قیمتِ تازه‌ی یک پلن، یا همان قیمتِ ایستا اگر خبری نبود.
 *
 * امضایش عمداً «مقدارِ پشتیبان را بده» است نه «شاید چیزی بدهم»:
 * این‌طور جای فراخوانی هیچ‌وقت لازم نیست حالتِ خالی را مدیریت کند
 * و امکان ندارد کسی قیمت را جا بیندازد.
 */
export function useLivePrice(variantId: string, fallback: LivePrice): LivePrice {
  const map = useContext(Ctx);
  return useMemo(() => map[variantId] ?? fallback, [map, variantId, fallback]);
}

/** فقط عدد قیمت — رایج‌ترین حالت */
export function useLiveAmount(variantId: string, fallback: number): number {
  const map = useContext(Ctx);
  return map[variantId]?.price ?? fallback;
}
