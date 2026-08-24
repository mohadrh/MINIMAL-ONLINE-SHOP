/* ============================================================
   داده‌ی حساب کاربری

   شکل این تایپ‌ها عمداً نزدیک به خروجی WooCommerce REST است تا روز
   اتصال، فقط منبع عوض شود و هیچ کامپوننتی دست نخورد:
     Order        → /wc/v3/orders
     VaultItem    → متای آیتم سفارش (_phx_delivered_*)
     Subscription → از روی آیتم‌های مدت‌دار ساخته می‌شود
     WalletTx     → جدول سفارشی یا افزونه‌ی کیف پول
   ============================================================ */

export type OrderStatus =
  | 'awaiting_payment' | 'paid' | 'fulfilling'
  | 'delivered' | 'needs_input' | 'failed' | 'refunded';

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: string }> = {
  awaiting_payment: { label: 'در انتظار پرداخت', tone: 'muted' },
  paid: { label: 'پرداخت شد', tone: 'info' },
  fulfilling: { label: 'در حال آماده‌سازی', tone: 'warn' },
  delivered: { label: 'تحویل شد', tone: 'ok' },
  needs_input: { label: 'نیازمند اصلاح', tone: 'danger' },
  failed: { label: 'ناموفق', tone: 'danger' },
  refunded: { label: 'بازگشت وجه', tone: 'muted' },
};

export interface OrderLine {
  productTitle: string;
  variantLabel: string;
  quantity: number;
  price: number;
  /** ورودی‌هایی که مشتری موقع خرید داده — برای اصلاح در حالت needs_input */
  inputs?: Record<string, string>;
}

export interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  total: number;
  lines: OrderLine[];
  /** پیام وضعیت — مثلاً چرا نیازمند اصلاح است */
  note?: string;
}

/** نوع محتوایی که در گاوصندوق نگهداری می‌شود */
export type VaultKind = 'code' | 'account' | 'upgrade';

export interface VaultItem {
  id: string;
  orderId: string;
  kind: VaultKind;
  productTitle: string;
  variantLabel: string;
  brand: string;
  accent: string;
  deliveredAt: string;
  /** روز پایان گارانتی، برای شمارش معکوس */
  warrantyEndsAt: string;
  /** محتوای حساس — در UI پنهان و با یک کلیک قابل نمایش */
  secrets: { label: string; value: string; masked: boolean }[];
  notes?: string;
}

export interface Subscription {
  id: string;
  productTitle: string;
  variantLabel: string;
  brand: string;
  accent: string;
  startedAt: string;
  endsAt: string;
  /** درصد سپری‌شده — در UI محاسبه می‌شود، اینجا فقط برای ووکامرس نگه داشته شده */
  autoRenew: boolean;
  productSlug: string;
}

export type WalletTxKind = 'topup' | 'purchase' | 'refund' | 'cashback';

export interface WalletTx {
  id: string;
  kind: WalletTxKind;
  amount: number;      // مثبت = افزایش، منفی = کاهش
  createdAt: string;
  description: string;
}

export interface AccountProfile {
  name: string;
  phone: string;
  email: string;
  tier: 'bronze' | 'silver' | 'gold' | 'phoenix';
  tierLabel: string;
  joinedAt: string;
  totalSpent: number;
  walletBalance: number;
  points: number;
}

/* ============================================================
   داده‌ی نمونه
   ============================================================ */

export const PROFILE: AccountProfile = {
  name: 'مهمان فونیکس شاپ',
  phone: '۰۹۱۲ ••• ۴۵ ۶۷',
  email: 'user@example.com',
  tier: 'silver',
  tierLabel: 'نقره‌ای',
  joinedAt: '۱۲ خرداد ۱۴۰۵',
  totalSpent: 3_240_000,
  walletBalance: 185_000,
  points: 640,
};

export const ORDERS: Order[] = [
  {
    id: 'PHX-482913',
    status: 'delivered',
    createdAt: '۲۵ مرداد ۱۴۰۵',
    total: 3_625_000,
    lines: [
      {
        productTitle: 'تلگرام پریمیوم',
        variantLabel: 'شش ماهه',
        quantity: 1,
        price: 3_625_000,
        inputs: { telegramUsername: 'phoenix_user' },
      },
    ],
  },
  {
    id: 'PHX-481022',
    status: 'fulfilling',
    createdAt: '۲۸ مرداد ۱۴۰۵',
    total: 4_460_000,
    lines: [
      {
        productTitle: 'کلاد پرو',
        variantLabel: 'یک ماهه',
        quantity: 1,
        price: 4_460_000,
        inputs: { accountEmail: 'user@example.com' },
      },
    ],
  },
  {
    id: 'PHX-479551',
    status: 'needs_input',
    createdAt: '۲۸ مرداد ۱۴۰۵',
    total: 205_000,
    note: 'ایمیلی که وارد کرده‌اید در سرویس کنوا معتبر نیست. لطفاً اصلاحش کنید تا فعال‌سازی ادامه پیدا کند.',
    lines: [
      {
        productTitle: 'کنوا پرو',
        variantLabel: 'یک ساله',
        quantity: 1,
        price: 205_000,
        inputs: { accountEmail: 'user@exmaple.com' },
      },
    ],
  },
  {
    id: 'PHX-476104',
    status: 'delivered',
    createdAt: '۱۲ مرداد ۱۴۰۵',
    total: 1_950_000,
    lines: [
      {
        productTitle: 'کال آو دیوتی مدرن وارفر',
        variantLabel: 'کد فعال‌سازی — Steam',
        quantity: 1,
        price: 1_950_000,
      },
    ],
  },
];

export const VAULT: VaultItem[] = [
  {
    id: 'v-1',
    orderId: 'PHX-482913',
    kind: 'upgrade',
    productTitle: 'تلگرام پریمیوم',
    variantLabel: 'شش ماهه',
    brand: 'Telegram',
    accent: '#2aabee',
    deliveredAt: '۲۵ مرداد ۱۴۰۵',
    warrantyEndsAt: '۲۵ بهمن ۱۴۰۵',
    secrets: [
      { label: 'یوزرنیم فعال‌شده', value: '@phoenix_user', masked: false },
      { label: 'کد پیگیری فعال‌سازی', value: 'TG-8842-XR91', masked: true },
    ],
    notes: 'اشتراک روی همین یوزرنیم فعال است. تغییر یوزرنیم اشتراک را قطع نمی‌کند.',
  },
  {
    id: 'v-2',
    orderId: 'PHX-476104',
    kind: 'code',
    productTitle: 'کال آو دیوتی مدرن وارفر',
    variantLabel: 'کد فعال‌سازی — Steam',
    brand: 'Activision',
    accent: '#7c93b8',
    deliveredAt: '۱۲ مرداد ۱۴۰۵',
    warrantyEndsAt: '۱۱ شهریور ۱۴۰۵',
    secrets: [
      { label: 'کد فعال‌سازی', value: 'K7X4M-9QP2W-BR88T', masked: true },
    ],
    notes: 'کد را در Steam از بخش Activate a Product وارد کنید. کد گلوبال است و ریجن‌لاک ندارد.',
  },
];

export const SUBSCRIPTIONS: Subscription[] = [
  {
    id: 's-1',
    productTitle: 'تلگرام پریمیوم',
    variantLabel: 'شش ماهه',
    brand: 'Telegram',
    accent: '#2aabee',
    startedAt: '۲۵ مرداد ۱۴۰۵',
    endsAt: '۲۵ بهمن ۱۴۰۵',
    autoRenew: false,
    productSlug: 'telegram-premium',
  },
  {
    id: 's-2',
    productTitle: 'کنوا پرو',
    variantLabel: 'یک ساله',
    brand: 'Canva',
    accent: '#00c4cc',
    startedAt: '۱۲ مرداد ۱۴۰۵',
    endsAt: '۱۲ مرداد ۱۴۰۶',
    autoRenew: false,
    productSlug: 'canva-pro',
  },
];

/** درصد سپری‌شده‌ی اشتراک — بین ۰ و ۱۰۰ */
export const SUBSCRIPTION_PROGRESS: Record<string, number> = {
  's-1': 34,
  's-2': 8,
};

/** روزهای باقی‌مانده تا انقضا */
export const SUBSCRIPTION_DAYS_LEFT: Record<string, number> = {
  's-1': 119,
  's-2': 336,
};

export const WALLET_TX: WalletTx[] = [
  { id: 'w-1', kind: 'cashback', amount: 181_250, createdAt: '۲۵ مرداد ۱۴۰۵', description: 'کش‌بک ۵٪ سفارش PHX-482913' },
  { id: 'w-2', kind: 'purchase', amount: -3_625_000, createdAt: '۲۵ مرداد ۱۴۰۵', description: 'پرداخت سفارش PHX-482913' },
  { id: 'w-3', kind: 'topup', amount: 4_000_000, createdAt: '۲۴ مرداد ۱۴۰۵', description: 'شارژ کیف پول از درگاه بانکی' },
  { id: 'w-4', kind: 'refund', amount: 97_500, createdAt: '۱۸ مرداد ۱۴۰۵', description: 'بازگشت وجه سفارش لغوشده' },
];

export const WALLET_TX_META: Record<WalletTxKind, { label: string; tone: string }> = {
  topup: { label: 'شارژ', tone: 'ok' },
  purchase: { label: 'خرید', tone: 'muted' },
  refund: { label: 'بازگشت وجه', tone: 'info' },
  cashback: { label: 'کش‌بک', tone: 'ok' },
};
