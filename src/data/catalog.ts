/* ============================================================
   کاتالوگ فونیکس شاپ
   افزودن دسته یا محصول جدید فقط یعنی افزودن یک عضو به آرایه —
   هیچ کامپوننتی دست نمی‌خوره. همین ساختار خروجی ووکامرس هم خواهد بود.
   ============================================================ */

import { DEFAULT_USD_RATE, tomanFromUsd } from '../lib/rate';

export type CategorySlug = 'ai' | 'creative' | 'social' | 'education' | 'gaming' | 'giftcard';

/** بعد از پرداخت چه اتفاقی می‌افته */
export type FulfillmentMode =
  | 'stock_code'      // کد از انبار
  | 'stock_account'   // یوزر/پسورد از انبار
  | 'upgrade_on_user' // ارتقای اکانت خودِ مشتری
  | 'api_topup'       // شارژ خودکار اکانت مشتری
  | 'manual';

export interface RequiredInput {
  key: string;
  label: string;
  hint?: string;
  type: 'text' | 'email' | 'number';
  pattern?: string;
  example?: string;
}

export interface Variant {
  id: string;
  label: string;
  price: number;          // تومان
  compareAt?: number;
  /**
   * مبلغِ دلاری، اگر محصول ذاتاً دلاری باشد.
   *
   * وقتی پر باشد، قیمتِ تومانی از نرخِ روز حساب می‌شود و
   * نرخ هم به کاربر نشان داده می‌شود — پس می‌فهمد عدد از
   * کجا آمده. price همان حاصلِ ضرب است تا فهرست‌ها و جستجو
   * لازم نباشد نرخ بدانند.
   */
  usd?: number;
  /**
   * ضریبی که روی مبلغِ دلاری می‌نشیند تا قیمتِ فروش دربیاید.
   *
   * ⚠ وجودِ همین فیلد است که تعیین می‌کند قیمت از کجا می‌آید.
   *
   * اگر تعریف شده باشد، قیمتِ تومانی از ‎usd × این ضریب × نرخِ
   * روز‎ حساب می‌شود و ‎price‎ فقط پشتیبانِ فهرست‌هاست. اگر
   * تعریف نشده باشد، ‎price‎ حرفِ آخر است و ‎usd‎ فقط نمایشی —
   * یعنی «این سرویس در سایتِ خودش چند است».
   *
   * ⚠ چرا این تفکیک لازم شد.
   *
   * قبلاً هر جا usd بود، قیمت از رویش حساب می‌شد. ولی usd در
   * داده دو معنی داشت و کسی جایی ننوشته بود:
   *
   *   گیفت کارت  — مبلغِ اسمیِ کارت. کارتِ ده دلاری واقعاً ده
   *                دلار اعتبار می‌دهد و همین باید روی پلن دیده
   *                شود، ولی ما ده دلار نمی‌فروشیمش.
   *   اشتراک‌ها  — قیمتِ سایتِ خودشان. کنوا پرو سالی ۱۲۰ دلار
   *                است ولی ما اکانتِ ظرفیتی می‌فروشیم و قیمتمان
   *                ۲۰۵٬۰۰۰ تومان است، نه ۲۷ میلیون.
   *
   * نتیجه‌اش این بود که صفحه‌ی محصولِ کنوا ۲۷٬۱۸۰٬۰۰۰ نشان
   * می‌داد و گیفت کارتِ ده دلاری ۲٬۲۷۰٬۰۰۰ به‌جای ۳٬۴۴۰٬۰۰۰ —
   * یکی صد برابر گران، یکی یک‌سوم ارزان.
   */
  usdMargin?: number;
  stock: number | null;   // null = بدون محدودیت انبار
  isDefault?: boolean;
  /**
   * راهنمای انتخاب پلن.
   *
   * برچسبِ پلن («Plus — یک ماهه») می‌گوید چه چیزی است، نه اینکه به
   * دردِ چه کسی می‌خورد. خریدارِ این بازار معمولاً هر دو را
   * نمی‌داند: تفاوت Go و Plus، یا معنیِ «ظرفیت دو»، چیزی نیست که
   * از اسمش دربیاید.
   *
   * fit یک جمله است: این پلن مالِ کیست.
   * detail چند جمله: دقیقاً چه می‌گیری و چه نمی‌گیری.
   *
   * اختیاری است چون بعضی محصولات یک پلن بیشتر ندارند و آن‌جا
   * انتخابی در کار نیست.
   */
  guide?: { fit: string; detail: string };
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  englishTitle: string;
  brand: string;
  category: CategorySlug;
  fulfillment: FulfillmentMode;
  requiredInputs: RequiredInput[];
  deliveryEstimate: string;
  warrantyLabel: string;
  variants: Variant[];
  /**
   * تصویرها.
   *
   * ⚠ logo با thumbnail یکی نیست.
   *
   * thumbnail تصویرِ کارتِ محصول است — تمام‌قد، با پس‌زمینه‌ی
   * خودش. logo فقط نشانِ سرویس است، شفاف، برای جاهایی که قابِ
   * کوچک داریم: مگا منو، نتیجه‌ی جست‌وجو، فهرست‌های فشرده. در
   * قابِ چهل‌پیکسلی، تصویرِ کارت لکه‌ای می‌شود که هیچ نمی‌گوید.
   */
  media: { thumbnail: string; logo?: string; cover?: string; cutout?: string; accent: string };
  /** پلتفرم‌ها — روی کارت محصول نمایش داده می‌شود. برای اشتراک‌های
      نرم‌افزاری معمولاً Web/iOS/Android است، برای بازی کنسول‌ها. */
  platforms?: string[];
  shortDescription: string;
  description: string;
  features: string[];
  notes?: string[];
  /** سوالات پرتکرارِ همین محصول — در ووکامرس متای محصول می‌شود */
  faq?: { q: string; a: string }[];
  rating: number;
  reviewsCount: number;
  salesCount: number;
  badges: ('hot' | 'new' | 'bestseller' | 'limited')[];
  /** برچسب‌های تاکسونومی — کلیدهای TAGS. در ووکامرس product_tag می‌شوند */
  tags?: string[];
}

/* ---------------------------------------------------------------
   تاکسونومی برچسب‌ها

   دسته‌بندی می‌گوید محصول «چیست»؛ برچسب می‌گوید «چه ویژگی‌هایی دارد».
   همین تفاوت اجازه می‌دهد کسی که دنبال «تحویل آنی» یا «بازی ترسناک»
   است، بدون دانستن اسم محصول پیدایش کند.

   گروه‌بندی برای رابط کاربری است: فیلترها گروه‌به‌گروه نشان داده
   می‌شوند، نه یک فهرست بلند بی‌سر و ته.
--------------------------------------------------------------- */

export type TagGroup = 'delivery' | 'platform' | 'genre' | 'usage' | 'status';

export interface Tag {
  slug: string;
  label: string;
  group: TagGroup;
  /** توضیح کوتاه — روی هاور و در صفحه‌ی برچسب استفاده می‌شود */
  hint?: string;
}

export const TAG_GROUP_LABELS: Record<TagGroup, string> = {
  delivery: 'نوع تحویل',
  platform: 'پلتفرم',
  genre: 'سبک بازی',
  usage: 'به چه کار می‌آید',
  status: 'وضعیت',
};

export const TAGS: Tag[] = [
  // ---- نوع تحویل ----
  { slug: 'instant', label: 'تحویل آنی', group: 'delivery', hint: 'بلافاصله بعد از پرداخت تحویل می‌شود' },
  { slug: 'upgrade-on-account', label: 'ارتقای اکانت خودت', group: 'delivery', hint: 'روی حساب شخصی خودت فعال می‌شود، بدون رمز' },
  { slug: 'capacity', label: 'اکانت ظرفیتی', group: 'delivery', hint: 'بین چند نفر تقسیم می‌شود، ارزان‌تر' },
  { slug: 'private-account', label: 'اکانت اختصاصی', group: 'delivery', hint: 'کامل مال خودت، بدون شریک' },
  { slug: 'preorder', label: 'پیش‌فروش', group: 'delivery', hint: 'قبل از عرضه رزرو می‌شود' },

  // ---- پلتفرم ----
  { slug: 'ps5', label: 'PlayStation 5', group: 'platform' },
  { slug: 'ps4', label: 'PlayStation 4', group: 'platform' },
  { slug: 'pc', label: 'کامپیوتر', group: 'platform' },
  { slug: 'xbox', label: 'Xbox', group: 'platform' },
  { slug: 'web', label: 'مرورگر', group: 'platform' },
  { slug: 'mobile', label: 'موبایل', group: 'platform' },

  // ---- سبک بازی ----
  { slug: 'shooter', label: 'شوتر', group: 'genre' },
  { slug: 'action-adventure', label: 'اکشن ماجراجویی', group: 'genre' },
  { slug: 'rpg', label: 'نقش‌آفرینی', group: 'genre' },
  { slug: 'sports', label: 'ورزشی', group: 'genre' },
  { slug: 'horror', label: 'ترسناک', group: 'genre' },
  { slug: 'open-world', label: 'جهان باز', group: 'genre' },
  { slug: 'story-driven', label: 'داستان‌محور', group: 'genre' },
  { slug: 'online', label: 'آنلاین', group: 'genre' },
  { slug: 'single-player', label: 'تک‌نفره', group: 'genre' },
  { slug: 'roguelike', label: 'روگ‌لایک', group: 'genre' },
  { slug: 'stealth', label: 'مخفی‌کاری', group: 'genre' },

  // ---- کاربرد ----
  { slug: 'writing', label: 'نوشتن و ترجمه', group: 'usage' },
  { slug: 'coding', label: 'کدنویسی', group: 'usage' },
  { slug: 'design', label: 'طراحی گرافیک', group: 'usage' },
  { slug: 'video-editing', label: 'ادیت ویدیو', group: 'usage' },
  { slug: 'image-gen', label: 'تولید تصویر', group: 'usage' },
  { slug: 'research', label: 'تحقیق و جست‌وجو', group: 'usage' },
  { slug: 'language-learning', label: 'یادگیری زبان', group: 'usage' },
  { slug: 'messaging', label: 'پیام‌رسان', group: 'usage' },
  { slug: 'ui-design', label: 'طراحی رابط کاربری', group: 'usage' },

  // ---- وضعیت ----
  { slug: 'new-release', label: 'تازه رسیده', group: 'status' },
  { slug: 'bestseller', label: 'پرفروش', group: 'status' },
  { slug: 'limited-stock', label: 'موجودی محدود', group: 'status' },
  { slug: 'on-sale', label: 'تخفیف‌دار', group: 'status' },
  { slug: 'budget', label: 'مقرون‌به‌صرفه', group: 'status' },
];

export const getTag = (slug: string) => TAGS.find((t) => t.slug === slug);

/** برچسب‌های یک محصول، به ترتیب گروه‌ها */
export const getProductTags = (p: Product): Tag[] => {
  const order: TagGroup[] = ['status', 'delivery', 'genre', 'usage', 'platform'];
  return (p.tags ?? [])
    .map(getTag)
    .filter((t): t is Tag => Boolean(t))
    .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
};

export interface Category {
  slug: CategorySlug;
  title: string;
  tagline: string;
  icon: string;
  accent: string;
  order: number;
}

/* ---------------------------------------------------------------
   دسته‌بندی‌ها
--------------------------------------------------------------- */

export const CATEGORIES: Category[] = [
  {
    slug: 'ai',
    title: 'هوش مصنوعی',
    tagline: 'دستیارهای گفتگو و ابزارهای تولید محتوا',
    icon: 'sparkles',
    accent: '#e8862e',
    order: 1,
  },
  {
    slug: 'creative',
    title: 'طراحی و ادیت',
    tagline: 'ابزار گرافیک، ویدیو و رابط کاربری',
    icon: 'palette',
    accent: '#de2e6b',
    order: 2,
  },
  {
    slug: 'social',
    title: 'شبکه‌های اجتماعی',
    tagline: 'اشتراک‌های پریمیوم پیام‌رسان و شبکه‌ها',
    icon: 'send',
    accent: '#4aa3e8',
    order: 3,
  },
  {
    slug: 'education',
    title: 'آموزشی',
    tagline: 'یادگیری زبان و مهارت',
    icon: 'graduation-cap',
    accent: '#2ecc8f',
    order: 4,
  },
  {
    slug: 'gaming',
    title: 'گیم',
    tagline: 'اکانت بازی، اشتراک و ارز درون‌بازی',
    icon: 'gamepad-2',
    accent: '#8b3fd4',
    order: 5,
  },
  {
    slug: 'giftcard',
    title: 'گیفت کارت',
    tagline: 'شارژ استور و کیف پول، با کد اورجینال',
    icon: 'gift',
    accent: '#ff9900',
    order: 6,
  },
];

/* ---------------------------------------------------------------
   ورودی‌های پرتکرار — قبل از پرداخت از مشتری گرفته می‌شن
--------------------------------------------------------------- */

const INPUT_EMAIL: RequiredInput = {
  key: 'accountEmail',
  label: 'ایمیل اکانتت',
  hint: 'اشتراک روی همین ایمیل فعال می‌شود. بعد از ثبت قابل تغییر نیست.',
  type: 'email',
  example: 'name@example.com',
};

const INPUT_TELEGRAM: RequiredInput = {
  key: 'telegramUsername',
  label: 'یوزرنیم تلگرامت',
  hint: 'بدون @ وارد کنید. حساب باید یوزرنیم عمومی داشته باشد.',
  type: 'text',
  pattern: '^[A-Za-z0-9_]{5,32}$',
  example: 'phoenix_user',
};

/* ---------------------------------------------------------------
   محصولات
--------------------------------------------------------------- */

import { GAMES } from './games';
import { GIFT_CARDS } from './giftcards';

/** محصولات غیرگیم — بازی‌ها از games.ts می‌آیند تا این فایل قابل مدیریت بماند */
const SUBSCRIPTIONS: Product[] = [
  /* ===================== هوش مصنوعی ===================== */
  {
    id: 'chatgpt',
    tags: ['upgrade-on-account', 'instant', 'writing', 'coding', 'image-gen', 'research', 'web', 'mobile', 'bestseller'],
    slug: 'chatgpt',
    title: 'چت جی‌پی‌تی',
    englishTitle: 'ChatGPT',
    brand: 'OpenAI',
    platforms: ['Web', 'iOS', 'Android'],
    category: 'ai',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'chatgpt-go-1m', label: 'Go — یک ماهه', price: 1766000, usd: 8, stock: null, isDefault: true, guide: { fit: 'برای شروع، و برای کسی که روزی چند بار می‌پرسد.', detail: 'ده برابرِ نسخه‌ی رایگان می‌توانی با GPT-5 حرف بزنی، تصویر بسازی و فایل آپلود کنی. حالت تفکر خودکار روشن است. اگر روزی چند مکالمه‌ی معمولی داری، همین کافی است و لازم نیست پول بیشتری بدهی.' } },
      { id: 'chatgpt-plus-1m', label: 'Plus — یک ماهه', price: 4274000, usd: 20, compareAt: 5210000, stock: null, guide: { fit: 'برای استفاده‌ی روزمره‌ی جدی — کار، درس، کد.', detail: 'محدودیت خیلی کمتر: هر سه ساعت تا صد و شصت پیام با GPT-5، و دسترسی دستی به نسخه‌ی Thinking. در ساعت‌های شلوغ اولویت داری و به Agent Mode هم می‌رسی. بیشترِ کسانی که چت‌جی‌پی‌تی را ابزارِ کارشان کرده‌اند، همین را می‌گیرند.' } },
    ],
    media: { thumbnail: '/products/chatgpt-card.webp', logo: '/brand/logos/openai.svg', cover: '/products/chatgpt-card.webp', accent: '#10a37f' },
    shortDescription: 'ارتقای مستقیم روی اکانت شخصی خودت',
    description:
      'نسخه‌ی رایگان چت‌جی‌پی‌تی سقف دارد: چند پیام که رد کنی، مدل ضعیف‌تر می‌شود، تحلیل فایل و تصویر محدود می‌ماند و ساعت‌های شلوغ اصلاً جواب نمی‌دهد. اگر روزانه با آن کار می‌کنی، همین سقف‌ها بیشتر از هزینه‌ی اشتراک برایت آب می‌خورند.\n\nبا اشتراک پولی به مدل‌های نسل جدید دسترسی داری، حافظه‌ی گفت‌وگو بلندتر می‌شود، می‌توانی فایل پی‌دی‌اف و اکسل و تصویر بدهی و تحلیل بگیری، و در ساعت‌های پرترافیک صف نمی‌شوی. ساخت تصویر، جست‌وجوی وب و اجرای کد هم داخل همین اشتراک است.\n\nمشکل ایران پرداخت است نه دسترسی. کارت ایرانی روی درگاه اوپن‌ای‌آی کار نمی‌کند و کارت مجازی هم اغلب وسط راه رد می‌شود. ما اشتراک را روی همان حساب خودت فعال می‌کنیم — حساب جدیدی نمی‌سازی و اطلاعاتت جای دیگری نمی‌رود.',
    features: [
      'فعال‌سازی روی ایمیل شخصی خودت',
      'بدون نیاز به تغییر رمز عبور',
      'دسترسی کامل به تاریخچه‌ی گفتگوهای قبلی',
      'پشتیبانی در تمام مدت اشتراک',
    ],
    notes: ['برای استفاده نیاز به اتصال بدون محدودیت دارید.'],
    rating: 4.9,
    reviewsCount: 412,
    salesCount: 1840,
    badges: ['bestseller', 'hot'],
    faq: [
      { q: 'رمز عبورم را می‌خواهید؟', a: 'نه. فقط همان ایمیلی را می‌خواهیم که با آن در ChatGPT ثبت‌نام کرده‌ای. ارتقا از سمت ما روی همان حساب می‌نشیند و رمزت هیچ‌جا وارد نمی‌شود.' },
      { q: 'تفاوت Go و Plus چیست؟', a: 'Plus سقف بالاتری دارد و به مدل‌های سنگین‌تر هم می‌رسی. اگر روزی چند بار سراغش می‌روی، Go کافی است؛ اگر کارت به آن بند است، Plus را بگیر.' },
      { q: 'روی چند دستگاه کار می‌کند؟', a: 'روی همه‌ی دستگاه‌هایی که با همان حساب وارد شوید — موبایل، مرورگر و اپلیکیشن دسکتاپ، بدون محدودیت تعداد.' },
    ],
  },
  {
    id: 'claude-pro',
    tags: ['upgrade-on-account', 'instant', 'writing', 'coding', 'research', 'web', 'mobile', 'new-release'],
    slug: 'claude-pro',
    title: 'کلاد پرو',
    englishTitle: 'Claude Pro',
    brand: 'Anthropic',
    platforms: ['Web', 'iOS', 'Android'],
    category: 'ai',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'claude-pro-1m', label: 'Pro — یک ماهه', price: 4460000, usd: 20, compareAt: 5250000, stock: null, isDefault: true, guide: { fit: 'برای متن‌های بلند، تحلیل فایل و کدنویسی.', detail: 'محدودیت استفاده چند برابرِ نسخه‌ی رایگان، به‌علاوه‌ی پروژه‌ها و حافظه‌ی گفتگو. اگر کارت با متن‌های طولانی یا کدِ واقعی است، تفاوتش با رایگان را از همان روز اول می‌بینی.' } },
    ],
    media: { thumbnail: '/products/claude-pro-card.webp', logo: '/brand/logos/claude-burst.svg', cover: '/products/claude-pro.webp', accent: '#e8862e' },
    shortDescription: 'اکانت شخصی، ارتقای مستقیم',
    description:
      'کلاد برای متن‌های بلند ساخته شده. اگر کارت قرارداد، مقاله، مستندات فنی یا کد است، نسخه‌ی رایگان زود به سقف می‌خورد و باید گفت‌وگو را تکه‌تکه کنی — و هر تکه، بخشی از زمینه را از دست می‌دهد.\n\nاشتراک پرو سقف پیام را چند برابر می‌کند، پنجره‌ی زمینه‌ی بلندتری می‌دهد و به مدل‌های قوی‌تر وصلت می‌کند. می‌توانی چند فایل را هم‌زمان بدهی، پروژه بسازی و برای هر پروژه دستور دائمی بگذاری تا هر بار از اول توضیح ندهی.\n\nپرداختش از ایران راه مستقیم ندارد. ما اشتراک را روی ایمیل خودت فعال می‌کنیم، در کمتر از یک ربع، و تا آخر دوره پشتش هستیم. اگر وسط دوره مشکلی پیش آمد، پشتیبانی همان روز پیگیرش می‌شود.',
    features: [
      'ارتقای مستقیم روی اکانت شخصی',
      'محدودیت استفاده‌ی چند برابر نسخه‌ی رایگان',
      'دسترسی به پروژه‌ها و حافظه‌ی گفتگو',
      'اولویت در ساعات شلوغی',
    ],
    rating: 4.9,
    reviewsCount: 168,
    salesCount: 620,
    badges: ['new', 'hot'],
    faq: [
      { q: 'اکانت مشترک است؟', a: 'خیر. اشتراک روی حساب شخصی خودتان فعال می‌شود و هیچ‌کس دیگری به آن دسترسی ندارد.' },
      { q: 'اگر وسط دوره قطع شد چه؟', a: 'تا پایان دوره‌ای که خریده‌اید پشتیبانی می‌کنیم. اگر مشکلی پیش بیاید یا تمدید می‌کنیم یا باقی‌مانده‌ی مبلغ را برمی‌گردانیم.' },
      { q: 'برای کدنویسی از Cursor بهتر است؟', a: 'برای فهمیدن و بازنویسی کد بله. ولی Cursor مستقیم داخل ادیتور کار می‌کند و فایل‌ها را خودش ویرایش می‌کند — کار متفاوتی است.' },
    ],
  },

  {
    id: 'gemini-pro',
    tags: ['private-account', 'instant', 'writing', 'research', 'image-gen', 'web', 'mobile', 'budget', 'on-sale'],
    slug: 'gemini-pro',
    title: 'جمنای پرو',
    englishTitle: 'Gemini Pro',
    brand: 'Google',
    platforms: ['Web', 'Android', 'iOS'],
    category: 'ai',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'gemini-private-18m', label: 'اختصاصی — ۱۸ ماهه', price: 1_200_000, usd: 240, stock: null, isDefault: true, guide: { fit: 'ارزان‌ترین راه برای دوره‌ی طولانی.', detail: 'هجده ماه با قیمتِ چند ماه. حساب اختصاصی است و با کسی شریک نیستی. اگر می‌دانی بیش از یک سال لازمش داری، هزینه‌ی ماهانه‌اش از هر گزینه‌ی دیگری کمتر درمی‌آید.' } },
      { id: 'gemini-family-1m', label: 'فمیلی — یک ماهه', price: 200_000, usd: 20, stock: null, guide: { fit: 'برای امتحان کردن، یا وقتی فقط چند ماه لازمش داری.', detail: 'ماهانه و بدون تعهد بلندمدت. روی حساب خودت فعال می‌شود و داخل Gmail و Docs هم کار می‌کند. اگر مطمئن نیستی چقدر استفاده می‌کنی، از این شروع کن.' } },
    ],
    media: { thumbnail: '/products/gemini-pro-card.webp', logo: '/brand/logos/gemini.svg', cover: '/products/gemini-pro.webp', accent: '#4a7cf7' },
    shortDescription: 'دوره‌ی بلند تا هجده ماه',
    description:
      'جمنای وقتی می‌درخشد که با بقیه‌ی ابزارهای گوگل کار کنی. نسخه‌ی رایگان اما نه به مدل‌های سنگین وصل می‌شود، نه در جی‌میل و داکس و اسلایدز دستیارِ واقعی می‌دهد، و نه فضای ذخیره‌سازی قابل‌اتکایی دارد.\n\nبا اشتراک، مدل‌های نسل جدید باز می‌شوند، دستیار جمنای داخل جی‌میل و گوگل داکس و شیتس می‌آید، ساخت ویدیو و تصویر فعال می‌شود و دو ترابایت فضای گوگل درایو هم رویش می‌آید. برای کسی که کارش روی حساب گوگل است، یعنی همه‌چیز یک‌جا.\n\nما اشتراک را روی حساب گوگل خودت فعال می‌کنیم. نه رمزت را می‌خواهیم نه حساب تازه می‌سازیم — فقط ایمیل، و بعد یک بار خارج و دوباره وارد شوی تا فعال بودنش را ببینی.',
    features: [
      'دسترسی به مدل‌های پیشرفته‌ی گوگل',
      'ادغام با Gmail، Docs و Drive',
      'پلن اختصاصی یا فمیلی، به انتخاب خودت',
      'گارانتی تا آخرین روز اشتراک',
    ],
    notes: ['پلن فمیلی زیرمجموعه‌ی اکانت فروشگاه است؛ اگر اکانت کاملاً خصوصی می‌خواهید پلن اختصاصی را انتخاب کنید.'],
    rating: 4.8,
    reviewsCount: 96,
    salesCount: 380,
    badges: ['hot', 'limited'],
    faq: [
      { q: 'تفاوت پلن اختصاصی و فمیلی چیست؟', a: 'اختصاصی کاملاً مال خودت است. فمیلی یعنی هزینه بین اعضای یک گروه پخش می‌شود؛ ارزان‌تر است ولی جایت در گروه تعریف‌شده است.' },
      { q: 'هجده ماه واقعاً یعنی هجده ماه؟', a: 'بله. دوره از روز فعال‌سازی شروع می‌شود و تا پایان همان مدت اعتبار دارد.' },
      { q: 'فضای ابری هم شامل می‌شود؟', a: 'بله، پلن‌های Gemini شامل فضای ذخیره‌سازی گوگل هم می‌شوند. مقدارش روی هر پلن نوشته شده.' },
    ],
  },
  {
    id: 'higgsfield',
    tags: ['private-account', 'instant', 'video', 'design'],
    slug: 'higgsfield',
    title: 'هیگزفیلد',
    englishTitle: 'Higgsfield',
    brand: 'Higgsfield AI',
    platforms: ['Web'],
    category: 'ai',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [
      { key: 'email', label: 'ایمیل حساب هیگزفیلد', type: 'email',
        example: 'you@example.com',
        hint: 'اشتراک روی همین حساب فعال می‌شود؛ رمزت را نمی‌خواهیم.' },
    ],
    deliveryEstimate: 'تا چند ساعت پس از پرداخت',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    /* ⚠ مبلغِ دلاری از صفحه‌ی رسمیِ higgsfield.ai/pricing است،
       بدونِ حاشیه‌ی فروشِ ما.

       نام‌های قبلی — Basic و Pro و Ultimate با ۹ و ۲۹ و ۴۹ دلار —
       دیگر روی سایتشان نیست. هیگزفیلد امسال دو بار نام و ردیفِ
       پلن‌ها را عوض کرده و مقالات و مقایسه‌های بیرونی هنوز
       نام‌های کهنه را می‌نویسند. این اعداد از خودِ صفحه‌شان
       خوانده شده‌اند، نه از آن‌ها. */
    variants: [
      { id: 'higgsfield-starter-1m', label: 'Starter — یک ماهه', price: 4_300_000, usd: 19, usdMargin: 1, stock: null, isDefault: true,
        guide: { fit: 'برای شروع و ویدیوهای کوتاه.', detail: 'سه مدلِ بدونِ محدودیت و صد ساختِ Nano Banana Pro در ماه. برای آشنا شدن با حرکت‌های دوربین و چند کلیپِ کوتاه کافی است.' } },
      { id: 'higgsfield-plus-1m', label: 'Plus — یک ماهه', price: 13_360_000, usd: 59, usdMargin: 1, stock: null,
        guide: { fit: 'برای تولیدکننده‌ی محتوایی که هفتگی کار می‌دهد.', detail: 'هفت مدلِ بدونِ محدودیت و پانصد ساختِ Nano Banana Pro در ماه، با صفِ سریع‌تر و دسترسی به حالت‌هایی که در Starter قفل‌اند.' } },
      { id: 'higgsfield-plus-12m', label: 'Plus — یک ساله', price: 127_750_000, usd: 564, usdMargin: 1, stock: null,
        guide: { fit: 'وقتی می‌دانی بیش از چند ماه لازمش داری.', detail: 'همان پلن Plus با حسابِ سالانه — ماهی ۴۷ دلار به‌جای ۵۹. شش هزار ساختِ Nano Banana Pro در سال. اگر ویدیو کارِ همیشگی‌ات است، ارزان‌ترین راه همین است.' } },
    ],
    media: { thumbnail: '/products/higgsfield-card.webp', logo: '/brand/logos/higgsfield.svg', accent: '#7d9c12' },
    shortDescription: 'ویدیو از روی متن، با حرکت دوربینِ سینمایی',
    description:
      'هیگزفیلد از روی توضیحِ متنی ویدیو می‌سازد و چیزی که جدایش می‌کند کنترلِ دوربین است: حرکت را خودت انتخاب می‌کنی — چرخش دور سوژه، نزدیک شدن، پروازِ بالای صحنه. یک عکسِ ثابت هم می‌دهی و به کلیپ تبدیل می‌شود.',
    features: [
      'ویدیو از روی متن یا عکس',
      'انتخاب حرکتِ دوربین از فهرستِ آماده',
      'روی حساب خودت فعال می‌شود',
      'پرداخت ریالی، بدون کارت ارزی',
    ],
    faq: [
      { q: 'اشتراک روی حساب خودم فعال می‌شود؟',
        a: 'بله. ایمیلِ حسابت را می‌گیریم و پلن روی همان فعال می‌شود. رمز عبورت را نمی‌خواهیم.' },
      { q: 'اعتبار ماهانه یعنی چه؟',
        a: 'هر ویدیو به اندازه‌ی طول و کیفیتش اعتبار مصرف می‌کند. اعتبارِ هر پلن ماهانه تازه می‌شود.' },
      { q: 'اگر اعتبارم تمام شد؟',
        a: 'می‌توانی پلن را ارتقا بدهی یا تا شروع دوره‌ی بعد صبر کنی. اعتبارِ اضافه هم از خودِ هیگزفیلد قابل خرید است.' },
    ],
    rating: 4.7,
    reviewsCount: 0,
    salesCount: 0,
    badges: ['new'],
  },
  {
    id: 'cursor-pro',
    tags: ['private-account', 'instant', 'coding', 'pc', 'limited-stock'],
    slug: 'cursor-pro',
    title: 'کرسر پرو',
    englishTitle: 'Cursor',
    brand: 'Anysphere',
    platforms: ['Windows', 'macOS', 'Linux'],
    category: 'ai',
    fulfillment: 'stock_account',
    requiredInputs: [],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'cursor-pro-1m', label: 'Pro — یک ماهه', price: 2_450_000, usd: 20, stock: 12, isDefault: true, guide: { fit: 'برای برنامه‌نویسی روزمره.', detail: 'سقف درخواستِ ماهانه‌ی استاندارد که برای کار روی یکی دو پروژه کافی است. اگر تازه از رایگان می‌آیی، همین را بگیر.' } },
      { id: 'cursor-proplus-1m', label: 'Pro+ — یک ماهه', price: 4_900_000, usd: 60, stock: 6, guide: { fit: 'وقتی Pro وسط ماه تمام می‌شود.', detail: 'همان امکانات با سقف چند برابری. مالِ کسی است که تمام‌وقت با ادیتور کار می‌کند و ماه گذشته به محدودیت خورده.' } },
      { id: 'cursor-ultra-1m', label: 'Ultra — یک ماهه', price: 9_800_000, usd: 200, stock: 3, guide: { fit: 'برای کار سنگین و تیمی.', detail: 'بالاترین سقف، بدون نگرانی از تمام شدنِ درخواست‌ها. اگر روزانه ساعت‌ها با مدل‌های بزرگ کار می‌کنی یا کدبیسِ بزرگی داری، این پلن برای همان ساخته شده.' } },
    ],
    media: { thumbnail: '/products/cursor-pro-card.webp', logo: '/brand/logos/cursor.png', cover: '/products/cursor-pro.webp', accent: '#a855f7' },
    shortDescription: 'اکانت آماده، تحویل فوری',
    description:
      'کرسر یک ویرایشگر کد است که مدل زبانی را مثل هم‌تیمی داخل خودش دارد. نسخه‌ی رایگان سقف درخواست دارد و همان جایی تمام می‌شود که تازه داری روی یک باگ سخت جلو می‌روی.\n\nنسخه‌ی پرو سقف تکمیل‌های هوشمند را برمی‌دارد، به مدل‌های قوی‌تر وصل می‌شود و حالت عامل را می‌دهد که می‌تواند چند فایل را با هم بخواند و تغییر بدهد. برای پروژه‌های بزرگ، همین خواندنِ هم‌زمانِ چند فایل تفاوت اصلی است.\n\nاین محصول از انبار تحویل می‌شود، پس بلافاصله بعد از پرداخت اطلاعات دستت است. گارانتی تمام دوره دارد و اگر حساب وسط راه مشکلی پیدا کرد، جایگزینش می‌کنیم.',
    features: [
      'اکانت آماده و کاملاً شخصی',
      'درک کل پروژه، نه فقط فایل باز',
      'ویرایش چندفایلی با یک دستور',
      'تحویل فوری پس از پرداخت',
    ],
    rating: 4.9,
    reviewsCount: 74,
    salesCount: 260,
    badges: ['new', 'hot'],
    faq: [
      { q: 'چه فرقی با ChatGPT دارد؟', a: 'Cursor یک ادیتور کد است، نه چت. فایل‌های پروژه‌تان را می‌خواند و مستقیم ویرایش می‌کند، پس دیگر لازم نیست کد را کپی و پیست کنید.' },
      { q: 'روی چه سیستم‌عامل‌هایی نصب می‌شود؟', a: 'ویندوز، مک و لینوکس. اکانت روی هر سه یکی است.' },
      { q: 'تفاوت Pro و Ultra چیست؟', a: 'سقف درخواست‌های ماهانه. اگر تمام‌وقت کد می‌زنید و به سقف Pro می‌خورید، Pro+ یا Ultra را بگیرید.' },
    ],
  },

  /* ⚠ چهار محصولِ زیر مبلغِ دلاری‌شان از صفحه‌ی رسمیِ خودِ سرویس
     خوانده شده و حاشیه‌ی فروشِ ما رویشان اعمال نشده.

     تومانِ نوشته‌شده فقط پشتیبانِ فهرست‌هاست؛ چیزی که کاربر
     می‌بیند از ‎usd × نرخِ روز‎ حساب می‌شود، پس با بالا و پایین
     شدنِ دلار خودش تازه می‌شود. */
  {
    id: 'grok',
    tags: ['private-account', 'instant', 'writing', 'research', 'image-gen', 'web', 'mobile', 'new-release'],
    slug: 'grok',
    title: 'گراک',
    englishTitle: 'SuperGrok',
    brand: 'xAI',
    platforms: ['Web', 'iOS', 'Android'],
    category: 'ai',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'تا چند ساعت پس از پرداخت',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    /* ⚠ این دو عدد از صفحه‌ی رسمی نیامده.
       ایکس‌ای‌آی قیمتِ اشتراک را روی x.ai و grok.com بیرونِ حساب
       کاربری نشان نمی‌دهد. سی و سیصد دلار عددی است که همه‌ی
       منابع می‌گویند، ولی تا وقتی از داخلِ حساب تأیید نشده،
       قطعی‌اش ندان. */
    variants: [
      { id: 'grok-super-1m', label: 'SuperGrok — یک ماهه', price: 6_800_000, usd: 30, usdMargin: 1, stock: null, isDefault: true,
        guide: { fit: 'برای استفاده‌ی روزمره، بدون خوردن به سقف.', detail: 'سقفِ بالاترِ گفتگو، دسترسی زودتر به مدل‌های تازه، و حالتِ چندعاملی که سوالِ سخت را بین چند عامل تقسیم می‌کند.' } },
      { id: 'grok-heavy-1m', label: 'SuperGrok Heavy — یک ماهه', price: 67_950_000, usd: 300, usdMargin: 1, stock: null,
        guide: { fit: 'برای کارِ پژوهشیِ سنگین.', detail: 'بالاترین سقف و کاملِ مدل‌های Heavy. مالِ کسی است که ساعت‌ها با پرسش‌های پیچیده کار می‌کند؛ برای استفاده‌ی معمولی زیاد است.' } },
    ],
    media: { thumbnail: '/products/grok-card.webp', logo: '/brand/logos/grok.svg', accent: '#17171a' },
    shortDescription: 'وصل به جریانِ زنده‌ی ایکس',
    description:
      'گراک چیزی دارد که بقیه‌ی دستیارها ندارند: به جریانِ زنده‌ی ایکس وصل است. یعنی وقتی می‌پرسی همین حالا چه خبر است، جوابش از پست‌هایی می‌آید که دارند همین لحظه نوشته می‌شوند، نه از داده‌ای که ماه‌ها پیش آموزش دیده.\n\nنسخه‌ی رایگان سقفِ کمی دارد و همان‌جا تمام می‌شود که تازه داری وارد بحث می‌شوی. با اشتراک، سقف بالا می‌رود، حالتِ چندعاملی باز می‌شود — چند عامل موازی روی یک سوال کار می‌کنند و هرکدام استدلالش را نشان می‌دهد — و ساختِ تصویر و ویدیوی کوتاه هم فعال می‌شود.\n\nاشتراک روی حساب خودت فعال می‌شود. ایمیلِ حسابت را می‌گیریم و رمزت را نمی‌خواهیم.',
    features: [
      'پاسخ با دادهٔ همین لحظه‌ی ایکس',
      'حالتِ چندعاملی برای سوال‌های سخت',
      'ساخت تصویر و ویدیوی کوتاه',
      'روی حساب خودت فعال می‌شود',
    ],
    faq: [
      { q: 'با ChatGPT چه فرقی دارد؟',
        a: 'گراک به ایکس وصل است، پس برای خبر و بحثِ داغِ همین ساعت بهتر جواب می‌دهد. برای نوشتن و کارِ عمومی، ChatGPT پخته‌تر است.' },
      { q: 'حساب ایکس لازم دارم؟',
        a: 'نه. با ایمیل هم می‌شود وارد گراک شد. اگر حساب ایکس داری، همان هم کار می‌کند.' },
      { q: 'تفاوت SuperGrok و Heavy چیست؟',
        a: 'سقفِ استفاده و عمقِ استدلال. Heavy چند برابر گران‌تر است و برای کارِ پژوهشیِ تمام‌وقت ساخته شده؛ برای استفاده‌ی معمولی SuperGrok کافی است.' },
    ],
    rating: 4.6,
    reviewsCount: 0,
    salesCount: 0,
    badges: ['new'],
  },
  {
    id: 'leonardo',
    tags: ['private-account', 'instant', 'image-gen', 'design', 'web'],
    slug: 'leonardo',
    title: 'لئوناردو',
    englishTitle: 'Leonardo.Ai',
    brand: 'Leonardo.Ai',
    platforms: ['Web'],
    category: 'ai',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'تا چند ساعت پس از پرداخت',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    /* نام‌های Apprentice و Artisan و Maestro کهنه‌اند و فقط در
       مقایسه‌های بیرونی مانده‌اند. این‌ها از leonardo.ai/pricing. */
    variants: [
      { id: 'leonardo-essential-1m', label: 'Essential — یک ماهه', price: 2_720_000, usd: 12, usdMargin: 1, stock: null, isDefault: true,
        guide: { fit: 'برای کارِ روزانه‌ی یک نفر.', detail: 'هشت‌هزار و پانصد توکنِ سریع در ماه، تصویرهای خصوصی، و ده مدلِ اختصاصیِ خودت. برای کسی که هفته‌ای چند بار تصویر می‌سازد کافی است.' } },
      { id: 'leonardo-premium-1m', label: 'Premium — یک ماهه', price: 6_800_000, usd: 30, usdMargin: 1, stock: null,
        guide: { fit: 'وقتی تصویر بخشی از کارِ حرفه‌ای‌ات است.', detail: 'بیست‌وپنج‌هزار توکن در ماه و ساختِ تصویرِ بی‌نهایت با سرعتِ آرام روی مدل‌های منتخب — یعنی دیگر نگرانِ تمام شدنِ توکن نیستی.' } },
      { id: 'leonardo-ultimate-1m', label: 'Ultimate — یک ماهه', price: 13_590_000, usd: 60, usdMargin: 1, stock: null,
        guide: { fit: 'برای تولیدکننده‌ی محتوا و کسب‌وکارِ کوچک.', detail: 'شصت‌هزار توکن، پنجاه مدلِ اختصاصی، شش ساختِ هم‌زمان، و ویدیوی بی‌نهایت با سرعتِ آرام. مالِ کسی است که روزانه خروجی می‌دهد.' } },
    ],
    media: { thumbnail: '/products/leonardo-card.webp', logo: '/brand/logos/leonardo.png', accent: '#7c3aed' },
    shortDescription: 'یک سبک را قفل کن، ده‌ها تصویر بگیر',
    description:
      'لئوناردو برای کارِ تکراری ساخته شده. بیشترِ ابزارهای تصویرسازی هر بار یک حال‌وهوای تازه می‌دهند؛ این‌جا می‌توانی یک سبک را قفل کنی و ده‌ها تصویر با همان لحن بگیری — دقیقاً چیزی که برندی که باید تصویرهایش شبیه هم باشند لازم دارد.\n\nمی‌توانی چند نمونه بدهی و مدلِ اختصاصیِ خودت را آموزش بدهی تا همان‌طور بکشد. ویرایشِ روی بوم هم هست: تکه‌ای از تصویر را انتخاب می‌کنی و فقط همان عوض می‌شود، نه کلِ کادر.\n\nاشتراک روی حسابِ خودت فعال می‌شود، پس تصویرها و مدل‌های قبلی‌ات سر جایشان می‌مانند.',
    features: [
      'قفل کردنِ یک سبک روی ده‌ها تصویر',
      'آموزشِ مدلِ اختصاصی از روی نمونه‌های خودت',
      'ویرایشِ بخشی از تصویر روی بوم',
      'تصویرهای خصوصی، نه عمومی',
    ],
    faq: [
      { q: 'توکن یعنی چه؟',
        a: 'هر ساخت به اندازه‌ی اندازه و کیفیتش توکن مصرف می‌کند. توکن‌های سریع ماهانه تازه می‌شوند و بانکِ توکن هم جدا انباشته می‌شود.' },
      { q: 'با میدجرنی چه فرقی دارد؟',
        a: 'میدجرنی خروجیِ هنری‌تری می‌دهد. لئوناردو وقتی جلو می‌افتد که بخواهی خروجی‌ها شبیه هم باشند یا مدلِ خودت را آموزش بدهی.' },
      { q: 'ویدیو هم می‌سازد؟',
        a: 'بله، ولی روی پلن Essential باز نیست. از Premium به بالا فعال می‌شود.' },
    ],
    rating: 4.7,
    reviewsCount: 0,
    salesCount: 0,
    badges: ['new'],
  },
  {
    id: 'firefly',
    tags: ['private-account', 'instant', 'image-gen', 'design', 'video-editing', 'web'],
    slug: 'firefly',
    title: 'ادوبی فایرفلای',
    englishTitle: 'Adobe Firefly',
    brand: 'Adobe',
    platforms: ['Web', 'Desktop'],
    category: 'ai',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'تا چند ساعت پس از پرداخت',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'firefly-standard-1m', label: 'Standard — یک ماهه', price: 2_260_000, usd: 9.99, usdMargin: 1, stock: null, isDefault: true,
        guide: { fit: 'برای کسی که گاهی داخل فتوشاپ لازمش دارد.', detail: 'دو هزار اعتبارِ ماهانه. ساختِ تصویرِ استاندارد بی‌حساب است و اعتبار فقط برای کارهای سنگین‌تر مثل ویدیو خرج می‌شود.' } },
      { id: 'firefly-pro-1m', label: 'Pro — یک ماهه', price: 4_530_000, usd: 19.99, usdMargin: 1, stock: null,
        guide: { fit: 'برای طراحی که هر روز با ادوبی کار می‌کند.', detail: 'چهار هزار اعتبار در ماه. برای کسی که پرکردنِ هوشمند و گسترشِ کادر بخشی از کارِ روزانه‌اش است.' } },
      { id: 'firefly-proplus-1m', label: 'Pro Plus — یک ماهه', price: 11_320_000, usd: 49.99, usdMargin: 1, stock: null,
        guide: { fit: 'وقتی ویدیو هم وارد کار می‌شود.', detail: 'ده هزار اعتبار در ماه. ویدیو و ترجمه‌ی صدا اعتبارِ زیادی می‌خورند؛ این پلن برای همان ساخته شده.' } },
    ],
    media: { thumbnail: '/products/firefly-card.webp', logo: '/brand/logos/firefly.svg', accent: '#d0021b' },
    shortDescription: 'داخل فتوشاپ و ایلوستریتور، نه سایتِ جدا',
    description:
      'فرقِ فایرفلای با بقیه این است که جای دیگری نمی‌بردت. پرکردنِ هوشمند و گسترشِ کادر همان‌جا داخل فتوشاپ انجام می‌شود، و در ایلوستریتور طرحِ برداری می‌سازد که بعداً قابلِ ویرایش است — نه یک تصویرِ صاف که فقط می‌شود نگاهش کرد.\n\nتغییر رنگِ دسته‌ای هم هست: یک طرح را می‌دهی و ده ترکیبِ رنگیِ دیگرش را می‌گیری. برای کسی که باید یک کمپین را در چند رنگ ببیند، همین یک قابلیت وقتِ زیادی می‌خرد.\n\nاعتبارِ ماهانه فقط برای کارهای سنگین خرج می‌شود؛ ساختِ تصویرِ استاندارد در همه‌ی پلن‌های پولی بی‌حساب است.',
    features: [
      'پرکردنِ هوشمند و گسترشِ کادر در فتوشاپ',
      'وکتورِ قابلِ ویرایش در ایلوستریتور',
      'تغییر رنگِ دسته‌ای یک طرح',
      'ساختِ تصویرِ استاندارد بدونِ مصرفِ اعتبار',
    ],
    faq: [
      { q: 'با اشتراکِ کاملِ Creative Cloud فرق دارد؟',
        a: 'بله. این پلن فقط فایرفلای است. اگر خودِ فتوشاپ و ایلوستریتور را نداری، این اشتراک آن‌ها را نمی‌آورد.' },
      { q: 'اعتبار ماهانه یعنی چه؟',
        a: 'کارهای سنگین مثل ساختِ ویدیو یا ترجمه‌ی صدا از اعتبار کم می‌کنند. ساختِ تصویرِ معمولی اعتبار نمی‌خورد.' },
      { q: 'خروجی‌اش برای کارِ تجاری مشکل ندارد؟',
        a: 'ادوبی می‌گوید مدلش روی محتوای دارای مجوز آموزش دیده و خروجی‌اش برای استفاده‌ی تجاری در نظر گرفته شده.' },
    ],
    rating: 4.5,
    reviewsCount: 0,
    salesCount: 0,
    badges: ['new'],
  },
  {
    id: 'copilot',
    tags: ['private-account', 'instant', 'coding', 'pc', 'web'],
    slug: 'copilot',
    title: 'گیت‌هاب کوپایلت',
    englishTitle: 'GitHub Copilot',
    brand: 'GitHub',
    platforms: ['Windows', 'macOS', 'Linux'],
    category: 'ai',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [
      { key: 'githubUsername', label: 'یوزرنیم گیت‌هابت', type: 'text',
        example: 'octocat',
        hint: 'اشتراک روی همین حساب فعال می‌شود؛ رمزت را نمی‌خواهیم.' },
    ],
    deliveryEstimate: 'تا چند ساعت پس از پرداخت',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'copilot-pro-1m', label: 'Pro — یک ماهه', price: 2_270_000, usd: 10, usdMargin: 1, stock: null, isDefault: true,
        guide: { fit: 'برای کدنویسیِ روزمره.', detail: 'تکمیلِ خودکار بدونِ سقف و حالتِ عامل داخلِ ویرایشگر. اگر تازه از نسخه‌ی رایگان می‌آیی، همین را بگیر.' } },
      { id: 'copilot-proplus-1m', label: 'Pro+ — یک ماهه', price: 8_830_000, usd: 39, usdMargin: 1, stock: null,
        guide: { fit: 'وقتی به مدل‌های گران‌ترِ داخلِ کوپایلت نیاز داری.', detail: 'سهمیه‌ی چند برابریِ درخواست‌های پریمیوم و دسترسی به مدل‌هایی که در Pro محدودند.' } },
      { id: 'copilot-max-1m', label: 'Max — یک ماهه', price: 22_650_000, usd: 100, usdMargin: 1, stock: null,
        guide: { fit: 'برای کارِ تمام‌وقت با عامل‌ها.', detail: 'بیشترین سهمیه، برای کسی که روزانه ساعت‌ها کارِ سنگین به عاملِ کوپایلت می‌سپارد.' } },
    ],
    media: { thumbnail: '/products/copilot-card.webp', logo: '/brand/logos/copilot.svg', accent: '#6e40c9' },
    shortDescription: 'داخل VS Code، روی حساب گیت‌هاب خودت',
    description:
      'کوپایلت داخلِ همان ویرایشگری می‌نشیند که با آن کار می‌کنی — VS Code، ویژوال استودیو، جت‌برینز — و خطِ بعدی را پیش از تایپ پیشنهاد می‌دهد. برای کارِ روزمره همین تکمیلِ خودکار بیشترِ ارزشش است.\n\nحالتِ چت و عامل هم هست: می‌توانی داخلِ ویرایشگر سوال بپرسی یا کاری را به عامل بسپاری تا خودش چند فایل را بخواند و تغییر بدهد. نوشتنِ تست هم کارِ خوبی است که ازش برمی‌آید — تابع را می‌بیند و تستش را می‌نویسد.\n\nاشتراک روی حسابِ گیت‌هابِ خودت فعال می‌شود؛ فقط یوزرنیم را می‌گیریم و رمزت را نمی‌خواهیم.',
    features: [
      'تکمیلِ خودکار داخلِ ویرایشگر',
      'چت و حالتِ عامل روی پروژه',
      'نوشتنِ تست از روی تابع',
      'روی حساب گیت‌هاب خودت',
    ],
    faq: [
      { q: 'با کرسر چه فرقی دارد؟',
        a: 'کرسر خودش یک ویرایشگرِ کامل است. کوپایلت افزونه‌ای است که داخلِ ویرایشگرِ فعلی‌ات می‌آید — اگر نمی‌خواهی ادیتورت را عوض کنی، این بهتر است.' },
      { q: 'روی چه ویرایشگرهایی کار می‌کند؟',
        a: 'VS Code، ویژوال استودیو، ویرایشگرهای جت‌برینز، Neovim و خودِ سایت گیت‌هاب.' },
      { q: 'دانشجو هستم، رایگان نمی‌شود؟',
        a: 'گیت‌هاب برای دانشجوها و نگه‌دارنده‌های پروژه‌های متن‌باز پلنِ رایگان دارد. اگر شرایطش را داری، اول آن را امتحان کن.' },
    ],
    rating: 4.6,
    reviewsCount: 0,
    salesCount: 0,
    badges: ['new'],
  },

  /* ===================== طراحی و ادیت ===================== */
  {
    id: 'canva-pro',
    tags: ['upgrade-on-account', 'instant', 'design', 'video-editing', 'web', 'mobile', 'budget', 'bestseller'],
    slug: 'canva-pro',
    title: 'کنوا پرو',
    englishTitle: 'Canva Pro',
    brand: 'Canva',
    platforms: ['Web', 'iOS', 'Android'],
    category: 'creative',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'canva-pro-12m', label: 'یک ساله', price: 205000, usd: 120, stock: null, isDefault: true, guide: { fit: 'یک سال، روی ایمیل خودت.', detail: 'همه‌ی قالب‌ها و عکس‌های پریمیوم، حذف پس‌زمینه، و کیت برند. خروجی بدون واترمارک. دوره‌ی سالانه است چون ماهانه‌اش عملاً صرف نمی‌کند.' } },
    ],
    media: { thumbnail: '/products/canva-pro-card.webp', logo: '/brand/logos/canva.svg', cover: '/products/canva-pro.webp', accent: '#00c4cc' },
    shortDescription: 'یک سال کامل، روی ایمیل شخصی خودت',
    description:
      'نسخه‌ی رایگان کنوا برای یک پست ساده کافی است، ولی همین که کار جدی شود دیوارها پیدا می‌شوند: بیشتر قالب‌ها و عکس‌ها قفل‌اند، حذف پس‌زمینه نیست، و نمی‌توانی رنگ و فونت برند را ذخیره کنی.\n\nبا نسخه‌ی پرو بیش از صد میلیون عکس و ویدیو و قالب باز می‌شود، حذف پس‌زمینه با یک کلیک انجام می‌شود، کیت برند می‌سازی تا رنگ و فونتت همیشه یکی بماند، و یک ترابایت فضای ابری می‌گیری. تغییر اندازه‌ی خودکار هم هست: یک طرح را به پست، استوری و کاور تبدیل می‌کند.\n\nاشتراک روی حساب خودت فعال می‌شود، پس طرح‌های قبلی‌ات همان‌جا می‌مانند. اگر تیمی کار می‌کنی، پلن تیمی هم داریم که همه‌ی اعضا زیر یک کیت برند می‌آیند.',
    features: [
      'بیش از صد میلیون عکس و عنصر پریمیوم',
      'حذف پس‌زمینه با یک کلیک',
      'کیت برند و تغییر اندازه‌ی خودکار',
      'صد گیگابایت فضای ابری',
    ],
    rating: 4.8,
    reviewsCount: 530,
    salesCount: 2410,
    badges: ['bestseller'],
    faq: [
      { q: 'روی حساب خودم فعال می‌شود؟', a: 'بله. فقط ایمیل حساب Canva‌ات را می‌گیریم و دسترسی Pro روی همان فعال می‌شود.' },
      { q: 'طرح‌هایی که قبلاً ساخته‌ام چه می‌شوند؟', a: 'همه سر جایشان می‌مانند و بعد از ارتقا، امکانات Pro رویشان فعال می‌شود.' },
      { q: 'بعد از پایان یک سال چه اتفاقی می‌افتد؟', a: 'حساب به نسخه‌ی رایگان برمی‌گردد. طرح‌هایتان پاک نمی‌شوند، فقط امکانات Pro غیرفعال می‌شود.' },
    ],
  },
  {
    id: 'capcut-pro',
    tags: ['upgrade-on-account', 'instant', 'video-editing', 'design', 'mobile', 'pc'],
    slug: 'capcut-pro',
    title: 'کپ‌کات پرو',
    englishTitle: 'CapCut Pro',
    brand: 'CapCut',
    platforms: ['Web', 'iOS', 'Android'],
    category: 'creative',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'capcut-pro-1m', label: 'یک ماهه', price: 1208000, usd: 20, stock: null, isDefault: true, guide: { fit: 'ماهانه، برای تدوین بدون واترمارک.', detail: 'افکت‌ها و قالب‌های پریمیوم و خروجی تمیز. روی حساب خودت فعال می‌شود، پس پروژه‌های قبلی‌ات سر جایشان می‌مانند.' } },
    ],
    media: { thumbnail: '/products/capcut-pro-card.webp', logo: '/brand/logos/capcut.svg', cover: '/products/capcut-pro.webp', accent: '#000000' },
    shortDescription: 'ادیت ویدیو حرفه‌ای بدون واترمارک',
    description:
      'کپ‌کات رایگان ویدیو را واترمارک می‌کند، خروجی را محدود می‌کند و بهترین افکت‌ها و صداهایش قفل‌اند. برای کسی که محتوا تولید می‌کند، همین واترمارک یعنی کار قابل انتشار نیست.\n\nنسخه‌ی پرو واترمارک را برمی‌دارد، خروجی چهارکی می‌دهد، و کتابخانه‌ی کامل افکت، ترنزیشن، فیلتر و موسیقی بدون کپی‌رایت را باز می‌کند. ابزارهای هوشمندش هم فعال می‌شوند: حذف پس‌زمینه بدون پرده‌ی سبز، زیرنویس خودکار فارسی و انگلیسی، و بازسازی کیفیت ویدیوهای قدیمی.\n\nهم روی موبایل و هم روی دسکتاپ با همان یک اشتراک کار می‌کند و پروژه‌ها بینشان همگام می‌شوند. فعال‌سازی روی حساب خودت انجام می‌شود و پروژه‌های فعلی‌ات دست‌نخورده می‌مانند.',
    features: [
      'خروجی 4K بدون واترمارک',
      'تمام افکت‌ها و ترنزیشن‌های پریمیوم',
      'حذف پس‌زمینه و ردیابی حرکت',
      'همگام‌سازی بین موبایل و دسکتاپ',
    ],
    rating: 4.7,
    reviewsCount: 289,
    salesCount: 1150,
    badges: ['hot'],
    faq: [
      { q: 'روی موبایل هم کار می‌کند؟', a: 'بله. اشتراک روی حساب شماست، پس روی موبایل و دسکتاپ هر دو فعال است.' },
      { q: 'واترمارک برداشته می‌شود؟', a: 'بله، خروجی بدون واترمارک و با کیفیت بالاتر گرفته می‌شود.' },
      { q: 'پروژه‌های نیمه‌تمامم می‌مانند؟', a: 'بله، هیچ پروژه‌ای با ارتقا از بین نمی‌رود.' },
    ],
  },
  {
    id: 'figma',
    tags: ['upgrade-on-account', 'instant', 'ui-design', 'design', 'web', 'pc'],
    slug: 'figma-professional',
    title: 'فیگما',
    englishTitle: 'Figma Professional',
    brand: 'Figma',
    platforms: ['Web', 'Desktop'],
    category: 'creative',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'figma-12m', label: 'یک ساله', price: 2787000, usd: 180, stock: null, isDefault: true, guide: { fit: 'یک سال دسترسی حرفه‌ای.', detail: 'فایل‌های نامحدود، تاریخچه‌ی کامل نسخه‌ها، و کامپوننت‌های اشتراکی. برای کسی که فیگما ابزار کارش است نه جای تماشای طرح دیگران.' } },
    ],
    media: { thumbnail: '/products/figma-card.webp', logo: '/brand/logos/figma.svg', cover: '/products/figma-card.webp', accent: '#a259ff' },
    shortDescription: 'پلن حرفه‌ای، یک سال کامل',
    description:
      'پلن رایگان فیگما برای تمرین خوب است، ولی سه فایل و سه صفحه زود پر می‌شود. بدتر از آن، تاریخچه‌ی نسخه‌ها فقط سی روز می‌ماند — یعنی طرحِ سه ماه پیش دیگر قابل بازیابی نیست.\n\nپلن پروفشنال فایل و پروژه‌ی نامحدود می‌دهد، تاریخچه‌ی کامل نسخه‌ها را نگه می‌دارد، کتابخانه‌ی کامپوننت مشترک بین پروژه‌ها می‌سازد و اجازه‌ی دسترسی دقیق برای هر عضو تیم می‌دهد. پروتوتایپ‌های پیشرفته و مهمانِ فقط‌خواندنی هم اینجاست.\n\nبرای تیم‌های ایرانی مشکل همیشه پرداخت دلاری بوده. ما پلن را روی حساب خودت یا تیمت فعال می‌کنیم، با پرداخت ریالی و گارانتی تمام دوره.',
    features: [
      'فایل و پروژه‌ی نامحدود',
      'تاریخچه‌ی نامحدود نسخه‌ها',
      'کتابخانه‌ی کامپوننت و استایل اشتراکی',
      'دسترسی توسعه‌دهنده و Dev Mode',
    ],
    rating: 4.9,
    reviewsCount: 141,
    salesCount: 480,
    badges: ['new'],
    faq: [
      { q: 'برای تیم است یا تک‌نفره؟', a: 'روی حساب شخصی خودتان فعال می‌شود. اگر فایل را با تیم به اشتراک بگذارید، امکانات پولی روی همان فایل کار می‌کنند.' },
      { q: 'فایل‌های قبلی‌ام دست‌نخورده می‌مانند؟', a: 'بله. ارتقا فقط سطح دسترسی را بالا می‌برد و به محتوای فایل‌ها کاری ندارد.' },
      { q: 'نسخه‌ی دسکتاپ هم فعال می‌شود؟', a: 'بله، اشتراک به حساب وصل است نه به یک برنامه‌ی خاص.' },
    ],
  },

  /* ===================== شبکه‌های اجتماعی ===================== */
  {
    id: 'telegram-premium',
    tags: ['upgrade-on-account', 'instant', 'messaging', 'mobile', 'web', 'bestseller'],
    slug: 'telegram-premium',
    title: 'تلگرام پریمیوم',
    englishTitle: 'Telegram Premium',
    brand: 'Telegram',
    platforms: ['iOS', 'Android', 'Desktop'],
    category: 'social',
    fulfillment: 'api_topup',
    requiredInputs: [INPUT_TELEGRAM],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'tg-3m', label: 'سه ماهه', price: 2695000, usd: 14, stock: null, isDefault: true, guide: { fit: 'کوتاه‌ترین دوره — برای امتحان کردن.', detail: 'همه‌ی امکانات پرمیوم برای سه ماه: آپلود چهار گیگابایتی، دانلود سریع‌تر، و بدون تبلیغ. اگر مطمئن نیستی به کارت می‌آید، از این شروع کن.' } },
      { id: 'tg-6m', label: 'شش ماهه', price: 3625000, usd: 20, stock: null, guide: { fit: 'تعادلِ قیمت و مدت.', detail: 'همان امکانات، شش ماه، با هزینه‌ی ماهانه‌ی کمتر از سه‌ماهه.' } },
      { id: 'tg-12m', label: 'یک ساله', price: 6506000, usd: 36, stock: null, guide: { fit: 'ارزان‌ترین حالت به ازای هر ماه.', detail: 'یک سال کامل. اگر تلگرام را روزانه استفاده می‌کنی، این پلن کمترین هزینه‌ی ماهانه را دارد.' } },
    ],
    media: { thumbnail: '/products/telegram-premium-card.webp', logo: '/brand/logos/telegram.svg', cover: '/products/telegram-premium-card.webp', accent: '#2aabee' },
    shortDescription: 'فعال‌سازی خودکار روی یوزرنیمت',
    description:
      'تلگرام پریمیوم بیشتر از یک تیک است. سقف فایل دو برابر می‌شود، دانلود بدون محدودیت سرعت انجام می‌گیرد، و می‌توانی تا هزار کانال و بیست پوشه داشته باشی — چیزی که برای کسی که با تلگرام کار می‌کند تفاوت روزمره است.\n\nبه‌علاوه استیکر و ایموجی متحرک اختصاصی، ترجمه‌ی کامل چت، تبدیل صوت به متن، پروفایل ویدیویی، و امکان مخفی کردن تبلیغات کانال‌ها. حساب هم یک نشان می‌گیرد که در گروه‌ها بالاتر دیده می‌شود.\n\nفعال‌سازی مستقیم روی یوزرنیم خودت انجام می‌شود — نه رمز می‌خواهیم نه کد ورود. فقط یوزرنیم را می‌دهی و اشتراک روی همان حساب می‌نشیند.',
    features: [
      'بدون نیاز به رمز عبور یا ورود به حساب',
      'آپلود فایل تا چهار گیگابایت',
      'دانلود پرسرعت و بدون تبلیغات',
      'استیکر، ایموجی و آواتار ویژه',
    ],
    notes: ['حسابت باید یوزرنیم عمومی داشته باشد.'],
    rating: 4.9,
    reviewsCount: 1204,
    salesCount: 5830,
    badges: ['bestseller', 'hot'],
    faq: [
      { q: 'یوزرنیم لازم است یا شماره؟', a: 'یوزرنیم. اگر یوزرنیم ندارید، در تنظیمات تلگرام یکی بسازید و همان را وارد کنید.' },
      { q: 'باید کد ورود بدهم؟', a: 'نه، هیچ‌وقت. فعال‌سازی از بیرون و روی یوزرنیم انجام می‌شود؛ ما به حسابت وارد نمی‌شویم.' },
      { q: 'اگر یوزرنیمم را عوض کنم چه؟', a: 'اشتراک روی حساب ثبت می‌شود نه روی نام، پس تغییر یوزرنیم مشکلی ایجاد نمی‌کند.' },
    ],
  },

  /* ===================== آموزشی ===================== */
  {
    id: 'duolingo-super',
    tags: ['upgrade-on-account', 'instant', 'language-learning', 'mobile', 'web', 'budget'],
    slug: 'duolingo-super',
    title: 'دولینگو سوپر',
    englishTitle: 'Duolingo Super',
    brand: 'Duolingo',
    platforms: ['Web', 'iOS', 'Android'],
    category: 'education',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'duolingo-5m', label: 'پنج ماهه', price: 837000, usd: 42, stock: null, isDefault: true, guide: { fit: 'پنج ماه، بدون تبلیغ و با اشتباه نامحدود.', detail: 'درس‌ها بدون وقفه‌ی تبلیغاتی پیش می‌روند و اگر اشتباه کنی روزت از دست نمی‌رود. برای کسی که می‌خواهد زنجیره‌اش را نگه دارد، همین دو مورد بیشترین فرق را می‌سازد.' } },
    ],
    media: { thumbnail: '/products/duolingo-super-card.webp', logo: '/brand/logos/duolingo.svg', cover: '/products/duolingo-super.webp', accent: '#58cc02' },
    shortDescription: 'یادگیری زبان بدون تبلیغات',
    description:
      'نسخه‌ی رایگان دولینگو با جان کار می‌کند: پنج اشتباه که کردی، درس قطع می‌شود و باید منتظر بمانی. برای کسی که جدی دنبال زبان است، همین وقفه‌ها بزرگ‌ترین دلیل رها کردن‌اند.\n\nسوپر جان‌ها را نامحدود می‌کند، تبلیغ‌ها را برمی‌دارد، تمرین اشتباهات شخصی‌سازی‌شده می‌دهد و اجازه می‌دهد درس‌ها را آفلاین ذخیره کنی. آزمون تعیین سطح و تمرین بی‌نهایت هم باز می‌شود.\n\nروی همان حسابی فعال می‌شود که تا حالا با آن پیش رفته‌ای، پس پیشرفت و زنجیره‌ی روزهایت دست‌نخورده می‌ماند. اگر روی چند دستگاه استفاده می‌کنی، همه‌جا هم‌زمان فعال است.',
    features: [
      'بدون تبلیغات',
      'جان نامحدود',
      'تمرین هدفمند اشتباهات',
      'آزمون تعیین سطح نامحدود',
    ],
    rating: 4.8,
    reviewsCount: 96,
    salesCount: 340,
    badges: ['new'],
    faq: [
      { q: 'پیشرفت فعلی‌ام می‌ماند؟', a: 'بله. ارتقا روی همان حساب انجام می‌شود و استریک و درس‌هایتان دست‌نخورده باقی می‌ماند.' },
      { q: 'محدودیت جان برداشته می‌شود؟', a: 'بله، با Super دیگر محدودیت جان ندارید و تبلیغ هم نمایش داده نمی‌شود.' },
      { q: 'روی چند دستگاه کار می‌کند؟', a: 'روی هر دستگاهی که با همان حساب وارد شوید.' },
    ],
  },

  {
    id: 'spotify-premium',
    tags: ['upgrade-on-account', 'instant', 'mobile', 'web', 'family-plan'],
    slug: 'spotify-premium',
    title: 'اسپاتیفای پریمیوم',
    englishTitle: 'Spotify Premium',
    brand: 'Spotify',
    platforms: ['Web', 'iOS', 'Android', 'Desktop'],
    category: 'social',
    fulfillment: 'upgrade_on_user',
    requiredInputs: [INPUT_EMAIL],
    deliveryEstimate: 'در اسرع وقت، توسط سیستم',
    warrantyLabel: 'گارانتی تمام دوره‌ی اشتراک',
    variants: [
      { id: 'spotify-individual-1m', label: 'اینفرادی — یک ماهه', price: 320_000, usd: 12, stock: null, isDefault: true, guide: { fit: 'تک‌نفره، ماهانه.', detail: 'روی حساب خودت فعال می‌شود، بدون تبلیغ و با دانلود آفلاین. کوتاه‌ترین تعهد.' } },
      { id: 'spotify-individual-3m', label: 'اینفرادی — سه ماهه', price: 850_000, usd: 36, compareAt: 960_000, stock: null, guide: { fit: 'تک‌نفره، سه ماهه.', detail: 'همان امکانات با هزینه‌ی ماهانه‌ی کمتر. برای کسی که می‌داند حداقل یک فصل استفاده می‌کند.' } },
      { id: 'spotify-individual-12m', label: 'اینفرادی — یک ساله', price: 2_950_000, usd: 144, compareAt: 3_840_000, stock: null, guide: { fit: 'تک‌نفره، یک ساله — کمترین هزینه‌ی ماهانه.', detail: 'یک سال کامل. اگر اسپاتیفای بخشی از روزت است، این پلن از همه به‌صرفه‌تر درمی‌آید.' } },
      { id: 'spotify-family-1m', label: 'فمیلی — یک ماهه', price: 520_000, usd: 20, stock: 14, guide: { fit: 'برای چند نفر، روی یک اشتراک.', detail: 'چند حساب جدا زیر یک اشتراک، هرکدام با کتابخانه و پیشنهادهای خودش. اگر بیش از یک نفر استفاده می‌کنید، از گرفتن چند اشتراک تک‌نفره ارزان‌تر است.' } },
    ],
    media: { thumbnail: '/products/spotify-premium-card.webp', logo: '/brand/logos/spotify.svg', cover: '/products/spotify-premium.webp', accent: '#1db954' },
    shortDescription: 'موسیقی بدون تبلیغ، روی حساب خودت',
    description:
      'اسپاتیفای رایگان بین آهنگ‌ها تبلیغ می‌گذارد، اجازه‌ی انتخاب آهنگ در موبایل نمی‌دهد و دانلود آفلاین ندارد. یعنی دقیقاً وقتی اینترنت نداری — در مترو، در سفر — موسیقی نداری.\n\nپریمیوم تبلیغ‌ها را برمی‌دارد، هر آهنگی را که بخواهی مستقیم پخش می‌کند، تا ده هزار آهنگ را برای پخش آفلاین ذخیره می‌کند و کیفیت صدا را تا ۳۲۰ کیلوبیت بالا می‌برد. پادکست‌های انحصاری و گروه‌های خانوادگی هم داخل همین اشتراک‌اند.\n\nپرداخت از ایران روی درگاه اسپاتیفای رد می‌شود. ما اشتراک را روی حساب خودت فعال می‌کنیم تا پلی‌لیست‌ها و تاریخچه‌ی شنیدنت بماند — چیزی که با ساختن حساب جدید از دست می‌رفت.',
    features: [
      'بدون تبلیغ، بدون وقفه بین آهنگ‌ها',
      'دانلود آفلاین روی پنج دستگاه',
      'کیفیت پخش تا ۳۲۰ کیلوبیت',
      'رد کردن نامحدود آهنگ',
      'پلی‌لیست‌ها و لایک‌های فعلی دست‌نخورده',
    ],
    notes: [
      'پلن فمیلی نیاز به آدرس مشترک بین اعضا دارد؛ راهنمایش را موقع تحویل می‌فرستیم.',
    ],
    rating: 4.9,
    reviewsCount: 214,
    salesCount: 620,
    badges: ['new', 'hot'],
    faq: [
      { q: 'پلی‌لیست‌هایم می‌ماند؟', a: 'بله. ارتقا روی همان حساب خودتان انجام می‌شود و پلی‌لیست‌ها، لایک‌ها و تاریخچه دست‌نخورده باقی می‌ماند.' },
      { q: 'رمز حسابم را باید بدهم؟', a: 'نه. فقط ایمیل حساب را می‌گیریم و ارتقا از سمت ما انجام می‌شود.' },
      { q: 'فمیلی برای چند نفر است؟', a: 'تا شش نفر. همه باید یک آدرس خانه‌ی مشترک ثبت کنند که راهنمایش را همراه تحویل می‌فرستیم.' },
      { q: 'بعد از پایان دوره چه می‌شود؟', a: 'حساب به حالت رایگان برمی‌گردد و چیزی پاک نمی‌شود. هر وقت خواستی دوباره تمدید کن.' },
    ],
  },

];

/** کاتالوگ کامل — اشتراک‌ها و بازی‌ها */
/* ============================================================
   منبعِ محصولات

   ⚠ داده‌ی دستی، پشتیبان است نه منبعِ اصلی.

   وقتی ووکامرس وصل شود، `npm run sync` کاتالوگ را می‌خواند و در
   generated/catalog.json می‌نویسد؛ از آن لحظه محصولات از آن‌جا
   می‌آیند و این فایل دست‌نخورده می‌ماند.

   چرا این‌طور و نه خواندنِ زنده در زمانِ اجرا: سایت خروجیِ ایستا
   دارد و سرور ندارد، پس کلیدِ ووکامرس هیچ‌جا نباید در مرورگر
   باشد. با همگام‌سازی در زمانِ بیلد، داده واقعی است و کلید فقط
   روی ماشینِ بیلد می‌ماند.

   اگر فایل خالی باشد — یعنی هنوز همگام نشده — همین داده‌ی دستی
   کار می‌کند و سایت بالا می‌ماند. هیچ حالتی نیست که فروشگاه خالی
   نشان داده شود.
   ============================================================ */

import GENERATED from './generated/catalog.json';

const SYNCED = GENERATED.products as unknown as Product[];

export const PRODUCTS: Product[] =
  SYNCED.length > 0 ? SYNCED : [...SUBSCRIPTIONS, ...GAMES, ...GIFT_CARDS];

/** از کجا آمده — برای نشان دادن در پنل و لاگِ بیلد */
export const CATALOG_SOURCE = SYNCED.length > 0 ? GENERATED.source : 'local';
export const CATALOG_SYNCED_AT = GENERATED.syncedAt;

/* ---------------------------------------------------------------
   کمکی‌ها
--------------------------------------------------------------- */

export const getProductsByCategory = (slug: CategorySlug) =>
  PRODUCTS.filter((p) => p.category === slug);

export const getProductBySlug = (slug: string) =>
  PRODUCTS.find((p) => p.slug === slug);

export const getDefaultVariant = (p: Product) =>
  p.variants.find((v) => v.isDefault) ?? p.variants[0];

/**
 * قیمتِ فروشِ یک پلن به تومان.
 *
 * ⚠ تنها جایی که دلار به تومان تبدیل می‌شود. همه‌جا از همین
 * بگذرد، وگرنه دوباره سه نسخه‌ی کمی متفاوت پیدا می‌کند.
 *
 * ⚠ شرط ‎usdMargin‎ است، نه ‎usd‎.
 *
 * داشتنِ مبلغِ دلاری به‌تنهایی یعنی «این سرویس در سایتِ خودش
 * چند است» — نه اینکه ما همان را می‌گیریم. فقط پلنی که صریحاً
 * ضریب دارد قیمتش از نرخِ روز می‌آید.
 */
export const variantToman = (
  v: Pick<Variant, 'price' | 'usd' | 'usdMargin'>,
  rate: number = DEFAULT_USD_RATE,
) => (v.usd && v.usdMargin !== undefined ? tomanFromUsd(v.usd * v.usdMargin, rate) : v.price);

/**
 * کمترین قیمتِ تومانیِ یک محصول.
 *
 * قبلاً فقط ‎v.price‎ خوانده می‌شد و برای محصولی که ذاتاً دلاری
 * است، آن عدد یک عکسِ لحظه‌ایِ کهنه بود — و برای هیگزفیلد که
 * ‎price: 0‎ داشت، «از ۰ تومان» روی کارت می‌نشست.
 *
 * نرخ این‌جا نرخِ لحظه‌ی بیلد است نه نرخِ زنده؛ برای فهرست‌ها و
 * مرتب‌سازی کافی است و صفحه‌ی محصول عددِ زنده را نشان می‌دهد.
 */
export const getLowestPrice = (p: Product) =>
  Math.min(...p.variants.map((v) => variantToman(v)));

export const getCategoryCount = (slug: CategorySlug) =>
  PRODUCTS.filter((p) => p.category === slug).length;

/** آیا این محصول قبل از پرداخت به ورودی مشتری نیاز دارد؟ */
export const needsCustomerInput = (p: Product) => p.requiredInputs.length > 0;
