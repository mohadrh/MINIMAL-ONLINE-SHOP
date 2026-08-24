/* ============================================================
   سفارش‌ها

   تا وقتی ووکامرس وصل نشده، سفارش بعد از پرداخت باید جایی بماند —
   وگرنه صفحه‌ی پیگیری و پنل کاربری چیزی برای نشان دادن ندارند و
   کل جریان خرید در «پرداخت موفق» تمام می‌شود.

   ذخیره‌سازی روی localStorage است، پس فقط روی همان مرورگر دیده
   می‌شود. وقتی بک‌اند آمد، تنها همین فایل عوض می‌شود: امضای توابع
   عمداً شبیه یک کلاینت API نوشته شده (خواندن، نوشتن، جست‌وجو با کد).
   ============================================================ */

export type OrderStatus =
  | 'awaiting_payment'  // ثبت شد، هنوز به درگاه نرفته
  | 'paid'              // پرداخت تأیید شد
  | 'fulfilling'        // در صف تحویل
  | 'delivered'         // تحویل شد
  | 'needs_input'       // اطلاعات واردشده مشکل دارد
  | 'failed';           // پرداخت ناموفق

export interface OrderItem {
  productId: string;
  title: string;
  variantLabel: string;
  quantity: number;
  price: number;
  /** ورودی‌های گرفته‌شده قبل از پرداخت — مثل ایمیل یا یوزرنیم */
  inputs: Record<string, string>;
  deliveryEstimate: string;
  /** بعد از تحویل پر می‌شود: کد فعال‌سازی یا مشخصات اکانت */
  secret?: string;
}

export interface Order {
  code: string;
  createdAt: number;
  status: OrderStatus;
  phone: string;
  gateway: string;
  /** شناسه‌ی تراکنش درگاه — در نسخه‌ی واقعی از callback می‌آید */
  refId?: string;
  subtotal: number;
  discount: number;
  walletUsed: number;
  payable: number;
  items: OrderItem[];
  note?: string;
}

const KEY = 'phoenix.orders.v1';

function readAll(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    // حافظه‌ی خراب نباید کل صفحه را بشکند
    return [];
  }
}

function writeAll(list: Order[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* حافظه پر است یا حالت خصوصی — سفارش در همین نشست معتبر می‌ماند */
  }
}

/** شماره‌ی پیگیری — قالب PHX-۶ رقمی، همان چیزی که در پشتیبانی می‌پرسیم */
export function newOrderCode(): string {
  return `PHX-${Math.floor(100000 + Math.random() * 899999)}`;
}

export function saveOrder(order: Order): Order {
  const all = readAll();
  const i = all.findIndex((o) => o.code === order.code);
  if (i >= 0) all[i] = order;
  else all.unshift(order);
  // فقط پنجاه سفارش آخر نگه داشته می‌شود؛ بیشترش فایده‌ای ندارد
  writeAll(all.slice(0, 50));
  return order;
}

export function getOrder(code: string): Order | undefined {
  const key = code.trim().toUpperCase();
  return readAll().find((o) => o.code === key);
}

export function listOrders(): Order[] {
  return readAll();
}

export function updateStatus(code: string, status: OrderStatus, note?: string) {
  const o = getOrder(code);
  if (!o) return;
  saveOrder({ ...o, status, note: note ?? o.note });
}

/* ---------------------------------------------------------------
   شبیه‌سازی تحویل

   کدهای آماده بلافاصله تحویل می‌شوند؛ ارتقای اکانت زمان می‌برد. تا
   وقتی بک‌اند واقعی نیست، همین تفاوت را با تایمر نشان می‌دهیم تا
   جریان پس از پرداخت واقعاً دیده شود، نه اینکه فرض شود.
--------------------------------------------------------------- */
export function scheduleFulfilment(code: string, delayMs = 6000) {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    const o = getOrder(code);
    if (!o || o.status !== 'paid') return;
    saveOrder({ ...o, status: 'fulfilling' });

    window.setTimeout(() => {
      const cur = getOrder(code);
      if (!cur || cur.status !== 'fulfilling') return;
      saveOrder({
        ...cur,
        status: 'delivered',
        items: cur.items.map((it) => ({
          ...it,
          secret: it.secret ?? `PHX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        })),
      });
    }, delayMs);
  }, delayMs);
}
