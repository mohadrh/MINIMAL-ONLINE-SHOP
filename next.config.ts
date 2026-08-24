import type { NextConfig } from 'next';

/* خروجی ایستا فقط وقتی روشن می‌شود که STATIC_EXPORT ست شده باشد.

   دلیلش این است که GitHub Pages فقط فایل ایستا سرو می‌کند، ولی
   نمی‌خواهیم پروژه‌ی اصلی برای همیشه به حالت ایستا قفل شود — وقتی
   بک‌اند لاراول وصل شد، به رندر سمت سرور و مسیرهای API نیاز داریم.

   پس یک پروژه می‌ماند با دو حالت بیلد:
     npm run build          → اپ کامل Next.js
     STATIC_EXPORT=1 npm run build → خروجی ایستا در پوشه‌ی out/
*/
const isStatic = process.env.STATIC_EXPORT === '1';

/* روی GitHub Pages سایت زیر یک زیرمسیر می‌نشیند (مثلاً /phoenixshop).
   basePath به Next می‌گوید همه‌ی مسیرها را با آن پیشوند بسازد، و
   asset() در src/lib/asset.ts همین کار را برای تگ‌های <img> خام و
   فایل‌هایی که مستقیم fetch می‌شوند انجام می‌دهد. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  ...(isStatic
    ? {
        output: 'export' as const,
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
        /* بهینه‌سازی تصویر Next به سرور نیاز دارد و در خروجی ایستا
           در دسترس نیست. تصویرها همان‌طور که هستند سرو می‌شوند —
           چون از قبل به webp تبدیل و فشرده شده‌اند. */
        images: { unoptimized: true },
        /* هر مسیر یک پوشه با index.html می‌شود؛ بدون این، آدرس‌های
           تودرتو روی میزبان‌های ایستا ۴۰۴ می‌دهند. */
        trailingSlash: true,
      }
    : {
        // ووکامرس تصاویر را از دامنه‌ی خودش سرو می‌کند. وقتی بک‌اند وصل شد،
        // دامنه‌ی وردپرس اینجا اضافه می‌شود و <Image> بدون تغییر کد کار می‌کند.
        images: {
          remotePatterns: [
            { protocol: 'https' as const, hostname: '**.phoenixshop.ir' },
          ],
        },

        // ویدیوهای scrub باید با Range قابل درخواست باشند، وگرنه seek کار نمی‌کند.
        // در خروجی ایستا هدر سفارشی پشتیبانی نمی‌شود؛ آنجا خود میزبان
        // Range را مدیریت می‌کند.
        async headers() {
          return [
            {
              source: '/video/:path*',
              headers: [
                { key: 'Accept-Ranges', value: 'bytes' },
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
