/* ============================================================
   کلاینتِ پل — امن برای مرورگر

   ⚠ این فایل عمداً هیچ رازی ندارد و همین است که اجازه می‌دهد از
   کامپوننتِ کلاینت صدا زده شود.

   سه کار می‌کند: درخواستِ کد یک‌بارمصرف، بررسی‌اش، و ثبت سفارش.
   هر سه به افزونه‌ی وردپرس می‌روند، جایی که اعتبارسنجیِ واقعی
   انجام می‌شود.

   قاعده‌ای که این‌جا هم رعایت می‌شود: قیمت فرستاده نمی‌شود. فقط
   شناسه‌ی محصول و تعداد. هر چیزی که در مرورگر باشد قابلِ دستکاری
   است، پس قیمت باید سمتِ سرور حساب شود.
   ============================================================ */

const BASE = (process.env.NEXT_PUBLIC_BRIDGE_URL ?? '').replace(/\/$/, '');

/** آیا بک‌اند وصل است؟ اگر نه، سایت با شبیه‌سازیِ محلی کار می‌کند. */
export const BRIDGE_READY = BASE !== '';

export class BridgeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'BridgeError';
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!BRIDGE_READY) {
    throw new BridgeError(0, 'بک‌اند هنوز وصل نشده است.');
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);

  try {
    const res = await fetch(`${BASE}/wp-json/phoenix/v1${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    } & T;

    if (!res.ok) {
      /* پیامِ خودِ سرور را نشان می‌دهیم چون فارسی و برای کاربر
         نوشته شده — ولی اگر نبود، یک جمله‌ی عمومی. جزئیاتِ فنی
         هیچ‌وقت به کاربر نمی‌رسد. */
      throw new BridgeError(res.status, data.message || 'درخواست انجام نشد.');
    }
    return data;
  } catch (e) {
    if (e instanceof BridgeError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new BridgeError(408, 'پاسخی نیامد. اینترنت را بررسی کن.');
    }
    throw new BridgeError(0, 'ارتباط برقرار نشد.');
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------
   رمز یک‌بارمصرف
--------------------------------------------------------------- */

export async function requestOtp(phone: string): Promise<{ ttl: number }> {
  return post<{ ttl: number }>('/otp/request', { phone });
}

/**
 * کد را می‌فرستد و ژتون می‌گیرد.
 *
 * ژتون در حافظه‌ی نشست می‌ماند نه در localStorage: عمرش پانزده
 * دقیقه است و فقط برای ثبتِ همین سفارش لازم است. چیزی که کوتاه‌عمر
 * است نباید جایی بماند که تا ماه‌ها بعد خوانده شود.
 */
export async function verifyOtp(phone: string, code: string): Promise<string> {
  const r = await post<{ token: string }>('/otp/verify', { phone, code });
  try {
    sessionStorage.setItem('phoenix.token', r.token);
  } catch {
    /* حالت ناشناس یا مسدود بودن — ژتون فقط در همین صفحه می‌ماند */
  }
  return r.token;
}

export function storedToken(): string {
  try {
    return sessionStorage.getItem('phoenix.token') ?? '';
  } catch {
    return '';
  }
}

/* ---------------------------------------------------------------
   سفارش
--------------------------------------------------------------- */

export interface OrderItem {
  /** شناسه‌ی محصول یا واریاسیون در ووکامرس */
  id: number;
  qty: number;
  /** ورودی‌هایی که محصول خواسته — ایمیل اکانت، آیدی تلگرام و مانند آن */
  inputs?: Record<string, string>;
}

export interface OrderResult {
  id: number;
  number: string;
  key: string;
  total: number;
  pay_url: string;
}

export async function createOrder(params: {
  phone: string;
  name?: string;
  email?: string;
  note?: string;
  items: OrderItem[];
}): Promise<OrderResult> {
  const token = storedToken();
  if (!token) {
    throw new BridgeError(401, 'اول شماره‌ات را با کد تأیید کن.');
  }
  return post<OrderResult>('/order', { ...params, token });
}

/* ---------------------------------------------------------------
   پیگیری
--------------------------------------------------------------- */

export interface TrackedOrder {
  number: string;
  status: string;
  createdAt: number | null;
  total: number;
  delivered: boolean;
  items: {
    title: string;
    quantity: number;
    total: number;
    /** کدهایی که تحویل داده شده — اگر هنوز تحویل نشده، خالی */
    codes: string[];
  }[];
}

/**
 * سفارش را با شماره‌ی سفارش و موبایل می‌گیرد.
 *
 * ⚠ هر دو لازم‌اند. فقط با شماره‌ی سفارش، هر کسی می‌توانست
 * شماره‌ها را یکی‌یکی امتحان کند و سفارش‌های دیگران را ببیند.
 */
export async function trackOrder(code: string, phone: string): Promise<TrackedOrder> {
  return post<TrackedOrder>('/track', { code, phone });
}
