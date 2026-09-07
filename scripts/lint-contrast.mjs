#!/usr/bin/env node
/* ============================================================
   سنجشِ کنتراست، از روی خودِ توکن‌ها

       npm run lint:contrast

   ⚠ چرا از فایل می‌خواند و نه از فهرستی در خودش

   نسخه‌ی اول رنگ‌ها را داخل اسکریپت داشت. توکن که عوض شد،
   اسکریپت همان مقدار قدیمی را می‌سنجید و «مردود» می‌داد برای
   رنگی که دیگر وجود نداشت. سنجه‌ای که منبعِ جدا داشته باشد،
   روزی دروغ می‌گوید.

   حالا tokens.css را می‌خواند. هر تغییری در رنگ‌ها، همین‌جا
   دیده می‌شود.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = readFileSync(resolve(ROOT, 'src/styles/tokens.css'), 'utf8');

/* ---------- خواندن توکن‌ها ---------- */

/**
 * دو مجموعه: روشن و تیره.
 *
 * فایل با ‎:root‎ شروع می‌شود و جایی ‎[data-theme='dark']‎ می‌آید؛
 * هرچه بعد از آن باشد مالِ حالت تیره است.
 */
function readTokens() {
  const darkAt = CSS.indexOf("[data-theme='dark']");
  const lightPart = darkAt > 0 ? CSS.slice(0, darkAt) : CSS;
  const darkPart = darkAt > 0 ? CSS.slice(darkAt) : '';

  const grab = (text) => {
    const out = {};
    for (const m of text.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
      out[m[1]] = m[2];
    }
    return out;
  };

  const light = grab(lightPart);
  /* حالت تیره فقط بعضی توکن‌ها را عوض می‌کند؛ بقیه از روشن ارث می‌برند */
  return { light, dark: { ...light, ...grab(darkPart) } };
}

/* ---------- ریاضیِ WCAG ---------- */

function channel(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ---------- جفت‌هایی که واقعاً روی صفحه کنار هم می‌نشینند ---------- */

const PAIRS = [
  ['متن روی کاغذ', '--ink', '--paper', 4.5],
  ['متن محو روی کاغذ', '--ink-faint', '--paper', 4.5],
  ['متن محو روی ته‌رنگ', '--ink-faint', '--tint', 4.5],
  ['متن روی دکمه‌ی اصلی', '--brand-ink', '--brand', 4.5],
  ['لینک روی کاغذ', '--blue', '--paper', 4.5],
  ['لینک روی ته‌رنگ', '--blue', '--tint', 4.5],
  ['تاکید روی کاغذ', '--accent-pink', '--paper', 4.5],
];

const { light, dark } = readTokens();
let failed = 0;

for (const [themeName, tokens] of [['روشن', light], ['تیره', dark]]) {
  console.log(`\n=== حالت ${themeName} ===`);
  for (const [label, fg, bg, need] of PAIRS) {
    const a = tokens[fg];
    const b = tokens[bg];
    if (!a || !b) {
      console.log(`   ${label.padEnd(22)} — توکن نیست (${!a ? fg : bg})`);
      continue;
    }
    const r = contrast(a, b);
    const ok = r >= need;
    if (!ok) failed += 1;
    console.log(
      `   ${label.padEnd(22)} ${a} روی ${b} = ${r.toFixed(2)}  ${ok ? '✓' : `✗ کمتر از ${need}`}`,
    );
  }
}

console.log(
  failed === 0
    ? '\n✓ همه‌ی جفت‌ها از حد WCAG می‌گذرند.\n'
    : `\n✗ ${failed} جفت مردود شد.\n`,
);
process.exit(failed === 0 ? 0 : 1);
