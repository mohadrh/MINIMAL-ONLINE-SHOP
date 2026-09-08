#!/usr/bin/env node
/* ============================================================
   بنرِ کنسول‌ها

       node scripts/make-gamebanners.mjs

   ⚠ این‌ها با SlideArt فرق دارند و عمداً تصویرند.

   بنرهای برداری برای اشتراک‌ها خوب‌اند: نشانِ سرویس روی کارتِ
   رنگی، همین. ولی بازی را کسی از روی نشانِ کنسول انتخاب نمی‌کند
   — از روی خودِ بازی انتخاب می‌کند. پس این‌جا کاورِ بازی‌ها
   خودشان تصویرند و نشانِ کنسول فقط می‌گوید مالِ کدام دستگاه است.

   ⚠ کاورها زاویه‌دار روی هم می‌نشینند، نه کنارِ هم.

   سه کاورِ صافِ کنارِ هم مثل جدول به نظر می‌رسد. با چرخشِ کم و
   هم‌پوشانی، حسِ «قفسه‌ی بازی» می‌دهد — همان چیزی که خریدارِ
   بازی می‌شناسد.
   ============================================================ */

import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAMES = resolve(ROOT, 'public/games');
const LOGOS = resolve(ROOT, 'public/brand/logos');
const OUT = resolve(ROOT, 'public/hero/banner');

const W = 1280;
const H = 720;

const BANNERS = [
  {
    out: 'slide-ps-games',
    title: 'PlayStation',
    sub: 'GAME ACCOUNTS',
    accent: '#0070d1',
    logo: 'playstation.svg',
    covers: ['marvels-wolverine.webp', 'saros.webp', 'resident-evil-9-requiem.webp'],
  },
  {
    out: 'slide-xbox-games',
    title: 'Xbox',
    sub: 'GAME ACCOUNTS',
    accent: '#107c10',
    logo: 'xbox.svg',
    covers: ['starfield.webp', 'ea-sports-fc-26.webp', 'hades-2.webp'],
  },
];

function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - amount);
  const g = Math.max(0, ((n >> 8) & 255) - amount);
  const b = Math.max(0, (n & 255) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function uriOf(dir, file) {
  const p = resolve(dir, file);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p);
  const mime = file.endsWith('.png') ? 'image/png' : 'image/svg+xml';
  return `data:${mime};base64,${raw.toString('base64')}`;
}

/* ⚠ کاورها باید PNG شوند، نه وب‌پی.

   librsvg وب‌پیِ داخلِ data URI را نمی‌خواند و بی‌صدا هیچ‌چیز
   نمی‌کشد — نه خطا می‌دهد نه لاگ. نتیجه‌اش قاب‌های خالی بود که
   تا چشم ندیدشان معلوم نشد. */
async function coverUri(file) {
  const p = resolve(GAMES, file);
  if (!existsSync(p)) return null;
  const png = await sharp(p).resize(620, 826, { fit: 'cover' }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

/* نشانِ کنسول روی زمینه‌ی تیره باید سفید باشد. رنگش در فایل
   پخته شده، پس همان‌جا عوض می‌شود. */
function whiteLogo(dir, file) {
  const p = resolve(dir, file);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, 'utf8').replace(/fill="#0070D1"/gi, 'fill="#ffffff"');
  return `data:image/svg+xml;base64,${Buffer.from(raw, 'utf8').toString('base64')}`;
}

const PHX = uriOf(resolve(ROOT, 'public/brand'), 'phoenix-mark.png');

/* جای سه کاور: چرخش و اندازه‌ی هرکدام.
   عقبی‌ها کوچک‌تر و کج‌تر، جلویی بزرگ و تقریباً صاف. */
const SLOTS = [
  { x: 690, y: 176, w: 250, rot: -9, dim: 0.55 },
  { x: 830, y: 140, w: 280, rot: -4, dim: 0.78 },
  { x: 975, y: 118, w: 310, rot: 3, dim: 1 },
];

let made = 0;

for (const b of BANNERS) {
  const logo = whiteLogo(LOGOS, b.logo);

  const covers = (await Promise.all(b.covers.map(async (file, i) => {
    const uri = await coverUri(file);
    if (!uri) return '';
    const s = SLOTS[i];
    const h = Math.round((s.w * 4) / 3);
    return `<g transform="rotate(${s.rot} ${s.x + s.w / 2} ${s.y + h / 2})">
      <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${h}" rx="18"
            fill="#000" opacity="0.34" transform="translate(6 14)"/>
      <clipPath id="c${i}"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${h}" rx="18"/></clipPath>
      <image href="${uri}" x="${s.x}" y="${s.y}" width="${s.w}" height="${h}"
             preserveAspectRatio="xMidYMid slice" clip-path="url(#c${i})"/>
      <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${h}" rx="18"
            fill="#0a0714" opacity="${(1 - s.dim).toFixed(2)}"/>
      <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${h}" rx="18"
            fill="none" stroke="#fff" stroke-opacity="0.2"/>
    </g>`;
  }))).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${darken(b.accent, 24)}"/>
      <stop offset="1" stop-color="${darken(b.accent, 92)}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.72" cy="0.4" r="0.6">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- ⚠ گوشه‌ی گرد در خودِ تصویر پخته می‌شود، نه فقط در CSS.

       CSS گوشه را گرد می‌کند ولی هرجا تصویر بیرون از آن قاب
       استفاده شود — اشتراک‌گذاری، تصویرِ شاخص، پیش‌نمایش —
       دوباره مستطیلِ تیز است. با کلیپِ داخلِ فایل، همه‌جا
       یکسان می‌ماند. -->
  <defs>
    <clipPath id="round">
      <rect width="${W}" height="${H}" rx="34"/>
    </clipPath>
  </defs>
  <g clip-path="url(#round)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  ${covers}

  ${logo ? `<image href="${logo}" x="86" y="196" width="150" height="150"
                   preserveAspectRatio="xMinYMid meet"/>` : ''}
  <text x="86" y="430" font-family="Arial, Helvetica, sans-serif"
        font-size="76" font-weight="bold" fill="#ffffff">${b.title}</text>
  <text x="86" y="480" font-family="Arial, Helvetica, sans-serif"
        font-size="26" letter-spacing="5" fill="#ffffff" fill-opacity="0.68">${b.sub}</text>

  ${PHX ? `<image href="${PHX}" x="86" y="${H - 128}" width="46" height="46" opacity="0.9"/>` : ''}
  <text x="${PHX ? 148 : 86}" y="${H - 96}" font-family="Arial, Helvetica, sans-serif"
        font-size="24" letter-spacing="3" fill="#ffffff" fill-opacity="0.66">PHOENIX SHOP</text>
  </g>
</svg>`;

  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(resolve(OUT, `${b.out}.png`));
  console.log(`✓ ${b.out}.png`);
  made += 1;
}

console.log(`\n${made} بنرِ کنسول.`);
