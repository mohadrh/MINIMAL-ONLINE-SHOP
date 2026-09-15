/* ============================================================
   اسلایدهای هیرو

   هیرو ویترین معرفی است، نه قفسه‌ی فروش: قیمت و دکمه‌ی «افزودن به
   سبد» ندارد. کارش این است که در ثانیه‌ی اول بگوید اینجا چه چیزهایی
   هست و تازه‌ترین‌ها کدام‌اند، و کسی که دنبال همان است را جذب کند.
   خرید در سکشن‌های بعدی و صفحه‌ی محصول اتفاق می‌افتد.

   ⚠ پنج اسلاید، و هر کدام یک دسته — نه یک محصول.

   سیزده اسلاید بود و بیشترشان یک محصولِ تک را تبلیغ می‌کردند:
   بتلفیلد ۶، کال‌آو‌دیوتی، جی‌تی‌ای، جمنای پرو… یعنی هیرو
   عملاً یک ردیفِ محصول شده بود، آن هم با تکرار (پنج اسلاید فقط
   برای گیم). و با چرخشِ سه‌ثانیه‌ای، چهل‌ودو ثانیه طول می‌کشید
   تا یک دور تمام شود که کسی تا آخرش نمی‌ماند.

   حالا هر اسلاید یک دسته است و ‎href‎ش هم به صفحه‌ی همان دسته
   می‌رود، پس هیرو همان کاری را می‌کند که باید: گفتنِ اینکه
   این‌جا چه *دسته‌هایی* هست.

   دو دسته اسلاید ندارند و عمدی است: «آموزشی» هیچ‌وقت بنر
   نداشت، و «شماره مجازی» دسته‌ی کاتالوگ نیست. هر دو در سکشنِ
   دسته‌بندی‌ها کارتِ خودشان را دارند.
   ============================================================ */

import type { SlideArtSpec } from '../components/home/SlideArt';

export type HeroKind = 'ai' | 'gaming' | 'creative' | 'social' | 'giftcard';

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
    id: 'ai-gemini',
    kind: 'ai',
    kindLabel: 'هوش مصنوعی',
    badge: 'موجودی محدود',
    titleLead: 'اشتراک',
    titleAccent: 'هوش مصنوعی',
    englishTitle: 'ChatGPT · Claude · Gemini · Midjourney',
    kicker: 'هر کدام را که لازم داری، یک‌جا',
    description:
      'چت‌جی‌پی‌تی، کلاد، جمنای و میدجرنی — همه روی حساب خودت فعال می‌شوند و با کارت بانکی ایرانی پرداخت می‌کنی.',
    highlights: [
      'بهترین قیمت اشتراک هوش مصنوعی',
      'فعال‌سازی فوری روی حساب خودت',
      'پشتیبانی فعال، هر روز هفته',
    ],
    backdrop: '/hero/banner/slide-ai2-v2.png',
    tint: '#4a7cf7',
    ctaLabel: 'دیدن هوش مصنوعی‌ها',
    href: '/ai',
    art: {
      card: '#a52344',
      /* ⚠ برچسب باید همان چیزی باشد که تیتر می‌گوید.

         تیتر «اشتراک هوش مصنوعی» شد ولی برچسبِ روی کارت
         «Gemini Pro» ماند — یعنی بنر یک برند را نام می‌برد در
         حالی که چهار نشان نشان می‌دهد و متن از همه می‌گوید. */
      label: ['AI', 'Subscriptions'],
      tiles: [
        { id: 'openai', bg: '#ffffff', logo: 'openai.svg' },
        { id: 'gemini', bg: '#ffffff', logo: 'gemini.svg' },
        { id: 'claude', bg: '#ffffff', logo: 'claude-burst.svg' },
        { id: 'midjourney', bg: '#ffffff', logo: 'midjourney.svg' },
      ],
    },
    platforms: ['Web', 'Android', 'iOS'],
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
      'منصفانه‌ترین قیمت ابزارهای طراحی',
      'فعال‌سازی سریع روی حساب خودت',
      'پشتیبانی فعال تا آخر دوره',
    ],
    backdrop: '/hero/banner/slide-tools-v2.png',
    tint: '#00c4cc',
    ctaLabel: 'دیدن دسته',
    href: '/creative',
    art: {
      card: '#a8781f',
      label: ['Creative', 'Tools'],
      tiles: [
        { id: 'canva', bg: '#ffffff', logo: 'canva.svg' },
        { id: 'figma', bg: '#ffffff', logo: 'figma.svg' },
        { id: 'capcut', bg: '#ffffff', logo: 'capcut.svg' },
        { id: 'midjourney', bg: '#ffffff', logo: 'midjourney.svg' },
      ],
    },
    platforms: ['Web', 'Desktop', 'Mobile'],
  },
  {
    id: 'social-premium',
    kind: 'social',
    kindLabel: 'اکانت پریمیوم',
    titleLead: 'اکانت‌های',
    titleAccent: 'پریمیوم',
    englishTitle: 'Spotify · YouTube · Telegram · Discord',
    kicker: 'بدون آگهی، روی حساب خودت',
    description:
      'اسپاتیفای، یوتیوب، تلگرام و دیسکورد — همه روی همان حسابی که داری فعال می‌شوند و پلی‌لیست و تاریخچه‌ات سر جایش می‌ماند.',
    highlights: [
      'ارزان‌ترین اکانت پریمیوم',
      'فعال‌سازی در کمترین زمان',
      'پشتیبانی فعال و پاسخ‌گو',
    ],
    backdrop: '/hero/banner/slide-ai-v2.png',
    tint: '#4aa3e8',
    ctaLabel: 'دیدن اکانت‌ها',
    href: '/social',
    art: {
      card: '#7c3aed',
      label: ['Social', 'Premium'],
      tiles: [
        { id: 'spotify', bg: '#ffffff', logo: 'spotify.svg' },
        { id: 'youtube', bg: '#ffffff', logo: 'youtube.png' },
        { id: 'telegram', bg: '#ffffff', logo: 'telegram.svg' },
        { id: 'discord', bg: '#ffffff', logo: 'discord.svg' },
      ],
    },
    platforms: ['Web', 'iOS', 'Android'],
  },
  {
    /* ⚠ این اسلاید پلی‌استیشنی بود و عوض شد.

       کارفرما گفت بازی‌های ما فقط برای کامپیوتر است. اسلاید
       تیترش «پلی‌استیشن» بود، نشانِ PS و ایکس‌باکس داشت و
       ‎platforms‎ش ‎PS5/PS4‎ — یعنی بنرِ اولِ صفحه چیزی را تبلیغ
       می‌کرد که اصلاً فروخته نمی‌شود.

       بعدش هم گفت «اکانت گیم فقط استیم داریم»، پس نامِ بتل‌نت و
       اپیک هم رفت و تیتر از «کامپیوتر» به «استیم» عوض شد —
       «کامپیوتر» هنوز پهن‌تر از چیزی بود که می‌فروشیم.

       گیفت کارتِ پلی‌استیشن و ایکس‌باکس هنوز فروخته می‌شود و
       اسلایدِ گیفت کارت هم دست‌نخورده ماند — آن شارژِ استور است،
       نه بازی. */
    id: 'gaming-pc',
    kind: 'gaming',
    kindLabel: 'اکانت استیم',
    titleLead: 'بازی‌های',
    titleAccent: 'استیم',
    englishTitle: 'Steam Accounts',
    kicker: 'اکانت استیم، بدون کارت ارزی',
    description:
      'بازی‌های روز کامپیوتر با قیمت ریالی، روی اکانت استیم. نه کارت ارزی لازم داری نه حساب خارجی.',
    highlights: [
      'بهترین قیمت اکانت استیم',
      'تحویل بعد از پرداخت',
      'در صورت بروز مشکل، پشتیبانی کامل',
    ],
    backdrop: '/hero/banner/slide-game-v2.png',
    tint: '#1b2838',
    ctaLabel: 'دیدن بازی‌ها',
    href: '/gaming',
    art: {
      card: '#1b2838',
      label: ['PC', 'Games'],
      tiles: [
        { id: 'steam', bg: '#ffffff', logo: 'steam.svg' },
        { id: 'discord', bg: '#ffffff', logo: 'discord.svg' },
        { id: 'gift', bg: '#ffffff', ink: '#1b2838' },
        { id: 'pc', bg: '#ffffff', ink: '#1b2838' },
      ],
    },
    platforms: ['PC', 'Steam'],
  },
  {
    id: 'giftcard',
    kind: 'giftcard',
    kindLabel: 'گیفت کارت',
    badge: 'تازه اضافه شد',
    titleLead: 'گیفت',
    titleAccent: 'کارت',
    englishTitle: 'PlayStation · Xbox · Steam · Apple',
    kicker: 'کد اورجینال، تحویل سیستمی',
    description:
      'شارژ استور و کیف پول، بدون کارت ارزی. کد را می‌گیری و خودت در حسابت وارد می‌کنی — اعتبار همان‌جا می‌نشیند و تاریخ انقضا هم ندارد.',
    highlights: [
      'ارزان‌ترین گیفت کارت با کد اورجینال',
      'تحویل آنی بعد از پرداخت',
      'ضمانت سالم بودن کد',
    ],
    backdrop: '/hero/banner/slide-gift-v2.png',
    tint: '#ff9900',
    ctaLabel: 'دیدن گیفت کارت‌ها',
    href: '/giftcard',
    art: {
      card: '#b02fa8',
      label: ['Gift', 'Cards'],
      tiles: [
        { id: 'apple', bg: '#ffffff', logo: 'apple.svg' },
        { id: 'netflix', bg: '#ffffff', logo: 'netflix.svg' },
        { id: 'spotify', bg: '#ffffff', logo: 'spotify.svg' },
        { id: 'xbox', bg: '#ffffff', logo: 'xbox.svg' },
      ],
    },
    platforms: ['PS5', 'Xbox', 'PC', 'iOS'],
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
