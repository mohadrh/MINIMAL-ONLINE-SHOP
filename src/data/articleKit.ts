/* ============================================================
   جعبه‌ابزارِ نوشتنِ مقاله

   ⚠ این فایل برای این است که نوشتنِ مقاله شبیهِ *نوشتن* باشد،
   نه شبیهِ پر کردنِ فرمِ JSON.

   پیش از این، هر بلوکِ متن یک آبجکتِ کامل بود:

     { kind: 'p', text: '…' }
     { kind: 'ul', items: ['…', '…'] }

   برای مقاله‌ی سی‌بلوکی یعنی سی بار نوشتنِ ‎kind‎ و ‎text‎، و هر
   بار یک جای احتمالیِ غلطِ تایپی که تازه سرِ بیلد معلوم می‌شود.
   با این‌جا:

     p('…')
     ul(['…', '…'])

   ⚠ و سه چیز که خودکار حساب می‌شوند، چون نویسنده نباید
     حدسشان بزند:

     ۱ زمانِ مطالعه — از تعدادِ کلمه. مقاله‌های قبلی هفت تا
       یازده دقیقه ادعا می‌کردند و واقعاً یک‌دو دقیقه بودند.
     ۲ لنگرِ هر تیتر — برای فهرستِ مطالب و لینکِ مستقیم به بخش.
     ۳ برچسب و رنگِ موضوع — از خودِ ‎topic‎، تا دو مقاله‌ی
       هم‌موضوع رنگ و برچسبِ متفاوت نگیرند.
   ============================================================ */

import type { Block, ArticleTopic } from './articles';

/* ------------------------------------------------------------
   سازنده‌های بلوک
   ------------------------------------------------------------ */

/** پاراگراف */
export const p = (text: string): Block => ({ kind: 'p', text });

/** تیترِ بخش — همین‌ها فهرستِ مطالب را می‌سازند */
export const h = (text: string): Block => ({ kind: 'h', text });

/** زیرتیتر — در فهرستِ مطالب تورفته می‌آید */
export const h3 = (text: string): Block => ({ kind: 'h3', text });

/** فهرستِ نقطه‌ای */
export const ul = (items: string[]): Block => ({ kind: 'ul', items });

/** فهرستِ شماره‌دار */
export const ol = (items: string[]): Block => ({ kind: 'ol', items });

/**
 * جعبه‌ی نکته، در سه لحن.
 *
 * ⚠ لحن‌ها رنگ‌های متفاوت دارند ولی آیکون هم — رنگ به‌تنهایی
 * حاملِ معنا نیست، برای کسی که رنگ را تشخیص نمی‌دهد شکل
 * می‌ماند.
 */
export const note = (text: string): Block => ({ kind: 'note', text, tone: 'info' });
export const tip  = (text: string): Block => ({ kind: 'note', text, tone: 'tip' });
export const warn = (text: string): Block => ({ kind: 'note', text, tone: 'warn' });

/** نقلِ برجسته */
export const quote = (text: string, by?: string): Block => ({ kind: 'quote', text, by });

/** تصویر با زیرنویس */
export const img = (src: string, caption?: string): Block => ({ kind: 'img', src, caption });

/**
 * جدولِ مقایسه.
 *
 * بیشترِ مقاله‌های این سایت «الف یا ب؟» هستند و جواب‌دادنشان با
 * پاراگراف، خواننده را مجبور می‌کند خودش جدول را در ذهنش
 * بسازد. این همان جدول را می‌دهد.
 */
export const table = (head: string[], rows: string[][]): Block =>
  ({ kind: 'table', head, rows });

/** گام‌های شماره‌دار، هر کدام با عنوان و شرح */
export const steps = (items: { t: string; d: string }[]): Block =>
  ({ kind: 'steps', items });

/** پرسش و پاسخ — ته مقاله خوب می‌نشیند و برای سئو هم می‌ارزد */
export const faq = (items: { q: string; a: string }[]): Block =>
  ({ kind: 'faq', items });

/**
 * کارتِ محصول، داخلِ متن.
 *
 * ⚠ همین یکی، بزرگ‌ترین شکافِ بخشِ مقالات را پر می‌کند.
 *
 * هیچ‌کدام از مقاله‌های موجود حتی یک لینک به صفحه‌ی محصول
 * نداشتند. یعنی خواننده تا آخر می‌خواند، قانع می‌شود، و بعد
 * هیچ راهی جلویش نیست جز اینکه خودش برود دنبالِ محصول بگردد.
 *
 * فقط ‎slug‎ داده می‌شود؛ عنوان و قیمت و تصویر را خودِ کارت
 * سرِ رندر از کاتالوگ برمی‌دارد، تا مقاله با عوض‌شدنِ قیمت
 * کهنه نشود.
 */
export const product = (slug: string, pitch?: string): Block =>
  ({ kind: 'product', slug, pitch });

/** خطِ جداکننده — برای وقتی که بحث عوض می‌شود ولی تیتر لازم نیست */
export const hr = (): Block => ({ kind: 'hr' });

/* ------------------------------------------------------------
   موضوع‌ها
   ------------------------------------------------------------ */

/**
 * ⚠ برچسب و رنگ این‌جا تعریف می‌شوند، نه در خودِ مقاله.
 *
 * قبلاً هر مقاله ‎topicLabel‎ و ‎accent‎ خودش را داشت. یعنی دو
 * مقاله‌ی «هوش مصنوعی» می‌توانستند دو رنگِ متفاوت بگیرند و
 * می‌گرفتند: ‎#e8862e‎ و ‎#a855f7‎. در صفحه‌ی فهرست، کنارِ هم،
 * شبیهِ دو دسته‌ی جدا به نظر می‌رسیدند.
 */
export const TOPICS: Record<ArticleTopic, { label: string; accent: string }> = {
  ai:       { label: 'هوش مصنوعی',  accent: '#a855f7' },
  gaming:   { label: 'گیم',          accent: '#3a7bd5' },
  creative: { label: 'طراحی و ادیت', accent: '#de2e6b' },
  guide:    { label: 'راهنما',       accent: '#2ecc8f' },
};

/* ------------------------------------------------------------
   شمارش و لنگر
   ------------------------------------------------------------ */

/** کلمه‌های یک بلوک — هرچه خوانده می‌شود، نه هرچه ذخیره شده */
function wordsIn(b: Block): number {
  const count = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  switch (b.kind) {
    case 'p':
    case 'h':
    case 'h3':
    case 'note':
      return count(b.text);
    case 'quote':
      return count(b.text) + (b.by ? count(b.by) : 0);
    case 'ul':
    case 'ol':
      return b.items.reduce((n, it) => n + count(it), 0);
    case 'steps':
      return b.items.reduce((n, it) => n + count(it.t) + count(it.d), 0);
    case 'faq':
      return b.items.reduce((n, it) => n + count(it.q) + count(it.a), 0);
    case 'table':
      return b.head.reduce((n, c) => n + count(c), 0)
        + b.rows.reduce((n, r) => n + r.reduce((m, c) => m + count(c), 0), 0);
    case 'img':
      return b.caption ? count(b.caption) : 0;
    default:
      return 0;
  }
}

/**
 * زمانِ مطالعه به دقیقه.
 *
 * ⚠ دویست کلمه در دقیقه، و کفِ یک دقیقه.
 *
 * برای متنِ فارسی دویست عددِ محافظه‌کارانه‌ای است (بعضی منابع
 * ۲۵۰ می‌گویند)، و محافظه‌کار بودنش عمدی است: بهتر است خواننده
 * زودتر از عددِ نوشته‌شده تمام کند تا دیرتر.
 */
export function readingMinutes(body: Block[]): number {
  const words = body.reduce((n, b) => n + wordsIn(b), 0);
  return Math.max(1, Math.round(words / 200));
}

/**
 * لنگرِ تیتر — برای ‎id‎ و لینکِ ‎#‎.
 *
 * ⚠ حروفِ فارسی نگه داشته می‌شوند.
 *
 * حذفشان از یک تیترِ فارسی رشته‌ی خالی می‌سازد و همه‌ی تیترها
 * لنگرِ یکسان می‌گیرند. فرگمنتِ فارسی در نشانی کاملاً کار
 * می‌کند؛ مرورگر خودش درصدی‌اش می‌کند.
 */
export function anchorOf(text: string, used: Set<string>): string {
  const base = text
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'بخش';

  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n++}`;
  }
  used.add(id);
  return id;
}

/** یک سرفصل در فهرستِ مطالب */
export interface TocItem {
  id: string;
  text: string;
  sub: boolean;
}

/**
 * فهرستِ مطالب از تیترهای متن.
 *
 * ⚠ همان ‎Set‎ باید سرِ رندرِ متن هم استفاده شود.
 *
 * وگرنه لنگری که فهرست می‌سازد با لنگری که تیتر می‌گیرد یکی
 * نمی‌ماند و کلیک روی فهرست جایی نمی‌رود. برای همین
 * ‎anchorOf‎ بیرون است و هر دو طرف از یک شمارنده استفاده
 * می‌کنند.
 */
export function tocOf(body: Block[]): TocItem[] {
  const used = new Set<string>();
  const out: TocItem[] = [];

  for (const b of body) {
    if (b.kind === 'h' || b.kind === 'h3') {
      out.push({ id: anchorOf(b.text, used), text: b.text, sub: b.kind === 'h3' });
    }
  }
  return out;
}
