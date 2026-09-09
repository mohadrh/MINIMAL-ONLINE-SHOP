import type { MetadataRoute } from 'next';
import { PRODUCTS, CATEGORIES } from '../data/catalog';
import { ARTICLES } from '../data/articles';
import { absolute } from '../lib/site';

/* ============================================================
   نقشه‌ی سایت

   ⚠ بدون این، گوگل فقط صفحه‌هایی را پیدا می‌کند که از صفحه‌ی
   اصلی لینکِ مستقیم دارند.

   بیشترِ صفحه‌های محصول از پشتِ فیلتر و اسلایدر می‌آیند و
   خزنده لزوماً به همه‌شان نمی‌رسد. نقشه‌ی سایت فهرست را صریح
   می‌کند: این‌ها هستند، این‌ها را ببین.

   ⚠ priority عمداً پلکانی است.

   صفحه‌ی محصول چیزی است که می‌فروشیم، پس بالاترین. صفحه‌های
   قانونی و حساب کاربری پایین‌ترین — نه چون بی‌اهمیت‌اند، بلکه
   چون کسی از گوگل دنبالشان نمی‌گردد.
   ============================================================ */

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  /* صفحه‌هایی که کاربر از جست‌وجو به آن‌ها می‌رسد */
  const landing = [
    { path: '', priority: 1.0, freq: 'daily' as const },
    { path: 'shop', priority: 0.9, freq: 'daily' as const },
    { path: 'numbers', priority: 0.8, freq: 'weekly' as const },
    { path: 'blog', priority: 0.7, freq: 'weekly' as const },
    { path: 'guide', priority: 0.6, freq: 'monthly' as const },
    { path: 'faq', priority: 0.6, freq: 'monthly' as const },
    { path: 'about', priority: 0.5, freq: 'monthly' as const },
    { path: 'contact', priority: 0.5, freq: 'monthly' as const },
    { path: 'club', priority: 0.5, freq: 'monthly' as const },
    { path: 'reseller', priority: 0.4, freq: 'monthly' as const },
    { path: 'careers', priority: 0.3, freq: 'monthly' as const },
    { path: 'rules', priority: 0.3, freq: 'yearly' as const },
    { path: 'track', priority: 0.3, freq: 'yearly' as const },
  ];

  /* ⚠ سبد، تسویه، ورود و حساب کاربری عمداً نیستند.
     محتوایی ندارند که ایندکس شود و برای هر بازدیدکننده فرق
     می‌کنند؛ در نقشه گذاشتنشان فقط سهمِ خزش را هدر می‌دهد. */

  return [
    ...landing.map((p) => ({
      url: absolute(p.path),
      lastModified: now,
      changeFrequency: p.freq,
      priority: p.priority,
    })),
    ...CATEGORIES.map((c) => ({
      url: absolute(c.slug),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...PRODUCTS.map((p) => ({
      url: absolute(`product/${p.slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...ARTICLES.map((a) => ({
      url: absolute(`blog/${a.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
