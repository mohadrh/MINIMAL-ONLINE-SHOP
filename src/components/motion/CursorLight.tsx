'use client';

import { useEffect } from 'react';

/**
 * نورِ دنبال‌کننده‌ی نشانگر.
 *
 * همان افکتی که در نسخه‌ی قبلی سایت روی کارت‌ها بود: یک لکه‌ی نور
 * که با موس روی سطح کارت حرکت می‌کند، انگار چراغی بالای شیشه است.
 *
 * سه تصمیم:
 *
 * ۱. یک شنونده روی document، نه یکی به‌ازای هر کارت. کارت‌ها در
 *    چند سکشن رندر می‌شوند و بعضی‌شان (تخفیف‌ها) با داده عوض
 *    می‌شوند. واگذاری از ریشه یعنی هیچ‌کدام لازم نیست چیزی درباره‌ی
 *    این افکت بدانند.
 *
 * ۲. نوشتن در rAF بسته‌بندی می‌شود. pointermove ده‌ها بار در ثانیه
 *    شلیک می‌کند و هر نوشتنِ متغیرِ CSS یک بازچینش سبک است.
 *
 * ۳. مختصات به درصد نوشته می‌شود نه پیکسل، تا اگر کارت در ریلِ
 *    کشویی جابه‌جا شد یا صفحه اسکرول خورد، لکه سر جایش بماند.
 */

const SELECTOR = '.deal, .review, .qa__card, .art, .pcard';

export function CursorLight() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;
    let current: HTMLElement | null = null;

    const flush = () => {
      frame = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      pending = null;
      el.style.setProperty('--lx', `${x.toFixed(1)}%`);
      el.style.setProperty('--ly', `${y.toFixed(1)}%`);
      el.style.setProperty('--lon', '1');
    };

    const onMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>(SELECTOR) ?? null;

      /* از کارت قبلی که خارج شدیم باید خاموش شود، وگرنه نور آخرین
         لحظه رویش می‌ماند. */
      if (current && current !== el) current.style.setProperty('--lon', '0');
      current = el;
      if (!el) return;

      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;

      pending = {
        el,
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      };
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const onLeave = () => {
      if (current) current.style.setProperty('--lon', '0');
      current = null;
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('blur', onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return null;
}
