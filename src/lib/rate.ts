/* ============================================================
   نرخ دلار

   بازارِ این محصولات دلاری است: اشتراک‌ها و گیفت کارت‌ها به دلار
   خریده می‌شوند و به تومان فروخته می‌شوند. پس قیمتِ تومانی یک
   عددِ ثابت نیست، حاصل‌ضربِ مبلغِ دلاری در نرخِ روز است.

   کارفرما همین را خواست: کاربر باید نرخ را ببیند و بفهمد قیمت از
   کجا آمده، نه اینکه یک عددِ تومانیِ بی‌توضیح جلویش باشد.

   ⚠ چرا نرخ این‌جا ثابت است و «لحظه‌ای» نیست:

   سایت به‌صورت استاتیک بیلد می‌شود و بک‌اندی ندارد که نرخ را
   بدهد. نرخِ لحظه‌ای بدون منبع، عددِ ساختگی است — و عددِ ساختگی
   روی صفحه‌ی پرداخت بدتر از نبودنش است.

   پس مسیرش ساخته شده و منتظرِ منبع است: اگر NEXT_PUBLIC_RATE_URL
   تعریف شود، همان لحظه‌ای می‌شود. وقتی داده از ووکامرس بیاید، آن
   آدرس همان اندپوینتِ فروشگاه است و هیچ‌جای دیگرِ کد عوض نمی‌شود.

   تا آن روز، DEFAULT_USD_RATE تنها جایی است که نرخ نوشته شده. یک
   عدد، نه ده جا.
   ============================================================ */

/** نرخ کاریِ دلار به تومان — تا وقتی منبعِ زنده وصل شود */
export const DEFAULT_USD_RATE = 110_000;

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
