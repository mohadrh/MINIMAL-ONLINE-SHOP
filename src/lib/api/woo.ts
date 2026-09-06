/* ============================================================
   کلاینتِ ووکامرس — فقط سمتِ سرور

   ⚠ این فایل راز دارد. هرگز در کامپوننتِ 'use client' ایمپورتش
   نکنید؛ نگهبانِ بالای هر تابع همان لحظه می‌ترکد.
   ============================================================ */

import {
  WP_URL, WOO_KEY, WOO_SECRET, TIMEOUT_MS, REVALIDATE, assertServerOnly,
} from './config';
import type { WooProduct, WooVariation } from './wooTypes';

/**
 * خطای ووکامرس، بدون راز.
 *
 * ⚠ پیامِ خطا هیچ‌وقت آدرسِ کامل را نمی‌گذارد.
 *
 * احراز هویت ووکامرس روی HTTPS با query string انجام می‌شود
 * (consumer_key و consumer_secret). اگر آدرس را در پیام خطا
 * بگذاریم، اولین باری که خطا لاگ شود کلید هم لاگ شده — و لاگ‌ها
 * معمولاً جایی می‌روند که کسی به امنیتشان فکر نکرده.
 */
export class WooError extends Error {
  constructor(
    public status: number,
    public path: string,
    message?: string,
  ) {
    super(`ووکامرس ${status} در ${path}${message ? ` — ${message}` : ''}`);
    this.name = 'WooError';
  }
}

function authQuery(): string {
  return `consumer_key=${encodeURIComponent(WOO_KEY)}&consumer_secret=${encodeURIComponent(WOO_SECRET)}`;
}

interface FetchOpts {
  /** ثانیه — به revalidate نکست داده می‌شود */
  revalidate?: number;
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
}

async function wooFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  assertServerOnly('کلاینت ووکامرس');

  if (!WP_URL || !WOO_KEY || !WOO_SECRET) {
    throw new WooError(0, path, 'کلیدهای ووکامرس ست نشده‌اند');
  }

  const sep = path.includes('?') ? '&' : '?';
  const url = `${WP_URL.replace(/\/$/, '')}/wp-json/wc/v3${path}${sep}${authQuery()}`;

  /* مهلت، وگرنه یک وردپرسِ کند کلِ رندر را نگه می‌دارد و کاربر
     صفحه‌ی سفید می‌بیند. */
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
      /* نوشتن هیچ‌وقت کش نمی‌شود */
      ...(opts.method && opts.method !== 'GET'
        ? { cache: 'no-store' as const }
        : { next: { revalidate: opts.revalidate ?? REVALIDATE.catalog } }),
    });

    if (!res.ok) {
      /* بدنه‌ی خطا را می‌خوانیم ولی فقط پیامش را نگه می‌داریم */
      let detail: string | undefined;
      try {
        const j = (await res.json()) as { message?: string };
        detail = typeof j.message === 'string' ? j.message : undefined;
      } catch {
        /* بدنه JSON نبود — مهم نیست */
      }
      throw new WooError(res.status, path, detail);
    }

    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof WooError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new WooError(408, path, `پاسخی در ${TIMEOUT_MS} میلی‌ثانیه نیامد`);
    }
    throw new WooError(0, path, e instanceof Error ? e.message : 'خطای ناشناخته');
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------
   خواندن
--------------------------------------------------------------- */

/**
 * همه‌ی محصولاتِ منتشرشده.
 *
 * ⚠ صفحه‌بندی اجباری است.
 *
 * ووکامرس در هر درخواست حداکثر صد آیتم می‌دهد و بی‌صدا قطع می‌کند.
 * اگر یک بار صدا بزنیم، فروشگاهی با صدویک محصول یکی را جا می‌گذارد
 * و هیچ خطایی هم نمی‌دهد — بدترین نوعِ باگ. پس تا وقتی صفحه پر
 * برمی‌گردد ادامه می‌دهیم.
 */
export async function fetchAllProducts(): Promise<WooProduct[]> {
  const per = 100;
  const out: WooProduct[] = [];

  for (let page = 1; page <= 50; page += 1) {
    const batch = await wooFetch<WooProduct[]>(
      `/products?status=publish&per_page=${per}&page=${page}&orderby=menu_order&order=asc`,
    );
    out.push(...batch);
    if (batch.length < per) break;
  }
  return out;
}

export async function fetchProduct(id: number): Promise<WooProduct> {
  return wooFetch<WooProduct>(`/products/${id}`);
}

export async function fetchVariations(productId: number): Promise<WooVariation[]> {
  const per = 100;
  const out: WooVariation[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const batch = await wooFetch<WooVariation[]>(
      `/products/${productId}/variations?per_page=${per}&page=${page}`,
    );
    out.push(...batch);
    if (batch.length < per) break;
  }
  return out;
}

/** موجودی — جدا از کاتالوگ چون خیلی زودتر کهنه می‌شود */
export async function fetchStock(ids: number[]): Promise<Record<number, number | null>> {
  if (!ids.length) return {};
  const list = await wooFetch<WooProduct[]>(
    `/products?include=${ids.join(',')}&per_page=100&_fields=id,stock_quantity,stock_status`,
    { revalidate: REVALIDATE.stock },
  );

  const map: Record<number, number | null> = {};
  for (const p of list) {
    if (typeof p.id !== 'number') continue;
    map[p.id] = p.stock_status === 'outofstock' ? 0 : (p.stock_quantity ?? null);
  }
  return map;
}

/* ---------------------------------------------------------------
   نوشتن
--------------------------------------------------------------- */

export interface NewOrderLine {
  product_id: number;
  variation_id?: number;
  quantity: number;
  /** ورودی‌هایی که مشتری داده — ایمیل اکانت، آیدی تلگرام و مانند آن */
  meta_data?: { key: string; value: string }[];
}

export interface NewOrder {
  billing: {
    first_name?: string;
    last_name?: string;
    phone: string;
    email?: string;
  };
  line_items: NewOrderLine[];
  customer_id?: number;
  customer_note?: string;
  meta_data?: { key: string; value: string }[];
}

/**
 * ثبت سفارش.
 *
 * ⚠ وضعیت عمداً pending است نه processing.
 *
 * سفارش پیش از پرداخت ساخته می‌شود تا شماره‌اش را به درگاه بدهیم.
 * اگر همین‌جا processing بگذاریم، هر کسی که فرم را پر کند و به
 * درگاه نرود یک سفارشِ «در حال انجام» می‌سازد و انبار را قفل
 * می‌کند. تأییدِ پرداخت وضعیت را جلو می‌برد.
 */
export async function createOrder(order: NewOrder) {
  return wooFetch<{ id: number; number: string; status: string; total: string }>(
    '/orders',
    { method: 'POST', body: { ...order, status: 'pending', set_paid: false } },
  );
}

export async function markOrderPaid(orderId: number, transactionId: string) {
  return wooFetch<{ id: number; status: string }>(`/orders/${orderId}`, {
    method: 'PUT',
    body: {
      status: 'processing',
      set_paid: true,
      transaction_id: transactionId,
    },
  });
}

/* ---------------------------------------------------------------
   مشتری
--------------------------------------------------------------- */

/**
 * مشتری را با شماره‌ی موبایل پیدا می‌کند.
 *
 * ⚠ ووکامرس جست‌وجوی مستقیم روی شماره ندارد.
 *
 * کلیدِ حسابِ ما شماره‌ی موبایل است ولی ووکامرس مشتری را با ایمیل
 * می‌شناسد و اندپوینتِ customers فیلترِ billing.phone ندارد. پس
 * افزونه‌ی پل یک اندپوینتِ جست‌وجو اضافه می‌کند؛ این تابع همان را
 * صدا می‌زند نه ووکامرس را.
 */
export async function findCustomerByPhone(phone: string): Promise<number | null> {
  assertServerOnly('جست‌وجوی مشتری');
  const base = WP_URL.replace(/\/$/, '');
  const url = `${base}/wp-json/phoenix/v1/customer-by-phone?phone=${encodeURIComponent(phone)}&${authQuery()}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { id?: number };
    return typeof j.id === 'number' ? j.id : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
