/* ============================================================
   بسته‌بندیِ افزونه برای نصب روی وردپرس.

   خروجی: dist/phoenix-bridge-<نسخه>.zip

   ⚠ نسخه از خودِ فایلِ افزونه خوانده می‌شود، نه از جایی دیگر.

   اگر نسخه را دستی این‌جا هم می‌نوشتیم، یک روز یکی‌شان
   به‌روز می‌شد و دیگری نه — و آن‌وقت زیپی به اسمِ ۱٫۲٫۰
   تحویل می‌دادیم که داخلش ۱٫۱٫۰ بود. وردپرس هم نسخه را از
   هدرِ همان فایل می‌خواند، پس تنها منبعِ درست همان است.

   ⚠ و ساختارِ زیپ باید یک پوشه‌ی phoenix-bridge در ریشه داشته
   باشد.

   وردپرس محتویاتِ زیپ را مستقیم در wp-content/plugins باز
   می‌کند. اگر فایل‌ها در ریشه‌ی زیپ باشند، افزونه لای بقیه‌ی
   افزونه‌ها پخش می‌شود و به‌روزرسانیِ بعدی فاجعه است.
   ============================================================ */

import { deflateRawSync, crc32 } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, rmSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const src = join(root, 'wp-plugin', 'phoenix-bridge');
const dist = join(root, 'dist');

/* ---------- نسخه ---------- */

const main = readFileSync(join(src, 'phoenix-bridge.php'), 'utf8');

const header = main.match(/^\s*\*\s*Version:\s*([0-9]+\.[0-9]+\.[0-9]+)\s*$/m);
const constant = main.match(/define\('PHOENIX_BRIDGE_VERSION',\s*'([0-9]+\.[0-9]+\.[0-9]+)'\)/);

if (!header) {
  console.error('✗ هدرِ Version در phoenix-bridge.php پیدا نشد.');
  process.exit(1);
}
if (!constant) {
  console.error('✗ ثابتِ PHOENIX_BRIDGE_VERSION پیدا نشد.');
  process.exit(1);
}

/* ⚠ این دو باید یکی باشند.

   هدر را وردپرس می‌خواند و در فهرستِ افزونه‌ها نشان می‌دهد؛
   ثابت را خودِ کد برای نسخه‌بندیِ فایل‌های CSS استفاده می‌کند.
   اگر یکی جلو بیفتد، وردپرس می‌گوید افزونه به‌روز است ولی
   مرورگرِ ادمین هنوز CSSِ قدیمی را کش کرده. */
if (header[1] !== constant[1]) {
  console.error(`✗ نسخه‌ها یکی نیستند: هدر ${header[1]} ولی ثابت ${constant[1]}`);
  console.error('  هر دو را در phoenix-bridge.php برابر کن.');
  process.exit(1);
}

const version = header[1];

/* ---------- سلامتِ فایل‌ها ---------- */

const must = [
  'phoenix-bridge.php',
  'CHANGELOG.md',
  'includes/db.php',
  'includes/rate.php',
  'includes/pricing.php',
  'includes/discounts.php',
  'includes/admin/admin.php',
  'assets/admin.css',
];

const missing = must.filter((f) => !existsSync(join(src, f)));
if (missing.length) {
  console.error('✗ این فایل‌ها نیستند:\n  ' + missing.join('\n  '));
  process.exit(1);
}

/* شمارشِ فایل‌ها — تا اگر روزی چیزی از قلم افتاد، همین‌جا
   دیده شود نه بعد از نصب روی هاست. */
function walk(dir) {
  let n = 0;
  let bytes = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      const r = walk(p);
      n += r.n;
      bytes += r.bytes;
    } else {
      n++;
      bytes += statSync(p).size;
    }
  }
  return { n, bytes };
}

const { n: fileCount, bytes } = walk(src);

/* ============================================================
   زیپ

   ⚠ خودمان می‌نویسیمش، و دلیلش یک باگِ واقعی است که تحویلِ
   اول را خراب می‌کرد.

   اول با ‎Compress-Archive‎ی ویندوز ساخته می‌شد. نتیجه زیپی
   بود که مسیرهایش با بک‌اسلش نوشته شده بودند:

       phoenix-bridge\includes\db.php

   استانداردِ ZIP اسلشِ رو به جلو می‌خواهد. ویندوز خودش
   بازش می‌کند و چیزی معلوم نمی‌شود — ولی وردپرس روی لینوکس
   بک‌اسلش را جداکننده‌ی پوشه حساب نمی‌کند و *یک فایلِ تخت*
   به اسمِ ‎phoenix-bridge\includes\db.php‎ می‌سازد. یعنی
   افزونه نصب می‌شود ولی هیچ‌کدام از فایل‌هایش سرِ جایش
   نیست، و خطایی هم نمی‌دهد که بشود فهمید چرا.

   ‎zip‎ و ‎tar‎ی درست هم روی این ویندوز در دسترس نبودند، پس
   زیپ با ‎deflateRawSync‎ و ‎crc32‎ی خودِ نود نوشته می‌شود.
   بیست خط بیشتر نیست و جداکننده‌اش قطعاً درست است.
   ============================================================ */

mkdirSync(dist, { recursive: true });

const out = join(dist, `phoenix-bridge-${version}.zip`);
if (existsSync(out)) rmSync(out);

/** همه‌ی فایل‌ها، با مسیرِ داخلِ زیپ */
function collect(dir, prefix, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, e.name);
    /* ⚠ همیشه اسلشِ رو به جلو، هر سیستم‌عاملی که باشیم */
    const zipPath = `${prefix}/${e.name}`;
    if (e.isDirectory()) collect(full, zipPath, acc);
    else acc.push({ full, zipPath });
  }
  return acc;
}

const entries = collect(src, 'phoenix-bridge');

/* ⚠ نگهبانِ همان باگی که یک بار اتفاق افتاد.
   اگر روزی کسی ساختِ مسیر را عوض کند و بک‌اسلش برگردد، این‌جا
   می‌ایستد — نه بعد از نصبِ خراب روی هاست. */
const wrong = entries.filter((e) => e.zipPath.includes('\\'));
if (wrong.length) {
  console.error('✗ مسیرِ داخلِ زیپ بک‌اسلش دارد و وردپرس نمی‌تواند بازش کند:');
  wrong.slice(0, 5).forEach((e) => console.error('   ' + e.zipPath));
  process.exit(1);
}

const locals = [];
const central = [];
let offset = 0;

for (const { full, zipPath } of entries) {
  const raw = readFileSync(full);
  const name = Buffer.from(zipPath, 'utf8');
  const deflated = deflateRawSync(raw, { level: 9 });

  /* اگر فشرده‌سازی کمکی نکرد، خام ذخیره کن */
  const useStore = deflated.length >= raw.length;
  const data = useStore ? raw : deflated;
  const method = useStore ? 0 : 8;
  const crc = crc32(raw);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);   // امضای هدرِ محلی
  local.writeUInt16LE(20, 4);           // نسخه‌ی لازم
  local.writeUInt16LE(0x0800, 6);       // پرچمِ UTF-8 برای نام
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(0, 10);           // زمان
  local.writeUInt16LE(0x21, 12);        // تاریخ (۱۹۸۰) — قطعی، تا زیپ تکرارپذیر بماند
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  locals.push(local, name, data);

  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0);
  cen.writeUInt16LE(20, 4);
  cen.writeUInt16LE(20, 6);
  cen.writeUInt16LE(0x0800, 8);
  cen.writeUInt16LE(method, 10);
  cen.writeUInt16LE(0, 12);
  cen.writeUInt16LE(0x21, 14);
  cen.writeUInt32LE(crc, 16);
  cen.writeUInt32LE(data.length, 20);
  cen.writeUInt32LE(raw.length, 24);
  cen.writeUInt16LE(name.length, 28);
  /* ⚠ ‎>>> 0‎ لازم است: عملگرهای بیتیِ جاوااسکریپت ۳۲بیتیِ
     علامت‌دارند و ‎0o100644 << 16‎ منفی می‌شود. */
  cen.writeUInt32LE((0o100644 << 16) >>> 0, 38); // اجازه‌های یونیکس
  cen.writeUInt32LE(offset, 42);

  central.push(cen, name);
  offset += local.length + name.length + data.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);

const zipBytes = Buffer.concat([...locals, centralBuf, end]);
writeFileSync(out, zipBytes);

/* ⚠ یک نسخه هم داخلِ مخزن، و این عمدی است.

   کارفرما گفت افزونه روی گیت‌هاب باشد تا بعداً بشود
   به‌روزرسانی کرد. کدِ منبع که از اول آن‌جاست، ولی چیزی که
   روی وردپرس نصب می‌شود زیپ است نه کد — و کسی که می‌خواهد
   نصبش کند نباید مجبور باشد اول ریپو را کلون و ‎npm‎ نصب کند.

   هشتاد کیلوبایت به‌ازای هر نسخه، بهای کمی است برای اینکه
   هر نسخه‌ی قدیمی هم همیشه قابلِ دانلود بماند. */
const repoCopy = join(root, 'wp-plugin', 'releases', `phoenix-bridge-${version}.zip`);
mkdirSync(join(root, 'wp-plugin', 'releases'), { recursive: true });
writeFileSync(repoCopy, zipBytes);

const zipKb = Math.round(statSync(out).size / 1024);

console.log('');
console.log('✓ بسته آماده شد.');
console.log('');
console.log(`  نسخه   ${version}`);
console.log(`  فایل   ${fileCount} تا، ${Math.round(bytes / 1024)} کیلوبایت`);
console.log(`  زیپ    dist/phoenix-bridge-${version}.zip (${zipKb} کیلوبایت)`);
console.log(`  و در مخزن: wp-plugin/releases/phoenix-bridge-${version}.zip`);
console.log('');
console.log('  نصب روی وردپرس:');
console.log('    افزونه‌ها ‹ افزودن ‹ بارگذاری افزونه ‹ همین فایل');
console.log('');
console.log('  ⚠ برای به‌روزرسانی، اول افزونه‌ی قبلی را غیرفعال کن');
console.log('    ولی حذفش نکن — تنظیمات و جدول‌ها سرِ جایشان می‌مانند.');
console.log('');
