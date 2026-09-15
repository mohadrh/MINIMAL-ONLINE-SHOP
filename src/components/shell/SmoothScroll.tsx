'use client';

import { useEffect } from 'react';

/**
 * اسکرولِ نرم — برای چرخِ ماوس.
 *
 * ⚠ این همان ‎scroll-behavior: smooth‎ نیست.
 *
 * آن یکی در base.css هست و فقط روی پرشِ لنگری و ‎scrollTo‎ کار
 * می‌کند — یعنی وقتی روی «بازگشت به بالا» می‌زنی. چرخِ ماوس
 * دستِ مرورگر است و پله‌پله می‌پرد؛ روی ویندوز هر تیکِ چرخ سه
 * خط، و صفحه در جا می‌پرد.
 *
 * این‌جا هر تیک به یک «مقصد» اضافه می‌شود و صفحه هر فریم کسری
 * از فاصله‌ی باقی‌مانده را می‌رود. نتیجه‌اش شتاب‌گرفتن و آرام
 * ایستادن است، بدونِ اینکه سرعتِ کلی کُند شود.
 *
 * ⚠ چهار جا عمداً دست نمی‌زند:
 *
 *   لمس — موبایل خودش اینرسی دارد و بهترش هم هست. دست‌زدن به
 *          ‎touchmove‎ فقط آن را خراب می‌کند.
 *   ناحیه‌های اسکرولیِ داخلی — پنلِ فیلتر، مگامنو، کشویِ سبد.
 *          اگر آن‌جا چرخ را بگیریم، محتوای داخلی قفل می‌شود.
 *   قفلِ اسکرول — وقتی مدال باز است ‎body‎ اورفلو ندارد؛ حرکتِ
 *          پس‌زمینه پشتِ مدال غلط است.
 *   ‎prefers-reduced-motion‎ — کسی که حرکت کم خواسته، حرکتِ
 *          اضافه نمی‌خواهد. کاملاً خاموش می‌شود.
 */

/** نرمی: کسری از فاصله‌ی باقی‌مانده در هر فریم. بزرگ‌تر = تندتر */
const EASE = 0.135;
/** زیر این فاصله دیگر حرکتی دیده نمی‌شود؛ همان‌جا تمام می‌شود */
const SNAP = 0.5;

/** چرخ چقدر پیکسل است — مرورگرها سه واحدِ مختلف گزارش می‌کنند */
const pixels = (e: WheelEvent) => {
  if (e.deltaMode === 1) return e.deltaY * 16;            // خط
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight; // صفحه
  return e.deltaY;                                         // پیکسل
};

/** آیا خودِ این ناحیه می‌تواند در همین جهت اسکرول شود؟ */
const innerScroller = (start: EventTarget | null, dir: number) => {
  let el = start instanceof Element ? start : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const oy = getComputedStyle(el).overflowY;
    if (oy === 'auto' || oy === 'scroll') {
      const room = el.scrollHeight - el.clientHeight;
      if (room > 1) {
        /* فقط وقتی واقعاً جا دارد. ناحیه‌ای که ته رسیده باید
           چرخ را به صفحه پس بدهد، وگرنه اسکرول وسطِ صفحه گیر
           می‌کند. */
        if (dir > 0 && el.scrollTop < room - 1) return true;
        if (dir < 0 && el.scrollTop > 1) return true;
      }
    }
    el = el.parentElement;
  }
  return false;
};

export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) return;

    let target = window.scrollY;
    /* ⚠ جای فعلی جداگانه نگه داشته می‌شود و از ‎scrollY‎ خوانده
       نمی‌شود.

       اولین نسخه هر فریم ‎window.scrollY‎ را می‌خواند و فاصله را
       از آن حساب می‌کرد. مرورگر موقعیتِ اسکرول را گرد می‌کند، پس
       وقتی فاصله کم می‌شد قدمِ ‎gap × 0.135‎ زیرِ یک پیکسل می‌افتاد
       و ‎scrollY‎ اصلاً تکان نمی‌خورد — فاصله همان‌قدر می‌ماند،
       شرطِ پایان هیچ‌وقت برقرار نمی‌شد و حلقه تا ابد شصت‌بار در
       ثانیه می‌چرخید. بدتر: همان حلقه‌ی زنده بعداً هر اسکرولِ
       دیگری را هم به مقصدِ کهنه‌اش برمی‌گرداند. با پرشِ لنگری
       آزمایش شد و صفحه واقعاً برمی‌گشت.

       با شمارنده‌ی اعشاریِ خودمان، هر فریم واقعاً جلو می‌رود و
       حلقه تمام می‌شود. */
    let current = window.scrollY;
    /* آخرین عددی که خودمان نوشتیم — برای تشخیصِ اسکرولِ بیرونی */
    let written = -1;
    let raf = 0;
    let riding = false;

    const limit = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      riding = false;
    };

    const put = (y: number) => {
      written = y;
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    };

    const tick = () => {
      const gap = target - current;

      if (Math.abs(gap) < SNAP) {
        put(target);
        stop();
        return;
      }

      current += gap * EASE;
      put(current);
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      /* Ctrl+چرخ زوم است، نه اسکرول */
      if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      /* چرخِ افقی — ریلِ خبرها و کارت‌ها کارِ خودشان را بکنند */
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      /* مدال باز است */
      if (document.body.style.overflow === 'hidden') return;

      const d = pixels(e);
      if (!d) return;
      if (innerScroller(e.target, d)) return;

      e.preventDefault();

      /* اگر تازه شروع شده، مقصد از جای فعلی حساب می‌شود نه از
         مقصدِ کهنه — وگرنه بعد از یک درگِ اسکرول‌بار، اولین
         تیکِ چرخ صفحه را به جای قبلی پرت می‌کند. */
      if (!riding) { current = window.scrollY; target = current; }
      riding = true;

      target = Math.min(limit(), Math.max(0, target + d));
      if (!raf) raf = requestAnimationFrame(tick);
    };

    /* ⚠ نگهبانِ اسکرولِ بیرونی.

       هر اسکرولی که خودمان ننوشته باشیم — پرشِ لنگری،
       ‎scrollIntoView‎، کشیدنِ اسکرول‌بار، دکمه‌ی «بازگشت به
       بالا»، بازگرداندنِ موقعیت بعد از ناوبری — سواری را همان‌جا
       تمام می‌کند. بدونِ این، انیمیشن با آن‌ها سرِ جای صفحه
       می‌جنگد و معمولاً هم برنده می‌شود.

       مقایسه با دو پیکسل رواداری است، چون مرورگر عددی را که
       نوشتیم گرد می‌کند. */
    const onScroll = () => {
      if (!riding) return;
      if (Math.abs(window.scrollY - written) > 2) stop();
    };

    /* اندازه‌ی صفحه که عوض شود، مقصدِ محاسبه‌شده دیگر معتبر نیست */
    const onOther = () => { if (riding) stop(); };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onOther, { passive: true });
    window.addEventListener('keydown', onOther);
    window.addEventListener('mousedown', onOther);
    window.addEventListener('resize', onOther);

    const onPref = () => { if (reduce.matches) stop(); };
    reduce.addEventListener('change', onPref);

    return () => {
      stop();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onOther);
      window.removeEventListener('keydown', onOther);
      window.removeEventListener('mousedown', onOther);
      window.removeEventListener('resize', onOther);
      reduce.removeEventListener('change', onPref);
    };
  }, []);

  return null;
}
