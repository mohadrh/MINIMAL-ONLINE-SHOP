import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CATEGORIES, PRODUCTS } from '../../data/catalog';
import { Glyph, type GlyphName } from '../ui/Glyph';
import { StarField } from '../shell/StarField';
import { MorphBackdrop } from '../ui/MorphBackdrop';

/**
 * دسترسی سریع.
 *
 * پس‌زمینه‌اش با تم عوض می‌شود: روز هاله‌های متحرک، شب آسمان ستاره.
 * هر دو رندر می‌شوند و CSS یکی را نشان می‌دهد — نه جاوااسکریپت.
 * اگر با شرطِ JS انتخاب می‌شدند، سرور یک چیز می‌فرستاد و کلاینت چیز
 * دیگری و React از ناسازگاری شکایت می‌کرد.
 *
 * متن کارت‌ها در روز تیره است و در شب سفید — چون پشتشان در روز
 * کاغذِ روشن است و در شب فضا. رنگ متنِ ثابت روی یکی از این دو
 * حتماً ناخوانا می‌شود؛ همین ایراد نسخه‌ی قبل بود.
 */

const CARD_ICONS: Record<string, GlyphName> = {
  ai: 'ai',
  creative: 'creative',
  social: 'social',
  education: 'education',
  gaming: 'gaming',
};

const OTHER: { g: GlyphName; t: string; h: string }[] = [
  { g: 'number',  t: 'شماره مجازی',      h: '/numbers' },
  { g: 'gift',    t: 'گیفت کارت',        h: '/shop' },
  { g: 'card',    t: 'پرداخت ریالی',     h: '/faq' },
  { g: 'shield',  t: 'گارانتی و مرجوعی', h: '/rules' },
  { g: 'spark',   t: 'پیشنهادهای ویژه',  h: '/shop' },
  { g: 'support', t: 'پشتیبانی',         h: '/track' },
];

export function QuickAccess() {
  return (
    <section className="qa reveal relative isolate overflow-hidden py-24 md:py-30">
      {/* روز */}
      <div className="qa__day"><MorphBackdrop tone="blue" /></div>
      {/* شب */}
      <div className="qa__night"><StarField /></div>

      <div className="container relative">
        <div className="mb-12 text-center">
          <span className="qa__kicker mb-3 inline-block text-xs font-bold">
            همه چیز یک‌جا
          </span>
          <h2 className="qa__title text-2xl font-black md:text-3xl">
            دسترسی سریع به سرویس‌های محبوب
          </h2>
        </div>

        {/* ---------- چهار ورق شیشه‌ای ---------- */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.slice(0, 4).map((c, idx) => {
            const glyph = CARD_ICONS[c.slug] ?? 'ai';
            const items = PRODUCTS.filter((p) => p.category === c.slug).slice(0, 5);
            return (
              <div
                key={c.slug}
                className="qa__card group flex flex-col rounded-3xl p-7"
                style={{ ['--i' as string]: idx }}
              >
                <div className="qa__card-head mb-5 flex items-center justify-between gap-3 pb-5">
                  <span className="text-base font-extrabold">{c.title}</span>
                  <Glyph
                    name={glyph}
                    className="qa__card-glyph shrink-0 transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                <div className="grid gap-3">
                  {items.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/product/${p.slug}`}
                      className="qa__link text-sm transition-colors"
                    >
                      {p.title}
                    </Link>
                  ))}
                </div>

                <Link
                  href={`/${c.slug}`}
                  className="qa__more mt-auto flex items-center gap-2 pt-6 text-sm font-bold"
                >
                  مشاهده
                  <ArrowLeft
                    aria-hidden="true"
                    className="size-3.5 transition-transform duration-300 group-hover:-translate-x-1"
                  />
                </Link>
              </div>
            );
          })}
        </div>

        {/* ---------- بقیه‌ی خدمات ---------- */}
        <h3 className="qa__title mt-28 mb-10 text-center text-lg font-extrabold">
          دیگر خدمات محبوب کاربران
        </h3>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {OTHER.map(({ g, t, h }, idx) => (
            <Link
              key={t}
              href={h}
              className="qa__other group grid justify-items-center gap-3 rounded-2xl px-3 py-5 text-center text-xs font-semibold"
              style={{ ['--i' as string]: idx }}
            >
              <span className="qa__other-icon grid size-14 place-items-center rounded-2xl">
                <Glyph name={g} className="size-6" />
              </span>
              {t}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
