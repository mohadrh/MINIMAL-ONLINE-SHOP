/* ============================================================
   ووکامرس → فونیکس

   جایی که بیشترِ ادغام‌ها بی‌صدا خراب می‌شوند، همین‌جاست: داده‌ی
   واقعی همیشه ناقص‌تر از چیزی است که تایپ‌ها می‌گویند. یک محصول
   دسته ندارد، یکی قیمتش رشته‌ی خالی است، یکی متایی دارد که کسی
   دستی و غلط پر کرده.

   قاعده‌ی این فایل: هیچ ورودیِ بدی نباید صفحه را بیندازد. هر تبدیل
   جای خالی دارد و هر جای خالی عمدی است، نه اتفاقی.
   ============================================================ */

import type {
  CategorySlug, FulfillmentMode, Product, RequiredInput, Variant,
} from '../../data/catalog';
import type {
  PhoenixFields, PhoenixVariantFields, WooProduct, WooVariation,
} from './wooTypes';

/* ---------------------------------------------------------------
   کمک‌ها
--------------------------------------------------------------- */

/** رشته‌ی قیمتِ ووکامرس به عدد. '' و '0.00' و undefined همه صفر. */
function toPrice(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** تگ‌های HTML را از توضیحاتِ ووکامرس درمی‌آورد.

    ووکامرس توضیحات را با <p> و <br> می‌دهد چون ویرایشگرش HTML
    است. ما همان متن را در کامپوننت خودمان می‌ریزیم، پس تگ‌ها یا
    باید رندر شوند یا برداشته. رندر کردنِ HTMLِ آمده از سرور یعنی
    باز کردنِ درِ XSS، پس برمی‌داریم. */
function stripHtml(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** متای فونیکس را از meta_data بیرون می‌کشد، اگر افزونه فیلدِ
    آماده نداده باشد. */
function metaOf<T>(list: { key?: string; value?: unknown }[] | undefined, key: string): T | undefined {
  const hit = list?.find((m) => m.key === key || m.key === `_${key}`);
  if (!hit) return undefined;
  const v = hit.value;
  /* وردپرس گاهی آرایه و شیء را به‌صورت رشته‌ی JSON ذخیره می‌کند */
  if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
    try { return JSON.parse(v) as T; } catch { return undefined; }
  }
  return v as T;
}

/* دسته‌ی ووکامرس به دسته‌ی ما.

   نگاشتِ صریح است نه حدسی: اسلاگِ ووکامرس هرچه باشد، فقط این شش
   تا در سایت معنی دارند. اگر چیزِ تازه‌ای بیاید که این‌جا نیست،
   محصول در دسته‌ی پیش‌فرض می‌افتد نه اینکه ناپدید شود. */
const CATEGORY_MAP: Record<string, CategorySlug> = {
  ai: 'ai', 'hoosh-masnoei': 'ai', 'artificial-intelligence': 'ai',
  creative: 'creative', 'design': 'creative', 'tarrahi': 'creative',
  social: 'social', 'shabakeh-ejtemai': 'social',
  education: 'education', 'amoozeshi': 'education',
  gaming: 'gaming', games: 'gaming', 'gim': 'gaming',
  giftcard: 'giftcard', 'gift-card': 'giftcard', 'gift-cards': 'giftcard',
};

function toCategory(p: WooProduct): CategorySlug {
  for (const c of p.categories ?? []) {
    const hit = c.slug && CATEGORY_MAP[c.slug];
    if (hit) return hit;
  }
  return 'ai';
}

const FULFILLMENTS: FulfillmentMode[] = [
  'stock_code', 'stock_account', 'upgrade_on_user', 'api_topup', 'manual',
];

function toFulfillment(v: string | undefined): FulfillmentMode {
  return FULFILLMENTS.includes(v as FulfillmentMode) ? (v as FulfillmentMode) : 'manual';
}

const INPUT_TYPES = ['text', 'email', 'number'] as const;

function toRequiredInputs(raw: PhoenixFields['required_inputs']): RequiredInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r.key === 'string' && typeof r.label === 'string')
    .map((r) => ({
      key: r.key as string,
      label: r.label as string,
      hint: typeof r.hint === 'string' ? r.hint : undefined,
      type: (INPUT_TYPES as readonly string[]).includes(r.type ?? '')
        ? (r.type as RequiredInput['type'])
        : 'text',
      pattern: typeof r.pattern === 'string' ? r.pattern : undefined,
      example: typeof r.example === 'string' ? r.example : undefined,
    }));
}

const BADGES = ['hot', 'new', 'bestseller', 'limited'] as const;

/* ---------------------------------------------------------------
   پلن‌ها
--------------------------------------------------------------- */

/**
 * واریاسیونِ ووکامرس به پلنِ ما.
 *
 * ⚠ برچسبِ پلن از صفت‌ها ساخته می‌شود، نه از نامِ واریاسیون.
 *
 * ووکامرس نامِ واریاسیون را «کلاد پرو - یک ماهه» می‌سازد، یعنی نامِ
 * محصول را هم می‌چسباند. اگر همان را برچسب بگذاریم، در فهرستِ
 * پلن‌ها نامِ محصول چهار بار تکرار می‌شود. صفت‌ها فقط خودِ تفاوت
 * را دارند.
 */
function toVariant(v: WooVariation, i: number): Variant {
  const px: PhoenixVariantFields =
    v.phoenix ?? metaOf<PhoenixVariantFields>(v.meta_data, 'phoenix') ?? {};

  const fromAttrs = (v.attributes ?? [])
    .map((a) => a.option)
    .filter((o): o is string => typeof o === 'string' && o.length > 0)
    .join(' — ');

  const price = toPrice(v.price || v.regular_price);
  const regular = toPrice(v.regular_price);

  return {
    id: String(v.id ?? `var-${i}`),
    label: px.label || fromAttrs || `پلن ${i + 1}`,
    price,
    /* compareAt فقط وقتی معنی دارد که واقعاً بیشتر باشد؛ ووکامرس
       گاهی regular را برابرِ price می‌گذارد و آن‌وقت یک «تخفیفِ
       صفر درصد» روی کارت می‌نشیند. */
    compareAt: v.on_sale && regular > price ? regular : undefined,
    usd: typeof px.usd === 'number' ? px.usd : undefined,
    stock: v.stock_status === 'outofstock'
      ? 0
      : (v.manage_stock ? (v.stock_quantity ?? null) : null),
    isDefault: px.is_default === true || i === 0,
    guide: px.guide?.fit && px.guide?.detail
      ? { fit: px.guide.fit, detail: px.guide.detail }
      : undefined,
  };
}

/**
 * محصولِ ساده هم باید یک پلن داشته باشد.
 *
 * کلِ سایت فرض می‌کند هر محصول دست‌کم یک variant دارد — قیمت،
 * دکمه‌ی خرید و سبد همه از آن‌جا می‌خوانند. محصولِ simple در
 * ووکامرس واریاسیون ندارد، پس یکی از خودش می‌سازیم.
 */
function singleVariant(p: WooProduct): Variant {
  const price = toPrice(p.price || p.regular_price);
  const regular = toPrice(p.regular_price);
  return {
    id: String(p.id ?? 'v1'),
    label: 'خرید',
    price,
    compareAt: p.on_sale && regular > price ? regular : undefined,
    stock: p.stock_status === 'outofstock'
      ? 0
      : (p.manage_stock ? (p.stock_quantity ?? null) : null),
    isDefault: true,
  };
}

/* ---------------------------------------------------------------
   محصول
--------------------------------------------------------------- */

export function toProduct(p: WooProduct, variations: WooVariation[] = []): Product {
  const px: PhoenixFields =
    p.phoenix ?? metaOf<PhoenixFields>(p.meta_data, 'phoenix') ?? {};

  const variants = variations.length
    ? variations.map(toVariant)
    : [singleVariant(p)];

  /* اگر هیچ پلنی isDefault نداشت، اولی را پیش‌فرض می‌کنیم —
     وگرنه صفحه‌ی محصول بدون انتخابِ اولیه باز می‌شود. */
  if (!variants.some((v) => v.isDefault) && variants[0]) {
    variants[0].isDefault = true;
  }

  const images = (p.images ?? []).map((im) => im.src).filter((s): s is string => !!s);

  return {
    id: String(p.id ?? p.slug ?? ''),
    slug: p.slug ?? String(p.id ?? ''),
    title: stripHtml(p.name) || 'بدون نام',
    englishTitle: px.english_title ?? p.sku ?? '',
    brand: px.brand ?? '',
    category: toCategory(p),
    fulfillment: toFulfillment(px.fulfillment),
    requiredInputs: toRequiredInputs(px.required_inputs),
    deliveryEstimate: px.delivery_estimate ?? 'در اسرع وقت، توسط سیستم',
    warrantyLabel: px.warranty_label ?? 'گارانتی تمام دوره',
    variants,
    media: {
      thumbnail: images[0] ?? '',
      cover: px.cover ?? images[1],
      cutout: px.cutout,
      accent: px.accent ?? '#6340d8',
    },
    platforms: Array.isArray(px.platforms) ? px.platforms : undefined,
    shortDescription: stripHtml(p.short_description),
    description: stripHtml(p.description),
    features: Array.isArray(px.features) ? px.features : [],
    notes: Array.isArray(px.notes) ? px.notes : undefined,
    faq: Array.isArray(px.faq)
      ? px.faq
        .filter((f) => f && typeof f.q === 'string' && typeof f.a === 'string')
        .map((f) => ({ q: f.q as string, a: f.a as string }))
      : undefined,
    rating: Number(p.average_rating ?? 0) || 0,
    reviewsCount: p.rating_count ?? 0,
    salesCount: p.total_sales ?? 0,
    badges: (px.badges ?? []).filter(
      (b): b is Product['badges'][number] => (BADGES as readonly string[]).includes(b),
    ),
    tags: (p.tags ?? []).map((t) => t.slug).filter((s): s is string => !!s),
  };
}
