import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Smartphone, BookOpen, Medal, PackageSearch, Handshake, Columns2,
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

const EXTRAS = [
  /* مقایسه اول می‌آید: ابزاری است که تا حالا فقط روی خودِ
     کارتِ محصول دیده می‌شد، یعنی کسی که نمی‌دانست هست،
     پیدایش نمی‌کرد. */
  { icon: Columns2, title: 'مقایسه‌ی محصولات', href: '/shop' },
  { icon: Medal, title: 'باشگاه مشتریان', href: '/club' },
  { icon: Smartphone, title: 'شماره مجازی', href: '/numbers' },
  { icon: PackageSearch, title: 'پیگیری سفارش', href: '/track' },
  { icon: BookOpen, title: 'آموزش و مقاله', href: '/blog' },
  { icon: Handshake, title: 'نمایندگی و همکاری', href: '/reseller' },
];

export function PopularServices() {
  return (
    <section className="section section--tint reveal">
      <div className="wrap">
        <div className="psv__extras">
          <h2 className="psv__extras-title">دیگر خدمات محبوب کاربران</h2>
          <div className="psv__row">
            {EXTRAS.map((e) => (
              <Link key={e.href} href={e.href} className="psv__x">
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
