'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * بازگشت به بالا.
 *
 * در نسخه‌ی یک این یک ققنوس متحرک با دنباله‌ی موشک بود. اینجا یک
 * دکمه‌ی ساده است — همان کار را می‌کند و با بقیه‌ی سایت می‌خواند.
 *
 * فقط بعد از یک صفحه اسکرول ظاهر می‌شود؛ دکمه‌ای که همیشه هست و
 * کاری ندارد، فقط جای صفحه را می‌گیرد.
 */
export function ScrollTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      className="stop"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="بازگشت به بالای صفحه"
    >
      <ArrowUp aria-hidden="true" />
    </button>
  );
}
