/* ============================================================
   اسلایدهای هیرو

   هیرو ویترین معرفی است، نه قفسه‌ی فروش: قیمت و دکمه‌ی «افزودن به
   سبد» ندارد. کارش این است که در ثانیه‌ی اول بگوید اینجا چه چیزهایی
   هست و تازه‌ترین‌ها کدام‌اند، و کسی که دنبال همان است را جذب کند.
   خرید در سکشن‌های بعدی و صفحه‌ی محصول اتفاق می‌افتد.
   ============================================================ */

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
    backdrop: '/hero/banner/battlefield-6-wide.webp',
    cutout: '/hero/cutout/battlefield-soldier.webp',
    tint: '#6ea8c7',
    ctaLabel: 'مشاهده‌ی محصول',
    href: '/product/battlefield-6',
    platforms: ['PS5', 'Xbox', 'PC'],
  },
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
    backdrop: '/hero/banner/banner-b.webp',
    cutout: '/hero/cutout/claude-wordmark.webp',
    cutoutKind: 'wordmark',
    tint: '#e8862e',
    ctaLabel: 'دیدن پلن‌ها',
    href: '/product/claude-pro',
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
    backdrop: '/hero/banner/banner-c.webp',
    cutout: '/hero/cutout/gemini-wordmark.webp',
    cutoutKind: 'wordmark',
    tint: '#4a7cf7',
    ctaLabel: 'مقایسه‌ی پلن‌ها',
    href: '/shop/ai',
    platforms: ['Web', 'Android', 'iOS'],
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
    backdrop: '/hero/banner/banner-a.webp',
    cutout: '/hero/cutout/gemini-wordmark.webp',
    cutoutKind: 'wordmark',
    tint: '#7c5cf0',
    ctaLabel: 'دیدن پلن فمیلی',
    href: '/product/gemini-pro',
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
    backdrop: '/hero/backdrop/cod-modern-warfare.webp',
    cutout: '/hero/cutout/cod-soldier.webp',
    tint: '#7c93b8',
    ctaLabel: 'مشاهده‌ی محصول',
    href: '/product/call-of-duty-modern-warfare',
    platforms: ['PC', 'Steam', 'Battle.net'],
  },
  {
    id: 'gaming-gta',
    kind: 'gaming',
    kindLabel: 'گیم',
    badge: 'پرفروش',
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
    backdrop: '/hero/backdrop/gta-vi.webp',
    cutout: '/hero/cutout/gta-duo.webp',
    tint: '#d977b8',
    ctaLabel: 'مشاهده‌ی محصول',
    href: '/product/gta-vi',
    platforms: ['PS5', 'Xbox'],
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
    backdrop: '/products/subscription-tiles.webp',
    tint: '#00c4cc',
    ctaLabel: 'دیدن دسته',
    href: '/shop/creative',
    platforms: ['Web', 'Desktop', 'Mobile'],
  },
];
