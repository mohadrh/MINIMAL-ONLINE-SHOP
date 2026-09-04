'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * نوار تبلیغاتی بالای نوبار.
 *
 * جای نوارِ قبلی را گرفت که فهرستی از لینک‌های کاربری بود —
 * مقالات، باشگاه، پیگیری سفارش. آن‌ها به منوی اصلی و فوتر رفتند،
 * چون یک نوارِ باریکِ همیشه‌حاضر، جای گران‌قیمتی است که نباید صرفِ
 * لینک‌هایی شود که کسی روزی یک بار هم نمی‌زند.
 *
 * پیام‌ها می‌چرخند، ولی آرام: هر شش ثانیه، با محو و یک قدم بالا.
 * نوارِ باریکی که تند عوض شود، در حاشیه‌ی دید سوسو می‌زند و
 * خواندنِ بقیه‌ی صفحه را سخت می‌کند.
 *
 * ⚠ متن‌ها وعده‌ی تجاری‌اند. «تخفیف خرید سوم» و «ارسال کد پیگیری»
 * باید با کارفرما تأیید شوند و اگر قرار نیست اجرا شوند، همین‌جا
 * عوض شوند — نوار تبلیغاتی که وعده‌ی نادرست بدهد، از نبودنش بدتر
 * است.
 */

const MESSAGES: { text: string; strong: string; href: string }[] = [
  {
    strong: 'سومین خریدت ۲۰٪ تخفیف دارد',
    text: 'خودکار اعمال می‌شود؛ کد نمی‌خواهد.',
    href: '/club',
  },
  {
    strong: 'کش‌بک تا ۸٪ روی هر خرید',
    text: 'به کیف پولت برمی‌گردد و خرج خرید بعدی می‌شود.',
    href: '/club',
  },
  {
    strong: 'پرداخت با کارت بانکی خودت',
    text: 'نه ارز لازم داری، نه حساب خارجی.',
    href: '/guide',
  },
];

export function PromoBar() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (MESSAGES.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => {
      /* تبِ پنهان نمی‌چرخد — وگرنه کاربر که برمی‌گردد وسط یک
         پیامِ نیمه‌دیده است. */
      if (document.visibilityState !== 'visible') return;
      setI((v) => (v + 1) % MESSAGES.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  const m = MESSAGES[i];

  return (
    <div className="promo">
      {/* درخششِ آرامی که از راست به چپ می‌رود — همان حرکتی که چشم
          در متن فارسی می‌کند. */}
      <span className="promo__sheen" aria-hidden="true" />

      <div className="wrap promo__row">
        <Link href={m.href} className="promo__link" key={i}>
          <b>{m.strong}</b>
          <span>{m.text}</span>
          <ArrowLeft aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
