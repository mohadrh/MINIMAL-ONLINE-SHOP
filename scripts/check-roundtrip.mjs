/* ============================================================
   آیا واردات چیزی را گم می‌کند؟

   ⚠ این اسکریپت به وردپرس وصل نمی‌شود و چیزی نمی‌سازد.

   کاری که می‌کند شبیه‌سازیِ کاملِ رفت‌وبرگشت است:

       محصولِ محلی  →  آنچه push-woo می‌فرستد
                    →  آنچه ووکامرس پس می‌دهد
                    →  آنچه map.ts می‌سازد

   و بعد محصولِ اول را با محصولِ آخر مقایسه می‌کند.

   دلیلِ وجودش: کارفرما پرسید «به‌محضِ وصل کردنِ کلید، محصولات
   از سایت می‌روند؟» — و جوابِ حدسی کافی نبود. این‌جا هر فیلد
   شمرده می‌شود.

       npm run check:roundtrip
   ============================================================ */

import { PRODUCTS } from '../src/data/catalog.ts';
import { toProduct } from '../src/lib/api/map.ts';

/* ---------- ۱ آنچه push-woo می‌فرستد ---------- */

function phoenixMeta(p) {
  return {
    english_title: p.englishTitle,
    brand: p.brand,
    fulfillment: p.fulfillment,
    delivery_estimate: p.deliveryEstimate,
    warranty_label: p.warrantyLabel,
    required_inputs: p.requiredInputs ?? [],
    features: p.features ?? [],
    notes: p.notes ?? [],
    faq: p.faq ?? [],
    platforms: p.platforms ?? [],
    accent: p.media?.accent ?? '',
    badges: p.badges ?? [],
    thumbnail: p.media?.thumbnail ?? '',
    logo: p.media?.logo ?? '',
    cover: p.media?.cover ?? '',
    cutout: p.media?.cutout ?? '',
    seed_rating: p.rating ?? 0,
    seed_reviews: p.reviewsCount ?? 0,
    seed_sales: p.salesCount ?? 0,
    ...(p.variants.length === 1
      ? {
        variant_label: p.variants[0].label,
        ...(p.variants[0].guide ? { variant_guide: p.variants[0].guide } : {}),
        ...(p.variants[0].usd ? { variant_usd: p.variants[0].usd } : {}),
      }
      : {}),
    price_mode: 'manual',
  };
}

/* ---------- ۲ آنچه ووکامرس پس می‌دهد ----------

   ⚠ فروشگاهِ *تازه* شبیه‌سازی می‌شود: بدونِ نظر، بدونِ فروش.
   این بدترین حالت است و دقیقاً همان چیزی که بعد از واردات
   پیش می‌آید. */

function asWooResponse(p) {
  const variable = p.variants.length > 1;

  return {
    id: 1,
    slug: p.slug,
    name: p.title,
    type: variable ? 'variable' : 'simple',
    status: 'publish',
    description: p.description ?? '',
    short_description: p.shortDescription ?? '',
    categories: [{ slug: p.category, name: p.category }],
    tags: (p.tags ?? []).map((t) => ({ slug: t, name: t })),
    images: [], // گالری هنوز دانلود نشده — بدترین حالت
    average_rating: '0',
    rating_count: 0,
    total_sales: 0,
    price: String(p.variants[0].price),
    regular_price: String(p.variants[0].compareAt ?? p.variants[0].price),
    sale_price: p.variants[0].compareAt ? String(p.variants[0].price) : '',
    stock_quantity: p.variants[0].stock,
    manage_stock: p.variants[0].stock !== null,
    stock_status: 'instock',
    phoenix: phoenixMeta(p),
    variations: variable ? p.variants.map((_, i) => i + 1) : [],
  };
}

function asWooVariations(p) {
  if (p.variants.length <= 1) return [];
  return p.variants.map((v, i) => ({
    id: i + 1,
    price: String(v.price),
    regular_price: String(v.compareAt ?? v.price),
    sale_price: v.compareAt ? String(v.price) : '',
    stock_quantity: v.stock,
    manage_stock: v.stock !== null,
    stock_status: 'instock',
    attributes: [{ name: 'پلن', option: v.label }],
    phoenix: {
      label: v.label,
      ...(v.usd ? { usd: v.usd } : {}),
      price_mode: 'manual',
      is_default: !!v.isDefault,
      ...(v.guide ? { guide: v.guide } : {}),
    },
  }));
}

/* ---------- ۳ مقایسه ---------- */

const CHECKS = [
  ['عنوان',            (a, b) => a.title === b.title],
  ['عنوان انگلیسی',    (a, b) => a.englishTitle === b.englishTitle],
  ['برند',             (a, b) => a.brand === b.brand],
  ['دسته',             (a, b) => a.category === b.category],
  ['روش تحویل',        (a, b) => a.fulfillment === b.fulfillment],
  ['زمان تحویل',       (a, b) => a.deliveryEstimate === b.deliveryEstimate],
  ['گارانتی',          (a, b) => a.warrantyLabel === b.warrantyLabel],
  ['توضیح کوتاه',      (a, b) => a.shortDescription === b.shortDescription],
  ['توضیح',            (a, b) => a.description === b.description],
  ['تصویر کارت',       (a, b) => a.media.thumbnail === b.media.thumbnail],
  ['لوگو',             (a, b) => (a.media.logo ?? '') === (b.media.logo ?? '')],
  ['کاور',             (a, b) => (a.media.cover ?? '') === (b.media.cover ?? '')],
  ['رنگ شاخص',         (a, b) => a.media.accent === b.media.accent],
  ['امتیاز',           (a, b) => a.rating === b.rating],
  ['تعداد نظر',        (a, b) => a.reviewsCount === b.reviewsCount],
  ['تعداد فروش',       (a, b) => a.salesCount === b.salesCount],
  ['تگ‌ها',            (a, b) => JSON.stringify(a.tags ?? []) === JSON.stringify(b.tags ?? [])],
  ['نشان‌ها',          (a, b) => JSON.stringify(a.badges) === JSON.stringify(b.badges)],
  ['ویژگی‌ها',         (a, b) => JSON.stringify(a.features) === JSON.stringify(b.features)],
  ['نکته‌ها',          (a, b) => JSON.stringify(a.notes ?? []) === JSON.stringify(b.notes ?? [])],
  ['پرسش‌ها',          (a, b) => JSON.stringify(a.faq ?? []) === JSON.stringify(b.faq ?? [])],
  ['پلتفرم‌ها',        (a, b) => JSON.stringify(a.platforms ?? []) === JSON.stringify(b.platforms ?? [])],
  ['ورودی‌های لازم',   (a, b) => (a.requiredInputs ?? []).length === (b.requiredInputs ?? []).length],
  ['تعداد پلن',        (a, b) => a.variants.length === b.variants.length],
  ['قیمتِ پلن‌ها',     (a, b) => a.variants.every((v, i) => v.price === b.variants[i]?.price)],
  ['برچسبِ پلن‌ها',    (a, b) => a.variants.every((v, i) => v.label === b.variants[i]?.label)],
  ['مبلغ دلاریِ پلن',  (a, b) => a.variants.every((v, i) => (v.usd ?? null) === (b.variants[i]?.usd ?? null))],
  ['راهنمای پلن',      (a, b) => a.variants.every((v, i) =>
    JSON.stringify(v.guide ?? null) === JSON.stringify(b.variants[i]?.guide ?? null))],
];

const broken = new Map();
let checked = 0;

for (const local of PRODUCTS) {
  const back = toProduct(asWooResponse(local), asWooVariations(local));
  if (!back) {
    broken.set('محصول اصلاً نگاشت نشد', [...(broken.get('محصول اصلاً نگاشت نشد') ?? []), local.slug]);
    continue;
  }
  for (const [name, ok] of CHECKS) {
    checked++;
    let good = false;
    try { good = ok(local, back); } catch { good = false; }
    if (!good) broken.set(name, [...(broken.get(name) ?? []), local.slug]);
  }
}

console.log('');
console.log(`  ${PRODUCTS.length} محصول × ${CHECKS.length} فیلد = ${checked} بررسی`);
console.log('');

if (!broken.size) {
  console.log('  ✓ هیچ فیلدی گم نمی‌شود. واردات بی‌نقص است.');
  console.log('');
  process.exit(0);
}

console.log('  ✗ این فیلدها گم می‌شوند:');
console.log('');
for (const [field, slugs] of broken) {
  console.log(`     ${field.padEnd(18)} ${slugs.length} محصول`);
  console.log(`     ${' '.repeat(18)} ${slugs.slice(0, 4).join(', ')}${slugs.length > 4 ? ' …' : ''}`);
}
console.log('');
process.exit(1);
