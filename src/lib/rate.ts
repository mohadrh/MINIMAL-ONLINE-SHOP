/* ============================================================
   نرخ دلار

   بازارِ این محصولات دلاری است: اشتراک‌ها و گیفت کارت‌ها به دلار
   خریده می‌شوند و به تومان فروخته می‌شوند. پس قیمتِ تومانی یک
   عددِ ثابت نیست، حاصل‌ضربِ مبلغِ دلاری در نرخِ روز است.

   کارفرما همین را خواست: کاربر باید نرخ را ببیند و بفهمد قیمت از
   کجا آمده، نه اینکه یک عددِ تومانیِ بی‌توضیح جلویش باشد.

   ⚠ نرخ دو مسیر دارد، و هر دو زنده‌اند.

   مسیرِ اول زمانِ بیلد است: scripts/fetch-rate.mjs نرخ را از
   منبع می‌گیرد و در فایل می‌نشاند. پس حتی سایتِ ایستا هم با
   نرخِ روزِ انتشار بالا می‌آید.

   مسیرِ دوم زمانِ اجراست: اگر NEXT_PUBLIC_RATE_URL تعریف شود —
   مثلاً اندپوینتِ phoenix/v1/rate در افزونه — صفحه نرخ را
   همان لحظه می‌گیرد و جای عددِ بیلد می‌گذارد.

   دومی دقیق‌تر است ولی به بک‌اند نیاز دارد؛ اولی همیشه کار
   می‌کند. با هم، نرخ هیچ‌وقت آن‌قدر کهنه نمی‌شود که ضرر بدهد.
   ============================================================ */

import GENERATED from '../data/generated/rate.json';

/**
 * نرخ کاریِ دلار به تومان.
 *
 * ⚠ دیگر عددِ دستی نیست — لحظه‌ی بیلد گرفته می‌شود.
 *
 * قبلاً ۱۱۰٬۰۰۰ نوشته شده بود و ماه‌ها دست‌نخورده ماند، در حالی
 * که نرخِ واقعی دو برابر شده بود. یعنی هر قیمتِ دلاری روی سایت
 * نصفِ ارزشِ واقعی‌اش را نشان می‌داد.
 *
 * ‎scripts/fetch-rate.mjs‎ پیش از هر بیلد اجرا می‌شود و نرخ را از
 * منبع می‌گیرد. اگر منبع جواب ندهد، نرخِ بارِ قبل می‌ماند و بیلد
 * نمی‌شکند.
 */
export const DEFAULT_USD_RATE: number = GENERATED.rate;

/** لحظه‌ای که نرخ گرفته شد — برای نشان دادن به کاربر */
export const RATE_FETCHED_AT: string = GENERATED.at;

/** آدرسی که نرخ را می‌دهد؛ اگر تعریف نشده باشد نرخ ثابت می‌ماند */
const RATE_URL = process.env.NEXT_PUBLIC_RATE_URL;

/**
 * تبدیل دلار به تومان.
 *
 * گرد به ده‌هزار تومان — قیمتی با رقمِ خرد («۴٬۲۷۳٬۵۵۰») در این
 * بازار بی‌اعتماد به نظر می‌رسد و کاربر فکر می‌کند حساب دستکاری
 * شده.
 */
export function tomanFromUsd(usd: number, rate: number = DEFAULT_USD_RATE): number {
  return Math.round((usd * rate) / 10_000) * 10_000;
}

export interface RateState {
  rate: number;
  /** آیا از منبعِ زنده آمده یا نرخِ ثابتِ داخلی است */
  live: boolean;
}

/**
 * نرخ را از منبع می‌گیرد و اگر نشد، نرخِ ثابت را برمی‌گرداند.
 *
 * هیچ‌وقت throw نمی‌کند: صفحه‌ی محصول نباید به‌خاطر نرسیدنِ نرخ
 * خالی بماند. قیمتِ کمی قدیمی بهتر از صفحه‌ی شکسته است.
 */
export async function fetchUsdRate(): Promise<RateState> {
  if (!RATE_URL) return { rate: DEFAULT_USD_RATE, live: false };
  try {
    const res = await fetch(RATE_URL, { cache: 'no-store' });
    if (!res.ok) return { rate: DEFAULT_USD_RATE, live: false };
    const data: unknown = await res.json();
    const n = typeof data === 'object' && data !== null && 'rate' in data
      ? Number((data as { rate: unknown }).rate)
      : Number(data);
    if (!Number.isFinite(n) || n <= 0) return { rate: DEFAULT_USD_RATE, live: false };
    return { rate: n, live: true };
  } catch {
    return { rate: DEFAULT_USD_RATE, live: false };
  }
}
