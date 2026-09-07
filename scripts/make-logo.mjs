#!/usr/bin/env node
/* ============================================================
   ساختِ نشانِ ققنوس از فایلِ خام

       node scripts/make-logo.mjs

   ⚠ پس‌زمینه با «کلیدِ رنگ» حذف نمی‌شود.

   روشِ رایج این است که رنگِ پس‌زمینه را بگیری و هر پیکسلِ نزدیکش
   را شفاف کنی. روی این لوگو جواب نمی‌دهد: فایل JPEG است، پس
   پس‌زمینه یکدست نیست، و لبه‌های نرمِ خطوط با همان تیرگی مخلوط
   شده‌اند. نتیجه‌اش هاله‌ی تیره‌ی دندانه‌دار دور هر خط است.

   به‌جایش از روشنایی به‌عنوان آلفا استفاده می‌کنیم: هرچه پیکسل
   روشن‌تر، مات‌تر. پس‌زمینه‌ی تیره خودش صفر می‌شود و لبه‌های نرم،
   نرم می‌مانند — چون همان چیزی که آن‌ها را نرم کرده، حالا
   شفافیتشان را می‌سازد.

   ⚠ فقط خودِ پرنده بریده می‌شود، نه نوشته.

   «PHEONIX SHOP» در تصویر سفید است. با این روش سفید کاملاً مات
   می‌ماند، و روی پس‌زمینه‌ی روشنِ سایت نامرئی می‌شود. نامِ برند
   در خودِ سایت متنِ زنده است، پس تصویری‌اش لازم نیست.
   ============================================================ */

import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'public/brand/1000060159.jpg');
const OUT_MARK = resolve(ROOT, 'public/brand/phoenix-mark.png');
const OUT_LOGO = resolve(ROOT, 'public/brand/phoenix-logo.png');

const img = sharp(SRC);
const meta = await img.metadata();
console.log(`ورودی: ${meta.width}×${meta.height}`);

/* بالای تصویر پرنده است و پایینش نوشته. نوشته بریده می‌شود. */
const CROP_BOTTOM = 0.68;
const cropH = Math.round(meta.height * CROP_BOTTOM);

const { data, info } = await img
  .extract({ left: 0, top: 0, width: meta.width, height: cropH })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = info.width * info.height;
const out = Buffer.alloc(px * 4);

/* ⚠ معیار «بیشترین کانال» است نه روشناییِ ادراکی.

   اول با luma نوشته شد و رنگ‌ها پریده درآمدند. دلیلش این است که
   رنگِ اشباع لومای پایینی دارد: سرخابیِ ‎#ee2d7a‎ لومای ۹۱ می‌دهد،
   یعنی با آستانه‌ی روشنایی نیمه‌شفاف می‌شد و روی سفید رنگش
   می‌پرید. همان رنگ در کانالِ قرمز ۲۳۸ است.

   برای «چیزِ روشن روی زمینه‌ی تیره»، بیشترین کانال معیارِ درستی
   است: پس‌زمینه در هر سه کانال تیره است، خطوط دست‌کم در یک کانال
   روشن‌اند. */
const FLOOR = 58;   // بیشترین کانالِ پس‌زمینه
const CEIL = 150;   // از این بالاتر، کاملاً مات

let kept = 0;
for (let i = 0; i < px; i += 1) {
  const r = data[i * info.channels];
  const g = data[i * info.channels + 1];
  const b = data[i * info.channels + 2];

  const peak = Math.max(r, g, b);

  let a = 0;
  if (peak > FLOOR) {
    a = Math.min(255, Math.round(((peak - FLOOR) / (CEIL - FLOOR)) * 255));
  }
  if (a > 8) kept += 1;

  /* رنگ دست‌نخورده می‌ماند؛ فقط شفافیت عوض می‌شود. */
  out[i * 4] = r;
  out[i * 4 + 1] = g;
  out[i * 4 + 2] = b;
  out[i * 4 + 3] = a;
}

console.log(`پیکسل‌های نگه‌داشته‌شده: ${((kept / px) * 100).toFixed(1)}٪`);

const base = sharp(out, {
  raw: { width: info.width, height: info.height, channels: 4 },
});

/* حاشیه‌ی خالی دور نشان بریده می‌شود تا در قاب‌های کوچک بزرگ‌تر
   دیده شود */
await base
  .clone()
  .trim({ threshold: 2 })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT_MARK);

await base
  .clone()
  .trim({ threshold: 2 })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT_LOGO);

console.log('✓ phoenix-mark.png و phoenix-logo.png ساخته شدند');
