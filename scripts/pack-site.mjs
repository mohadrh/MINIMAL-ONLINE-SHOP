/* ============================================================
   بسته‌بندیِ سایت برای آپلود روی هاست.

   خروجی: dist/phonixmarket-site.zip

   ⚠ محتویاتِ ‎out‎ در ریشه‌ی زیپ می‌نشیند، نه خودِ پوشه‌ی ‎out‎.

   این یکی از همان اشتباه‌هایی است که ده دقیقه وقت می‌برد تا
   بفهمی چه شده: اگر پوشه را زیپ کنی، بعد از Extract در
   ‎public_html‎ همه‌چیز داخلِ ‎public_html/out/‎ می‌افتد و سایت
   روی ‎phonixmarket.com/out/‎ بالا می‌آید، نه روی خودِ دامنه.

   پس این اسکریپت خودش درستش می‌کند و جای اشتباه نمی‌گذارد.
   ============================================================ */

import { mkdirSync, existsSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { collect, makeZip } from './lib/zip.mjs';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'out');
const dist = join(root, 'dist');
const zipPath = join(dist, 'phonixmarket-site.zip');

/* ---------- ‎out‎ باید باشد و تازه باشد ---------- */

if (!existsSync(out)) {
  console.error('✗ پوشه‌ی out/ نیست.');
  console.error('  اول این را بزن:  npm run build:host');
  process.exit(1);
}

const index = join(out, 'index.html');
if (!existsSync(index)) {
  console.error('✗ out/index.html نیست — بیلد ناقص است.');
  console.error('  دوباره بزن:  npm run build:host');
  process.exit(1);
}

/* ⚠ بیلدِ گیت‌هابی را نباید روی هاست گذاشت.

   ‎npm run build‎ همه‌ی آدرس‌ها را با پیشوندِ
   ‎/MINIMAL-ONLINE-SHOP‎ می‌سازد. اگر آن را آپلود کنی، مرورگر
   دنبالِ فایل‌هایی می‌گردد که وجود ندارند و سایت **سفید و
   بی‌استایل** بالا می‌آید — و هیچ خطایی هم نمی‌بینی که بفهمی
   چرا. این‌جا همان را می‌گیریم. */
const html = (await import('node:fs')).readFileSync(index, 'utf8');
if (html.includes('/MINIMAL-ONLINE-SHOP/')) {
  console.error('✗ این بیلد برای گیت‌هاب است، نه برای هاست.');
  console.error('  آدرس‌هایش پیشوندِ /MINIMAL-ONLINE-SHOP دارند و روی');
  console.error('  دامنه‌ی خودت سایت بی‌استایل بالا می‌آید.');
  console.error('');
  console.error('  درستش:  npm run build:host');
  process.exit(1);
}

/* ---------- ‎.htaccess‎ ---------- */

const htaccess = join(out, '.htaccess');
if (!existsSync(htaccess)) {
  console.error('✗ out/.htaccess نیست.');
  console.error('  بدونش HTTPSِ اجباری و صفحه‌ی ۴۰۴ کار نمی‌کنند.');
  process.exit(1);
}

/* ---------- زیپ ---------- */

const entries = collect(out, '');

const hasHtaccess = entries.some((e) => e.zipPath === '.htaccess');
if (!hasHtaccess) {
  console.error('✗ ‎.htaccess‎ در فهرستِ زیپ نیامد.');
  process.exit(1);
}

mkdirSync(dist, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath);

const bytes = makeZip(entries);
writeFileSync(zipPath, bytes);

const mb = (n) => (n / 1024 / 1024).toFixed(1);
const rawBytes = entries.reduce((n, e) => n + e.size, 0);

console.log('');
console.log('✓ بسته‌ی سایت آماده شد.');
console.log('');
console.log(`  فایل   ${entries.length} تا، ${mb(rawBytes)} مگابایت`);
console.log(`  زیپ    dist/phonixmarket-site.zip (${mb(statSync(zipPath).size)} مگابایت)`);
console.log('');
console.log('  روی هاست:');
console.log('    ۱  دایرکت‌ادمین ‹ File Manager ‹ public_html');
console.log('    ۲  هرچه داخلش هست پاک کن');
console.log('    ۳  همین فایل را آپلود کن');
console.log('    ۴  راست‌کلیک ‹ Extract');
console.log('    ۵  خودِ فایلِ زیپ را پاک کن');
console.log('');
console.log('  ⚠ بعد از Extract، فایل‌ها باید مستقیم در public_html');
console.log('    باشند — نه داخلِ یک پوشه‌ی دیگر.');
console.log('');
console.log('  ⚠ در File Manager گزینه‌ی Show Hidden Files را روشن کن');
console.log('    و مطمئن شو ‎.htaccess‎ آن‌جاست.');
console.log('');
