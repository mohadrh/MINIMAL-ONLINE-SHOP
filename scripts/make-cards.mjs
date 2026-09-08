#!/usr/bin/env node
/* ============================================================
   ساختِ تصویرِ کارتِ محصول‌ها

       node scripts/make-cards.mjs

   ⚠ حرفِ اول جایش را به نشان می‌دهد.

   نسخه‌ی قبلی پشتِ نامِ هر محصول یک حرفِ بزرگِ محو داشت — «C»
   برای ChatGPT، «F» برای Figma. همان ایرادی که کارفرما یک بار
   روی کاشی‌های بنر گرفت: آدم سرویس را از روی شکلش می‌شناسد نه از
   روی حرفِ اولش، و حرفِ تنها شبیهِ کارِ نیمه‌تمام است.

   حالا خودِ نشان آن‌جاست: بزرگ و محو در پس‌زمینه، و یک نسخه‌ی
   کوچکِ واضح در گوشه.

   ⚠ متن فقط لاتین است.

   عنوانِ کارت‌ها لاتین‌اند و librsvg روی هر سیستمی فونتِ لاتین
   دارد. اگر روزی متنِ فارسی این‌جا اضافه شود، اول باید فونتش
   کنارِ اسکریپت بیاید وگرنه خروجی روی یک ماشین درست و روی ماشینِ
   دیگر مربع‌های خالی می‌شود.
   ============================================================ */

import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGOS = resolve(ROOT, 'public/brand/logos');
const OUT = resolve(ROOT, 'public/products');

const W = 1280;
const H = 720;

/** محصول → نام لاتین، رنگِ برند، فایلِ نشان، برچسبِ بالا */
const CARDS = [
  ['chatgpt-card', 'ChatGPT', '#10a37f', 'openai.svg', 'Subscription'],
  ['claude-pro-card', 'Claude Pro', '#c8613f', 'claude-burst.svg', 'Subscription'],
  ['gemini-pro-card', 'Gemini Pro', '#3b6fe0', 'gemini.svg', 'Subscription'],
  ['canva-pro-card', 'Canva Pro', '#00a3aa', 'canva.svg', 'Subscription'],
  ['capcut-pro-card', 'CapCut Pro', '#1a1a1a', 'capcut.svg', 'Subscription'],
  ['figma-card', 'Figma', '#8b45e0', 'figma.svg', 'Subscription'],
  ['spotify-premium-card', 'Spotify', '#169c47', 'spotify.svg', 'Premium'],
  ['midjourney-card', 'Midjourney', '#3f3fb8', 'midjourney.svg', 'Subscription'],
  ['higgsfield-card', 'Higgsfield', '#7d9c12', 'higgsfield.svg', 'Subscription'],
  ['firefly-card', 'Adobe Firefly', '#b8001c', 'firefly.svg', 'Subscription'],
  ['grok-card', 'Grok', '#1a1a1a', 'grok.svg', 'Subscription'],
  ['nano-banana-card', 'Nano Banana', '#b89c00', 'nano-banana.svg', 'Subscription'],
  ['leonardo-card', 'Leonardo', '#6d3fd4', null, 'Subscription'],
  ['copilot-card', 'GitHub Copilot', '#5b34ad', 'copilot.svg', 'Subscription'],
];

/** تیره‌کردنِ رنگ برای انتهای گرادیانت */
function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - amount);
  const g = Math.max(0, ((n >> 8) & 255) - amount);
  const b = Math.max(0, (n & 255) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** نشان را به‌صورت data URI درمی‌آورد تا داخل SVGِ کارت جا شود */
function logoUri(file) {
  const p = resolve(LOGOS, file);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, 'utf8');
  return `data:image/svg+xml;base64,${Buffer.from(raw, 'utf8').toString('base64')}`;
}

let made = 0;
let skipped = 0;

for (const [name, title, accent, logo, label] of CARDS) {
  const uri = logo ? logoUri(logo) : null;

  if (logo && !uri) {
    console.log(`— ${name}: نشانِ ${logo} نیست`);
    skipped += 1;
    continue;
  }

  /* ⚠ نشانِ محو با opacity می‌آید نه با رنگِ روشن‌تر.

     رنگِ روشن‌تر یعنی برای هر برند یک عددِ جدا. شفافیت روی هر
     زمینه‌ای همان نسبت را نگه می‌دارد.

     ⚠ زیرش یک صفحه‌ی سفیدِ کم‌رنگ لازم است.

     اولین نسخه فقط نشانِ محو داشت و برای کلاد و جمنای جواب
     نداد: رنگِ خودِ نشان به رنگِ کارت نزدیک بود و در آن گم
     می‌شد. صفحه‌ی سفید نشان را از زمینه جدا می‌کند، هر رنگی
     که باشد. */
  const ghost = uri
    ? `<g opacity="0.9">
         <rect x="${W - 486}" y="${H / 2 - 226}" width="452" height="452" rx="96"
               fill="#ffffff" fill-opacity="0.11"/>
         <image href="${uri}" x="${W - 446}" y="${H / 2 - 186}" width="372" height="372"
                opacity="0.5" preserveAspectRatio="xMidYMid meet"/>
       </g>`
    : '';

  const badge = uri
    ? `<image href="${uri}" x="72" y="${H - 168}" width="72" height="72"
             opacity="0.95" preserveAspectRatio="xMidYMid meet"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${darken(accent, 46)}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.42" r="0.55">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${ghost}
  <text x="72" y="112" font-family="Arial, Helvetica, sans-serif"
        font-size="30" fill="#ffffff" fill-opacity="0.72">${label}</text>
  <text x="72" y="${H / 2 + 26}" font-family="Arial, Helvetica, sans-serif"
        font-size="88" font-weight="bold" fill="#ffffff">${title}</text>
  ${badge}
  <text x="${W - 72}" y="${H - 72}" text-anchor="end"
        font-family="Arial, Helvetica, sans-serif" font-size="26"
        letter-spacing="3" fill="#ffffff" fill-opacity="0.6">PHOENIX SHOP</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .webp({ quality: 88 })
    .toFile(resolve(OUT, `${name}.webp`));

  console.log(`✓ ${name}.webp`);
  made += 1;
}

console.log(`\n${made} کارت ساخته شد${skipped ? `، ${skipped} تا رد شد` : ''}.`);
