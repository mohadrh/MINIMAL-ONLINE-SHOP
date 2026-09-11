import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Flame, BookOpen, Medal, PackageSearch, Handshake, Columns2,
} from 'lucide-react';

/**
 * دیگر خدمات محبوب کاربران.
 *
 * این سکشن اول چهار جعبه هم داشت که نامِ محصول‌های هر دسته را
 * نشان می‌داد. کارفرما گفت جای آن‌ها همان کارت‌های دسته‌بندیِ
 * بالاست، نه یک سکشنِ جدا — و درست بود: دو بخشِ پشت‌سرهم که هر دو
 * دسته‌ها را فهرست می‌کردند یک کار را دو بار می‌کردند و صفحه را
 * بی‌دلیل بلند می‌کردند. آن‌ها رفتند داخل کارت‌ها.
 *
 * آنچه ماند چیزِ دیگری است و تکراری نیست: کارهایی که محصول
 * نیستند. پیگیری سفارش، باشگاه مشتریان، نمایندگی — این‌ها تا حالا
 * فقط از فوتر پیدا می‌شدند، یعنی عملاً پیدا نمی‌شدند.
 */

const EXTRAS: { icon: React.ComponentType<{ className?: string }>; title: string; href: string; tube: string }[] = [
  /* مقایسه اول می‌آید: ابزاری است که تا حالا فقط روی خودِ
     کارتِ محصول دیده می‌شد، یعنی کسی که نمی‌دانست هست،
     پیدایش نمی‌کرد. */
  /* ⚠ رنگ‌ها از توکن می‌آیند، نه شش hex دلخواه.

     نارنجی، سرخ، سرخابی، ارغوانی و دو بنفش بودند — کمانِ لوگوی
     قدیمی. حالا از سه رنگِ تم پخش شده‌اند: برند، اعتماد، باشگاه.
     هر کدام به معنای خودش نزدیک است — پرفروش و باشگاه گرم،
     پیگیری و راهنما آبی. */
  { icon: Columns2, title: 'مقایسه‌ی محصولات', href: '/shop', tube: 'var(--blue)' },
  { icon: Medal, title: 'باشگاه مشتریان', href: '/club', tube: 'var(--vip)' },
  { icon: Flame, title: 'پرفروش‌ترین محصولات', href: '/shop?sort=hot', tube: 'var(--brand)' },
  { icon: PackageSearch, title: 'پیگیری سفارش', href: '/track', tube: 'var(--blue)' },
  { icon: BookOpen, title: 'چطور بهتر استفاده کنم', href: '/blog', tube: 'var(--blue)' },
  { icon: Handshake, title: 'نمایندگی و همکاری', href: '/reseller', tube: 'var(--brand)' },
];

export function PopularServices() {
  return (
    /* ⚠ ‎section--slim‎ چون این سکشن فقط یک بلوکِ کوتاه دارد.

       با پادینگِ کاملِ سکشن (۱۲۰ بالا و ۱۲۰ پایین) دویست‌وچهل
       پیکسل فضای خالی دورِ صدوشصت پیکسل محتوا می‌نشست — و چون
       سکشنِ بالا و پایینش هم پادینگ دارند، روی هم یک نوارِ
       خالیِ بلند می‌شد. */
    <section className="section section--tint section--slim reveal">
      <div className="wrap">
        <div className="psv__extras">
          <h2 className="psv__extras-title">دیگر خدمات محبوب کاربران</h2>
          <div className="psv__row">
            {EXTRAS.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className="psv__x"
                style={{ ['--tube' as string]: e.tube }}
              >
                {/* آیکون بدونِ کادر — قاعده‌ی ثابتِ سایت */}
                <e.icon aria-hidden="true" />
                <b>{e.title}</b>
                <span className="psv__x-go">
                  اطلاعات بیشتر
                  <ArrowLeft aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
