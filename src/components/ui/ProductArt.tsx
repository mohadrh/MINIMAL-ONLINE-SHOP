'use client';

import React, { useState } from 'react';
import { asset } from '../../lib/asset';

/**
 * تصویر محصول با جایگزینِ تایپوگرافیک.
 *
 * بعضی محصولات هنوز تصویر ندارند — چت‌جی‌پی‌تی، فیگما و تلگرام
 * پریمیوم. به‌جای آیکونِ تصویرِ شکسته، یک صفحه‌ی تایپوگرافیک روی
 * رنگ خود محصول می‌نشیند تا عمدی به نظر برسد نه خراب.
 *
 * تشخیصِ خرابی دو راه دارد و هر دو لازم است:
 *
 *   onError  — برای تصویری که بعد از هیدریشن شکست می‌خورد.
 *   naturalWidth === 0 موقع سوار شدن — برای تصویری که سمت سرور
 *   رندر شده و پیش از رسیدن ری‌اکت شکسته. رویدادِ خطای آن هرگز به
 *   ری‌اکت نمی‌رسد، و اولین نسخه دقیقاً به همین دلیل هیچ جایگزینی
 *   نشان نمی‌داد.
 */
export function ProductArt({
  src,
  title,
  brand,
  className = '',
  blankClassName = 'is-blank',
}: {
  src: string;
  title: string;
  brand?: string;
  className?: string;
  blankClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={`${className} ${blankClassName}`.trim()}>
        <span className="art-plate" aria-hidden="true">
          <b>{title}</b>
          {brand && <i>{brand}</i>}
        </span>
      </span>
    );
  }

  return (
    <span className={className}>
      <img
        ref={(el) => {
          if (el && el.complete && el.naturalWidth === 0) setFailed(true);
        }}
        src={asset(src)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setFailed(true)}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth === 0) setFailed(true);
        }}
      />
    </span>
  );
}
