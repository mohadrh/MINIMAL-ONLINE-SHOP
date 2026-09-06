/* ============================================================
   پیکربندیِ منبعِ داده

   سایت باید در سه حالت کار کند و هیچ‌کدام نباید کدِ کامپوننت‌ها را
   عوض کند:

     local  — داده از src/data می‌آید. حالتِ امروز، و همان چیزی که
              روی GitHub Pages منتشر می‌شود.
     woo    — داده از ووکامرس می‌آید، از سمتِ سرور.
     bridge — داده از افزونه‌ی وردپرسِ خودمان می‌آید، از اندپوینتِ
              عمومیِ فقط‌خواندنی. برای وقتی که میزبانِ سایت سرور
              ندارد.

   ⚠ انتخاب خودکار است نه دستی: اگر کلیدها ست شده باشند woo، وگرنه
   اگر آدرسِ پل ست شده باشد bridge، وگرنه local. این‌طور یک نصبِ
   ناقص به‌جای خطا دادن، به دادهٔ محلی برمی‌گردد و سایت بالا
   می‌ماند.
   ============================================================ */

export type DataSource = 'local' | 'woo' | 'bridge';

/**
 * ⚠ این‌ها عمداً NEXT_PUBLIC_ نیستند.
 *
 * هر متغیری که با NEXT_PUBLIC_ شروع شود داخل باندلِ مرورگر پخته
 * می‌شود و هر بازدیدکننده‌ای می‌تواند بخواندش. کلید و رمزِ
 * ووکامرس اجازه‌ی خواندنِ سفارش‌ها و مشتری‌ها را می‌دهد، پس
 * افتادنش در مرورگر یعنی نشتِ کاملِ فروشگاه.
 *
 * فقط آدرسِ سایت و آدرسِ پل عمومی‌اند، چون آن‌ها راز نیستند.
 */
export const WP_URL = process.env.WORDPRESS_URL ?? '';
export const WOO_KEY = process.env.WOO_CONSUMER_KEY ?? '';
export const WOO_SECRET = process.env.WOO_CONSUMER_SECRET ?? '';

/** آدرسِ عمومیِ افزونه‌ی پل — این یکی می‌تواند در مرورگر باشد */
export const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL ?? '';

export function resolveSource(): DataSource {
  if (WP_URL && WOO_KEY && WOO_SECRET) return 'woo';
  if (BRIDGE_URL) return 'bridge';
  return 'local';
}

export const SOURCE: DataSource = resolveSource();

/** چند ثانیه صبر کنیم تا یک درخواست را شکست‌خورده حساب کنیم */
export const TIMEOUT_MS = Number(process.env.WOO_TIMEOUT_MS ?? 8000);

/**
 * چند ثانیه پاسخ را نگه داریم.
 *
 * کاتالوگ ساعتی چند بار عوض نمی‌شود ولی موجودی می‌شود؛ پس دو عدد
 * جدا. با revalidate نکست، صفحه‌ها ایستا می‌مانند و در پس‌زمینه
 * تازه می‌شوند.
 */
export const REVALIDATE = {
  catalog: Number(process.env.REVALIDATE_CATALOG ?? 600),
  stock: Number(process.env.REVALIDATE_STOCK ?? 60),
};

/**
 * نگهبانِ سمتِ سرور.
 *
 * اگر ماژولی که راز دارد به‌اشتباه در کامپوننتِ کلاینت ایمپورت
 * شود، این خطا در همان لحظه‌ی توسعه می‌ترکد — نه شش ماه بعد وقتی
 * کلید در باندل پیدا شد.
 */
export function assertServerOnly(who: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      `${who} فقط در سمتِ سرور اجرا می‌شود. این ماژول راز دارد و نباید در کامپوننت کلاینت ایمپورت شود.`,
    );
  }
}
