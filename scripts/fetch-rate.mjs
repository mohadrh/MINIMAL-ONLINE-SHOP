#!/usr/bin/env node
/* ============================================================
   گرفتنِ نرخِ دلار در زمانِ بیلد

       node scripts/fetch-rate.mjs

   ⚠ چرا زمانِ بیلد و نه در مرورگر.

   سایت خروجیِ ایستا دارد و بک‌اندی همراهش نیست. اندپوینتِ
   phoenix/v1/rate در افزونه ساخته شده ولی تا وقتی وردپرس بالا
   نیامده، در دسترس نیست.

   این‌جا نرخ همان لحظه‌ی بیلد گرفته می‌شود و در فایل می‌نشیند.
   یعنی هر بار که سایت منتشر می‌شود، نرخش تازه است — و اگر روزی
   منبع از کار بیفتد، نرخِ قبلی سرِ جایش می‌ماند و بیلد نمی‌شکند.

   ⚠ عدد ریال است نه تومان.

   tgju مثل بیشترِ منابعِ ایرانی ریال می‌دهد: «۲٬۲۶۵٬۰۵۰» یعنی
   دویست‌وبیست‌وشش‌هزار تومان. یک بار تقسیم بر ده جا بیفتد،
   قیمتِ کلِ فروشگاه ده برابر می‌شود.

   ⚠ این نرخِ بازارِ آزاد است، نه نرخِ فروشِ ما.

   گیفت کارت و اشتراک معمولاً چند درصد بالاتر از نرخِ خامِ دلار
   فروخته می‌شوند. حاشیه در PROFIT_MARGIN نوشته شده و کارفرما
   باید تأییدش کند.
   ============================================================ */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'src/data/generated');
const OUT = resolve(OUT_DIR, 'rate.json');

/** حاشیه‌ی فروش روی نرخِ خامِ بازار. ۱ یعنی بدونِ حاشیه. */
const PROFIT_MARGIN = 1.0;

/* منابع، به ترتیبِ اولویت. اولی که جواب بدهد برنده است. */
const SOURCES = [
  {
    name: 'tgju',
    url: 'https://call.tgju.org/ajax.json',
    pick: (d) => d?.current?.price_dollar_rl?.p,
    unit: 'rial',
  },
];

/** «۲,۲۶۵,۰۵۰» → 2265050 */
function toNumber(raw) {
  if (raw === undefined || raw === null) return NaN;
  return Number(String(raw).replace(/[,٬\s]/g, ''));
}

async function fetchRate() {
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.url, {
        signal: AbortSignal.timeout(15_000),
        headers: { 'user-agent': 'phoenix-shop-build' },
      });
      if (!res.ok) { console.log(`— ${src.name}: HTTP ${res.status}`); continue; }

      const value = toNumber(src.pick(await res.json()));
      if (!Number.isFinite(value) || value <= 0) {
        console.log(`— ${src.name}: عددی پیدا نشد`);
        continue;
      }

      const toman = src.unit === 'rial' ? value / 10 : value;

      /* ⚠ محدوده‌ی معقول.

         اگر منبع روزی ساختارِ پاسخش را عوض کند ممکن است عددی
         بی‌ربط برگردد — و قیمتِ کلِ فروشگاه به آن گره خورده. */
      if (toman < 10_000 || toman > 10_000_000) {
        console.log(`— ${src.name}: ${toman} بیرونِ محدوده‌ی معقول`);
        continue;
      }

      return { rate: Math.round(toman * PROFIT_MARGIN), source: src.name };
    } catch (e) {
      console.log(`— ${src.name}: ${e.message}`);
    }
  }
  return null;
}

const fresh = await fetchRate();

if (fresh) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT,
    `${JSON.stringify({ ...fresh, at: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
  console.log(`✓ نرخ دلار: ${fresh.rate.toLocaleString('fa-IR')} تومان  (${fresh.source})`);
} else if (existsSync(OUT)) {
  const old = JSON.parse(readFileSync(OUT, 'utf8'));
  console.log(`⚠ منبع جواب نداد. نرخِ قبلی می‌ماند: ${old.rate.toLocaleString('fa-IR')} تومان (${old.at})`);
} else {
  console.log('⚠ منبع جواب نداد و نرخِ ذخیره‌شده‌ای هم نیست. نرخِ پیش‌فرضِ کد می‌ماند.');
}
