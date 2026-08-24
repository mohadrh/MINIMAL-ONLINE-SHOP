/* ============================================================
   مسیر فایل‌های استاتیک

   وقتی سایت روی زیرمسیر میزبانی می‌شود — مثل
   mohadrh.github.io/phoenixshop/ — مسیرهای مطلقی که با / شروع
   می‌شوند به ریشه‌ی دامنه اشاره می‌کنند، نه به ریشه‌ی سایت. یعنی
   /brand/logo.png می‌رود سراغ mohadrh.github.io/brand/logo.png که
   وجود ندارد.

   Next خودش <Link> و next/image را با basePath تنظیم می‌کند، ولی
   تگ <img> خام و فراخوانی مستقیم فایل (مثل مدل سه‌بعدی و ویدیو) را
   دست نمی‌زند. این تابع همان شکاف را پر می‌کند.

   روی دامنه‌ی اصلی، NEXT_PUBLIC_BASE_PATH خالی است و تابع مسیر را
   دست‌نخورده برمی‌گرداند — پس اضافه کردنش هیچ هزینه‌ای ندارد.
   ============================================================ */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/* undefined را هم می‌پذیرد، چون خیلی از مسیرهای تصویر در کاتالوگ
   اختیاری‌اند (cover و cutout). این‌طور جای فراخوانی لازم نیست هر
   بار بررسی وجود بنویسیم. */
export function asset(path: string): string;
export function asset(path: string | undefined): string | undefined;
export function asset(path: string | undefined): string | undefined {
  if (!path) return path;
  // مسیرهای بیرونی و data: دست نمی‌خورند
  if (!path.startsWith('/')) return path;
  /* اگر پیشوند از قبل خورده، دوباره نزن.

     یک مسیر ممکن است از دو جا رد شود — مثلاً کارت محصول مسیر را
     تبدیل می‌کند و بعد به کامپوننت تصویر می‌دهد که آن هم تبدیل
     می‌کند. نتیجه‌اش /phoenixshop/phoenixshop/... بود و تصویر
     نمی‌آمد. این نگهبان کل آن دسته خطا را می‌بندد. */
  if (BASE && path.startsWith(`${BASE}/`)) return path;
  return `${BASE}${path}`;
}
