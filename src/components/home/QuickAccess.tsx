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

/* شش خدمت، هر کدام با یک جمله.

   قبلاً فقط یک آیکون بود و زیرش دو کلمه، در شش ستونِ باریک. نتیجه
   این بود که سکشن «فقط چند آیکون» دیده می‌شد و هیچ‌کدام معلوم
   نبود دقیقاً چه کاری می‌کند — «پرداخت ریالی» یعنی چه؟ «گارانتی و
   مرجوعی» شامل چه می‌شود؟

   حالا هر مورد یک جمله دارد که همان سوال را جواب می‌دهد، و رنگِ
   خودش را از کمان ققنوس می‌گیرد تا شش آیکونِ هم‌رنگ یک دیوارِ
   یکنواخت نسازند. */
const OTHER: { g: GlyphName; t: string; d: string; h: string; tube: string }[] = [
  { g: 'number',  t: 'شماره مجازی',      d: 'برای ثبت‌نام سرویس‌هایی که شماره‌ی ایران را قبول نمی‌کنند.', h: '/numbers', tube: '#3ddcff' },
  { g: 'gift',    t: 'گیفت کارت',        d: 'شارژ اکانت پلی‌استیشن، ایکس‌باکس و استیم.',                  h: '/shop',    tube: '#ff4d9f' },
  { g: 'card',    t: 'پرداخت ریالی',     d: 'با کارت بانکی خودت. نه ارز لازم داری نه حساب خارجی.',       h: '/faq',     tube: '#f59440' },
  { g: 'shield',  t: 'گارانتی و مرجوعی', d: 'تا آخرین روز اشتراک پشتش هستیم.',                            h: '/rules',   tube: '#4ade80' },
  { g: 'spark',   t: 'پیشنهادهای ویژه',  d: 'تخفیف‌هایی که هر روز عوض می‌شوند.',                          h: '/shop',    tube: '#c94ff5' },
  { g: 'support', t: 'پشتیبانی',         d: 'تلگرام و تیکت، همه‌ی روزهای هفته.',                          h: '/track',   tube: '#7a6bff' },
];

export function QuickAccess() {
  return (
    <section className="qa reveal relative isolate overflow-hidden py-24 md:py-30">
      {/* روز */}
      <div className="qa__day"><MorphBackdrop tone="blue" /></div>
      {/* شب */}
      <div className="qa__night"><StarField /></div>

      <div className="wrap relative">
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
        <h3 className="qa__title">دیگر خدمات محبوب کاربران</h3>
        <p className="qa__lead">هر کدام یک کار مشخص می‌کند؛ اینجا نوشته چه کاری.</p>

        <div className="qa__others">
          {OTHER.map(({ g, t, d, h, tube }, idx) => (
            <Link
              key={t}
              href={h}
              className="qa__other"
              style={{ ['--i' as string]: idx, ['--tube' as string]: tube }}
            >
              {/* بدون کادر — فقط آیکون. هاله‌ی رنگی روی هاور جای
                  قابی را می‌گیرد که قرار نیست باشد. */}
              <span className="qa__other-icon"><Glyph name={g} /></span>
              <span className="qa__other-txt">
                <b>{t}</b>
                <span>{d}</span>
              </span>
              <ArrowLeft className="qa__other-go" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
