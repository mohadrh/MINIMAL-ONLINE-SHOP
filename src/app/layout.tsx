import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '../components/shell/Nav';
import { Footer } from '../components/shell/Footer';
import { Reveal } from '../components/motion/Reveal';
import { CursorLight } from '../components/motion/CursorLight';
import { ScrollTop } from '../components/shell/ScrollTop';

export const metadata: Metadata = {
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
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
        <ScrollTop />
        <Reveal />
        <CursorLight />
      </body>
    </html>
  );
}
