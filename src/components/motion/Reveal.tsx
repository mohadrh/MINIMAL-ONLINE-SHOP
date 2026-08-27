'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ظهور آرام سکشن‌ها هنگام اسکرول.
 *
 * تنها حرکت سراسری سایت است و عمداً خیلی کم: هجده پیکسل بالا آمدن
 * و محو شدن، یک بار، بدون برگشت. همین اندازه کافی است تا صفحه
 * زنده به نظر برسد و از نمونه — که صفر انیمیشن دارد — متمایز شود،
 * بدون اینکه چیزی به شلوغی اضافه کند.
 *
 * چهار تصمیم:
 *
 * ۱. کلاس js-reveal را همین کامپوننت روی <html> می‌گذارد، نه CSS.
 *    اگر جاوااسکریپت اجرا نشود کلاس نمی‌آید و حالت مخفی هم اعمال
 *    نمی‌شود — یعنی محتوا هیچ‌وقت نامرئی گیر نمی‌کند. اگر برعکس
 *    عمل می‌کردیم و پیش‌فرض را مخفی می‌گذاشتیم، هر خطای اسکریپت
 *    کل صفحه را سفید می‌کرد.
 *
 * ۲. با هر تغییر مسیر دوباره اسکن می‌شود. این کامپوننت در layout
 *    است و یک بار mount می‌شود؛ اگر فقط همان یک بار پرس‌وجو
 *    می‌کرد، هر صفحه‌ای که با ناوبری داخلی باز شود عنصرهای
 *    reveal‌اش هیچ‌وقت باز نمی‌شدند و برای همیشه نامرئی می‌ماندند.
 *
 * ۳. تصمیم با محاسبه‌ی مستقیمِ rect گرفته می‌شود، نه با
 *    IntersectionObserver. ناظر دو رفتار داشت که این‌جا گران تمام
 *    می‌شد: در تبِ پس‌زمینه اصلاً خبر نمی‌داد، و آستانه‌اش نسبتِ
 *    مساحتِ دیده‌شده به مساحتِ *خودِ عنصر* است — پس سکشنی که از
 *    قاب بلندتر باشد روی پنجره‌ی کوتاه ممکن بود هیچ‌وقت آن نسبت را
 *    برآورده نکند. چون کلِ بدنه‌ی صفحه پشت این کلاس پنهان است،
 *    هزینه‌ی اشتباهش صفحه‌ی سفید بود، نه فقط نبودِ انیمیشن.
 *    همان روشی که «مسیر خرید» دارد، این‌جا هم درست است و زبانِ
 *    حرکتِ کد را یکی نگه می‌دارد.
 *
 * ۴. عنصری که باز شد از فهرست بیرون می‌رود و وقتی فهرست خالی شد،
 *    شنونده خودش برداشته می‌شود.
 */
export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    root.classList.add('js-reveal');

    let pending = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (!pending.length) return;

    let frame = 0;

    const sweep = () => {
      frame = 0;
      /* دوازده درصدِ پایینِ قاب حساب نمی‌شود تا حرکت در حاشیه‌ی دید
         تمام شود، نه وسط صفحه. */
      const edge = window.innerHeight * 0.88;
      const rest: HTMLElement[] = [];
      for (const el of pending) {
        if (el.getBoundingClientRect().top < edge) el.classList.add('is-in');
        else rest.push(el);
      }
      pending = rest;
      if (!pending.length) detach();
    };

    const onScroll = () => {
      /* فریمِ در انتظار را لغو کن و تازه‌اش را بگذار، وگرنه آخرین
         موقعیتِ اسکرول دور ریخته می‌شود و آخرین سکشن باز نمی‌ماند. */
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(sweep);
    };

    const detach = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    /* یک بار همین حالا: هرچه در قاب هست یا بالایش مانده — ورودی از
       لینکِ لنگردار، بازگشتِ مرورگر با اسکرولِ ذخیره‌شده، یا رفرش در
       میانه‌ی صفحه — بی‌درنگ باز می‌شود. */
    sweep();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return detach;
  }, [pathname]);

  return null;
}
