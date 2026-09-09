import type { MetadataRoute } from 'next';
import { absolute } from '../lib/site';

/* ============================================================
   robots.txt

   ⚠ نبودنش یعنی «همه‌چیز آزاد» — و همان مشکل است.

   بدون این فایل خزنده صفحه‌ی سبد و تسویه و ورود را هم می‌خزد.
   محتوایی ندارند، ولی سهمِ خزشِ سایت را می‌خورند و گاهی در
   نتیجه‌ی جست‌وجو با عنوانِ خالی ظاهر می‌شوند.

   نشانیِ نقشه‌ی سایت هم این‌جاست، چون اولین جایی است که هر
   موتور جست‌وجو نگاه می‌کند.
   ============================================================ */

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cart/', '/checkout/', '/login/', '/account/'],
    },
    sitemap: absolute('sitemap.xml'),
  };
}
