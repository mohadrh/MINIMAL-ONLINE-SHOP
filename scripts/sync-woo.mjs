#!/usr/bin/env node
/* ============================================================
   همگام‌سازی کاتالوگ از ووکامرس

   روی ماشینِ بیلد اجرا می‌شود، نه در مرورگر. محصولات را می‌خواند،
   به شکلِ فونیکس درمی‌آورد و در src/data/generated/catalog.json
   می‌نویسد.

       npm run sync

   ⚠ این تنها جایی است که کلیدِ ووکامرس لازم است، و همان‌جا هم فقط
   از متغیرِ محیطی خوانده می‌شود. کلید هیچ‌وقت در کد و هیچ‌وقت در
   خروجی نمی‌نشیند.

   اگر چیزی خطا بدهد، فایلِ قبلی دست‌نخورده می‌ماند: نوشتن فقط بعد
   از موفقیتِ کاملِ خواندن انجام می‌شود. یک شبکه‌ی قطع نباید
   کاتالوگ را خالی کند.
   ============================================================ */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../src/data/generated/catalog.json');

/* ---------- محیط ---------- */

/** .env.local را دستی می‌خوانیم — این اسکریپت بیرون از Next اجرا می‌شود */
function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(HERE, '..', name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, k, vRaw] = m;
      if (process.env[k]) continue;
      process.env[k] = vRaw.replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const WP_URL = (process.env.WORDPRESS_URL ?? '').replace(/\/$/, '');
const KEY = process.env.WOO_CONSUMER_KEY ?? '';
const SECRET = process.env.WOO_CONSUMER_SECRET ?? '';
const BRIDGE = (process.env.NEXT_PUBLIC_BRIDGE_URL ?? '').replace(/\/$/, '');

const TIMEOUT = Number(process.env.WOO_TIMEOUT_MS ?? 15000);

/* ---------- ابزار ---------- */

async function getJson(url, label) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) {
      /* ⚠ آدرس در پیام نمی‌آید چون کلید داخلش است */
      throw new Error(`${label}: کد ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const auth = () =>
  `consumer_key=${encodeURIComponent(KEY)}&consumer_secret=${encodeURIComponent(SECRET)}`;

/* ---------- نگاشت ---------- */

const CATEGORY_MAP = {
  ai: 'ai', 'hoosh-masnoei': 'ai', 'artificial-intelligence': 'ai',
  creative: 'creative', design: 'creative', tarrahi: 'creative',
  social: 'social', 'shabakeh-ejtemai': 'social',
  education: 'education', amoozeshi: 'education',
  gaming: 'gaming', games: 'gaming', gim: 'gaming',
  giftcard: 'giftcard', 'gift-card': 'giftcard', 'gift-cards': 'giftcard',
};

const FULFILLMENTS = ['stock_code', 'stock_account', 'upgrade_on_user', 'api_topup', 'manual'];
const BADGES = ['hot', 'new', 'bestseller', 'limited'];
const INPUT_TYPES = ['text', 'email', 'number'];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

function stripHtml(html) {
  if (!html) return '';
  return String(html)
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

function category(p) {
  for (const c of p.categories ?? []) {
    const hit = c.slug && CATEGORY_MAP[c.slug];
    if (hit) return hit;
  }
  return 'ai';
}

function variantFrom(v, i) {
  const px = v.phoenix ?? {};
  const price = num(v.price ?? v.regular_price);
  const regular = num(v.regular_price);
  const label =
    px.label ||
    (v.attributes ?? []).map((a) => a.option).filter(Boolean).join(' — ') ||
    `پلن ${i + 1}`;

  return {
    id: String(v.id ?? `v${i}`),
    label,
    price,
    ...(v.on_sale && regular > price ? { compareAt: regular } : {}),
    ...(typeof px.usd === 'number' ? { usd: px.usd } : {}),
    stock:
      v.stock_status === 'outofstock'
        ? 0
        : v.manage_stock
          ? (v.stock_quantity ?? null)
          : null,
    isDefault: px.is_default === true || i === 0,
    ...(px.guide?.fit && px.guide?.detail ? { guide: px.guide } : {}),
  };
}

function productFrom(p, variations) {
  const px = p.phoenix ?? {};
  const variants = variations.length
    ? variations.map(variantFrom)
    : [
      {
        id: String(p.id),
        label: 'خرید',
        price: num(p.price ?? p.regular_price),
        ...(p.on_sale && num(p.regular_price) > num(p.price)
          ? { compareAt: num(p.regular_price) }
          : {}),
        stock:
          p.stock_status === 'outofstock'
            ? 0
            : p.manage_stock
              ? (p.stock_quantity ?? null)
              : null,
        isDefault: true,
      },
    ];

  if (!variants.some((v) => v.isDefault) && variants[0]) variants[0].isDefault = true;

  const images = (p.images ?? []).map((im) => im.src).filter(Boolean);

  return {
    id: String(p.id),
    slug: p.slug ?? String(p.id),
    title: stripHtml(p.name) || 'بدون نام',
    englishTitle: px.english_title ?? p.sku ?? '',
    brand: px.brand ?? '',
    category: category(p),
    fulfillment: FULFILLMENTS.includes(px.fulfillment) ? px.fulfillment : 'manual',
    requiredInputs: Array.isArray(px.required_inputs)
      ? px.required_inputs
        .filter((r) => r && r.key && r.label)
        .map((r) => ({
          key: r.key,
          label: r.label,
          ...(r.hint ? { hint: r.hint } : {}),
          type: INPUT_TYPES.includes(r.type) ? r.type : 'text',
          ...(r.pattern ? { pattern: r.pattern } : {}),
          ...(r.example ? { example: r.example } : {}),
        }))
      : [],
    deliveryEstimate: px.delivery_estimate ?? 'در اسرع وقت، توسط سیستم',
    warrantyLabel: px.warranty_label ?? 'گارانتی تمام دوره',
    variants,
    media: {
      thumbnail: images[0] ?? '',
      ...(px.cover || images[1] ? { cover: px.cover ?? images[1] } : {}),
      ...(px.cutout ? { cutout: px.cutout } : {}),
      accent: px.accent || '#6340d8',
    },
    ...(Array.isArray(px.platforms) ? { platforms: px.platforms } : {}),
    shortDescription: stripHtml(p.short_description),
    description: stripHtml(p.description),
    features: Array.isArray(px.features) ? px.features : [],
    ...(Array.isArray(px.notes) ? { notes: px.notes } : {}),
    ...(Array.isArray(px.faq)
      ? { faq: px.faq.filter((f) => f && f.q && f.a).map((f) => ({ q: f.q, a: f.a })) }
      : {}),
    rating: Number(p.average_rating ?? 0) || 0,
    reviewsCount: p.rating_count ?? 0,
    salesCount: p.total_sales ?? 0,
    badges: (px.badges ?? []).filter((b) => BADGES.includes(b)),
    tags: (p.tags ?? []).map((t) => t.slug).filter(Boolean),
  };
}

/* ---------- خواندن ---------- */

async function viaWoo() {
  const products = [];
  for (let page = 1; page <= 50; page += 1) {
    const batch = await getJson(
      `${WP_URL}/wp-json/wc/v3/products?status=publish&per_page=100&page=${page}&${auth()}`,
      'خواندن محصولات',
    );
    products.push(...batch);
    if (batch.length < 100) break;
  }

  const out = [];
  for (const p of products) {
    let variations = [];
    if (p.type === 'variable') {
      variations = await getJson(
        `${WP_URL}/wp-json/wc/v3/products/${p.id}/variations?per_page=100&${auth()}`,
        `واریاسیون محصول ${p.id}`,
      );
    }
    out.push(productFrom(p, variations));
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  return out;
}

async function viaBridge() {
  const list = await getJson(`${BRIDGE}/wp-json/phoenix/v1/catalog`, 'خواندن از پل');
  return list.map((p) => productFrom(p, p._variants ?? []));
}

/* ---------- اجرا ---------- */

async function main() {
  let source;
  if (WP_URL && KEY && SECRET) source = 'woo';
  else if (BRIDGE) source = 'bridge';
  else {
    console.error('\n✗ نه کلید ووکامرس ست است نه آدرس پل.');
    console.error('  یکی از این دو را در .env.local بگذار:');
    console.error('    WORDPRESS_URL + WOO_CONSUMER_KEY + WOO_CONSUMER_SECRET');
    console.error('    یا NEXT_PUBLIC_BRIDGE_URL\n');
    process.exit(1);
  }

  console.log(`همگام‌سازی از ${source}…`);
  const products = source === 'woo' ? await viaWoo() : await viaBridge();

  if (!products.length) {
    /* ⚠ فایلِ قبلی را با آرایه‌ی خالی جایگزین نمی‌کنیم.

       اگر ووکامرس موقتاً خالی جواب بدهد و ما بنویسیم، بیلدِ بعدی
       فروشگاهِ خالی می‌سازد و کسی هم متوجه نمی‌شود. */
    console.error('✗ هیچ محصولی برنگشت. فایل قبلی دست‌نخورده ماند.');
    process.exit(1);
  }

  const payload = {
    source,
    syncedAt: new Date().toISOString(),
    products,
  };
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const plans = products.reduce((n, p) => n + p.variants.length, 0);
  console.log(`✓ ${products.length} محصول و ${plans} پلن نوشته شد در`);
  console.log(`  src/data/generated/catalog.json`);

  /* گزارشِ چیزهایی که ادمین باید پر کند — بی‌صدا رد نمی‌شوند */
  const noImage = products.filter((p) => !p.media.thumbnail).map((p) => p.slug);
  const noDesc = products.filter((p) => !p.shortDescription).map((p) => p.slug);
  const noInputs = products
    .filter((p) => p.fulfillment === 'upgrade_on_user' && !p.requiredInputs.length)
    .map((p) => p.slug);

  if (noImage.length) console.warn(`⚠ بدون تصویر: ${noImage.join(', ')}`);
  if (noDesc.length) console.warn(`⚠ بدون توضیح کوتاه: ${noDesc.join(', ')}`);
  if (noInputs.length) {
    console.warn(`⚠ ارتقای اکانت ولی بدون ورودی لازم: ${noInputs.join(', ')}`);
  }
}

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  console.error('  فایل قبلی دست‌نخورده ماند.');
  process.exit(1);
});
