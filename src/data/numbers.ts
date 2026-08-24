/* ============================================================
   شماره‌ی مجازی

   چرا مدل داده‌اش با بقیه‌ی کاتالوگ فرق دارد:

   یک اشتراک، یک محصول با چند پلن است. شماره‌ی مجازی اما یک ماتریس
   سه‌بعدی است — سرویس × کشور × نوع. اگر هر ترکیب را یک Product
   می‌کردیم، چند صد محصول تکراری می‌شد که هیچ‌کدام صفحه‌ی خودش را
   لازم ندارد.

   پس سرویس‌ها، کشورها و پیشنهادها جدا نگه داشته می‌شوند و در زمان
   نمایش به هم وصل می‌شوند. اضافه کردن یک کشور تازه یعنی یک سطر، نه
   بازنویسی فهرست محصولات.
   ============================================================ */

/** نوع شماره — همان چیزی که قیمت و کاربرد را تعیین می‌کند */
export type NumberKind = 'once' | 'rental' | 'permanent';

export interface NumberKindInfo {
  id: NumberKind;
  title: string;
  tagline: string;
  /** توضیح صادقانه‌ی محدودیت — قبل از خرید، نه بعدش */
  limit: string;
  accent: string;
  icon: string;
}

export const NUMBER_KINDS: NumberKindInfo[] = [
  {
    id: 'once',
    title: 'یک‌بار مصرف',
    tagline: 'یک پیامک فعال‌سازی می‌گیری و تمام',
    limit: 'شماره فقط چند دقیقه در اختیار توست و بعد آزاد می‌شود. برای بازیابی رمز در آینده به کارت نمی‌آید.',
    accent: '#2ecc8f',
    icon: 'zap',
  },
  {
    id: 'rental',
    title: 'اجاره‌ای',
    tagline: 'شماره برای مدت مشخص مال توست',
    limit: 'تا پایان دوره هر تعداد پیامک می‌گیری. بعد از آن شماره برمی‌گردد به مخزن.',
    accent: '#4a7cf7',
    icon: 'calendar-clock',
  },
  {
    id: 'permanent',
    title: 'دائمی',
    tagline: 'شماره برای همیشه زیر دست خودت',
    limit: 'بدون تاریخ انقضا. تعداد محدود است چون هر شماره فقط یک بار فروخته می‌شود.',
    accent: '#a855f7',
    icon: 'infinity',
  },
];

/* ---------------------------------------------------------------
   کشورها
--------------------------------------------------------------- */

export interface NumberCountry {
  code: string;
  name: string;
  flag: string;
  /** اپراتور — روی نرخ موفقیت اثر دارد، پس نشانش می‌دهیم */
  operator: string;
}

export const NUMBER_COUNTRIES: NumberCountry[] = [
  { code: 'us', name: 'آمریکا', flag: '🇺🇸', operator: 'T-Mobile' },
  { code: 'gb', name: 'انگلستان', flag: '🇬🇧', operator: 'EE' },
  { code: 'de', name: 'آلمان', flag: '🇩🇪', operator: 'Vodafone' },
  { code: 'nl', name: 'هلند', flag: '🇳🇱', operator: 'KPN' },
  { code: 'ca', name: 'کانادا', flag: '🇨🇦', operator: 'Rogers' },
  { code: 'pl', name: 'لهستان', flag: '🇵🇱', operator: 'Play' },
  { code: 'ro', name: 'رومانی', flag: '🇷🇴', operator: 'Orange' },
  { code: 'my', name: 'مالزی', flag: '🇲🇾', operator: 'Maxis' },
];

/* ---------------------------------------------------------------
   سرویس‌ها
--------------------------------------------------------------- */

export type ServiceGroup = 'messaging' | 'social' | 'ai' | 'finance' | 'other';

export const SERVICE_GROUPS: { id: ServiceGroup | 'all'; title: string }[] = [
  { id: 'all', title: 'همه' },
  { id: 'messaging', title: 'پیام‌رسان' },
  { id: 'social', title: 'شبکه اجتماعی' },
  { id: 'ai', title: 'هوش مصنوعی' },
  { id: 'finance', title: 'مالی' },
  { id: 'other', title: 'متفرقه' },
];

export interface NumberService {
  id: string;
  name: string;
  group: ServiceGroup;
  accent: string;
  /** حرف اول برای نشان‌واره — لوگوی برندها را نمی‌گذاریم */
  mark: string;
  popular?: boolean;
}

export const NUMBER_SERVICES: NumberService[] = [
  { id: 'telegram',  name: 'Telegram',  group: 'messaging', accent: '#4aa3e8', mark: 'T', popular: true },
  { id: 'whatsapp',  name: 'WhatsApp',  group: 'messaging', accent: '#25d366', mark: 'W', popular: true },
  { id: 'signal',    name: 'Signal',    group: 'messaging', accent: '#3a76f0', mark: 'S' },
  { id: 'instagram', name: 'Instagram', group: 'social',    accent: '#e1306c', mark: 'I', popular: true },
  { id: 'tiktok',    name: 'TikTok',    group: 'social',    accent: '#ff0050', mark: 'K' },
  { id: 'x',         name: 'X',         group: 'social',    accent: '#8899a6', mark: 'X' },
  { id: 'discord',   name: 'Discord',   group: 'social',    accent: '#5865f2', mark: 'D' },
  { id: 'openai',    name: 'ChatGPT',   group: 'ai',        accent: '#10a37f', mark: 'C', popular: true },
  { id: 'claude',    name: 'Claude',    group: 'ai',        accent: '#e8862e', mark: 'A' },
  { id: 'gemini',    name: 'Gemini',    group: 'ai',        accent: '#4a7cf7', mark: 'G' },
  { id: 'midjourney',name: 'Midjourney',group: 'ai',        accent: '#7c3aed', mark: 'M' },
  { id: 'paypal',    name: 'PayPal',    group: 'finance',   accent: '#0070ba', mark: 'P' },
  { id: 'binance',   name: 'Binance',   group: 'finance',   accent: '#f0b90b', mark: 'B' },
  { id: 'wise',      name: 'Wise',      group: 'finance',   accent: '#9fe870', mark: 'W' },
  { id: 'google',    name: 'Google',    group: 'other',     accent: '#ea4335', mark: 'G', popular: true },
  { id: 'steam',     name: 'Steam',     group: 'other',     accent: '#66c0f4', mark: 'S' },
  { id: 'uber',      name: 'Uber',      group: 'other',     accent: '#cccccc', mark: 'U' },
  { id: 'amazon',    name: 'Amazon',    group: 'other',     accent: '#ff9900', mark: 'A' },
];

/* ---------------------------------------------------------------
   پیشنهادها — یک سطر برای هر ترکیب موجود

   قیمت‌ها فعلاً تخمینی‌اند و با قیمت واقعی جایگزین می‌شوند. مقدارها
   عمداً از یک تابع تولید می‌شوند نه دستی، تا وقتی قیمت واقعی رسید
   جای عوض کردن صدها عدد، فقط همین تابع عوض شود.
--------------------------------------------------------------- */

export interface NumberOffer {
  serviceId: string;
  countryCode: string;
  kind: NumberKind;
  price: number;
  /** موجودی مخزن — صفر یعنی الان نیست */
  stock: number;
  /** فقط برای اجاره‌ای */
  days?: number;
}

/** پایه‌ی قیمت هر نوع، تومان */
const BASE: Record<NumberKind, number> = {
  once: 38_000,
  rental: 320_000,
  permanent: 1_850_000,
};

/** ضریب کشور — هرچه شماره کمیاب‌تر، گران‌تر */
const COUNTRY_FACTOR: Record<string, number> = {
  us: 1.6, gb: 1.45, de: 1.4, nl: 1.3, ca: 1.35, pl: 1, ro: 0.95, my: 0.9,
};

/** ضریب سرویس — سرویس‌های سخت‌گیرتر گران‌ترند */
const SERVICE_FACTOR: Record<string, number> = {
  whatsapp: 1.5, openai: 1.45, paypal: 1.6, binance: 1.5,
  instagram: 1.25, google: 1.3, claude: 1.4, gemini: 1.2,
};

const priceFor = (kind: NumberKind, countryCode: string, serviceId: string) => {
  const raw =
    BASE[kind] * (COUNTRY_FACTOR[countryCode] ?? 1) * (SERVICE_FACTOR[serviceId] ?? 1);
  // گرد کردن به هزار تومان — قیمت با رقم خرد بی‌اعتماد به نظر می‌رسد
  return Math.round(raw / 1000) * 1000;
};

/** موجودی شبه‌تصادفی ولی پایدار — با هر رندر عوض نمی‌شود */
const stockFor = (serviceId: string, countryCode: string, kind: NumberKind) => {
  const seed = [...(serviceId + countryCode + kind)].reduce((n, c) => n + c.charCodeAt(0), 0);
  if (kind === 'permanent') return seed % 5;          // دائمی همیشه کم
  if (kind === 'rental') return seed % 18;
  return (seed % 60) + 5;
};

/** همه‌ی ترکیب‌های ممکن، ساخته‌شده در زمان لود ماژول */
export const NUMBER_OFFERS: NumberOffer[] = (() => {
  const out: NumberOffer[] = [];
  for (const s of NUMBER_SERVICES) {
    for (const c of NUMBER_COUNTRIES) {
      for (const k of ['once', 'rental', 'permanent'] as NumberKind[]) {
        // دائمی فقط آمریکا و انگلستان — همان‌طور که در عمل هست
        if (k === 'permanent' && !['us', 'gb'].includes(c.code)) continue;
        out.push({
          serviceId: s.id,
          countryCode: c.code,
          kind: k,
          price: priceFor(k, c.code, s.id),
          stock: stockFor(s.id, c.code, k),
          days: k === 'rental' ? 30 : undefined,
        });
      }
    }
  }
  return out;
})();

/* ---------------------------------------------------------------
   کمک‌کننده‌ها
--------------------------------------------------------------- */

export const offersFor = (kind: NumberKind, serviceId?: string, countryCode?: string) =>
  NUMBER_OFFERS.filter(
    (o) =>
      o.kind === kind &&
      (!serviceId || o.serviceId === serviceId) &&
      (!countryCode || o.countryCode === countryCode)
  );

/** ارزان‌ترین قیمت موجود برای یک سرویس در یک نوع — برای کارت خلاصه */
export const cheapestFor = (kind: NumberKind, serviceId: string) => {
  const list = NUMBER_OFFERS.filter(
    (o) => o.kind === kind && o.serviceId === serviceId && o.stock > 0
  );
  return list.length ? Math.min(...list.map((o) => o.price)) : null;
};

export const getService = (id: string) => NUMBER_SERVICES.find((s) => s.id === id);
export const getCountry = (code: string) => NUMBER_COUNTRIES.find((c) => c.code === code);

/** مجموع موجودی — روی سربرگ نشان داده می‌شود */
export const totalInStock = () =>
  NUMBER_OFFERS.reduce((n, o) => n + (o.stock > 0 ? 1 : 0), 0);
