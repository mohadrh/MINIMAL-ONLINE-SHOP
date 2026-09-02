/* ============================================================
   حساب کاربری

   ⚠ این لایه عمداً ساده و محلی است، و عمداً رمز را جدی نمی‌گیرد.

   تا وقتی بک‌اند واقعی (ووکامرس) وصل نشده، هیچ سروری وجود ندارد که
   حساب را نگه دارد. پس حساب در localStorage همین مرورگر می‌ماند.
   یعنی:

   ۱ این «احراز هویت» نیست. هیچ چیزی این‌جا از کسی محافظت نمی‌کند
     و نباید طوری رفتار شود که انگار می‌کند.

   ۲ رمز *ذخیره نمی‌شود*. فقط یک نشانه نگه داشته می‌شود که کاربر
     رمز گذاشته یا نه. ذخیره‌ی رمز — حتی هش‌شده — در مرورگر، عادتِ
     غلطی است که وقتی بک‌اند آمد کسی یادش نمی‌ماند پاکش کند، و
     کاربران رمزهایشان را در سایت‌ها تکرار می‌کنند.

   وقتی ووکامرس وصل شد، فقط همین فایل عوض می‌شود: امضای توابع
   همان می‌ماند و بقیه‌ی سایت دست نمی‌خورد.
   ============================================================ */

const KEY = 'phoenix.account.v1';

export interface Account {
  /** شناسه‌ی ورود — ایمیل کاربر */
  email: string;
  /** برای کد پیگیری و پیامک تحویل */
  phone: string;
  /** فقط نشانه: کاربر هنگام ثبت‌نام رمز گذاشت یا مهمان ماند */
  hasPassword: boolean;
  createdAt: string;
}

const canStore = () => typeof window !== 'undefined';

export function getAccount(): Account | null {
  if (!canStore()) return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    /* حالت خصوصی یا داده‌ی خراب — مثل نداشتن حساب رفتار می‌شود */
    return null;
  }
}

/**
 * حساب را می‌سازد یا به‌روز می‌کند.
 *
 * رمز گرفته می‌شود ولی نگه داشته نمی‌شود — فقط hasPassword ثبت
 * می‌شود. امضای تابع رمز را قبول می‌کند تا وقتی بک‌اند آمد، همین
 * فراخوانی بدون تغییر به سرور برود.
 */
export function saveAccount(
  { email, phone, password }: { email: string; phone: string; password?: string },
): Account {
  const acc: Account = {
    email: email.trim(),
    phone: phone.trim(),
    hasPassword: Boolean(password && password.length > 0),
    createdAt: getAccount()?.createdAt ?? new Date().toISOString(),
  };
  if (canStore()) {
    try { localStorage.setItem(KEY, JSON.stringify(acc)); } catch { /* بی‌صدا */ }
  }
  return acc;
}

export function clearAccount() {
  if (!canStore()) return;
  try { localStorage.removeItem(KEY); } catch { /* بی‌صدا */ }
}

/* ---------------------------------------------------------------
   اعتبارسنجی

   هر سه در یک جا، چون هم فرم پرداخت لازمشان دارد هم هر فرم دیگری
   که بعداً اضافه شود. تکرارِ الگوی موبایل در دو فایل یعنی دو جا
   برای از هم افتادن.
--------------------------------------------------------------- */

/** موبایل ایرانی. سخت‌گیر است چون شماره‌ی غلط یعنی سفارشِ
    پیگیری‌ناپذیر. */
export const phoneOk = (v: string) => /^09\d{9}$/.test(v.trim());

/** ایمیل — الگوی ساده و عمدی.

    الگوهای «کامل» ایمیل هم غلط‌اند هم آدرس‌های درست را رد می‌کنند.
    این فقط شکلِ کلی را می‌سنجد؛ درستیِ واقعی وقتی معلوم می‌شود که
    اشتراک روی همان ایمیل فعال شود. */
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** رمز اختیاری است، ولی اگر گذاشته شد باید حداقلی داشته باشد */
export const passwordOk = (v: string) => v.length === 0 || v.length >= 6;
