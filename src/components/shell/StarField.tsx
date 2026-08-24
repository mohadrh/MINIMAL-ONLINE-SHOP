import React from 'react';

/**
 * آسمان شب.
 *
 * پنج لایه، به همان ترتیبی که در نمونه هست:
 *
 *   ۱. void   — گرادیانت شعاعیِ عمق فضا. این را بار اول جا انداختم
 *               و برای همین ستاره‌ها روی آبیِ تخت می‌نشستند و صحنه
 *               عمق نداشت. بدون این لایه، بقیه‌شان معنی ندارند.
 *   ۲. nebula — سه لکه‌ی رنگی با blend مود screen که خیلی آرام
 *               می‌لغزند و بزرگ می‌شوند.
 *   ۳-۵. سه لایه ستاره با چگالی و سرعت متفاوت. کاشی‌هایشان
 *        (۶۱، ۸۳، ۱۴۰) نسبت به هم اول‌اند تا الگو دیر تکرار شود؛
 *        با اعداد مضرب، شبکه بعد از چند وجب آشکارا تکراری می‌شود.
 *
 * روی همه‌شان چند شهاب می‌افتد. تأخیرهایشان نامنظم است تا رسیدنشان
 * ریتم ساعت‌وار پیدا نکند.
 *
 * کل میدان با گرادیانتِ تکرارشونده کشیده می‌شود نه با صدها المان —
 * نه گره‌ی DOM بیشتر.
 */

const METEORS = [
  { d: '0s',    top: '-6%',  left: '-8%', len: '210px' },
  { d: '4.3s',  top: '8%',   left: '16%', len: '150px' },
  { d: '9.1s',  top: '-12%', left: '42%', len: '260px' },
  { d: '14.7s', top: '2%',   left: '64%', len: '170px' },
  { d: '21.2s', top: '-4%',  left: '28%', len: '300px' },
];

const STAR = 'rgba(255,255,255,0.97)';
const STAR_WING = 'rgba(190,214,255,0.8)';

export function StarField() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* ۱ — عمق فضا */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(130% 100% at 50% 108%, #1a2340 0%, #06070f 68%)',
        }}
      />

      {/* ۲ — سحابی */}
      <div
        className="absolute inset-0 opacity-50 mix-blend-screen blur-[46px] animate-nebula"
        style={{
          background: [
            'radial-gradient(34% 30% at 22% 30%, rgba(124,92,220,0.5), transparent 70%)',
            'radial-gradient(30% 26% at 74% 22%, rgba(56,142,214,0.45), transparent 72%)',
            'radial-gradient(40% 30% at 58% 78%, rgba(190,80,170,0.4), transparent 74%)',
          ].join(','),
        }}
      />

      {/* ۳ — ستاره‌های دور */}
      <div
        className="absolute -inset-[6%] bg-repeat opacity-50 animate-twinkle-slow"
        style={{
          backgroundImage: `radial-gradient(${STAR} 0.6px, transparent 0.8px)`,
          backgroundSize: '61px 61px',
          backgroundPosition: '14px 22px',
          animation: 'twinkle 7.5s ease-in-out infinite alternate, drift 220s linear infinite',
        }}
      />

      {/* ۴ — ستاره‌های میانی */}
      <div
        className="absolute -inset-[6%] bg-repeat opacity-70"
        style={{
          backgroundImage: [
            `radial-gradient(${STAR} 0.85px, transparent 1.05px)`,
            `radial-gradient(${STAR_WING} 0.7px, transparent 0.95px)`,
          ].join(','),
          backgroundSize: '83px 83px, 127px 127px',
          backgroundPosition: '0 0, 47px 61px',
          animation: 'twinkle 5s ease-in-out infinite alternate-reverse, drift 150s linear infinite',
        }}
      />

      {/* ۵ — ستاره‌های نزدیک */}
      <div
        className="absolute -inset-[6%] bg-repeat"
        style={{
          backgroundImage: 'radial-gradient(#fff 1.2px, transparent 1.45px)',
          backgroundSize: '140px 140px',
          backgroundPosition: '66px 31px',
          filter: 'drop-shadow(0 0 4px rgba(180,210,255,0.7))',
          animation: 'twinkle 3.6s ease-in-out infinite alternate, drift 95s linear infinite',
        }}
      />

      {/* شهاب‌ها */}
      <div className="absolute inset-0 overflow-hidden">
        {METEORS.map((m) => (
          <span
            key={m.d}
            className="absolute h-0.5 rounded-full opacity-0 animate-meteor"
            style={{
              top: m.top,
              left: m.left,
              width: m.len,
              rotate: '32deg',
              transformOrigin: '0 50%',
              animationDelay: m.d,
              background:
                'linear-gradient(270deg, #fff 0 2%, rgba(150,185,255,0.72) 18%, transparent 100%)',
              filter: 'drop-shadow(0 0 6px rgba(170,205,255,0.9))',
            }}
          />
        ))}
      </div>
    </div>
  );
}
