import type { Product } from './catalog';

/* ============================================================
   کاتالوگ بازی‌ها

   توضیحات همه اینجا از نو نوشته شده‌اند — نه کپی از هیچ فروشگاه یا
   ویکی. هر متن روی چیزی تمرکز دارد که خریدار ایرانی واقعاً می‌پرسد:
   ظرفیت چیست، روی چه کنسولی کار می‌کند، تحویل چقدر طول می‌کشد،
   و گارانتی‌اش چیست.

   قیمت‌ها فرضی‌اند و باید با اعداد واقعی جایگزین شوند.
   ============================================================ */

/** سازنده‌ی محصول بازی — تکرار را حذف می‌کند */
function game(cfg: {
  id: string;
  slug: string;
  title: string;
  englishTitle: string;
  brand: string;
  art: string;
  accent: string;
  short: string;
  description: string;
  features: string[];
  /** ⚠ فقط اکانتِ استیم روی کامپیوتر.

      سه اصلاحِ پشتِ سرِ هم از کارفرما آمد: «بازی‌های ما برای
      پلی‌استیشن و ایکس‌باکس نیست»، بعد «اکانت گیم فقط استیم
      داریم»، و بعد حذفِ دو بازیِ انحصاریِ کنسول.

      تا پیش از این، پانزده بازی ‎PS5‎ و ‎Xbox‎ در فهرستشان
      داشتند و یکی هم ‎Battle.net‎ — یعنی سایت سه پلتفرمی را
      تبلیغ می‌کرد که هیچ‌کدام تأمین نمی‌شوند، و مشتری بعد از
      خرید می‌فهمید.

      «ولورین مارول» و «ساروس» هم کاملاً حذف شدند: هر دو انحصاریِ
      PS5 بودند و روی استیم اصلاً وجود ندارند. */
  platforms: string[];
  variants: Product['variants'];
  badges?: Product['badges'];
  tags?: string[];
  rating?: number;
  reviews?: number;
  sales?: number;
  fulfillment?: Product['fulfillment'];
  delivery?: string;
  warranty?: string;
  notes?: string[];
  faq?: { q: string; a: string }[];
}): Product {
  return {
    id: cfg.id,
    slug: cfg.slug,
    title: cfg.title,
    englishTitle: cfg.englishTitle,
    brand: cfg.brand,
    platforms: cfg.platforms,
    category: 'gaming',
    fulfillment: cfg.fulfillment ?? 'stock_account',
    requiredInputs: [],
    deliveryEstimate: cfg.delivery ?? 'در اسرع وقت، توسط سیستم',
    warrantyLabel: cfg.warranty ?? 'پشتیبانی کامل فونیکس',
    variants: cfg.variants,
    media: {
      thumbnail: `/games/${cfg.art}-thumb.webp`,
      cover: `/games/${cfg.art}.webp`,
      cutout: `/games/${cfg.art}.webp`,
      accent: cfg.accent,
    },
    shortDescription: cfg.short,
    description: cfg.description,
    features: cfg.features,
    notes: cfg.notes,
    faq: cfg.faq,
    rating: cfg.rating ?? 4.8,
    reviewsCount: cfg.reviews ?? 0,
    salesCount: cfg.sales ?? 0,
    badges: cfg.badges ?? [],
    /* هر اکانت بازی این سه را دارد؛ به‌جای تکرار در هفده جا، همین‌جا
       اضافه می‌شوند و بقیه‌ی برچسب‌ها اختصاصی هر بازی می‌مانند. */
    tags: Array.from(new Set(['private-account', 'instant', ...(cfg.tags ?? [])])),
  };
}

/* ⚠ یک پلن، نه سه — و دلیلش تغییرِ مدلِ کسب‌وکار است.

   تا امروز این تابع سه واریانت می‌ساخت: «ظرفیت دو»، «ظرفیت سه» و
   «اکانت اختصاصی». آن الگو مالِ بازارِ پلی‌استیشن است، جایی که
   یک بازی روی چند کنسول هم‌زمان فعال می‌شود و ظرفیت، قیمت را
   تعیین می‌کند.

   کارفرما گفت روی استیم فقط اکانتِ کامل می‌فروشیم. پس ظرفیت
   اصلاً معنا ندارد و یک پلن می‌ماند.

   ⚠ قیمت از واریانتِ «اکانت اختصاصی»ِ قبلی می‌آید (پایه × ۱٫۸۵)،
   نه از پایه. پایه قیمتِ حسابِ *اشتراکی* بود؛ اگر آن را قیمتِ
   اکانتِ کامل بگذاریم، قیمتِ هر بازی ۴۶٪ کمتر از چیزی می‌شود که
   واقعاً هست. این عدد باید با کارفرما تأیید شود. */
const fullAccount = (base: number, compare?: number) => [
  {
    id: 'full',
    label: 'اکانت کامل استیم',
    price: Math.round(base * 1.85),
    compareAt: compare ? Math.round(compare * 1.85) : undefined,
    stock: 5,
    isDefault: true,
    guide: {
      fit: 'حساب کامل، فقط مالِ خودت.',
      detail: 'کلِ اکانت استیم به تو تحویل داده می‌شود و با هیچ‌کس شریک نیستی. ایمیل و رمزش را خودت عوض می‌کنی و بازی برای همیشه در کتابخانه‌ات می‌ماند.',
    },
  },
];

export const GAMES: Product[] = [
  game({
    id: 'battlefield-6',
    slug: 'battlefield-6',
    tags: ['shooter', 'online', 'ps5', 'xbox', 'pc', 'new-release', 'on-sale'],
    title: 'بتلفیلد ۶',
    englishTitle: 'Battlefield 6',
    brand: 'EA · Battlefield Studios',
    art: 'battlefield-6',
    accent: '#6ea8c7',
    short: 'نبرد ۶۴ نفره با تخریب کامل محیط',
    description:
      'بازگشت بتلفیلد به جنگ مدرن، با نقشه‌های بزرگ و سیستم تخریبی که ساختمان‌ها را واقعاً فرو می‌ریزد. اکانت کامل استیم تحویل می‌گیری و به بخش آنلاین دسترسی کامل داری. اگر دنبال شوتر تیمی با مقیاس بزرگ هستی، این همان چیزی است که نباید از دستش بدهی.',
    features: [
      'دسترسی کامل به بخش آنلاین و مولتی‌پلیر',
      'اکانت قانونی، بدون خطر مسدود شدن',
      'آپدیت‌های رسمی و فصل‌های جدید',
      'پشتیبانی تا آخرین روز گارانتی',
    ],
    platforms: ['PC', 'Steam'],
    variants: fullAccount(3_850_000, 4_600_000),
    badges: ['new', 'hot'],
    rating: 4.9,
    reviews: 64,
    sales: 180,
    notes: ['بازی روی اکانت استیمی که تحویل می‌گیری فعال است؛ اشتراک جداگانه‌ای برای بخش آنلاین لازم نیست.'],
    faq: [
      { q: 'اکانت را کامل تحویل می‌گیرم؟', a: 'بله. ایمیل و رمز کامل به تو داده می‌شود و خودت عوضشان می‌کنی؛ با کسی شریک نیستی.' },
      { q: 'بازی برای همیشه مال من می‌ماند؟', a: 'بله، در کتابخانه‌ی همان اکانت می‌ماند و محدودیت زمانی ندارد.' },
    ],
  }),
];
