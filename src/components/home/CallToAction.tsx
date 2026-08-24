import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * فراخوان.
 *
 * پس‌زمینه‌اش دو لایه است و عمداً همان نسخه‌ی اول: یک گرادیانت
 * خطی که خودش می‌لغزد، و روی آن چند لکه‌ی بلورشده که شکل عوض
 * می‌کنند.
 *
 * نسخه‌ی مخروطی/SVG را امتحان کردم و اینجا جواب نداد — روی یک
 * باکسِ پهن، آن شکل‌ها به‌جای پس‌زمینه شبیه المانِ فراموش‌شده
 * می‌شدند. گرادیانتِ لغزان کل سطح را می‌پوشاند و همین باعث می‌شود
 * حرکت به‌جای «یک چیزِ متحرک»، «یک سطحِ زنده» دیده شود.
 */
export function CallToAction() {
  return (
    <section className="section cta reveal">
      <div className="container">
        <div className="cta__box">
          <div className="cta__grad" aria-hidden="true" />
          <div className="cta__blobs" aria-hidden="true">
            <span className="cta__blob cta__blob--1" />
            <span className="cta__blob cta__blob--2" />
            <span className="cta__blob cta__blob--3" />
          </div>

          <div className="cta__row">
            <div className="cta__text">
              <span className="cta__kicker">به جمع کاربران فونیکس بپیوند</span>
              <h2>وقت ثبت اولین سفارش رسیده است</h2>
              <p>
                اگر مطمئن نیستی کدام سرویس به کارت می‌آید بپرس. قبل از خرید
                راهنمایی می‌کنیم، حتی اگر جواب این باشد که لازمش نداری.
              </p>
            </div>

            <div className="cta__actions">
              <Link href="/faq" className="btn btn--ghost">سوال دارم</Link>
              <Link href="/shop" className="btn btn--primary">
                ثبت سفارش
                <ArrowLeft aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
