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
  /**
   * شناسه‌ی حساب — شماره‌ی موبایل.
   *
   * یوزرنیمِ جدا عمداً نداریم. موبایل در ایران کلید یکتای طبیعی
   * است: با پیامک تأیید می‌شود، تکراری نمی‌شود، و کاربر همیشه
   * یادش هست. شناسه‌ی دوم یعنی دو ایندکس یکتا و یک سوال همیشگی —
   * اگر کاربر یوزرنیمش را عوض کند، سفارش‌های قبلی به چه چیزی وصل
   * می‌مانند؟ با یک کلید، این سوال اصلاً پیش نمی‌آید.
   */
  phone: string;
  /** برای پشتیبانی و فاکتور — نه برای ورود */
  name: string;
  /**
   * ایمیل اختیاری است و شناسه نیست.
   *
   * در این سایت ایمیل یک چیزِ *محصولی* است نه هویتی: اشتراک روی
   * همان ایمیل فعال می‌شود و کاربر ممکن است برای هر سفارش ایمیل
   * دیگری بدهد. همین حالا هم در requiredInputs هر محصول گرفته
   * می‌شود. اگر شناسه‌ی حسابش می‌کردیم، کسی که برای سفارش بعدی
   * ایمیل کاری‌اش را می‌دهد، حسابِ دومی می‌ساخت.
   */
  email?: string;
  /** فقط نشانه: کاربر رمز گذاشت یا مهمان ماند */
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
  { phone, name, email, password }:
  { phone: string; name: string; email?: string; password?: string },
): Account {
  const acc: Account = {
    phone: phone.trim(),
    name: name.trim(),
    email: email?.trim() || undefined,
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

/** نام — فقط اینکه خالی نباشد و یک حرف واقعی داشته باشد.

    سخت‌گیری بیشتر روی نام، بیش از آنکه چیزی را درست کند، آدم‌هایی
    را که نامشان در الگوی ما نمی‌گنجد بیرون می‌گذارد. */
export const nameOk = (v: string) => v.trim().length >= 2;


/* ---------------------------------------------------------------
   ورود با کد یک‌بارمصرف

   ⚠ شبیه‌سازی است، نه احراز هویت.

   کد در همین مرورگر ساخته و نگه داشته می‌شود چون سرویس پیامکی
   وصل نیست. یعنی هرکسی که به این مرورگر دسترسی دارد می‌تواند کد
   را بخواند — پس این هیچ‌چیزی را محافظت نمی‌کند و نباید طوری
   استفاده شود که انگار می‌کند.

   وقتی سرویس پیامک وصل شد، requestOtp به سرور می‌رود و verifyOtp
   جواب سرور را می‌گیرد؛ امضای هر دو همین می‌ماند.

   انقضا و سقفِ تلاش از همین حالا پیاده شده‌اند، چون اگر بعداً
   اضافه شوند معمولاً از قلم می‌افتند: کدِ بی‌انقضا و بی‌سقف،
   حدس‌زدنی است.
--------------------------------------------------------------- */

const OTP_KEY = 'phoenix.otp.v1';
const OTP_TTL = 2 * 60 * 1000;   // دو دقیقه
const OTP_MAX_TRIES = 5;

interface OtpState {
  phone: string;
  code: string;
  expiresAt: number;
  tries: number;
}

function readOtp(): OtpState | null {
  if (!canStore()) return null;
  try {
    const raw = sessionStorage.getItem(OTP_KEY);
    return raw ? (JSON.parse(raw) as OtpState) : null;
  } catch {
    return null;
  }
}

/**
 * کد را می‌سازد و برمی‌گرداند.
 *
 * در نسخه‌ی واقعی هیچ‌وقت کد به کلاینت برنمی‌گردد — پیامک می‌شود.
 * این‌جا برگردانده می‌شود تا بشود روی صفحه نشانش داد و بدون سرویس
 * پیامک هم فلو قابل امتحان باشد. همین که سرویس وصل شد، مقدار
 * برگشتی حذف می‌شود و صفحه هم دیگر نشانش نمی‌دهد.
 */
export function requestOtp(phone: string): { code: string; expiresAt: number } {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const state: OtpState = {
    phone: phone.trim(),
    code,
    expiresAt: Date.now() + OTP_TTL,
    tries: 0,
  };
  if (canStore()) {
    /* sessionStorage نه localStorage: کد نباید از بستنِ تب زنده
       بماند. */
    try { sessionStorage.setItem(OTP_KEY, JSON.stringify(state)); } catch { /* بی‌صدا */ }
  }
  return { code, expiresAt: state.expiresAt };
}

export type OtpResult = 'ok' | 'wrong' | 'expired' | 'too-many' | 'none';

export function verifyOtp(phone: string, code: string): OtpResult {
  const st = readOtp();
  if (!st || st.phone !== phone.trim()) return 'none';
  if (Date.now() > st.expiresAt) return 'expired';
  if (st.tries >= OTP_MAX_TRIES) return 'too-many';

  if (st.code !== code.trim()) {
    st.tries += 1;
    if (canStore()) {
      try { sessionStorage.setItem(OTP_KEY, JSON.stringify(st)); } catch { /* بی‌صدا */ }
    }
    return st.tries >= OTP_MAX_TRIES ? 'too-many' : 'wrong';
  }

  if (canStore()) {
    try { sessionStorage.removeItem(OTP_KEY); } catch { /* بی‌صدا */ }
  }
  return 'ok';
}

/** کد شش‌رقمی */
export const otpOk = (v: string) => /^\d{6}$/.test(v.trim());
