import React from 'react';

/**
 * آیکون‌های اختصاصی.
 *
 * چرا کتابخانه‌ی آماده کافی نبود: آیکون‌های تک‌خطیِ استاندارد
 * همه‌جا یک شکل‌اند و صفحه را «قالبی» نشان می‌دهند. اینجا هر آیکون
 * دو لایه دارد — یک سطحِ توپرِ کم‌رنگ که فرم را می‌سازد و یک خطِ
 * پررنگ که جزئیات را — و همین دولایگی است که به چشم می‌گوید این
 * آیکون‌ها برای همین سایت کشیده شده‌اند.
 *
 * هر دو لایه از currentColor مشتق می‌شوند، پس آیکون هرجا برود رنگ
 * محیطش را می‌گیرد و لازم نیست نسخه‌ی تیره و روشن جدا داشته باشد.
 */

type Name =
  | 'ai' | 'creative' | 'gaming' | 'social' | 'education'
  | 'number' | 'card' | 'shield' | 'clock' | 'support'
  | 'gift' | 'spark';

const SIZE = 28;

/* لایه‌ی توپر با شفافیت کم می‌آید تا زیر خط اصلی بنشیند */
const fill = { fill: 'currentColor', opacity: 0.18 };
const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const PATHS: Record<Name, React.ReactNode> = {
  /* هوش مصنوعی — تراشه با هسته‌ی درخشان */
  ai: (
    <>
      <rect x="7" y="7" width="14" height="14" rx="4" {...fill} />
      <rect x="7" y="7" width="14" height="14" rx="4" {...line} />
      <path d="M12 12h4v4h-4z" {...line} />
      <path d="M11 3v3M17 3v3M11 22v3M17 22v3M3 11h3M3 17h3M22 11h3M22 17h3" {...line} />
    </>
  ),

  /* ابزار خلاقیت — پالت با قلم */
  creative: (
    <>
      <path d="M14 4a10 10 0 1 0 0 20c1.5 0 2-1 1.4-2.2-.7-1.4.3-2.8 1.9-2.8H21a3 3 0 0 0 3-3A10 10 0 0 0 14 4Z" {...fill} />
      <path d="M14 4a10 10 0 1 0 0 20c1.5 0 2-1 1.4-2.2-.7-1.4.3-2.8 1.9-2.8H21a3 3 0 0 0 3-3A10 10 0 0 0 14 4Z" {...line} />
      <circle cx="10" cy="11" r="1.4" fill="currentColor" />
      <circle cx="16" cy="9" r="1.4" fill="currentColor" />
      <circle cx="8" cy="17" r="1.4" fill="currentColor" />
    </>
  ),

  /* گیم — دسته‌ی بازی */
  gaming: (
    <>
      <path d="M8 9h12a6 6 0 0 1 5.8 7.5l-1 4A3.6 3.6 0 0 1 19 21.6L17 19h-6l-2 2.6a3.6 3.6 0 0 1-5.8-1.1l-1-4A6 6 0 0 1 8 9Z" {...fill} />
      <path d="M8 9h12a6 6 0 0 1 5.8 7.5l-1 4A3.6 3.6 0 0 1 19 21.6L17 19h-6l-2 2.6a3.6 3.6 0 0 1-5.8-1.1l-1-4A6 6 0 0 1 8 9Z" {...line} />
      <path d="M9 13v3M7.5 14.5h3M18.5 13.5h.01M21 15.5h.01" {...line} />
    </>
  ),

  /* شبکه‌های اجتماعی — حباب گفتگو */
  social: (
    <>
      <path d="M4 12a8 8 0 0 1 8-8h4a8 8 0 0 1 0 16h-6l-5 4v-4.5A8 8 0 0 1 4 12Z" {...fill} />
      <path d="M4 12a8 8 0 0 1 8-8h4a8 8 0 0 1 0 16h-6l-5 4v-4.5A8 8 0 0 1 4 12Z" {...line} />
      <path d="M11 12h.01M15 12h.01M19 12h.01" {...line} />
    </>
  ),

  /* آموزش — کلاه فارغ‌التحصیلی */
  education: (
    <>
      <path d="M14 5 3 11l11 6 11-6-11-6Z" {...fill} />
      <path d="M14 5 3 11l11 6 11-6-11-6Z" {...line} />
      <path d="M7 13.5V19c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-5.5M25 11v6" {...line} />
    </>
  ),

  /* شماره مجازی — گوشی با موج */
  number: (
    <>
      <rect x="6" y="3" width="12" height="22" rx="3" {...fill} />
      <rect x="6" y="3" width="12" height="22" rx="3" {...line} />
      <path d="M11 21h2" {...line} />
      <path d="M21 9a6 6 0 0 1 0 10M24 6a10 10 0 0 1 0 16" {...line} />
    </>
  ),

  /* پرداخت ریالی — کارت بانکی */
  card: (
    <>
      <rect x="2" y="6" width="24" height="16" rx="3" {...fill} />
      <rect x="2" y="6" width="24" height="16" rx="3" {...line} />
      <path d="M2 11h24" {...line} />
      <path d="M6 17h4" {...line} />
    </>
  ),

  /* گارانتی — سپر با تیک */
  shield: (
    <>
      <path d="M14 3 5 6.5V14c0 5.5 3.7 9.6 9 11 5.3-1.4 9-5.5 9-11V6.5L14 3Z" {...fill} />
      <path d="M14 3 5 6.5V14c0 5.5 3.7 9.6 9 11 5.3-1.4 9-5.5 9-11V6.5L14 3Z" {...line} />
      <path d="m10 13.5 3 3 5-6" {...line} />
    </>
  ),

  /* تحویل آنی — ساعت با آذرخش */
  clock: (
    <>
      <circle cx="14" cy="14" r="10" {...fill} />
      <circle cx="14" cy="14" r="10" {...line} />
      <path d="M14 8v6l4 2" {...line} />
    </>
  ),

  /* پشتیبانی — هدست */
  support: (
    <>
      <path d="M5 15a9 9 0 0 1 18 0v4a3 3 0 0 1-3 3h-2" {...line} />
      <rect x="2" y="14" width="5" height="8" rx="2" {...fill} />
      <rect x="2" y="14" width="5" height="8" rx="2" {...line} />
      <rect x="21" y="14" width="5" height="8" rx="2" {...fill} />
      <rect x="21" y="14" width="5" height="8" rx="2" {...line} />
    </>
  ),

  /* گیفت کارت — جعبه با روبان */
  gift: (
    <>
      <rect x="3" y="10" width="22" height="14" rx="2" {...fill} />
      <rect x="3" y="10" width="22" height="14" rx="2" {...line} />
      <path d="M14 10v14M3 15h22" {...line} />
      <path d="M14 10c-3 0-5-1-5-3s3-2 5 3c2-5 5-4 5-3s-2 3-5 3Z" {...line} />
    </>
  ),

  /* پیشنهاد ویژه — درخشش */
  spark: (
    <>
      <path d="M14 3l2.6 7.4L24 13l-7.4 2.6L14 23l-2.6-7.4L4 13l7.4-2.6L14 3Z" {...fill} />
      <path d="M14 3l2.6 7.4L24 13l-7.4 2.6L14 23l-2.6-7.4L4 13l7.4-2.6L14 3Z" {...line} />
    </>
  ),
};

export function Glyph({ name, className }: { name: Name; className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={SIZE}
      height={SIZE}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

export type GlyphName = Name;
