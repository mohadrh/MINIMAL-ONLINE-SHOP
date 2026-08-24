import React from 'react';

/**
 * لودر — نقطه‌ای که دور یک شکل می‌چرخد و خطِ شکل هم‌زمان کشیده و
 * جمع می‌شود.
 *
 * چرا این و نه یک دایره‌ی چرخان: اسپینرِ معمولی هیچ چیزی درباره‌ی
 * پیشرفت نمی‌گوید و بعد از دو ثانیه حس «گیر کرده» می‌دهد. اینجا
 * نقطه مسیر مشخصی را دور می‌زند و چشم می‌فهمد چیزی در جریان است.
 *
 * کشیدن خط با stroke-dasharray انجام می‌شود نه با انیمیشنِ طول:
 * مرورگر فقط الگوی خط‌چین را جابه‌جا می‌کند و مسیر دوباره محاسبه
 * نمی‌شود.
 */

type Shape = 'circle' | 'square' | 'triangle';

export function Loader({
  shape = 'circle',
  label = 'در حال بارگذاری',
}: {
  shape?: Shape;
  label?: string;
}) {
  return (
    <span className={`loader loader--${shape}`} role="status" aria-live="polite">
      <svg viewBox={shape === 'triangle' ? '0 0 86 80' : '0 0 80 80'} aria-hidden="true">
        {shape === 'circle' && <circle cx="40" cy="40" r="32" />}
        {shape === 'square' && <rect x="8" y="8" width="64" height="64" />}
        {shape === 'triangle' && <polygon points="43 8 79 72 7 72" />}
      </svg>
      <span className="loader__sr">{label}</span>
    </span>
  );
}

/** لودر تمام‌صفحه‌ی سکشن — وقتی محتوای یک بخش هنوز نرسیده */
export function BlockLoader({ label = 'در حال بارگذاری' }: { label?: string }) {
  return (
    <div className="loader-block">
      <Loader shape="circle" label={label} />
      <span className="loader-block__text">{label}…</span>
    </div>
  );
}
