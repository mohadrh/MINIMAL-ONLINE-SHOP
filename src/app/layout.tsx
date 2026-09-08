import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { JetFlightOverlay } from '../components/three/JetFlightOverlay';
import { Nav } from '../components/shell/Nav';
import { Footer } from '../components/shell/Footer';
import { Reveal } from '../components/motion/Reveal';
import { CursorLight } from '../components/motion/CursorLight';
import { ScrollTop } from '../components/shell/ScrollTop';
import { LiveChat } from '../components/shell/LiveChat';
import { CompareProvider, CompareBar } from '../components/shop/Compare';
import { CartDrawer } from '../components/cart/CartDrawer';
import { LivePriceProvider } from '../lib/api/livePrices';

export const metadata: Metadata = {
  /* آیکونِ تب و آیکونِ صفحه‌ی خانه‌ی موبایل، از نشانِ ققنوس. */
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },

  title: 'فونیکس شاپ — اشتراک هوش مصنوعی، گیم و شماره مجازی',
  description:
    'اشتراک‌هایی که از ایران نمی‌شود خرید، با کارت بانکی خودت. روی حساب شخصی خودت فعال می‌شوند و رمزت را نمی‌خواهیم.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  /* data-theme را اسکریپت درون‌خطی پایین می‌نویسد، نه JSX. اگر
     اینجا مقدار بگذاریم، سرور یک چیز می‌فرستد و اسکریپت سمت کلاینت
     چیز دیگری، و React از ناسازگاری شکایت می‌کند.
     suppressHydrationWarning دقیقاً برای همین ویژگی است. */
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* وزیرمتن از گوگل‌فونت. display=swap تا متن پیش از رسیدن فونت
            هم دیده شود — وگرنه صفحه چند صد میلی‌ثانیه خالی می‌ماند. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap"
        />

        {/* انتخاب تم پیش از رنگ‌آمیزی صفحه.

            اگر این را به React بسپاریم، مرورگر یک فریم با تم پیش‌فرض
            رنگ می‌کند و بعد عوض می‌شود — همان پرشِ سفیدی که در نسخه‌ی
            یک دیده می‌شد. اسکریپت درون‌خطی قبل از رندر اجرا می‌شود. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              /* پیش‌فرض روشن است، نه تمِ سیستم.

                 نسخه‌ی یک شب‌محور بود و از سیستم پیروی می‌کرد. اینجا
                 برعکس: سفیدِ آرام خودِ هویت است و کسی که آن را ندیده
                 نباید تصادفی شب ببیند. شب فقط با انتخاب صریح کاربر. */
              var t = localStorage.getItem('phoenix.theme');
              document.documentElement.dataset.theme = t === 'dark' ? 'dark' : 'light';
            }catch(e){}})();`,
          }}
        />

        {/* ⚠ نگهبانِ چانکِ گم‌شده.

            سایت خروجیِ ایستا دارد و نامِ فایل‌های جاوااسکریپت با
            هر بیلد عوض می‌شود. اگر کسی صفحه را باز گذاشته باشد و
            بینش نسخه‌ی تازه منتشر شود، صفحه‌ی کهنه‌ی توی مرورگرش
            چانکی را می‌خواهد که دیگر وجود ندارد — و نکست همان
            «Application error: a client-side exception» را نشان
            می‌دهد.

            روی هاستِ خودمان ‎.htaccess‎ جلویش را می‌گیرد: HTML صفر
            ثانیه کش می‌شود و دارایی‌ها یک سال. ولی روی گیت‌هاب‌پیجز
            هدر دستِ ما نیست.

            پس این‌جا: اگر بارگذاریِ یک چانک شکست خورد، یک بار —
            فقط یک بار — صفحه دوباره بارگذاری می‌شود تا HTMLِ تازه
            با نام‌های درست بیاید.

            ⚠ نشانه در sessionStorage است نه در متغیر.

            بارگذاریِ دوباره همه‌ی متغیرها را پاک می‌کند، پس با
            متغیر حلقه‌ی بی‌پایان می‌شد: ۴۰۴ ← ریلود ← ۴۰۴ ← …
            sessionStorage از ریلود جان سالم به در می‌برد و بعد از
            یک بار دست نگه می‌دارد؛ اگر مشکل چیز دیگری باشد، کاربر
            خطا را می‌بیند نه صفحه‌ای که مدام می‌پرد. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var KEY='phoenix.chunkReload';
              addEventListener('error',function(e){
                var el=e.target;
                if(!el||!el.tagName)return;
                var src=el.src||el.href||'';
                if(src.indexOf('/_next/static/')===-1)return;
                try{
                  if(sessionStorage.getItem(KEY))return;
                  sessionStorage.setItem(KEY,'1');
                }catch(_){return;}
                location.reload();
              },true);
              addEventListener('load',function(){
                try{sessionStorage.removeItem(KEY);}catch(_){}
              });
            })();`,
          }}
        />
      </head>
      <body>
        <Providers>
          {/* قیمت‌ها بعد از بارگذاری خودشان را تازه می‌کنند —
              روی سایت ایستا، تنها راهِ نشان دادنِ عددِ درست. */}
          <LivePriceProvider>
          <CompareProvider>
          <Nav />
          <main>{children}</main>
          <Footer />

          {/* پروازِ جت هنگام افزودن به سبد — روی همه‌ی صفحه‌ها */}
          <JetFlightOverlay />
          <ScrollTop />
          <CompareBar />
          <CartDrawer />
          </CompareProvider>
          <LiveChat />
          <Reveal />
          <CursorLight />
          </LivePriceProvider>
        </Providers>
      </body>
    </html>
  );
}
