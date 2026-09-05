/* ============================================================
   اسلایدهای هیرو

   هیرو ویترین معرفی است، نه قفسه‌ی فروش: قیمت و دکمه‌ی «افزودن به
   سبد» ندارد. کارش این است که در ثانیه‌ی اول بگوید اینجا چه چیزهایی
   هست و تازه‌ترین‌ها کدام‌اند، و کسی که دنبال همان است را جذب کند.
   خرید در سکشن‌های بعدی و صفحه‌ی محصول اتفاق می‌افتد.
   ============================================================ */

import type { SlideArtSpec } from '../components/home/SlideArt';

export type HeroKind = 'ai' | 'gaming' | 'creative' | 'social';

export interface HeroSlideData {
  id: string;
  /** برچسب دسته که بالای تیتر می‌نشیند */
  kind: HeroKind;
  kindLabel: string;
  /** نشان گوشه — «جدید»، «پرفروش»، «موجودی محدود» */
  badge?: string;
  /** خط اول تیتر — وزن معمولی */
  titleLead: string;
  /** خط دوم — روی گرادیانت فونیکس */
  titleAccent: string;
  englishTitle: string;
  kicker: string;
  description: string;
  /** سه نکته‌ی کوتاه — چیزی که خریدار واقعاً دنبالش است */
  highlights: string[];
  /** لایه ۱ — تصویر پس‌زمینه، ۱۶:۹ */
  backdrop: string;
  /**
   * نشانِ سرویس‌هایی که روی بنر می‌نشینند.
   *
   * تا حالا مربع‌های حرفی در خودِ تصویرِ PNG پخته شده بودند — یعنی
   * برای عوض کردن یکی‌شان باید کلِ بنر دوباره ساخته می‌شد، و در
   * حالت شب هم همان روشناییِ روز را داشتند.
   *
   * حالا شناسه‌اند و کامپوننت خودش نشان را می‌کشد: برداری، تیز در
   * هر اندازه، و هماهنگ با تم.
   */
  /** تصویرِ برداری — اگر باشد جای backdrop را می‌گیرد */
  art?: SlideArtSpec;
  /** لایه ۳ — PNG/WebP شفاف. نبودش هیرو را نمی‌شکند */
  cutout?: string;
  /** کاراکتر قدبلند است یا نشان‌واره‌ی پهن — اندازه و موشن‌شان فرق دارد */
  cutoutKind?: 'character' | 'wordmark';
  /** ته‌رنگ نور صحنه */
  tint: string;
  /** متن دکمه‌ی اصلی */
  ctaLabel: string;
  href: string;
  platforms: string[];
}

export const HERO_SLIDES: HeroSlideData[] = [
  {
    id: 'ai-claude',
    kind: 'ai',
    kindLabel: 'هوش مصنوعی',
    badge: 'جدید',
    titleLead: 'کلاد',
    titleAccent: 'پرو',
    englishTitle: 'Claude Pro · Anthropic',
    kicker: 'یک اکانت، اندازه‌ی یک تیم کار',
    description:
      'پروژه‌ی چندفایلی را کامل می‌فهمد و بازنویسی می‌کند. اگر تا حالا کارت را بین چند ابزار تقسیم می‌کردی، اینجا همه‌اش یک‌جا جمع می‌شود.',
    highlights: [
      'روی ایمیل خودت فعال می‌شود، نه اکانت مشترک',
      'رمز عبورت را هیچ‌وقت نمی‌خواهیم',
      'تا آخرین روز اشتراک پشتیبانی داری',
    ],
    backdrop: '/hero/banner/slide-ai-v2.png',
    tint: '#e8862e',
    ctaLabel: 'دیدن پلن‌ها',
    href: '/product/claude-pro',
    art: {
      card: '#6b21b6',
      label: ['Premium', 'Account'],
      tiles: [
        { id: 'gemini', bg: '#ffffff', ink: '#4285f4' },
        { id: 'claude', bg: '#d97757' },
        { id: 'openai', bg: '#10a37f' },
        { id: 'cursor', bg: '#17171a' },
      ],
    },
    platforms: ['Web', 'iOS', 'Android'],
  },
  {
    id: 'ai-gemini',
    kind: 'ai',
    kindLabel: 'هوش مصنوعی',
    badge: 'موجودی محدود',
    titleLead: 'جمنای',
    titleAccent: 'پرو',
    englishTitle: 'Gemini Pro · Google',
    kicker: 'هجده ماه، با قیمت چند ماه',
    description:
      'وقتی طرح رایگان گوگل تمام شد، این تنها راهی است که هنوز باز مانده. داخل Gmail و Docs هم کار می‌کند، نه فقط در یک تب جدا.',
    highlights: [
      'اختصاصی ۱۸ ماهه یا فمیلی ماهانه',
      'ادغام با Gmail، Docs و Drive',
      'فعال‌سازی زیر ۱۵ دقیقه',
    ],
    backdrop: '/hero/banner/slide-ai2-v2.png',
    tint: '#4a7cf7',
    ctaLabel: 'مقایسه‌ی پلن‌ها',
    href: '/ai',
    art: {
      card: '#a52344',
      label: ['AI', 'Subscriptions'],
      tiles: [
        { id: 'gemini', bg: '#4285f4' },
        { id: 'openai', bg: '#10a37f' },
        { id: 'midjourney', bg: '#17171a' },
        { id: 'claude', bg: '#ffffff', ink: '#d97757' },
      ],
    },
    platforms: ['Web', 'Android', 'iOS'],
  },
  {
    id: 'giftcard',
    kind: 'gaming',
    kindLabel: 'گیفت کارت',
    badge: 'تازه اضافه شد',
    titleLead: 'گیفت',
    titleAccent: 'کارت',
    englishTitle: 'PlayStation · Xbox · Steam · Apple',
    kicker: 'کد اورجینال، تحویل سیستمی',
    description:
      'شارژ استور و کیف پول، بدون کارت ارزی. کد را می‌گیری و خودت در حسابت وارد می‌کنی — اعتبار همان‌جا می‌نشیند و تاریخ انقضا هم ندارد.',
    highlights: [
      'پلی‌استیشن، ایکس‌باکس، استیم، اپل و گوگل پلی',
      'مبالغ ده تا صد دلاری',
      'تضمین سالم بودن کد',
    ],
    backdrop: '/hero/banner/slide-gift-v2.png',
    tint: '#ff9900',
    ctaLabel: 'دیدن گیفت کارت‌ها',
    href: '/giftcard',
    art: {
      card: '#b02fa8',
      label: ['Gift', 'Cards'],
      tiles: [
        { id: 'xbox', bg: '#107c10' },
        { id: 'playstation', bg: '#0b3f9e' },
        { id: 'gift', bg: '#ffffff', ink: '#b02fa8' },
        { id: 'steam', bg: '#17171a', ink: '#66c0f4' },
      ],
    },
    platforms: ['PS5', 'Xbox', 'PC', 'iOS'],
  },
  {
    id: 'gaming-bf6',
    kind: 'gaming',
    kindLabel: 'گیم',
    badge: 'جدید',
    titleLead: 'بتلفیلد',
    titleAccent: 'شش',
    englishTitle: 'Battlefield 6 · EA',
    kicker: 'از نبرد جدید جا نمان',
    description:
      'نقشه‌های بزرگ، ۶۴ بازیکن و تخریبی که ساختمان‌ها را واقعاً فرو می‌ریزد. اکانت روی کنسول خودت فعال می‌شود و بخش آنلاین کامل در اختیارت است.',
    highlights: ['اکانت قانونی', 'دسترسی کامل به آنلاین', 'گارانتی مادام‌العمر'],
    backdrop: '/hero/banner/slide-game-v2.png',
    tint: '#6ea8c7',
    ctaLabel: 'مشاهده‌ی محصول',
    href: '/product/battlefield-6',
    platforms: ['PS5', 'Xbox', 'PC'],
  },
  {
    id: 'ai-gemini-partner',
    kind: 'ai',
    kindLabel: 'هوش مصنوعی',
    badge: 'ظرفیت محدود',
    titleLead: 'پارتنر',
    titleAccent: 'جمنای پرو',
    englishTitle: 'Gemini Pro · Partner Program',
    kicker: 'دو نفر، نصف هزینه',
    description:
      'پلن فمیلی یعنی هزینه بین اعضا پخش می‌شود. اگر دوستی داری که او هم لازمش دارد، هر دوتان با کسری از قیمت اختصاصی دسترسی کامل می‌گیرید.',
    highlights: [
      'هزینه‌ی ماهانه به‌جای پرداخت یکجا',
      'همان دسترسی پلن اختصاصی',
      'بدون نیاز به کارت خارجی',
    ],
    backdrop: '/hero/banner/slide-gift-v2.png',
    tint: '#7c5cf0',
    ctaLabel: 'دیدن پلن فمیلی',
    href: '/product/gemini-pro',
    art: {
      card: '#7c5cf0',
      label: ['AI', 'Bundle'],
      tiles: [
        { id: 'claude', bg: '#ffffff', ink: '#d97757' },
        { id: 'gemini', bg: '#4285f4' },
        { id: 'cursor', bg: '#17171a' },
        { id: 'openai', bg: '#10a37f' },
      ],
    },
    platforms: ['Web', 'Android', 'iOS'],
  },
  {
    id: 'gaming-cod',
    kind: 'gaming',
    kindLabel: 'گیم',
    titleLead: 'کال آو دیوتی',
    titleAccent: 'مدرن وارفر',
    englishTitle: 'Call of Duty · Modern Warfare',
    kicker: 'کد را می‌گیری، خودت فعال می‌کنی',
    description:
      'بدون قفل منطقه‌ای، بدون واسطه. کد روی اکانت خودت می‌نشیند و تمام پیشرفتت سر جایش می‌ماند — نه اکانت قرضی، نه ترس از قطع شدن.',
    highlights: [
      'کد گلوبال، هر کجا کار می‌کند',
      'تحویل بلافاصله بعد از پرداخت',
      'مولتی‌پلیر و وارزون، هر دو باز',
    ],
    backdrop: '/hero/banner/slide-cod-v2.png',
    tint: '#7c93b8',
    ctaLabel: 'مشاهده‌ی محصول',
    href: '/product/call-of-duty-modern-warfare',
    platforms: ['PC', 'Steam', 'Battle.net'],
  },
  {
    id: 'creative-suite',
    kind: 'creative',
    kindLabel: 'طراحی و ادیت',
    titleLead: 'ابزارهای',
    titleAccent: 'طراحی و ادیت',
    englishTitle: 'Canva · CapCut · Figma',
    kicker: 'سه ابزار، یک بار پرداخت',
    description:
      'کنوا برای طرح، کپ‌کات برای تدوین، فیگما برای رابط. هر سه بدون واترمارک و روی ایمیل خودت — همان چیزی که یک فریلنسر واقعاً لازم دارد.',
    highlights: [
      'خروجی بدون واترمارک',
      'دوره‌های تا یک سال',
      'پرداخت ریالی، بدون کارت ارزی',
    ],
    backdrop: '/hero/banner/slide-tools-v2.png',
    tint: '#00c4cc',
    ctaLabel: 'دیدن دسته',
    href: '/creative',
    art: {
      card: '#a8781f',
      label: ['Creative', 'Tools'],
      tiles: [
        { id: 'canva', bg: '#00c4cc' },
        { id: 'figma', bg: '#a259ff' },
        { id: 'capcut', bg: '#17171a' },
        { id: 'tiktok', bg: '#22c55e' },
      ],
    },
    platforms: ['Web', 'Desktop', 'Mobile'],
  },
  {
    id: 'gaming-gta',
    kind: 'gaming',
    kindLabel: 'گیم',
    badge: 'به‌زودی',
    titleLead: 'جی‌تی‌ای',
    titleAccent: 'شش',
    englishTitle: 'Grand Theft Auto VI',
    kicker: 'قبل از اینکه ظرفیت پر شود',
    description:
      'اکانت ظرفیتی یعنی هزینه بین چند نفر تقسیم می‌شود و تو کسری از قیمت کامل می‌دهی. آنلاین و آپدیت‌های رسمی، هر دو باز.',
    highlights: [
      'کسری از قیمت خرید مستقیم',
      'حالت آنلاین کاملاً فعال',
      'گارانتی مادام‌العمر تعویض',
    ],
    backdrop: '/hero/banner/slide-gta-v2.png',
    tint: '#d977b8',
    ctaLabel: 'دیدن اکانت‌های گیم',
    href: '/gaming',
    platforms: ['PS5', 'Xbox'],
  },

];

/* ============================================================
   نگهبانِ مقصدها

   دکمه‌ی اسلاید پرکلیک‌ترین چیزِ صفحه‌ی اصلی است و مقصدش فقط یک
   رشته‌ی متنی است — تایپ‌اسکریپت نمی‌داند آن رشته به جایی می‌رسد
   یا نه. سه اسلاید مدت‌ها به ۴۰۴ می‌رفتند و هیچ‌چیز صدا نکرد؛
   /shop/ai و /shop/creative اصلاً مسیر نبودند و محصولی به نام
   gta-vi وجود نداشت. تنها نشانه، چند خطای بی‌صدا در کنسول بود.

   این بررسی فقط در حالت توسعه اجرا می‌شود: در همان ثانیه‌ای که
   کسی اسلاید تازه‌ای اضافه کند و اسلاگ را اشتباه بنویسد، پیام
   می‌دهد. در بیلد نهایی هیچ هزینه‌ای ندارد.
   ============================================================ */
if (process.env.NODE_ENV !== 'production') {
  /* وارد کردن تنبل، تا کاتالوگ به باندلِ نهایی گره نخورد */
  import('./catalog').then(({ PRODUCTS, CATEGORIES }) => {
    const slugs = new Set(PRODUCTS.map((p) => p.slug));
    const cats = new Set<string>(CATEGORIES.map((c) => c.slug));
    const pages = new Set(['', 'shop', 'blog', 'faq', 'rules', 'numbers', 'cart', 'checkout', 'track', 'account']);

    for (const s of HERO_SLIDES) {
      const path = s.href.split('?')[0].replace(/^\/|\/$/g, '');
      const parts = path.split('/');
      const ok = parts[0] === 'product'
        ? slugs.has(parts[1])
        : parts.length === 1 && (cats.has(parts[0]) || pages.has(parts[0]));
      if (!ok) {
        console.error(
          `[heroSlides] مقصدِ اسلاید «${s.id}» به جایی نمی‌رسد: ${s.href}\n` +
          'مسیرهای مجاز: /product/<اسلاگ محصول>، /<اسلاگ دسته>، یا یکی از صفحه‌های ثابت.',
        );
      }
    }
  });
}
