/* ============================================================
   دانشِ چت

   جواب‌ها از خودِ داده‌ی سایت ساخته می‌شوند، نه از متنِ ثابت.

   دلیلش یک اشتباه بود که در نسخه‌ی قبلی چت واقعاً وجود داشت: آن‌جا
   نوشته شده بود «بیشتر سفارش‌ها زیر پانزده دقیقه تحویل می‌شوند»،
   در حالی که کارفرما همان جمله را از کلِ سایت برداشته بود و
   همه‌جا شده بود «در اسرع وقت، توسط سیستم». چت داشت چیزی وعده
   می‌داد که سایت دیگر نمی‌گفت.

   هر جوابی که به عددی، قیمتی یا شرطی اشاره دارد، آن را از منبعِ
   واقعی می‌خواند. اگر داده عوض شود، جوابِ چت هم عوض می‌شود و کسی
   لازم نیست یادش بماند.
   ============================================================ */

import { CATEGORIES, PRODUCTS, getLowestPrice } from '../data/catalog';
import { TIERS } from '../data/club';
import { HELP_ARTICLES } from '../data/helpArticles';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/** ارزان‌ترین قیمت یک دسته — برای جوابِ «چند؟» */
function cheapestIn(cat: string) {
  const items = PRODUCTS.filter((p) => p.category === cat);
  if (!items.length) return null;
  return Math.min(...items.map(getLowestPrice));
}

export interface Answer {
  text: string;
  /** لینک‌هایی که همراه جواب پیشنهاد می‌شوند */
  links?: { label: string; href: string }[];
}

/* ---------------------------------------------------------------
   گزینه‌های آماده

   کاربرِ چتِ فروشگاه معمولاً نمی‌داند چه بپرسد؛ نوشتنِ سوال از
   انتخاب کردن سخت‌تر است. این‌ها همان چند سوالی‌اند که واقعاً
   پرسیده می‌شوند.
--------------------------------------------------------------- */

export const QUICK: { id: string; label: string }[] = [
  { id: 'what',     label: 'چه چیزهایی می‌فروشید؟' },
  { id: 'price',    label: 'قیمت‌ها از چند شروع می‌شود؟' },
  { id: 'delivery', label: 'چقدر طول می‌کشد؟' },
  { id: 'safe',     label: 'رمز حسابم را می‌خواهید؟' },
  { id: 'pay',      label: 'چطور پرداخت کنم؟' },
  { id: 'warranty', label: 'گارانتی چطور است؟' },
  { id: 'club',     label: 'باشگاه مشتریان چیست؟' },
  { id: 'track',    label: 'سفارشم را چطور پیگیری کنم؟' },
];

export function quickAnswer(id: string): Answer {
  switch (id) {
    case 'what': {
      const list = CATEGORIES.map((c) => c.title).join('، ');
      return {
        text: `${list} و شماره‌ی مجازی. روی هم ${fmt(PRODUCTS.length)} محصول.`,
        links: [{ label: 'دیدن همه', href: '/shop' }],
      };
    }

    case 'price': {
      const rows = CATEGORIES
        .map((c) => ({ t: c.title, p: cheapestIn(c.slug) }))
        .filter((r) => r.p !== null)
        .map((r) => `${r.t} از ${fmt(r.p!)} تومان`);
      return {
        text: rows.join('\n'),
        links: [{ label: 'فروشگاه', href: '/shop' }],
      };
    }

    case 'delivery': {
      /* از خودِ محصول خوانده می‌شود، نه از متنِ ثابت */
      const est = PRODUCTS[0]?.deliveryEstimate ?? 'در اسرع وقت';
      return {
        text: `${est}. کد پیگیری همان لحظه‌ی پرداخت صادر می‌شود و وضعیت سفارش را در پنل کاربری می‌بینی.`,
        links: [{ label: 'پیگیری سفارش', href: '/track' }],
      };
    }

    case 'safe':
      return {
        text: 'نه. رمز عبورِ هیچ حسابی را نمی‌خواهیم — نه حساب چت‌جی‌پی‌تی، نه ایمیلت، نه رمز دوم کارت بانکی.\nبرای بیشتر اشتراک‌ها فقط ایمیلِ حسابت لازم است تا اشتراک روی همان فعال شود. اگر جایی به اسم ما این‌ها را خواستند، از طرف ما نیست.',
        links: [{ label: 'قوانین و گارانتی', href: '/rules' }],
      };

    case 'pay':
      return {
        text: 'با کارت بانکی خودت و درگاه ریالی داخلی. نه ارز لازم داری نه حساب خارجی.\nقیمت پیش از پرداخت کامل معلوم است و هزینه‌ی پنهانی وجود ندارد.',
        links: [{ label: 'راهنمای خرید', href: '/guide' }],
      };

    case 'warranty': {
      const w = PRODUCTS[0]?.warrantyLabel ?? 'گارانتی تمام دوره';
      return {
        text: `${w}. اگر وسط دوره مشکلی پیش بیاید جایگزین می‌کنیم یا مبلغ را برمی‌گردانیم.`,
        links: [{ label: 'شرایط کامل', href: '/rules' }],
      };
    }

    case 'club': {
      const top = TIERS[TIERS.length - 1];
      return {
        text: `رایگان است و از اولین خرید شروع می‌شود. هر خرید امتیاز دارد و هر پله کش‌بک — تا ٪${fmt(top.cashback)} در بالاترین پله، که به کیف پولت برمی‌گردد.`,
        links: [{ label: 'باشگاه مشتریان', href: '/club' }],
      };
    }

    case 'track':
      return {
        text: 'کد پیگیری‌ات را در صفحه‌ی پیگیری بزن، یا از پنل کاربری وضعیت همه‌ی سفارش‌هایت را ببین.',
        links: [
          { label: 'پیگیری با کد', href: '/track' },
          { label: 'پنل کاربری', href: '/account' },
        ],
      };

    default:
      return { text: 'این یکی را بلد نیستم.' };
  }
}

/* ---------------------------------------------------------------
   جواب به متنِ آزاد

   اول محصول را می‌گردد، بعد مقاله‌های راهنما، بعد کلیدواژه‌ها.
   ترتیبش عمدی است: کسی که اسم یک محصول را می‌نویسد، دنبال همان
   محصول است نه دنبال یک جوابِ عمومی.
--------------------------------------------------------------- */

const KEYWORDS: { k: string[]; id: string }[] = [
  { k: ['تحویل', 'کی می', 'چقدر طول', 'زمان'], id: 'delivery' },
  { k: ['گارانتی', 'ضمانت', 'مرجوع', 'پس بدم'], id: 'warranty' },
  { k: ['رمز', 'پسورد', 'امن', 'هک'], id: 'safe' },
  { k: ['پرداخت', 'کارت', 'ریال', 'بخرم', 'درگاه'], id: 'pay' },
  { k: ['قیمت', 'چند', 'هزینه', 'ارزان'], id: 'price' },
  { k: ['باشگاه', 'امتیاز', 'کش‌بک', 'کشبک', 'تخفیف'], id: 'club' },
  { k: ['پیگیری', 'سفارشم', 'کد رهگیری'], id: 'track' },
  { k: ['چی دارید', 'چه', 'محصول', 'لیست'], id: 'what' },
];

export function answerFor(input: string): Answer {
  const t = input.trim().toLowerCase();
  if (!t) return { text: 'چیزی ننوشتی.' };

  /* ۱ محصول */
  const prod = PRODUCTS.find(
    (p) => t.includes(p.title.toLowerCase())
      || t.includes(p.englishTitle.toLowerCase())
      || t.includes(p.brand.toLowerCase()),
  );
  if (prod) {
    return {
      text: `${prod.title} را داریم — از ${fmt(getLowestPrice(prod))} تومان، با ${fmt(prod.variants.length)} پلن.\n${prod.shortDescription}`,
      links: [{ label: `صفحه‌ی ${prod.title}`, href: `/product/${prod.slug}` }],
    };
  }

  /* ۲ مقاله‌ی راهنما */
  const art = HELP_ARTICLES.find(
    (a) => a.keywords?.some((k) => t.includes(k.toLowerCase())),
  );
  if (art) {
    return { text: art.answer, links: [{ label: 'سوالات متداول', href: '/faq' }] };
  }

  /* ۳ کلیدواژه */
  const kw = KEYWORDS.find((k) => k.k.some((x) => t.includes(x)));
  if (kw) return quickAnswer(kw.id);

  return {
    text: 'این یکی را مطمئن نیستم و ترجیح می‌دهم حدس نزنم.\nاز پنل کاربری تیکت بزن — شماره‌ی سفارشت همان‌جا جلوی چشم ماست و همان روز جواب می‌گیری.',
    links: [
      { label: 'ثبت تیکت', href: '/account' },
      { label: 'سوالات متداول', href: '/faq' },
    ],
  };
}
