import React from 'react';

/**
 * پس‌زمینه‌ی هاله‌های متحرک.
 *
 * نسخه‌ی اول یک مسیر SVG هم داشت که وسط قاب مورف می‌شد. آن را
 * برداشتم: روی یک باکسِ پهن، آن شکل فقط یک دایره‌ی مات وسط صفحه
 * می‌شد و به‌جای پس‌زمینه، شبیه یک المانِ فراموش‌شده بود. چیزی که
 * کار می‌کند هاله‌هاست، نه شکلِ مشخص.
 *
 * هر هاله یک گرادیانت مخروطی است که هم‌زمان دو کار می‌کند: شکلش با
 * border-radius هشت‌مقداری عوض می‌شود و خودش هم می‌چرخد. چون
 * گرادیانت مخروطی است، چرخیدنش رنگ را هم می‌چرخاند — رنگِ توپر این
 * را نمی‌دهد و فقط یک لکه‌ی مات می‌ماند.
 *
 * دوره‌ی چرخش ۲٫۳ برابر دوره‌ی مورف است تا دو حرکت روی هم قفل
 * نشوند؛ اگر هم‌دوره باشند، هاله ضرب‌آهنگ پیدا می‌کند و مصنوعی
 * دیده می‌شود.
 */

type Tone = 'blue' | 'warm';

const SETS: Record<Tone, { t: string; x: string; y: string; s: string; h: number }[]> = {
  blue: [
    { t: '13s', x: '12%', y: '18%', s: '42%', h: 232 },
    { t: '17s', x: '72%', y: '26%', s: '34%', h: 208 },
    { t: '15s', x: '54%', y: '78%', s: '46%', h: 262 },
    { t: '19s', x: '22%', y: '82%', s: '30%', h: 190 },
  ],
  warm: [
    { t: '14s', x: '16%', y: '22%', s: '40%', h: 28 },
    { t: '18s', x: '76%', y: '20%', s: '32%', h: 340 },
    { t: '16s', x: '52%', y: '80%', s: '44%', h: 268 },
    { t: '20s', x: '86%', y: '72%', s: '28%', h: 205 },
  ],
};

export function MorphBackdrop({
  tone = 'blue',
  className = '',
}: {
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 -z-10 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* شست‌وشوی پایه — هاله‌ها روی چیزی بنشینند، نه روی خلأ */}
      <div
        className="absolute inset-0"
        style={{
          background:
            tone === 'blue'
              ? 'radial-gradient(120% 100% at 50% 0%, #ffffff, #e7edfb 82%)'
              : 'radial-gradient(120% 100% at 50% 0%, #fffdfb, #fdeee8 82%)',
        }}
      />

      {/* هاله‌ها.

          بلور بالا و اشباع کمی بیشتر: بدون بلور، لبه‌ی شکلِ مورف
          دیده می‌شود و به‌جای هاله یک لکه‌ی کش‌دار به نظر می‌رسد. */}
      <div className="absolute inset-0 opacity-70 blur-[40px] saturate-125">
        {SETS[tone].map((b) => (
          <span
            key={`${b.x}-${b.y}`}
            /* انیمیشن با کلاس CSS نوشته می‌شود نه با مقدار دلخواهِ
               تیلویند: سه انیمیشنِ هم‌زمان با کاما داخل
               animate-[...] خوانا نیست و به‌راحتی می‌شکند. */
            className="morphblob absolute aspect-square mix-blend-multiply"
            style={{
              ['--t' as string]: b.t,
              left: b.x,
              top: b.y,
              width: b.s,
              translate: '-50% -50%',
              background: `conic-gradient(from 140deg,
                hsl(${b.h} 74% 74%),
                hsl(${b.h + 40} 68% 82%),
                hsl(${b.h - 30} 80% 70%),
                hsl(${b.h} 74% 74%))`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
