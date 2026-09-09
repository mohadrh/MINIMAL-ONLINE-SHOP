#!/usr/bin/env node
/* ============================================================
   بیلد برای هاست خودمان

       npm run build:host

   با `npm run build` فرق دارد و تفاوتش یک چیز است که اگر رعایت
   نشود کل سایت می‌شکند:

   ⚠ روی GitHub Pages سایت زیر مسیرِ /MINIMAL-ONLINE-SHOP می‌نشیند،
   پس همه‌ی لینک‌ها و فایل‌ها با آن پیشوند ساخته می‌شوند. روی
   دامنه‌ی خودتان سایت در ریشه است. اگر همان بیلد را آپلود کنید،
   مرورگر دنبال ‎/MINIMAL-ONLINE-SHOP/_next/…‎ می‌گردد، پیدا
   نمی‌کند، و صفحه بدون هیچ استایلی بالا می‌آید — سفید و به‌هم‌ریخته.

   این اسکریپت همان بیلد را بدون پیشوند می‌سازد و یک .htaccess
   کنارش می‌گذارد.

   ⚠ طراحی هیچ فرقی نمی‌کند. فقط آدرس‌ها.
   ============================================================ */

import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

console.log('\n=== بیلد برای هاست ===\n');

/* پوشه‌های قبلی پاک می‌شوند، وگرنه فایل‌های بیلدِ گیت‌هاب با
   پیشوندِ اشتباه لای فایل‌های تازه می‌مانند. */
for (const dir of ['.next', 'out']) {
  const p = resolve(ROOT, dir);
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    console.log(`  پاک شد: ${dir}`);
  }
}

console.log('\nدر حال بیلد…\n');

const res = spawnSync('npx', ['next', 'build'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    STATIC_EXPORT: '1',
    /* ⚠ خالی، نه حذف‌شده.

       اگر متغیر را برداریم، مقدارِ .env.local می‌نشیند و دوباره
       پیشوند می‌خورد. رشته‌ی خالی صریحاً می‌گوید «ریشه». */
    NEXT_PUBLIC_BASE_PATH: '',

    /* ⚠ دامنه‌ی خودمان، نه گیت‌هاب.

       نقشه‌ی سایت و کارتِ اشتراک‌گذاری نشانیِ کامل می‌خواهند. اگر
       این‌جا ست نشود و ‎.env.local‎ آدرسِ گیت‌هاب داشته باشد،
       نقشه‌ای آپلود می‌شود که همه‌ی آدرس‌هایش به سایتِ دیگری
       اشاره می‌کند — و گوگل دامنه‌ی خودمان را نمی‌بیند. */
    NEXT_PUBLIC_SITE_URL: process.env.PHOENIX_SITE_URL ?? 'https://phonixmarket.com',
  },
});

if (res.status !== 0) {
  console.error('\n✗ بیلد شکست خورد.\n');
  process.exit(1);
}

/* ---------- .htaccess ---------- */

const HTACCESS = `# ============================================================
#  فونیکس شاپ — تنظیمات سرور
#  این فایل را همراه بقیه در public_html بگذارید.
# ============================================================

# ---------- HTTPS اجباری ----------
# بدون این، درگاه پرداخت وصل نمی‌شود و مرورگر هشدار می‌دهد.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !https
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

# ---------- صفحه‌ی ۴۰۴ ----------
ErrorDocument 404 /404.html

# ---------- فهرست پوشه نمایش داده نشود ----------
# وگرنه هر کسی می‌تواند فایل‌های داخل پوشه‌ها را ببیند.
Options -Indexes

# ---------- فشرده‌سازی ----------
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript
  AddOutputFilterByType DEFLATE application/javascript application/json
  AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>

# ---------- کش ----------
# فایل‌های _next نامشان هش دارد، پس تغییر که کنند نامشان هم عوض
# می‌شود؛ می‌شود یک سال کششان کرد. HTML نه — باید تازه بماند.
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 6 months"
  ExpiresByType image/png "access plus 6 months"
  ExpiresByType image/jpeg "access plus 6 months"
  ExpiresByType image/svg+xml "access plus 6 months"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(css|js|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.html$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>

  # ---------- چند هدر امنیتی ----------
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# ---------- فایل‌هایی که نباید سرو شوند ----------
<FilesMatch "^(\\.env|\\.git|package\\.json|.*\\.md)$">
  Require all denied
</FilesMatch>
`;

writeFileSync(resolve(ROOT, 'out/.htaccess'), HTACCESS, 'utf8');

console.log('\n✓ آماده است.\n');
console.log('  پوشه‌ی out/ را باز کن و *محتویاتش* را در public_html هاست بریز.');
console.log('  ⚠ خودِ پوشه‌ی out را نه — محتویاتش را.\n');
console.log('  فایل .htaccess هم ساخته شد و باید همراهشان برود.');
console.log('  (در فایل‌منیجر هاست، «نمایش فایل‌های مخفی» را روشن کن تا ببینیش.)\n');

/* ⚠ هشدارِ لازم، چون شبیهِ باگ به نظر می‌رسد.

   این اسکریپت ‎.next‎ را پاک می‌کند. اگر ‎npm run dev‎ هم‌زمان
   بالا باشد، کشش زیر پایش می‌رود و از آن لحظه صفحه‌ها بی‌استایل
   یا با «Cannot find module ./vendor-chunks/…» بالا می‌آیند —
   در حالی که کد هیچ ایرادی ندارد. */
console.log('  ⚠ اگر «npm run dev» باز بود، همین حالا ببند و دوباره بازش کن.');
console.log('    این دستور کشِ توسعه را پاک می‌کند و سرورِ باز از آن به بعد');
console.log('    صفحه‌ی بی‌استایل یا خطای chunk نشان می‌دهد — ایرادِ کد نیست.\n');
