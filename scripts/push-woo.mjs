#!/usr/bin/env node
/* ============================================================
   انتقال کاتالوگ به ووکامرس

   عکسِ sync-woo: این یکی محصولاتِ محلی را در ووکامرس *می‌سازد*.
   یک بار اجرا می‌شود، موقع راه‌اندازی — وگرنه باید سی‌وسه محصول
   با همه‌ی پلن‌ها و فیلدها دستی وارد شوند.

       npm run push -- --dry     فقط نشان بده چه می‌کند
       npm run push              واقعاً بساز

   ⚠ پیش‌فرض حالت آزمایشی نیست، ولی هیچ‌چیزی را هم پاک نمی‌کند.

   محصولی که اسلاگش از قبل در ووکامرس باشد، رد می‌شود نه
   بازنویسی. دلیلش این است که بعد از اولین اجرا، ووکامرس منبعِ
   حقیقت است: اگر ادمین قیمتی را آن‌جا عوض کرده باشد، اجرای
   دوباره‌ی این اسکریپت نباید برش گرداند. برای بازنویسیِ عمدی
   ‎--force‎ هست.
   ============================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------- محیط ---------- */

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(HERE, '..', name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const WP_URL = (process.env.WORDPRESS_URL ?? '').replace(/\/$/, '');
const KEY = process.env.WOO_CONSUMER_KEY ?? '';
const SECRET = process.env.WOO_CONSUMER_SECRET ?? '';

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');

if (!WP_URL || !KEY || !SECRET) {
  console.error('\n✗ WORDPRESS_URL و WOO_CONSUMER_KEY و WOO_CONSUMER_SECRET لازم‌اند.');
  console.error('  در .env.local بگذارشان.\n');
  console.error('  ⚠ کلید باید دسترسی «خواندن/نوشتن» داشته باشد،');
  console.error('    وگرنه ساختن محصول با خطای ۴۰۱ رد می‌شود.\n');
  process.exit(1);
}

const auth = () =>
  `consumer_key=${encodeURIComponent(KEY)}&consumer_secret=${encodeURIComponent(SECRET)}`;

async function woo(path, opts = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3${path}${sep}${auth()}`, {
      method: opts.method ?? 'GET',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (!res.ok) {
      /* ⚠ آدرس در پیام نمی‌آید چون کلید داخلش است */
      const msg = data && data.message ? data.message : `کد ${res.status}`;
      throw new Error(`${path} → ${msg}`);
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

/* ---------- داده‌ی محلی ---------- */

/* کاتالوگ از خروجیِ بیلد خوانده می‌شود نه از TypeScript، تا این
   اسکریپت به ترنسپایل وابسته نباشد. */
async function loadCatalog() {
  const gen = resolve(HERE, '../src/data/generated/catalog.json');
  const g = JSON.parse(readFileSync(gen, 'utf8'));
  if (g.products && g.products.length) {
    console.log(`کاتالوگ از generated خوانده شد (${g.products.length} محصول)`);
    return g.products;
  }

  /* هنوز همگام نشده — از خودِ ماژول‌های داده می‌خوانیم */
  const url = new URL('../src/data/catalog.ts', import.meta.url);
  console.error('\n✗ generated/catalog.json خالی است.');
  console.error('  این اسکریپت داده‌ی ساخته‌شده می‌خواهد، نه TypeScript خام.');
  console.error(`  فایل: ${url.pathname}`);
  console.error('\n  راه ساده: یک بار `npm run build` بزن تا داده‌ها');
  console.error('  ترنسپایل شوند، بعد دوباره این را اجرا کن.\n');
  process.exit(1);
}

/* ---------- دسته‌بندی ---------- */

const CATEGORY_TITLES = {
  ai: 'هوش مصنوعی',
  creative: 'طراحی و ادیت',
  social: 'شبکه‌های اجتماعی',
  education: 'آموزشی',
  gaming: 'گیم',
  giftcard: 'گیفت کارت',
};

async function ensureCategories() {
  const existing = await woo('/products/categories?per_page=100');
  const bySlug = new Map(existing.map((c) => [c.slug, c.id]));
  const out = {};

  for (const [slug, name] of Object.entries(CATEGORY_TITLES)) {
    if (bySlug.has(slug)) {
      out[slug] = bySlug.get(slug);
      continue;
    }
    if (DRY) {
      console.log(`  [آزمایشی] دسته ساخته می‌شد: ${name}`);
      out[slug] = -1;
      continue;
    }
    const created = await woo('/products/categories', {
      method: 'POST',
      body: { name, slug },
    });
    console.log(`  ✓ دسته ساخته شد: ${name}`);
    out[slug] = created.id;
  }
  return out;
}

/* ---------- محصول ---------- */

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
  };
}

async function pushProduct(p, catIds, existingSlugs) {
  if (existingSlugs.has(p.slug) && !FORCE) {
    console.log(`  – رد شد (از قبل هست): ${p.title}`);
    return 'skipped';
  }

  const variable = p.variants.length > 1;

  const body = {
    name: p.title,
    slug: p.slug,
    type: variable ? 'variable' : 'simple',
    status: 'publish',
    catalog_visibility: 'visible',
    description: p.description ?? '',
    short_description: p.shortDescription ?? '',
    sku: p.englishTitle || p.slug,
    categories: catIds[p.category] > 0 ? [{ id: catIds[p.category] }] : [],
    /* ⚠ محصول دیجیتال است: بدون وزن و بدون حمل‌ونقل.

       اگر virtual نباشد، ووکامرس در پرداخت آدرس و روش ارسال
       می‌خواهد و مشتری گیر می‌کند. */
    virtual: true,
    downloadable: false,
    meta_data: [{ key: '_phoenix', value: phoenixMeta(p) }],
    ...(variable
      ? {
        attributes: [{
          name: 'پلن',
          visible: true,
          variation: true,
          options: p.variants.map((v) => v.label),
        }],
      }
      : {
        regular_price: String(p.variants[0].compareAt ?? p.variants[0].price),
        ...(p.variants[0].compareAt ? { sale_price: String(p.variants[0].price) } : {}),
        manage_stock: p.variants[0].stock !== null,
        ...(p.variants[0].stock !== null ? { stock_quantity: p.variants[0].stock } : {}),
      }),
  };

  if (DRY) {
    console.log(`  [آزمایشی] ${p.title} — ${variable ? p.variants.length + ' پلن' : 'ساده'}`);
    return 'dry';
  }

  const created = await woo('/products', { method: 'POST', body });

  if (variable) {
    for (const v of p.variants) {
      await woo(`/products/${created.id}/variations`, {
        method: 'POST',
        body: {
          regular_price: String(v.compareAt ?? v.price),
          ...(v.compareAt ? { sale_price: String(v.price) } : {}),
          attributes: [{ name: 'پلن', option: v.label }],
          manage_stock: v.stock !== null,
          ...(v.stock !== null ? { stock_quantity: v.stock } : {}),
          meta_data: [{
            key: '_phoenix',
            value: {
              label: v.label,
              ...(v.usd ? { usd: v.usd } : {}),
              is_default: !!v.isDefault,
              ...(v.guide ? { guide: v.guide } : {}),
            },
          }],
        },
      });
    }
  }

  console.log(`  ✓ ${p.title}${variable ? ` (${p.variants.length} پلن)` : ''}`);
  return 'created';
}

/* ---------- اجرا ---------- */

async function main() {
  console.log(DRY ? '\n=== حالت آزمایشی — چیزی ساخته نمی‌شود ===\n' : '\n=== انتقال به ووکامرس ===\n');

  const products = await loadCatalog();

  console.log('بررسی دسته‌بندی‌ها…');
  const catIds = await ensureCategories();

  console.log('\nخواندن محصولات موجود…');
  const existing = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = await woo(`/products?per_page=100&page=${page}&status=any&_fields=id,slug`);
    existing.push(...batch);
    if (batch.length < 100) break;
  }
  const existingSlugs = new Set(existing.map((p) => p.slug));
  console.log(`  ${existing.length} محصول از قبل در ووکامرس هست`);

  console.log('\nانتقال…');
  const tally = { created: 0, skipped: 0, dry: 0, failed: 0 };

  for (const p of products) {
    try {
      const r = await pushProduct(p, catIds, existingSlugs);
      tally[r] += 1;
    } catch (e) {
      /* ⚠ یک محصولِ خراب کل انتقال را متوقف نمی‌کند.

         با سی‌وسه محصول، افتادن روی بیستمی یعنی نوزده‌تا رفته و
         چهارده‌تا نه — و اجرای دوباره باید بقیه را ببرد. برای
         همین خطا شمرده می‌شود و کار ادامه پیدا می‌کند. */
      console.error(`  ✗ ${p.title}: ${e.message}`);
      tally.failed += 1;
    }
  }

  console.log('\n--- نتیجه ---');
  if (tally.created) console.log(`  ساخته شد: ${tally.created}`);
  if (tally.skipped) console.log(`  رد شد (از قبل بود): ${tally.skipped}`);
  if (tally.dry) console.log(`  آزمایشی: ${tally.dry}`);
  if (tally.failed) console.log(`  ناموفق: ${tally.failed}`);

  if (!DRY && tally.created) {
    console.log('\nحالا در پیشخوان ووکامرس:');
    console.log('  ۱ تصویر هر محصول را آپلود کن — تصویرها منتقل نمی‌شوند');
    console.log('  ۲ برای محصولاتی که کد دارند، انبار کد را پر کن');
    console.log('  ۳ بعد اینجا `npm run sync` بزن تا سایت از ووکامرس بخواند');
  }
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}\n`);
  process.exit(1);
});
