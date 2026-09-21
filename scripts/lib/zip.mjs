/* ============================================================
   نوشتنِ زیپ، با مسیرهای درست.

   ⚠ چرا خودمان می‌نویسیمش و از ابزارِ سیستم استفاده نمی‌کنیم

   ‎Compress-Archive‎ی ویندوز مسیرها را با بک‌اسلش می‌نویسد:

       phoenix-bridge\includes\db.php

   استانداردِ ZIP اسلشِ رو به جلو می‌خواهد. ویندوز خودش بازش
   می‌کند و چیزی معلوم نمی‌شود — ولی لینوکس (یعنی هاست)
   بک‌اسلش را جداکننده‌ی پوشه حساب نمی‌کند و *یک فایلِ تخت* با
   همان اسمِ عجیب می‌سازد.

   نتیجه‌اش سایتی است که آپلود شده ولی هیچ فایلی سرِ جایش
   نیست، بدونِ هیچ خطایی که بشود از رویش فهمید چه شده.

   این یک بار واقعاً اتفاق افتاد (زیپِ افزونه) و پیش از رسیدن
   به هاست گرفته شد. حالا هر دو زیپ از همین‌جا می‌آیند.
   ============================================================ */

import { deflateRawSync, crc32 } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * فهرستِ فایل‌ها با مسیرِ داخلِ زیپ.
 *
 * @param dir    پوشه‌ی مبدأ روی دیسک
 * @param prefix پیشوندِ مسیر داخلِ زیپ؛ رشته‌ی خالی یعنی محتویاتِ
 *               پوشه در ریشه‌ی زیپ بنشینند
 *
 * ⚠ ‎readdirSync‎ فایل‌های نقطه‌دار را هم می‌آورد، و این‌جا
 * حیاتی است: ‎.htaccess‎ باید در زیپ باشد وگرنه روی هاست
 * HTTPSِ اجباری و صفحه‌ی ۴۰۴ کار نمی‌کنند.
 */
export function collect(dir, prefix = '', acc = []) {
  const items = readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const e of items) {
    const full = join(dir, e.name);
    /* ⚠ همیشه اسلشِ رو به جلو، هر سیستم‌عاملی که باشیم */
    const zipPath = prefix ? `${prefix}/${e.name}` : e.name;

    if (e.isDirectory()) collect(full, zipPath, acc);
    else acc.push({ full, zipPath, size: statSync(full).size });
  }
  return acc;
}

/**
 * ساختِ بایت‌های زیپ.
 *
 * @param entries خروجیِ ‎collect‎
 * @returns Buffer
 */
export function makeZip(entries) {
  /* نگهبان — اگر روزی ساختِ مسیر عوض شود و بک‌اسلش برگردد،
     این‌جا می‌ایستد نه روی هاست. */
  const wrong = entries.filter((e) => e.zipPath.includes('\\'));
  if (wrong.length) {
    throw new Error(
      'مسیرِ داخلِ زیپ بک‌اسلش دارد:\n  ' +
      wrong.slice(0, 5).map((e) => e.zipPath).join('\n  '),
    );
  }

  const locals = [];
  const central = [];
  let offset = 0;

  for (const { full, zipPath } of entries) {
    const raw = readFileSync(full);
    const name = Buffer.from(zipPath, 'utf8');

    /* ⚠ تصویر و فونت از قبل فشرده‌اند.
       فشرده‌سازیِ دوباره‌شان وقت می‌برد و حجم را کم نمی‌کند —
       گاهی زیادش هم می‌کند. برای ۳۶ مگابایت عکس، این تفاوتِ
       چند ثانیه با چند دقیقه است. */
    const precompressed = /\.(webp|avif|png|jpe?g|gif|woff2?|zip|mp4|glb)$/i.test(zipPath);
    const deflated = precompressed ? null : deflateRawSync(raw, { level: 9 });

    const useStore = !deflated || deflated.length >= raw.length;
    const data = useStore ? raw : deflated;
    const method = useStore ? 0 : 8;
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);   // نامِ فایل UTF-8 است
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);    // تاریخِ ثابت، تا زیپ تکرارپذیر بماند
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
    cen.writeUInt32LE((0o100644 << 16) >>> 0, 38);
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

  return Buffer.concat([...locals, centralBuf, end]);
}
