/* ============================================================
   کلاینتِ حسابِ مشتری — افزونه‌ی Phoenix Account
   (‎/wp-json/phoenix-account/v1‎)

   ⚠ این‌جا هم رازی نیست. نشست یک ژتونِ تصادفی است که سرور فقط
   هشش را دارد؛ در ‎localStorage‎ می‌ماند چون مشتری فردا برمی‌گردد و
   نباید هر بار پیامک بگیرد. تنها راهِ خواندنش از صفحه اسکریپتِ
   تزریقی است، و سایت هیچ متنِ کاربر را HTML نمی‌کند — همه‌جا متن.

   ⚠ شماره هیچ‌وقت از این‌جا فرستاده نمی‌شود — سرور از خودِ نشست
   می‌داند کیستی. سفارشِ دیگران «پیدا نشد» است.
   ============================================================ */

import { BRIDGE_READY, BridgeError, storedToken } from './bridge';
import { forgetSession, getSession, keepSession } from './session';

export { forgetSession, getSession } from './session';
export type { StoredSession } from './session';

const BASE = (process.env.NEXT_PUBLIC_BRIDGE_URL ?? '').replace(/\/$/, '');

/** پنلِ مشتریِ واقعی روشن است؟ همان شرطِ اتصالِ سایت به پنل. */
export const ACCOUNT_READY = BRIDGE_READY;

async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  if (!ACCOUNT_READY) throw new BridgeError(0, 'حساب کاربری هنوز به فروشگاه متصل نشده است.');
  const s = getSession();
  if (auth && !s) throw new BridgeError(401, 'لطفاً ابتدا وارد حساب خود شوید.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && s) headers['X-Phoenix-Session'] = s.token;
    const res = await fetch(`${BASE}/wp-json/phoenix-account/v1${path}`, {
      method,
      signal: ctrl.signal,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; code?: string; data?: Record<string, unknown> } & T;
    if (!res.ok) {
      /* نشستِ تمام‌شده یا بسته‌شده: همین‌جا فراموش — صفحه «وارد شو» نشان می‌دهد */
      if (res.status === 401 && auth) forgetSession();
      throw new BridgeError(res.status, data.message || 'درخواست انجام نشد.', data.code || '', data.data || {});
    }
    return data;
  } catch (e) {
    if (e instanceof BridgeError) throw e;
    if (e instanceof Error && e.name === 'AbortError') throw new BridgeError(408, 'پاسخی دریافت نشد. لطفاً اتصال اینترنت خود را بررسی کنید.');
    throw new BridgeError(0, 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.');
  } finally {
    clearTimeout(timer);
  }
}

/** خطاهای فیلد از پاسخِ ۴۲۲ — ‎{ field: message }‎ */
export function fieldErrors(e: unknown): Record<string, string> {
  if (e instanceof BridgeError && e.data && typeof e.data.errors === 'object' && e.data.errors) {
    return e.data.errors as Record<string, string>;
  }
  return {};
}

/* ---------------------------------------------------------------
   ورود
--------------------------------------------------------------- */

interface LoginResult { token: string; expires: string; phone: string; has_password: boolean }

function started(r: LoginResult) {
  keepSession({ token: r.token, phone: r.phone, expires: r.expires });
  return r;
}

/** بعد از کدِ پیامکی: ژتونِ پانزده‌دقیقه‌ایِ پل → نشستِ بلند */
export async function loginWithOtpToken(token = storedToken()) {
  return started(await call<LoginResult>('POST', '/session', { token }, false));
}

export async function loginWithPassword(phone: string, password: string) {
  return started(await call<LoginResult>('POST', '/login', { phone, password }, false));
}

/** «رمزم را فراموش کرده‌ام» — کدِ پیامکی (ژتونِ پل) + رمزِ تازه */
export async function resetPassword(password: string, token = storedToken()) {
  return started(await call<LoginResult>('POST', '/password/reset', { token, password }, false));
}

export async function logout() {
  try { await call('DELETE', '/session'); } finally { forgetSession(); }
}

/* ---------------------------------------------------------------
   حساب
--------------------------------------------------------------- */

export interface Me {
  phone: string;
  name: string;
  email: string;
  has_password: boolean;
  pass_set_at: string | null;
  joined: string;
  orders_count: number;
  paid_total: number;
  open_tickets: number;
  unread: number;
}

export const me = () => call<Me>('GET', '/me');
export const saveMe = (name: string, email: string) => call<Me>('POST', '/me', { name, email });

/** گذاشتن یا عوض کردنِ رمز — با رمزِ فعلی، یا کدِ پیامکیِ تازه */
export const setPassword = (p: { password: string; current?: string; token?: string }) =>
  call<{ ok: true; revoked: number; me: Me }>('POST', '/password', p);

export interface SessionRow { id: number; device: string; created: string; last_seen: string; current: boolean }
export const sessions = () => call<SessionRow[]>('GET', '/sessions');
export const revokeSession = (id: number) => call('DELETE', `/sessions/${id}`);
export const revokeOthers = () => call<{ revoked: number }>('POST', '/sessions/others');

/* ---------------------------------------------------------------
   سفارش‌ها
--------------------------------------------------------------- */

export type OrderState = 'awaiting_payment' | 'checking' | 'fulfilling' | 'needs_input' | 'delivered' | 'failed' | 'refunded';

export interface OrderSummary {
  id: number;
  number: string;
  state: OrderState;
  label: string;
  created: string | null;
  total: number;
  items: { name: string; qty: number }[];
  pay_url: string;
}

export interface Delivery {
  id: string;
  kind: 'code' | 'account' | 'upgrade' | 'link';
  note: string;
  until: number;
  at: number;
  /** پوشیده تا «نمایش»؛ ‎null‎ یعنی سرور بازش نکرد */
  secret: Record<string, string> | null;
}

export interface OrderItem {
  item_id: number;
  product_id: number;
  name: string;
  qty: number;
  total: number;
  inputs: { key: string; value: string }[];
  required: { key: string; label: string; given: boolean }[];
  deliveries: Delivery[];
  stock_codes: string[];
  state: 'waiting' | 'needs_input' | 'delivered' | 'cancelled';
  message: string;
}

export interface OrderDetail {
  id: number;
  number: string;
  state: OrderState;
  label: string;
  created: string | null;
  paid: string | null;
  total: number;
  payment: { method: string; transaction_id: string; is_paid: boolean };
  note: string;
  items: OrderItem[];
}

export const orders = (page = 1) =>
  call<{ rows: OrderSummary[]; page: number; pages: number; total: number }>('GET', `/orders?page=${page}`);
export const order = (id: number) => call<OrderDetail>('GET', `/orders/${id}`);
export const revealOrder = (id: number) => call<OrderDetail>('POST', `/orders/${id}/reveal`);
export const fixInputs = (id: number, itemId: number, inputs: Record<string, string>) =>
  call<OrderDetail>('POST', `/orders/${id}/inputs`, { item_id: itemId, inputs });

export interface VaultRow {
  order_id: number;
  number: string;
  item_id: number;
  name: string;
  deliveries: Delivery[];
  stock_codes: string[];
  at: number;
}
export const vault = () => call<VaultRow[]>('GET', '/vault');

export interface SubscriptionRow {
  order_id: number;
  number: string;
  item_id: number;
  name: string;
  slug: string;
  start: number;
  end: number;
  total_days: number;
  days_left: number;
  state: 'active' | 'ending' | 'expired';
}
export const subscriptions = () => call<SubscriptionRow[]>('GET', '/subscriptions');

/* ---------------------------------------------------------------
   تیکت
--------------------------------------------------------------- */

export interface TicketRow {
  id: number;
  subject: string;
  order_id: number;
  status: 'open' | 'answered' | 'closed';
  created: string;
  updated: string;
  last_by: 'customer' | 'staff';
  unread: boolean;
  messages?: { id: number; author: 'customer' | 'staff'; body: string; at: string }[];
}
export const tickets = () => call<TicketRow[]>('GET', '/tickets');
export const ticket = (id: number) => call<TicketRow>('GET', `/tickets/${id}`);
export const newTicket = (p: { subject: string; body: string; order_id?: number }) => call<TicketRow>('POST', '/tickets', p);
export const replyTicket = (id: number, body: string) => call<TicketRow>('POST', `/tickets/${id}`, { body });
export const closeTicket = (id: number) => call<TicketRow>('POST', `/tickets/${id}/close`);

/* ---------------------------------------------------------------
   قاعده‌ی رمز — همان سرور، تا پیش از فرستادن گفته شود
--------------------------------------------------------------- */

/** همان فهرستِ ‎PHOENIX_ACC_COMMON_PASSWORDS‎ی سرور */
const COMMON = [
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234',
  '11223344', '12344321', '123123123', '88888888', '99999999', '66666666', '55555555',
  'password', 'password1', 'password123', 'qwertyui', 'qwerty123', 'qwertyuiop', 'asdfghjk',
  'asdf1234', 'abcd1234', 'abc12345', '1q2w3e4r', '1qaz2wsx', 'zxcvbnm1', 'iloveyou',
  'admin123', 'welcome1', 'p@ssw0rd', 'passw0rd', 'football', 'baseball', 'princess',
];

const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** همان ‎PHOENIX_ACC_PASSWORD_RULE‎ی سرور — زیرِ هر فیلدِ رمز */
export const PASSWORD_RULE =
  'رمز عبور باید دست‌کم ۸ کاراکتر و ترکیبی از حروف انگلیسی و اعداد باشد. استفاده از نمادهایی مانند ! @ # نیز توصیه می‌شود.';

/** خالی یعنی قبول. سرور دوباره و کامل می‌سنجد؛ این فقط زودتر می‌گوید. */
export function passwordProblem(pass: string, phone: string): string {
  const p = toLatin(pass);
  if (!p) return 'لطفاً رمز عبور خود را وارد کنید.';
  if ([...p].length < 8) return 'رمز عبور باید دست‌کم ۸ کاراکتر باشد.';
  if ([...p].length > 64) return 'رمز عبور حداکثر می‌تواند ۶۴ کاراکتر باشد.';
  if (p.trim() !== p) return 'لطفاً فاصله‌ی ابتدا یا انتهای رمز عبور را حذف کنید.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'رمز عبور باید ترکیبی از حروف انگلیسی و اعداد باشد.';
  if (/^(.)+$/u.test(p)) return 'رمز عبور نمی‌تواند فقط یک کاراکترِ تکراری باشد.';
  if (COMMON.includes(p.toLowerCase())) return 'این رمز عبور بسیار رایج است؛ لطفاً رمز دیگری انتخاب کنید.';
  const digits = toLatin(phone).replace(/\D/g, '');
  if (digits.length >= 10 && p.replace(/\D/g, '').includes(digits.slice(-9))) return 'لطفاً شماره‌ی موبایل خود را در رمز عبور به کار نبرید.';
  return '';
}
