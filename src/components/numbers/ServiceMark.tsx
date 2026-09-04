import React from 'react';

/**
 * نشان‌واره‌ی سرویس‌ها.
 *
 * تا حالا هر سرویس فقط یک حرف بود — «T» برای تلگرام، «W» برای
 * واتساپ. نتیجه این بود که شبکه‌ی سرویس‌ها یک جدولِ حروف می‌شد و
 * کاربر باید هر خانه را *می‌خواند* تا پیدایش کند. آدم سرویس‌ها را
 * از روی شکلشان می‌شناسد، نه از روی حرف اولشان.
 *
 * ⚠ این‌ها بازکشیده‌شده‌اند، نه برداشته‌شده.
 *
 * فایل هیچ سایت دیگری اینجا کپی نشده. هر نشان با کمترین خط ممکن
 * دوباره کشیده شده تا قابل تشخیص باشد بدون اینکه نسخه‌ی دقیقِ
 * علامت تجاری باشد: هواپیمای کاغذی برای تلگرام، حباب گفتگو با
 * گوشی برای واتساپ، مربعِ دوربین برای اینستاگرام.
 *
 * استفاده از نشانِ یک برند برای اینکه بگوییم «شماره برای همین
 * سرویس» در این بازار عرفی است، ولی تصمیمِ تجاری‌اش با کارفرماست.
 * اگر خواست برداشته شوند، فقط همین فایل عوض می‌شود و بقیه‌ی صفحه
 * دست نمی‌خورد — نشان‌ها از یک نقطه می‌آیند.
 *
 * همه با currentColor کشیده می‌شوند تا رنگ سرویس از CSS بیاید.
 */

type P = { className?: string };
const box = (children: React.ReactNode, cls?: string) => (
  <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden="true" focusable="false">
    {children}
  </svg>
);

const MARKS: Record<string, (p: P) => React.ReactElement> = {
  /* هواپیمای کاغذی */
  telegram: ({ className }) => box(
    <path
      d="M21.2 4.3 3.5 11c-.9.34-.87 1.63.05 1.93l4.3 1.4 1.65 4.9c.28.83 1.36 1 1.9.32l2.2-2.8 4.3 3.2c.6.44 1.46.12 1.62-.6l3-13.1c.18-.8-.6-1.47-1.32-1.2Z M8.1 14.6l9.6-6.7-7.3 7.9-.4 3.1"
      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"
    />, className,
  ),

  /* حباب گفتگو با گوشی */
  whatsapp: ({ className }) => box(
    <>
      <path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.3 20.7l4.4-1.1A8.8 8.8 0 1 0 12 3.2Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 8.4c.3-.1.6 0 .8.3l.7 1.2c.2.3.1.6-.1.8l-.5.5c.5 1 1.3 1.8 2.3 2.3l.5-.5c.2-.2.5-.3.8-.1l1.2.7c.3.2.4.5.3.8-.3.9-1.3 1.4-2.2 1.1a7.6 7.6 0 0 1-4.9-4.9c-.3-.9.2-1.9 1.1-2.2Z"
        fill="currentColor" />
    </>, className,
  ),

  /* مربعِ دوربین */
  instagram: ({ className }) => box(
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="7" r="1.15" fill="currentColor" />
    </>, className,
  ),

  /* نتِ موسیقی — تیک‌تاک */
  tiktok: ({ className }) => box(
    <path d="M15.2 3.5v9.9a4 4 0 1 1-3.3-3.94v2.6a1.5 1.5 0 1 0 1.1 1.44V3.5h2.2c.25 2 1.6 3.4 3.6 3.6v2.2c-1.4-.1-2.6-.6-3.6-1.45"
      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />,
    className,
  ),

  /* ضربدر */
  x: ({ className }) => box(
    <path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />, className,
  ),

  /* دسته‌بازیِ گرد — دیسکورد */
  discord: ({ className }) => box(
    <>
      <path d="M8.2 5.6A13 13 0 0 1 12 5c1.3 0 2.6.2 3.8.6 2.6 1 4 4 4.2 8.2-1.2 1.6-3 2.7-4.9 3.2l-1-1.7c.7-.2 1.3-.5 1.9-.9-2.6 1.2-5.4 1.2-8 0 .6.4 1.2.7 1.9.9l-1 1.7c-1.9-.5-3.7-1.6-4.9-3.2C4.2 9.6 5.6 6.6 8.2 5.6Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="9.4" cy="12.2" r="1.15" fill="currentColor" />
      <circle cx="14.6" cy="12.2" r="1.15" fill="currentColor" />
    </>, className,
  ),

  /* گره‌ی شش‌پر */
  openai: ({ className }) => box(
    <path d="M12 3.2 19.6 7.6v8.8L12 20.8 4.4 16.4V7.6L12 3.2Z M12 3.2v8.8M19.6 7.6 12 12M4.4 16.4 12 12"
      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />, className,
  ),

  /* جرقه‌ی چهارپر */
  claude: ({ className }) => box(
    <path d="M12 2.8c.6 4.4 1.4 5.2 5.8 5.8-4.4.6-5.2 1.4-5.8 5.8-.6-4.4-1.4-5.2-5.8-5.8 4.4-.6 5.2-1.4 5.8-5.8Z M17.3 14.4c.35 2.4.75 2.8 3.1 3.15-2.35.35-2.75.75-3.1 3.15-.35-2.4-.75-2.8-3.1-3.15 2.35-.35 2.75-.75 3.1-3.15Z"
      stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />, className,
  ),

  /* ستاره‌ی چهارپر */
  gemini: ({ className }) => box(
    <path d="M12 2.6c.8 5.4 3.2 7.8 8.6 8.6-5.4.8-7.8 3.2-8.6 8.6-.8-5.4-3.2-7.8-8.6-8.6C8.8 10.4 11.2 8 12 2.6Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />, className,
  ),

  /* قایقِ بادبانی — میدجرنی */
  midjourney: ({ className }) => box(
    <path d="M3.6 16.6c2.4 1.6 5 2.4 8.4 2.4s6-.8 8.4-2.4M6.2 15.4 12 4.6l5.8 10.8"
      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />, className,
  ),

  /* حرف P با دنباله — پی‌پال */
  paypal: ({ className }) => box(
    <path d="M7.4 19.4 9.6 5.2h4.9c2.5 0 3.9 1.4 3.5 3.6-.4 2.4-2.3 3.9-5 3.9h-2.3l-.9 6.7H7.4Z"
      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />, className,
  ),

  /* لوزی از مربع‌ها */
  binance: ({ className }) => box(
    <path d="m12 3.4 3 3-3 3-3-3 3-3Zm-5.6 5.6 3 3-3 3-3-3 3-3Zm11.2 0 3 3-3 3-3-3 3-3ZM12 14.6l3 3-3 3-3-3 3-3Z"
      stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />, className,
  ),

  /* موجِ دوخطی */
  wise: ({ className }) => box(
    <path d="M4 6.4h13.4L11 12l6.4 5.6H4M8.4 12H16"
      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />, className,
  ),

  /* حرف G در دایره */
  google: ({ className }) => box(
    <path d="M20.4 12c0 4.6-3.6 8-8.4 8a8 8 0 1 1 5.4-13.9l-2.4 2.3A4.7 4.7 0 0 0 12 7.2a4.8 4.8 0 1 0 4.5 6.3H12v-3h8.3c.07.5.1 1 .1 1.5Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />, className,
  ),

  /* چرخ‌دنده‌ی بخار */
  steam: ({ className }) => box(
    <>
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.4" cy="9.6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.6" cy="15.2" r="1.9" stroke="currentColor" strokeWidth="1.5" />
      <path d="m10.2 13.7 2.1-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>, className,
  ),


  /* دسته‌ی بازی — پلی‌استیشن */
  playstation: ({ className }) => box(
    <>
      <rect x="2.6" y="7.4" width="18.8" height="9.2" rx="4.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.6 10.6v3.2M5 12.2h3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16.4" cy="10.9" r="1.05" fill="currentColor" />
      <circle cx="18.4" cy="13.3" r="1.05" fill="currentColor" />
    </>, className,
  ),

  /* ایکس‌باکس — دو کمانِ متقاطع */
  xbox: ({ className }) => box(
    <>
      <circle cx="12" cy="12" r="8.7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.4 18.4C8 14 10 11 12 8.6c2 2.4 4 5.4 5.6 9.8M7.2 6.2C9 7.4 10.7 9 12 10.4c1.3-1.4 3-3 4.8-4.2"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>, className,
  ),

  /* کنوا — دایره با حرف C */
  canva: ({ className }) => box(
    <>
      <circle cx="12" cy="12" r="8.7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 9.4a3.4 3.4 0 0 0-4.9 1c-1 1.7-.7 3.8.7 4.6 1.1.6 2.5.1 3.4-1"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>, className,
  ),

  /* کپ‌کات — قیچیِ برش */
  capcut: ({ className }) => box(
    <>
      <circle cx="7" cy="17" r="2.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="17" r="2.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.6 15.2 17.5 4.8M15.4 15.2 6.5 4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>, className,
  ),

  /* فیگما — سه دایره‌ی روی هم */
  figma: ({ className }) => box(
    <>
      <rect x="8" y="2.8" width="8" height="6.2" rx="3.1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="8.9" width="8" height="6.2" rx="3.1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 15.1H10a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 3.1-3.1v-3.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </>, className,
  ),

  /* کرسر — مکان‌نمای متن */
  cursor: ({ className }) => box(
    <path d="M12 3.2 20 7.8v8.4L12 20.8 4 16.2V7.8L12 3.2Zm0 0v17.6M20 7.8 12 12.4 4 7.8"
      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />, className,
  ),

  /* گیفت کارت — جعبه با روبان */
  gift: ({ className }) => box(
    <>
      <rect x="3.2" y="8.6" width="17.6" height="11.8" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.2 12.6h17.6M12 8.6v11.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8.6C10.4 6.2 9 4.6 7.6 4.6a2 2 0 0 0 0 4h4.4Zm0 0c1.6-2.4 3-4 4.4-4a2 2 0 0 1 0 4H12Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </>, className,
  ),

  /* حباب پیام با قفل — سیگنال */
  signal: ({ className }) => box(
    <>
      <path d="M12 3.6a8.4 8.4 0 0 0-7.3 12.6L3.6 20.4l4.2-1.1A8.4 8.4 0 1 0 12 3.6Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 12.4v-1.2a2 2 0 1 1 4 0v1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="9.2" y="12.4" width="5.6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
    </>, className,
  ),
};

/** نشانِ پیش‌فرض: دایره‌ای با حرف اول — برای سرویسی که نشان ندارد */
function Fallback({ mark, className }: { mark: string; className?: string }) {
  return (
    <span className={className} aria-hidden="true" data-fallback="1">
      {mark}
    </span>
  );
}

export function ServiceMark(
  { id, mark, className }: { id: string; mark: string; className?: string },
) {
  const M = MARKS[id];
  if (!M) return <Fallback mark={mark} className={className} />;
  return M({ className });
}
