/* ============================================================
   تازه‌های هوش مصنوعی

   ⚠ این فهرست جای کاتالوگ را نمی‌گیرد.

   کاتالوگ می‌گوید «چه می‌فروشیم و چند»؛ این‌جا می‌گوید «کدام
   ابزار به چه دردی می‌خورد». کسی که تازه با این حوزه آشنا شده
   نامِ ده سرویس را می‌شنود و نمی‌داند کدامش کارِ او را راه
   می‌اندازد — و تا وقتی نداند، قیمت هم برایش بی‌معنی است.

   پس ترتیب از **کار** می‌آید نه از برند: اول می‌پرسیم می‌خواهی
   بنویسی یا تصویر بسازی یا کد بزنی، بعد ابزارها را نشان می‌دهیم.

   ⚠ هرچه اسلاگ دارد باید در کاتالوگ باشد.

   ابزارهایی که هنوز نمی‌فروشیم اسلاگ ندارند و به‌جای قیمت
   «به‌زودی» می‌گیرند. حدس زدنِ قیمت بدترین کاری است که می‌شود
   کرد: مشتری روی عددی سفارش می‌دهد که ما پشتش نیستیم.
   ============================================================ */

export type AiPurpose = 'chat' | 'visual' | 'code';

export interface AiTool {
  id: string;
  /** نام فارسی — همان که مشتری می‌گوید */
  title: string;
  /** نام لاتین، همان‌طور که خودشان می‌نویسند */
  englishTitle: string;
  /** سازنده */
  maker: string;
  purpose: AiPurpose;
  /** یک جمله: این ابزار چه کاری را راه می‌اندازد */
  lead: string;
  /** دو یا سه کارِ مشخص — نه صفت، فعل */
  does: string[];
  /**
   * نامِ فایلِ نشان در ‎public/brand/logos‎، با پسوند.
   * نبودش کارت را نمی‌شکند؛ حرفِ اول جایش می‌نشیند.
   */
  logo?: string;
  /** رنگِ برند — نوارِ بالای کارت از همین ساخته می‌شود */
  tint: string;
  /** اسلاگِ محصول در کاتالوگ. نبودنش یعنی هنوز نمی‌فروشیم. */
  slug?: string;
  /** تازه اضافه شده — نشانِ گوشه می‌گیرد */
  fresh?: boolean;
}

export const AI_PURPOSES: { key: AiPurpose; label: string; hint: string }[] = [
  { key: 'chat', label: 'گفتگو و نوشتن', hint: 'متن بنویس، خلاصه کن، بپرس' },
  { key: 'visual', label: 'تصویر و ویدیو', hint: 'از روی توضیح، تصویر بساز' },
  { key: 'code', label: 'کدنویسی', hint: 'داخل ویرایشگر، کنارِ خودت' },
];

export const AI_TOOLS: AiTool[] = [
  /* ---------- گفتگو و نوشتن ---------- */
  {
    id: 'chatgpt',
    title: 'چت‌جی‌پی‌تی',
    englishTitle: 'ChatGPT',
    maker: 'OpenAI',
    purpose: 'chat',
    lead: 'همه‌کاره‌ترین‌شان؛ اگر یکی را می‌خواهی، معمولاً این است.',
    does: ['نوشتن و بازنویسی متن', 'خواندن فایل و عکس', 'ساخت تصویر'],
    logo: 'openai.svg',
    tint: '#10a37f',
    slug: 'chatgpt',
  },
  {
    id: 'claude',
    title: 'کلاد',
    englishTitle: 'Claude',
    maker: 'Anthropic',
    purpose: 'chat',
    lead: 'متنِ بلند و پروژه‌ی چندفایلی را کامل می‌خواند، نه تکه‌تکه.',
    does: ['تحلیل سند طولانی', 'بازنویسی کد', 'کار روی چند فایل'],
    logo: 'claude-burst.svg',
    tint: '#d97757',
    slug: 'claude-pro',
  },
  {
    id: 'gemini',
    title: 'جمنای',
    englishTitle: 'Gemini',
    maker: 'Google',
    purpose: 'chat',
    lead: 'داخل جیمیل و داکس هم هست، نه فقط در یک تبِ جدا.',
    does: ['کار داخل Gmail و Docs', 'خواندن ویدیو و صدا', 'جست‌وجوی زنده'],
    logo: 'gemini.svg',
    tint: '#4285f4',
    slug: 'gemini-pro',
  },
  {
    id: 'grok',
    title: 'گراک',
    englishTitle: 'Grok',
    maker: 'xAI',
    purpose: 'chat',
    lead: 'به جریانِ زنده‌ی ایکس وصل است، پس از خبرِ همین ساعت خبر دارد.',
    does: ['پاسخ با دادهٔ لحظه‌ای', 'تحلیل تصویر', 'ساخت تصویر'],
    logo: 'grok.svg',
    tint: '#17171a',
    fresh: true,
  },

  /* ---------- تصویر و ویدیو ---------- */
  {
    id: 'midjourney',
    title: 'میدجرنی',
    englishTitle: 'Midjourney',
    maker: 'Midjourney',
    purpose: 'visual',
    lead: 'تصویرهایش از همه هنری‌تر است؛ برای پوستر و کاور انتخابِ اول.',
    does: ['تصویر از روی توضیح', 'تغییر سبک', 'بزرگ‌کردن بدون افت'],
    logo: 'midjourney.svg',
    tint: '#4b4bd6',
    fresh: true,
  },
  {
    id: 'higgsfield',
    title: 'هیگزفیلد',
    englishTitle: 'Higgsfield',
    maker: 'Higgsfield AI',
    purpose: 'visual',
    lead: 'ویدیو می‌سازد و حرکتِ دوربین را خودت انتخاب می‌کنی.',
    does: ['ویدیو از روی متن', 'حرکت دوربینِ سینمایی', 'جان دادن به عکس'],
    logo: 'higgsfield.svg',
    tint: '#c5f832',
    fresh: true,
  },
  {
    id: 'firefly',
    title: 'ادوبی فایرفلای',
    englishTitle: 'Adobe Firefly',
    maker: 'Adobe',
    purpose: 'visual',
    lead: 'داخل فتوشاپ و ایلوستریتور کار می‌کند، نه در یک سایتِ جدا.',
    does: ['پرکردن هوشمند در فتوشاپ', 'تصویر از روی متن', 'تغییر رنگ وکتور'],
    logo: 'firefly.svg',
    tint: '#d0021b',
    fresh: true,
  },

  /* ---------- کدنویسی ---------- */
  {
    id: 'cursor',
    title: 'کرسر',
    englishTitle: 'Cursor',
    maker: 'Anysphere',
    purpose: 'code',
    lead: 'ویرایشگری که کلِ پروژه را خوانده، پس جوابش به کدِ خودت می‌خورد.',
    does: ['نوشتن کد در پروژه', 'اصلاح خطا', 'توضیح کدِ ناآشنا'],
    tint: '#17171a',
    slug: 'cursor-pro',
  },
  {
    id: 'copilot',
    title: 'گیت‌هاب کوپایلت',
    englishTitle: 'GitHub Copilot',
    maker: 'GitHub',
    purpose: 'code',
    lead: 'داخل VS Code می‌نشیند و خطِ بعدی را پیش از تایپ پیشنهاد می‌دهد.',
    does: ['تکمیل خودکار کد', 'نوشتن تست', 'پاسخ داخل ویرایشگر'],
    logo: 'copilot.svg',
    tint: '#6e40c9',
    fresh: true,
  },
];
