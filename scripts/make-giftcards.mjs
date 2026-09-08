#!/usr/bin/env node
/* ============================================================
   تصویرِ گیفت کارت‌ها

       node scripts/make-giftcards.mjs

   دو اندازه از هر برند ساخته می‌شود:

     ‎-card.webp‎   ۱۲۸۰×۷۲۰ — کارتِ محصول و بنر
     ‎-thumb.webp‎  ۴۰۰×۴۰۰ — مگا منو، سبد خرید، نتیجه‌ی جست‌وجو

   ⚠ بندانگشتی نسخه‌ی کوچکِ کارت نیست.

   کارتِ ۱۶:۹ اگر به مربعِ چهل‌پیکسلی برسد، نوشته‌اش خوانا نیست و
   لوگو هم ریز می‌شود. پس مربع طرحِ خودش را دارد: فقط نشان، بزرگ،
   وسطِ زمینه‌ی برند. در آن اندازه نشان تنها چیزی است که کار
   می‌کند.

   ⚠ شکلِ کارت از خودِ گیفت کارتِ واقعی آمده.

   کارتِ فیزیکی نسبتِ ۸۵٫۶ به ۵۳٫۹ دارد و گوشه‌ی گرد. همان شکل
   وسطِ قاب می‌نشیند تا کاربر در یک نگاه بفهمد این «کارت» است نه
   یک اشتراک — چیزی که با یک مستطیلِ تمام‌قاب منتقل نمی‌شد.
   ============================================================ */

import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGOS = resolve(ROOT, 'public/brand/logos');
const OUT = resolve(ROOT, 'public/giftcards');
mkdirSync(OUT, { recursive: true });

/* اسلاگ، نامِ لاتین، رنگِ برند، فایلِ نشان */
const CARDS = [
  ['giftcard-playstation', 'PlayStation Store', '#0070d1', 'playstation.svg'],
  ['giftcard-xbox', 'Xbox', '#107c10', 'xbox.svg'],
  ['giftcard-steam', 'Steam', '#1b2838', 'steam.svg'],
  ['giftcard-apple', 'App Store & iTunes', '#1d1d1f', 'apple.svg'],
  ['giftcard-google-play', 'Google Play', '#0f9d58', 'googleplay.svg'],
  ['giftcard-amazon', 'Amazon', '#e08800', 'amazon.svg'],
  ['giftcard-netflix', 'Netflix', '#8b0007', 'netflix.svg'],
  ['giftcard-spotify', 'Spotify', '#0f7a37', 'spotify.svg'],
];

/* ⚠ متن باید برای XML امن شود.

   «App Store & iTunes» با آمپرسند خامش، SVG را نامعتبر می‌کند و
   sharp خطای «corrupt header» می‌دهد — پیامی که هیچ ربطی به
   علتش ندارد و وقت می‌برد تا پیدا شود. */
const esc = (t) => t
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - amount);
  const g = Math.max(0, ((n >> 8) & 255) - amount);
  const b = Math.max(0, (n & 255) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function uriOf(file) {
  if (!file) return null;
  const p = resolve(LOGOS, file);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p);
  const mime = file.endsWith('.png') ? 'image/png' : 'image/svg+xml';
  return `data:${mime};base64,${raw.toString('base64')}`;
}

const PHX = uriOf('../phoenix-mark.png');

/* ---------- کارتِ بزرگ ---------- */

function bigCard(title, accent, uri) {
  const W = 1280;
  const H = 720;
  /* کارت با نسبتِ کارتِ بانکی، وسطِ قاب */
  const CW = 760;
  const CH = Math.round((CW * 53.9) / 85.6);
  const CX = (W - CW) / 2;
  const CY = (H - CH) / 2 - 12;

  const logo = uri
    ? `<image href="${uri}" x="${CX + 54}" y="${CY + CH / 2 - 66}" width="132" height="132"
             preserveAspectRatio="xMidYMid meet"/>`
    : '';

  /* بدونِ نشان، نامِ برند بزرگ‌تر می‌شود و جای نشان را پر می‌کند */
  const tx = uri ? CX + 214 : CX + 54;
  const size = uri ? 54 : 62;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${darken(accent, 30)}"/>
      <stop offset="1" stop-color="${darken(accent, 78)}"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${darken(accent, 40)}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.34"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <g filter="url(#sh)">
    <rect x="${CX}" y="${CY}" width="${CW}" height="${CH}" rx="30" fill="url(#card)"/>
    <rect x="${CX}" y="${CY}" width="${CW}" height="${CH}" rx="30" fill="url(#sheen)"/>
    <rect x="${CX + 1}" y="${CY + 1}" width="${CW - 2}" height="${CH - 2}" rx="29"
          fill="none" stroke="#ffffff" stroke-opacity="0.22"/>
  </g>

  ${logo}
  <text x="${tx}" y="${CY + CH / 2 - 4}" font-family="Arial, Helvetica, sans-serif"
        font-size="${size}" font-weight="bold" fill="#ffffff">${esc(title)}</text>
  <text x="${tx}" y="${CY + CH / 2 + 44}" font-family="Arial, Helvetica, sans-serif"
        font-size="28" letter-spacing="5" fill="#ffffff" fill-opacity="0.72">GIFT CARD</text>

  ${PHX ? `<image href="${PHX}" x="72" y="${H - 132}" width="52" height="52" opacity="0.92"/>` : ''}
  <text x="${PHX ? 140 : 72}" y="${H - 98}" font-family="Arial, Helvetica, sans-serif"
        font-size="26" letter-spacing="3" fill="#ffffff" fill-opacity="0.72">PHOENIX SHOP</text>
</svg>`;
}

/* ---------- بندانگشتیِ مربع ---------- */

function thumb(title, accent, uri) {
  const S = 400;
  const logo = uri
    ? `<image href="${uri}" x="${S / 2 - 108}" y="${S / 2 - 118}" width="216" height="216"
             preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${S / 2}" y="${S / 2 + 6}" text-anchor="middle"
             font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="bold"
             fill="#ffffff">${esc(title.split(' ')[0])}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${darken(accent, 46)}"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" rx="72" fill="url(#g)"/>
  ${logo}
  <text x="${S / 2}" y="${S - 62}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="30" letter-spacing="4"
        fill="#ffffff" fill-opacity="0.78">GIFT CARD</text>
</svg>`;
}

let made = 0;
for (const [slug, title, accent, logo] of CARDS) {
  const uri = uriOf(logo);

  await sharp(Buffer.from(bigCard(title, accent, uri)))
    .webp({ quality: 90 })
    .toFile(resolve(OUT, `${slug}-card.webp`));

  await sharp(Buffer.from(thumb(title, accent, uri)))
    .webp({ quality: 92 })
    .toFile(resolve(OUT, `${slug}-thumb.webp`));

  console.log(`✓ ${slug}${logo ? '' : '  (بدون نشان — نامش نوشته شد)'}`);
  made += 1;
}

console.log(`\n${made} گیفت کارت، هرکدام دو اندازه.`);
