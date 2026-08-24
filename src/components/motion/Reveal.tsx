'use client';

import { useEffect } from 'react';

/**
 * ظهور آرام سکشن‌ها هنگام اسکرول.
 *
 * تنها حرکت سراسری سایت است و عمداً خیلی کم: هشت پیکسل بالا آمدن
 * و محو شدن، یک بار، بدون برگشت. همین اندازه کافی است تا صفحه
 * زنده به نظر برسد و از نمونه — که صفر انیمیشن دارد — متمایز شود،
 * بدون اینکه چیزی به شلوغی اضافه کند.
 *
 * دو تصمیم:
 *
 * ۱. کلاس js-reveal را همین کامپوننت روی <html> می‌گذارد، نه CSS.
 *    اگر جاوااسکریپت اجرا نشود کلاس نمی‌آید و حالت مخفی هم اعمال
 *    نمی‌شود — یعنی محتوا هیچ‌وقت نامرئی گیر نمی‌کند. اگر برعکس
 *    عمل می‌کردیم و پیش‌فرض را مخفی می‌گذاشتیم، هر خطای اسکریپت
 *    کل صفحه را سفید می‌کرد.
 *
 * ۲. بعد از دیده شدن، عنصر از رصد بیرون می‌رود. سکشن‌ها زیادند و
 *    نگه‌داشتنشان در observer فقط کار بی‌فایده است.
 */
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    root.classList.add('js-reveal');

    const targets = document.querySelectorAll<HTMLElement>('.reveal');
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      },
      /* کمی قبل از رسیدن به کف قاب فعال می‌شود تا حرکت در حاشیه‌ی
         دید تمام شود، نه وسط صفحه. */
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );

    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return null;
}
