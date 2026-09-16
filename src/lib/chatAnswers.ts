/* ============================================================
   مغزِ چت — سه مسیر، یک تابع

   ⚠ منطق از «فهرستِ سوال» به «ماشینِ حالت» عوض شد.

   نسخه‌ی قبلی دو تابعِ صادرشده داشت (‎quickAnswer‎ و ‎answerFor‎)
   و یک آرایه‌ی ‎QUICK‎ که کامپوننت آن را در نواری *زیرِ* چت
   می‌چید. نتیجه‌اش دو مشکل بود:

     یک، هشت دکمه‌ی هم‌سطح که هیچ ترتیبی نداشتند — نه معلوم بود
     کدام برای خرید است کدام برای پشتیبانی، نه جایی برای پیگیری
     سفارش.

     دو، آن نوار بخشی از گفتگو نبود. یک ردیفِ ثابت بود که همیشه
     همان هشت‌تا را نشان می‌داد، حتی وقتی کاربر وسطِ یک سوالِ
     دیگر بود.

   حالا گزینه‌ها داخلِ خودِ پیامِ ربات می‌آیند — یعنی هر لحظه
   فقط همان چیزهایی پیشنهاد می‌شوند که در آن لحظه معنی دارند —
   و همه‌ی مسیرها از یک تابعِ ‎run‎ می‌گذرند.

   سه مسیر:
     خرید      → دسته، بعد بودجه، بعد سه محصولِ واقعی
     پیگیری    → کدِ سفارش، بعد وضعیتِ واقعیِ همان سفارش
     پشتیبانی  → پنج موضوعی که واقعاً پرسیده می‌شوند

   ⚠ و همان قاعده‌ی قبلی سرِ جایش است: هر عدد، قیمت یا شرطی که
   در جواب‌ها می‌آید از منبعِ واقعی خوانده می‌شود، نه از متنِ
   ثابت. دلیلش یک اشتباهِ واقعی بود: چت نوشته بود «زیر پانزده
   دقیقه» در حالی که کلِ سایت شده بود «در اسرع وقت» — چت چیزی
   وعده می‌داد که سایت دیگر نمی‌گفت.
   ============================================================ */

import {
  CATEGORIES, PRODUCTS, getLowestPrice, variantToman, type Product,
} from '../data/catalog';
import { TIERS } from '../data/club';
import { HELP_ARTICLES } from '../data/helpArticles';
import { ORDERS, ORDER_STATUS_META } from '../data/account';
import { getOrder, listOrders } from './orders';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* ---------------------------------------------------------------
   نوعِ داده
--------------------------------------------------------------- */

/** یک گزینه‌ی پیشنهادی، داخلِ حبابِ ربات */
export interface Chip {
  label: string;
  /** شناسه‌ی کنش — همان چیزی که به ‎run‎ داده می‌شود */
  act: string;
}

/** کاری که ربات بین دو پیام یادش می‌ماند.
 *
 *  فقط دو چیز لازم است: در کدام مسیریم، و اگر مسیرِ خرید است،
 *  چه دسته‌ای انتخاب شده. بیشتر از این لازم نیست چون هر مسیر
 *  حداکثر دو پرسش دارد. */
export type ChatState =
  | { mode: 'idle' }
  | { mode: 'buy'; cat: string }
  | { mode: 'track' };

export const START: ChatState = { mode: 'idle' };

export interface Answer {
  text: string;
  /** گزینه‌های بعدی — داخلِ همین حباب چیده می‌شوند */
  chips?: Chip[];
  /** جایی برای رفتن */
  links?: { label: string; href: string }[];
  /** حالتِ بعدی؛ نبودنش یعنی برگرد به بی‌طرف */
  next?: ChatState;
  /** راهنمای کادرِ نوشتن، وقتی ربات منتظرِ چیزِ مشخصی است */
  ask?: string;
}

/* ---------------------------------------------------------------
   منوی اصلی — سه مسیر

   ترتیبشان از روی فراوانی است نه الفبا: بیشترِ کسی که چت را باز
   می‌کند هنوز نخریده و دنبال انتخاب است؛ کسی که خریده و منتظرِ
   تحویل است دومین گروهِ بزرگ؛ و سوال‌های عمومی سوم.
--------------------------------------------------------------- */

const MENU: Chip[] = [
  { label: '🛍 کمک برای انتخاب', act: 'buy' },
  { label: '📦 پیگیری سفارش', act: 'track' },
  { label: '💬 سوال و پشتیبانی', act: 'help' },
];

export const GREETING: Answer = {
  text: 'سلام 👋\nهم برای انتخاب محصول کمکت می‌کنم، هم سفارشت را پیگیری می‌کنم، هم جواب سوال‌هایت را می‌دهم.\n\nکدام؟',
  chips: MENU,
  next: START,
};

/** برگشت به منو — تهِ هر مسیر پیشنهاد می‌شود */
const backChip: Chip = { label: '↩ برگشت به اول', act: 'menu' };

/* ---------------------------------------------------------------
   مسیر یک: دستیارِ خرید

   ⚠ باندهای بودجه از خودِ کاتالوگ حساب می‌شوند، نه دستی.

   عددِ دستی دو عیب دارد: با تغییرِ نرخِ دلار بی‌معنی می‌شود، و
   ممکن است باندی بسازد که هیچ محصولی داخلش نباشد — یعنی دستیار
   سوالی بپرسد که جوابش «چیزی پیدا نشد» است.

   با دو چارکِ واقعیِ قیمت‌های همان دسته، هر سه باند تضمینی
   محصول دارند.
--------------------------------------------------------------- */

/** همه‌ی محصولاتِ یک دسته، مرتب بر اساس ارزان‌ترین پلن */
function inCategory(cat: string): Product[] {
  return PRODUCTS.filter((p) => p.category === cat)
    .sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
}

/** دو نقطه‌ی برش، روی یک‌سوم و دوسومِ فهرستِ مرتب‌شده */
function bands(cat: string): { low: number; high: number } | null {
  const prices = inCategory(cat).map(getLowestPrice);
  if (prices.length < 3) return null;
  return {
    low: prices[Math.floor(prices.length / 3)],
    high: prices[Math.floor((prices.length * 2) / 3)],
  };
}

function catChips(): Chip[] {
  return [
    ...CATEGORIES.map((c) => ({ label: c.title, act: `buy:cat:${c.slug}` })),
    { label: 'شماره مجازی', act: 'buy:numbers' },
  ];
}

/** سه محصولِ پیشنهادی از یک دسته و بازه‌ی قیمت */
function picks(cat: string, max: number | null, min = 0): Product[] {
  return inCategory(cat)
    .filter((p) => {
      const price = getLowestPrice(p);
      return price >= min && (max === null || price <= max);
    })
    /* مرتب‌سازی بر اساس فروش، نه قیمت: کاربر بازه را خودش
       انتخاب کرده، پس داخلِ بازه چیزی را می‌خواهد که بقیه
       پسندیده‌اند. */
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 3);
}

/* ⚠ پیشنهاد دو پله است، نه یکی.

   اول سه محصول با یک جمله‌ی کوتاه معرفی می‌شوند — همین‌قدر که
   کاربر بفهمد کدام به کارش می‌آید. اگر خواست بیشتر بداند،
   گزینه‌ی «اطلاعات بیشتر» را می‌زند و همان‌جا جزئیاتِ کاملِ آن
   محصول را می‌گیرد با لینکِ صفحه‌اش.

   دلیلش این است که ریختنِ همه‌چیزِ سه محصول در یک حباب، حبابی
   می‌سازد که کسی نمی‌خواندش. سه خطِ کوتاه خوانده می‌شود. */
function offer(list: Product[], catTitle: string): Answer {
  if (!list.length) {
    return {
      text: `در این بازه چیزی در ${catTitle} نداشتیم.`,
      chips: [{ label: 'بازه‌ی دیگر', act: 'buy' }, backChip],
      links: [{ label: 'دیدن همه‌ی محصولات', href: '/shop' }],
      next: START,
    };
  }

  const lines = list.map(
    (p) => `• ${p.title} — از ${fmt(getLowestPrice(p))} تومان\n  ${p.shortDescription}`,
  );

  /* جمله‌ی مقدمه می‌گوید این سه‌تا از کجا آمدند. بدونش، فهرست
     مثل تبلیغ به نظر می‌رسد نه مثل جواب. */
  const intro = list.length === 1
    ? `در ${catTitle} و این بازه، همین یکی را داریم:`
    : `از پرفروش‌های ${catTitle} در این بازه، این ${fmt(list.length)} تا:`;

  return {
    text: `${intro}\n\n${lines.join('\n\n')}`,
    chips: [
      ...list.map((p) => ({ label: `اطلاعات بیشتر: ${p.title}`, act: `prod:${p.slug}` })),
      { label: 'پیشنهاد دیگر', act: 'buy' },
      backChip,
    ],
    next: START,
  };
}

/** جزئیاتِ یک محصول — پله‌ی دومِ پیشنهاد، و مقصدش صفحه‌ی محصول */
function detail(slug: string): Answer {
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) return GREETING;

  const prices = p.variants.map((v) => variantToman(v));
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const range = lo === hi ? `${fmt(lo)} تومان` : `${fmt(lo)} تا ${fmt(hi)} تومان`;

  /* نامِ پلن‌ها را خودِ محصول می‌دهد؛ سقفِ سه‌تا تا حباب بلند نشود */
  const plans = p.variants.slice(0, 3).map((v) => v.label).join('، ');
  const more = p.variants.length > 3 ? ` و ${fmt(p.variants.length - 3)} پلن دیگر` : '';

  return {
    text: [
      `${p.title} (${p.englishTitle})`,
      p.shortDescription,
      '',
      `پلن‌ها: ${plans}${more}`,
      `قیمت: ${range}`,
      `تحویل: ${p.deliveryEstimate}`,
      `گارانتی: ${p.warrantyLabel}`,
      '',
      'بقیه‌ی جزئیات و انتخابِ پلن در صفحه‌ی خودش است:',
    ].join('\n'),
    links: [{ label: `رفتن به صفحه‌ی ${p.title}`, href: `/product/${p.slug}` }],
    chips: [
      { label: 'محصولِ مشابه ببینم', act: `buy:cat:${p.category}` },
      backChip,
    ],
    next: START,
  };
}

/* ---------------------------------------------------------------
   مسیر دو: پیگیری سفارش

   ⚠ دو منبع، به‌ترتیب: سفارشِ واقعیِ خودِ کاربر، بعد نمونه‌ها.

   سفارشِ واقعی در ‎localStorage‎ است (‎lib/orders‎) و فقط روی
   همان مرورگر دیده می‌شود. نمونه‌های ‎data/account‎ به‌عنوان
   داده‌ی پایه می‌مانند تا مسیر همیشه چیزی برای نشان دادن داشته
   باشد — بی‌آنکه کدِ نمونه‌ای در متنِ چت تبلیغ شود.

   دو شکلِ داده هم یکی می‌شوند: یکی ‎code/items/payable‎ دارد و
   دیگری ‎id/lines/total‎.
--------------------------------------------------------------- */

interface TrackedOrder {
  code: string;
  status: string;
  when: string;
  total: number;
  lines: { title: string; variant: string }[];
}

const CODE_RE = /PHX-?\d{6}/i;

/** کدِ سفارش را از هر جمله‌ای بیرون می‌کشد و یکدست می‌کند */
function normalizeCode(input: string): string | null {
  const m = input.match(CODE_RE);
  if (!m) return null;
  return m[0].toUpperCase().replace(/^PHX-?/, 'PHX-');
}

function findOrder(code: string): TrackedOrder | null {
  const real = getOrder(code);
  if (real) {
    return {
      code: real.code,
      status: real.status,
      when: new Date(real.createdAt).toLocaleDateString('fa-IR'),
      total: real.payable,
      lines: real.items.map((i) => ({ title: i.title, variant: i.variantLabel })),
    };
  }

  const demo = ORDERS.find((o) => o.id.toUpperCase() === code);
  if (demo) {
    return {
      code: demo.id,
      status: demo.status,
      when: demo.createdAt,
      total: demo.total,
      lines: demo.lines.map((l) => ({ title: l.productTitle, variant: l.variantLabel })),
    };
  }

  return null;
}

/** کدهایی که همین مرورگر دارد — واقعی اگر بود، وگرنه نمونه‌ها */
function myCodes(): string[] {
  const real = listOrders().map((o) => o.code);
  return real.length ? real.slice(0, 3) : ORDERS.slice(0, 3).map((o) => o.id);
}

/** جمله‌ی «قدمِ بعدی چیست» برای هر وضعیت */
const NEXT_STEP: Record<string, string> = {
  awaiting_payment: 'هنوز پرداخت نشده. از سبد خرید پرداخت را تمام کن تا وارد صف تحویل شود.',
  paid: 'بانک تراکنش را تأیید کرده و سفارش در نوبتِ آماده‌سازی است.',
  fulfilling: 'داریم اکانت را آماده می‌کنیم. تمام که شد، اطلاعات در پنل کاربری و ایمیلت می‌آید.',
  delivered: 'تحویل شده. اطلاعاتش در بخش «محفظه»ی پنل کاربری هست.',
  needs_input: 'اطلاعاتی که وارد شده مشکل دارد و منتظر اصلاحش هستیم — از پنل کاربری درستش کن.',
  failed: 'پرداخت به نتیجه نرسید. اگر پول از حسابت کم شده، تا ۷۲ ساعت خودش برمی‌گردد.',
};

function orderCard(o: TrackedOrder): Answer {
  const label = ORDER_STATUS_META[o.status as keyof typeof ORDER_STATUS_META]?.label ?? o.status;
  const items = o.lines.map((l) => `• ${l.title} — ${l.variant}`).join('\n');

  return {
    text: `سفارش ${o.code}\nوضعیت: ${label}\nتاریخ: ${o.when}\nمبلغ: ${fmt(o.total)} تومان\n\n${items}\n\n${NEXT_STEP[o.status] ?? ''}`.trim(),
    links: [
      { label: 'صفحه‌ی پیگیری', href: `/track?code=${o.code}` },
      { label: 'پنل کاربری', href: '/account' },
    ],
    chips: [{ label: 'سفارش دیگری دارم', act: 'track' }, backChip],
    next: START,
  };
}

/* ---------------------------------------------------------------
   مسیر سه: پشتیبانی

   ⚠ پنج موضوع، نه هشت.

   «چه چیزهایی می‌فروشید؟» و «قیمت‌ها از چند شروع می‌شود؟» از
   این فهرست رفتند — جایشان مسیرِ خرید است که همان را با دسته و
   بودجه دقیق‌تر جواب می‌دهد. «سفارشم را چطور پیگیری کنم؟» هم
   رفت، چون حالا خودش یک مسیر است و مستقیم وضعیت را نشان
   می‌دهد نه توضیحِ راه را.
--------------------------------------------------------------- */

const HELP_TOPICS: Chip[] = [
  { label: 'چقدر طول می‌کشد؟', act: 'help:delivery' },
  { label: 'چطور پرداخت کنم؟', act: 'help:pay' },
  { label: 'گارانتی چطور است؟', act: 'help:warranty' },
  { label: 'رمز حسابم را می‌خواهید؟', act: 'help:safe' },
  { label: 'باشگاه مشتریان چیست؟', act: 'help:club' },
];

function helpAnswer(topic: string): Answer {
  const tail = { chips: [{ label: 'سوال دیگر', act: 'help' }, backChip], next: START };

  switch (topic) {
    case 'delivery': {
      /* از خودِ محصول خوانده می‌شود، نه از متنِ ثابت */
      const est = PRODUCTS[0]?.deliveryEstimate ?? 'در اسرع وقت';
      return {
        text: `${est}\nکد پیگیری همان لحظه‌ی پرداخت صادر می‌شود و وضعیت سفارش را در پنل کاربری می‌بینی.`,
        links: [{ label: 'پیگیری سفارش', href: '/track' }],
        ...tail,
      };
    }

    case 'pay':
      return {
        text: 'با کارت بانکی خودت و درگاه ریالی داخلی. نه ارز لازم داری نه حساب خارجی.\nقیمت پیش از پرداخت کامل معلوم است و هزینه‌ی پنهانی وجود ندارد.',
        links: [{ label: 'راهنمای خرید', href: '/guide' }],
        ...tail,
      };

    case 'warranty': {
      const w = PRODUCTS[0]?.warrantyLabel ?? 'گارانتی تمام دوره';
      return {
        text: `${w}\nاگر وسط دوره مشکلی پیش بیاید جایگزین می‌کنیم یا مبلغ را برمی‌گردانیم.`,
        links: [{ label: 'شرایط کامل', href: '/rules' }],
        ...tail,
      };
    }

    case 'safe':
      return {
        text: 'نه. رمز عبورِ هیچ حسابی را نمی‌خواهیم — نه حساب چت‌جی‌پی‌تی، نه ایمیلت، نه رمز دوم کارت بانکی.\nبرای بیشتر اشتراک‌ها فقط ایمیلِ حسابت لازم است تا اشتراک روی همان فعال شود. اگر جایی به اسم ما این‌ها را خواستند، از طرف ما نیست.',
        links: [{ label: 'قوانین و گارانتی', href: '/rules' }],
        ...tail,
      };

    case 'club': {
      const top = TIERS[TIERS.length - 1];
      return {
        text: `رایگان است و از اولین خرید شروع می‌شود. هر خرید امتیاز دارد و هر پله کش‌بک — تا ٪${fmt(top.cashback)} در بالاترین پله، که به کیف پولت برمی‌گردد.`,
        links: [{ label: 'باشگاه مشتریان', href: '/club' }],
        ...tail,
      };
    }

    default:
      return { text: 'این یکی را بلد نیستم.', ...tail };
  }
}


/* ---------------------------------------------------------------
   واگذاری به کارشناس

   ⚠ وقتی ربات نمی‌داند، «نمی‌دانم» کافی نیست.

   تا امروز جوابِ ناشناخته این بود: «مطمئن نیستم، از پنل تیکت
   بزن». صادق بود ولی کاربر را می‌فرستاد سرِ یک فرمِ دیگر، و
   بیشترِ کسانی که وسطِ چت به بن‌بست می‌خورند همان‌جا رها
   می‌کنند.

   حالا همان لحظه به یک کارشناس وصل می‌شود و سوالش با خودش
   می‌رود.
--------------------------------------------------------------- */

/** بیست کارشناس. نام از فهرستِ خودِ کارفرما می‌آید. */
export const AGENTS = [
  'سارا محمدی', 'امیر رضایی', 'نگین کاظمی', 'محمد حسینی',
  'الهه نوری', 'پویا صادقی', 'مریم افشار', 'رضا کریمی',
  'شیوا مرادی', 'آرش بهرامی', 'نیلوفر جعفری', 'سینا اکبری',
  'هستی رحیمی', 'کیان مهدوی', 'پریسا شریفی', 'بهنام قاسمی',
  'یلدا امینی', 'فرهاد نیک‌پور', 'ترانه سلطانی', 'حامد یزدانی',
];

/* ⚠ انتخاب در مرورگر انجام می‌شود، نه این‌جا در ماژول.

   اگر نام موقعِ رندرِ سرور قرعه بخورد، مرورگر قرعه‌ی دیگری
   می‌اندازد و ری‌اکت هنگامِ هیدریشن اختلاف را خطا می‌دهد. و
   مهم‌تر: نام باید در طولِ یک گفتگو *ثابت* بماند — کسی که به
   «سارا محمدی» وصل شده، پیامِ بعدی نباید ببیند «امیر رضایی».
   پس کامپوننت یک‌بار انتخابش می‌کند و همان را پاس می‌دهد. */
export const pickAgent = () => AGENTS[Math.floor(Math.random() * AGENTS.length)];

/** آیدیِ پشتیبانی در تلگرام.

    ⚠ این با کانالِ خبر فرق دارد و نباید قاطی شود.

    یک دور این‌جا ‎Ph0enix_Shop‎ بود — که کانالِ اطلاع‌رسانی است،
    نه پشتیبانی. یعنی هر کسی که از چت یا صفحه‌ی تماس «سوالم را
    در تلگرام می‌پرسم» را می‌زد، به کانالی می‌رسید که کسی آن‌جا
    جواب نمی‌دهد.

    کانالِ خبر در ‎data/aiNews.ts‎ و آیکونِ فوتر می‌ماند؛ این
    یکی فقط برای رساندنِ کاربر به یک آدم است. */
export const SUPPORT_TELEGRAM = 'Ph0enixSupport';

/** لینکِ تلگرام با متنِ از پیش نوشته.

    ⚠ چرا کاربر خودش می‌فرستد و ما مستقیم نمی‌فرستیم.

    فرستادنِ خودکار به تلگرام، توکنِ ربات می‌خواهد. این سایت
    خروجیِ ایستا دارد و هر چیزی که این‌جا بنویسیم داخلِ باندلِ
    مرورگر پخته می‌شود — یعنی توکن در دسترسِ هر بازدیدکننده‌ای
    قرار می‌گیرد و می‌شود با آن هر پیامی به هر جا فرستاد.

    پس تا وقتی وردپرس بالا نیامده، لینکِ ‎t.me‎ با متنِ آماده
    می‌سازیم: کاربر یک دکمه می‌زند و پیام از تلگرامِ *خودش*
    می‌رود. وقتی افزونه فعال شد، ‎notifySupport‎ پایین همین کار
    را خودکار می‌کند و توکن سمتِ سرور می‌ماند. */
export function supportLink(question: string, context?: string): string {
  const body = [
    'سلام، از چت سایت آمدم.',
    '',
    `سوال: ${question}`,
    context ? `\n${context}` : '',
  ].filter(Boolean).join('\n');
  return `https://t.me/${SUPPORT_TELEGRAM}?text=${encodeURIComponent(body)}`;
}

/** جوابِ «وصل شدی به کارشناس» */
function handoff(question: string, agent: string, context?: string): Answer {
  return {
    /* ⚠ نمی‌گوید «در داده‌هایم نیست».

       آن جمله ربات را لو می‌دهد و کاربر را به این نتیجه می‌رساند
       که با یک ماشینِ ناقص طرف است. چیزی که واقعاً اتفاق می‌افتد
       همان است که می‌گوییم: سوال می‌رود دستِ یک آدم. */
    text: [
      `وصلت می‌کنم به ${agent} از تیم پشتیبانی.`,
      '',
      'سوالت را برایش فرستادم و همین‌جا جواب می‌دهد. اگر عجله داری، در تلگرام هم می‌توانی بپرسی — آن‌جا سریع‌تر جواب می‌گیری.',
    ].join('\n'),
    links: [{ label: 'پرسیدن در تلگرام', href: supportLink(question, context) }],
    chips: [
      { label: 'همین‌جا منتظر می‌مانم', act: 'wait' },
      { label: 'سوال دیگری دارم', act: 'help' },
      backChip,
    ],
    next: START,
  };
}

/* ---------------------------------------------------------------
   تکِ نقطه‌ی ورود برای گزینه‌ها
--------------------------------------------------------------- */

export function run(act: string, state: ChatState): Answer {
  /* --- منو --- */
  if (act === 'menu') return GREETING;

  /* --- مسیرِ خرید --- */

  if (act === 'buy') {
    return {
      text: 'دنبالِ چه دسته‌ای هستی؟',
      chips: catChips(),
      next: START,
    };
  }

  /* «اطلاعات بیشتر» روی یکی از پیشنهادها */
  if (act.startsWith('prod:')) return detail(act.slice('prod:'.length));

  if (act === 'buy:numbers') {
    return {
      text: 'شماره‌ی مجازی برای ساختِ حساب در سرویس‌هایی است که ایران را قبول نمی‌کنند. کشور و سرویس را همان‌جا انتخاب می‌کنی و شماره بلافاصله فعال می‌شود.',
      links: [{ label: 'شماره‌های موجود', href: '/numbers' }],
      chips: [{ label: 'دسته‌ی دیگر', act: 'buy' }, backChip],
      next: START,
    };
  }

  if (act.startsWith('buy:cat:')) {
    const slug = act.slice('buy:cat:'.length);
    const cat = CATEGORIES.find((c) => c.slug === slug);
    if (!cat) return GREETING;

    const b = bands(slug);
    /* دسته‌ی کم‌محصول باند نمی‌خواهد — سه‌تا را همان‌جا نشان بده */
    if (!b) return offer(picks(slug, null), cat.title);

    return {
      text: `${cat.title} 👌\nتا چه مبلغی راحتی؟`,
      chips: [
        { label: `تا ${fmt(b.low)}`, act: `buy:max:${slug}:${b.low}` },
        { label: `${fmt(b.low)} تا ${fmt(b.high)}`, act: `buy:mid:${slug}:${b.low}:${b.high}` },
        { label: `بالای ${fmt(b.high)}`, act: `buy:min:${slug}:${b.high}` },
        { label: 'مهم نیست', act: `buy:any:${slug}` },
      ],
      next: { mode: 'buy', cat: slug },
    };
  }

  if (act.startsWith('buy:')) {
    const [, kind, slug, a, b] = act.split(':');
    const cat = CATEGORIES.find((c) => c.slug === slug);
    if (!cat) return GREETING;

    if (kind === 'max') return offer(picks(slug, Number(a)), cat.title);
    if (kind === 'mid') return offer(picks(slug, Number(b), Number(a)), cat.title);
    if (kind === 'min') return offer(picks(slug, null, Number(a)), cat.title);
    if (kind === 'any') return offer(picks(slug, null), cat.title);
  }

  /* --- مسیرِ پیگیری --- */

  if (act === 'track') {
    const mine = myCodes();
    return {
      text: 'کدِ پیگیری‌ات را بنویس — قالبش مثل ‎PHX-123456‎ است و در ایمیلِ تأیید و پنل کاربری هست.',
      /* کدهای خودِ همین مرورگر به‌صورت گزینه می‌آیند، پس کاربر
         لازم نیست تایپ کند و کدِ نمونه هم در متن تبلیغ نمی‌شود */
      chips: [
        ...mine.map((c) => ({ label: c, act: `track:${c}` })),
        backChip,
      ],
      next: { mode: 'track' },
      ask: 'مثلاً PHX-123456',
    };
  }

  if (act.startsWith('track:')) {
    const code = act.slice('track:'.length);
    const o = findOrder(code);
    return o ? orderCard(o) : notFound(code);
  }

  /* کاربر گفت منتظر می‌ماند — تأییدِ کوتاه، بدونِ وعده‌ی زمانی
     که نمی‌توانیم تضمینش کنیم */
  if (act === 'wait') {
    return {
      text: 'باشه. سوالت ثبت شد و کارشناس همین‌جا جواب می‌دهد.\nتا آن موقع می‌توانی چیز دیگری بپرسی.',
      chips: MENU,
      next: START,
    };
  }

  /* --- مسیرِ پشتیبانی --- */

  if (act === 'help') {
    return {
      text: 'کدامش؟ اگر هیچ‌کدام نبود، خودت بنویس.',
      chips: HELP_TOPICS,
      next: START,
    };
  }

  if (act.startsWith('help:')) return helpAnswer(act.slice('help:'.length));

  return GREETING;
}

function notFound(code: string): Answer {
  return {
    text: `سفارشی با کدِ ${code} پیدا نکردم.\nکد در ایمیلِ تأیید سفارش و در پنل کاربری هست. اگر تازه پرداخت کرده‌ای، چند لحظه بعد دوباره امتحان کن.`,
    links: [
      { label: 'پیگیری با کد', href: '/track' },
      { label: 'سفارش‌های من', href: '/account' },
    ],
    chips: [{ label: 'دوباره امتحان می‌کنم', act: 'track' }, backChip],
    next: START,
  };
}

/* ---------------------------------------------------------------
   متنِ آزاد

   ترتیبِ جست‌وجو عمدی است:

     ۰ اگر ربات منتظرِ کدِ سفارش است، همان را می‌فهمد — حتی اگر
       کاربر جمله بنویسد («سفارش PHX-482913 چی شد؟»)
     ۱ کدِ سفارش، در هر حالتی. کسی که کد می‌نویسد دنبالِ وضعیت
       است، نه دنبالِ توضیح.
     ۲ نامِ محصول. کسی که «کلاد» می‌نویسد همان را می‌خواهد.
     ۳ مقاله‌ی راهنما، بعد کلیدواژه.
--------------------------------------------------------------- */

/* ⚠ نرمال‌سازیِ فارسی، همان که فروشگاه هم می‌کند.

   «ي» و «ك» عربی روی کیبوردِ خیلی‌ها هستند و نیم‌فاصله هم گاهی
   تایپ می‌شود گاهی نه. بدونِ این، «كلاد» و «کلاد» دو رشته‌ی
   مختلف‌اند و جست‌وجو خالی برمی‌گردد. */
const norm = (s: string) =>
  s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ')
    .replace(/\s+/g, ' ').toLowerCase().trim();

const KEYWORDS: { k: string[]; act: string }[] = [
  { k: ['تحویل', 'کی می', 'چقدر طول', 'زمان'], act: 'help:delivery' },
  { k: ['گارانتی', 'ضمانت', 'مرجوع', 'پس بدم'], act: 'help:warranty' },
  { k: ['رمز', 'پسورد', 'امن', 'هک'], act: 'help:safe' },
  { k: ['پرداخت', 'کارت', 'ریال', 'درگاه'], act: 'help:pay' },
  { k: ['باشگاه', 'امتیاز', 'کش بک', 'کشبک'], act: 'help:club' },
  { k: ['پیگیری', 'سفارشم', 'کد رهگیری', 'رهگیری'], act: 'track' },
  /* ⚠ شماره‌ی مجازی پیش از «قیمت» می‌آید، و ترتیبش مهم است.

     «قیمت شماره مجازی» هر دو کلیدواژه را دارد. اگر «قیمت» اول
     بیاید، کاربر به پرسشِ «چه دسته‌ای؟» می‌رسد — در حالی که خودش
     دسته را گفته بود. */
  { k: ['شماره مجازی', 'شماره virtual', 'ویرچوال', 'شماره خارجی'], act: 'buy:numbers' },
  { k: ['بخرم', 'پیشنهاد', 'چی بگیرم', 'کدام', 'کدوم'], act: 'buy' },
  /* ⚠ «چند»ِ تنها این‌جا نیست، و عمدی است.

     یک‌بار بود و هر جمله‌ای که «چند» داشت را به مسیرِ خرید
     می‌برد — «شماره شبای شرکتتون چنده؟» هم می‌رفت آن‌جا و
     کاربر به‌جای جواب، فهرستِ دسته‌ها می‌گرفت. کلیدواژه‌ی
     دوحرفی در فارسی داخلِ ده کلمه‌ی دیگر هم می‌نشیند.

     حالا فقط ترکیب‌هایی که واقعاً قیمت می‌پرسند می‌مانند. هرچه
     این‌جا نیفتد به کارشناس می‌رود — که بدترین حالتش یک آدم
     است، نه یک جوابِ غلط. */
  { k: ['قیمت', 'هزینه', 'ارزان', 'بودجه', 'چند تومن', 'چند تومان'], act: 'buy' },
  { k: ['چی دارید', 'چه محصول', 'لیست', 'دسته'], act: 'buy' },
];

/* ---------------------------------------------------------------
   پیدا کردنِ محصول از متن

   ⚠ تطبیق دوطرفه است، نه یک‌طرفه.

   نسخه‌ی قبلی فقط ‎input.includes(title)‎ را چک می‌کرد — یعنی
   کاربر باید نامِ *کاملِ* محصول را می‌نوشت. کسی که «کلاد»
   می‌نوشت هیچ جوابی نمی‌گرفت، چون «کلاد» شاملِ «کلاد پرو» نیست.
   آزمایش شد و واقعاً به «نمی‌دانم» می‌افتاد.

   حالا هر طرف که طرفِ دیگر را داشته باشد کافی است. حدِ سه حرف
   هم لازم است وگرنه دو حرفِ مشترک هر چیزی را به هر چیزی وصل
   می‌کند؛ و از میانِ تطبیق‌ها بلندترین برنده است تا «گیفت کارت
   استیم» به «استیم» ترجیح داده شود.
--------------------------------------------------------------- */
function findProduct(input: string): Product | null {
  const t = norm(input);
  if (t.length < 3) return null;

  let best: Product | null = null;
  let bestLen = 0;

  for (const p of PRODUCTS) {
    for (const field of [p.title, p.englishTitle, p.brand]) {
      const f = norm(field);
      if (f.length < 3) continue;
      const hit = t.includes(f) || f.includes(t);
      if (hit && f.length > bestLen) { best = p; bestLen = f.length; }
    }
  }
  return best;
}

/* ⚠ سلام و تعارف پیش از هر چیزِ دیگر بررسی می‌شوند.

   بدونِ این، «سلام» به کارشناس واگذار می‌شد — یعنی هر کسی که
   مودبانه شروع می‌کند، اولین کارش وقت‌گرفتن از یک آدم است. این‌ها
   جوابِ کوتاهِ خودشان را می‌گیرند و به منو برمی‌گردند.

   شرطِ «کوتاه بودن» لازم است: «سلام، سفارشم نرسیده» باید به مسیرِ
   پیگیری برود نه به جوابِ سلام. پس فقط جمله‌هایی که *تقریباً
   تماماً* تعارف‌اند این‌جا گیر می‌کنند. */
const SMALL_TALK: { k: string[]; reply: string }[] = [
  { k: ['سلام', 'درود', 'وقت بخیر', 'صبح بخیر', 'شب بخیر', 'hi', 'hello'],
    reply: 'سلام 👋 در خدمتم. با کدامش شروع کنیم؟' },
  { k: ['خوبی', 'چطوری', 'چه خبر', 'حالت چطور'],
    reply: 'خوبم، ممنون 🙏 تو بگو چه کمکی از دستم برمی‌آید.' },
  { k: ['ممنون', 'مرسی', 'سپاس', 'دمت گرم', 'تشکر', 'لطف'],
    reply: 'خواهش می‌کنم. اگر چیز دیگری بود همین‌جام.' },
  { k: ['خداحافظ', 'بای', 'فعلا', 'خدانگهدار'],
    reply: 'مراقب خودت باش 👋 هر وقت خواستی برگرد.' },
  { k: ['کی هستی', 'ربات', 'آدمی', 'بات'],
    reply: 'دستیارِ فونیکس‌شاپم. هرچه بلد نباشم می‌دهم دستِ کارشناس‌های خودمان.' },
];

function smallTalk(t: string): Answer | null {
  const words = t.split(/\s+/).length;
  /* بیش از چهار کلمه یعنی سوالِ واقعی، نه تعارف */
  if (words > 4) return null;
  const hit = SMALL_TALK.find((s) => s.k.some((k) => t.includes(k)));
  return hit ? { text: hit.reply, chips: MENU, next: START } : null;
}

export function freeText(input: string, state: ChatState, agent: string, context?: string): Answer {
  const t = input.trim();
  if (!t) return { text: 'چیزی ننوشتی.', chips: MENU, next: START };

  /* سلام و تعارف — ولی نه وقتی ربات منتظرِ کدِ سفارش است */
  if (state.mode !== 'track') {
    const talk = smallTalk(norm(t));
    if (talk) return talk;
  }

  /* ۰ و ۱ — کدِ سفارش */
  const code = normalizeCode(t);
  if (code) {
    const o = findOrder(code);
    return o ? orderCard(o) : notFound(code);
  }
  if (state.mode === 'track') {
    return {
      text: 'این شبیهِ کدِ سفارش نبود. قالبش ‎PHX-‎ است و شش رقم، مثل ‎PHX-123456‎.',
      chips: [{ label: 'بی‌خیال، سوال دیگری دارم', act: 'help' }, backChip],
      next: { mode: 'track' },
      ask: 'مثلاً PHX-123456',
    };
  }

  const low = norm(t);

  /* ۲ محصول */
  const prod = findProduct(t);
  if (prod) {
    return {
      text: `${prod.title} را داریم — از ${fmt(getLowestPrice(prod))} تومان، با ${fmt(prod.variants.length)} پلن.\n${prod.shortDescription}`,
      links: [{ label: `صفحه‌ی ${prod.title}`, href: `/product/${prod.slug}` }],
      chips: [
        { label: 'اطلاعات بیشتر', act: `prod:${prod.slug}` },
        { label: 'چیزِ مشابه پیشنهاد بده', act: `buy:cat:${prod.category}` },
        backChip,
      ],
      next: START,
    };
  }

  /* ۳ مقاله‌ی راهنما */
  const art = HELP_ARTICLES.find((a) => a.keywords?.some((k) => low.includes(k.toLowerCase())));
  if (art) {
    return {
      text: art.answer,
      links: [{ label: 'سوالات متداول', href: '/faq' }],
      chips: [{ label: 'سوال دیگر', act: 'help' }, backChip],
      next: START,
    };
  }

  /* ۴ کلیدواژه */
  const kw = KEYWORDS.find((k) => k.k.some((x) => low.includes(x)));
  if (kw) return run(kw.act, state);

  /* ⚠ حدس نمی‌زند — به آدم وصل می‌کند.

     جوابِ غلطِ مطمئن از «نمی‌دانم»ِ صادقانه بدتر است، چون کاربر
     رویش حساب می‌کند. ولی «نمی‌دانم»ِ خالی هم کافی نیست: کسی که
     وسطِ چت به بن‌بست بخورد، همان‌جا رها می‌کند. پس سوالش با
     خودش می‌رود سراغِ کارشناس. */
  return handoff(t, agent, context);
}
