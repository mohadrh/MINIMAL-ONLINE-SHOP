'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  CATEGORIES, PRODUCTS, getLowestPrice, type CategorySlug,
} from '../../data/catalog';
import { Glyph, type GlyphName } from '../ui/Glyph';
import { StarField } from '../shell/StarField';
import { MorphBackdrop } from '../ui/MorphBackdrop';

/**
 * ویترین دسته‌بندی‌ها.
 *
 * هر دسته یک کارت است که چهار چیز را همان‌جا جواب می‌دهد: چه
 * دسته‌ای است، چند محصول دارد، از چند شروع می‌شود، و **دقیقاً چه
 * چیزهایی داخلش هست**.
 *
 * آن مورد آخر تازه است. اولش یک سکشنِ جدا زیر همین بخش ساخته شد که
 * نامِ محصول‌ها را در چهار جعبه نشان می‌داد، ولی کارفرما گفت
 * جایشان همین کارت‌هاست نه یک سکشنِ دیگر — و درست بود: دو بخشِ
 * پشت‌سرهم که هر دو دسته‌ها را فهرست می‌کردند، یک کار را دو بار
 * می‌کردند.
 *
 * ⚠ به همین دلیل کارت دیگر خودش لینک نیست.
 *
 * قبلاً کلِ کارت یک <Link> بود. حالا که داخلش لینکِ محصول هست،
 * آن ساختار HTMLِ نامعتبر می‌شد — لنگر داخل لنگر — و مرورگر
 * خودش تگ‌ها را باز می‌کند و چیدمان به هم می‌ریزد. پس کارت یک
 * div است و لینک‌ها داخلش: تیتر، نامِ محصول‌ها، و «موارد بیشتر».
 */

const ICONS: Record<string, GlyphName> = {
  ai: 'ai', creative: 'creative', social: 'social',
  education: 'education', gaming: 'gaming', giftcard: 'gift', numbers: 'number',
};

/* رنگ هر دسته از کمان ققنوس، نه از یک آبیِ مشترک */
const TUBES: Record<string, string> = {
  ai: '#ffa63d',
  creative: '#ff7a45',
  gaming: '#ff4d9f',
  social: '#c94ff5',
  education: '#7a6bff',
  giftcard: '#ff9900',
  numbers: '#3ddcff',
};

/** حداکثر چند نام در هر کارت — بیشترش دیوارِ لینک می‌شود */
const PER_CARD = 5;

const fmt = (n: number) => n.toLocaleString('fa-IR');

export function CategoryShowcase() {
  const cards = CATEGORIES.map((c) => {
    const items = PRODUCTS.filter((p) => p.category === c.slug);
    const from = items.length ? Math.min(...items.map(getLowestPrice)) : 0;
    return {
      slug: c.slug as CategorySlug | 'numbers',
      title: c.title,
      tagline: c.tagline,
      count: items.length,
      from,
      /* نام‌ها از خودِ کاتالوگ می‌آیند، نه از فهرستِ دستی. محصولِ
         تازه خودش این‌جا پیدایش می‌شود و محصولِ حذف‌شده لینکِ مرده
         جا نمی‌گذارد. با ووکامرس هم همین می‌ماند. */
      items: items.slice(0, PER_CARD).map((p) => ({ slug: p.slug, title: p.title })),
      href: `/${c.slug}`,
    };
  });

  /* شماره‌ی مجازی دسته‌ی کاتالوگ نیست ولی محصول است — جایش
     همین‌جاست، نه در فهرستی جدا که کسی پیدایش نکند. */
  cards.push({
    slug: 'numbers',
    title: 'شماره مجازی',
    tagline: 'برای ساخت حساب در سرویس‌هایی که ایران را قبول نمی‌کنند',
    count: 0,
    from: 0,
    items: [
      { slug: '', title: 'تلگرام' },
      { slug: '', title: 'واتساپ' },
      { slug: '', title: 'چت‌جی‌پی‌تی' },
    ],
    href: '/numbers',
  });

  return (
    <section className="catshow reveal">
      {/* روز و شب، هر دو رندر می‌شوند و CSS یکی را نشان می‌دهد —
          نه جاوااسکریپت. اگر با شرطِ JS انتخاب می‌شدند، سرور یک
          چیز می‌فرستاد و کلاینت چیز دیگری. */}
      <div className="qa__day"><MorphBackdrop tone="blue" /></div>
      <div className="qa__night"><StarField /></div>

      <div className="wrap catshow__inner">
        <div className="sec-head sec-head--mid">
          <span className="sec-head__kicker">از کجا شروع کنم</span>
          <h2>دسته‌بندی محصولات</h2>
          <p className="sec-head__lead">
            اسمِ چیزی که دنبالش هستی را همین‌جا بزن — لازم نیست اول دسته را باز کنی.
          </p>
        </div>

        <div className="catshow__grid">
          {cards.map((c) => (
            <div
              key={c.slug}
              className="catcard"
              style={{ ['--tube' as string]: TUBES[c.slug] ?? '#ffa63d' }}
            >
              {/* رنگِ دسته که از پایین بالا می‌آید */}
              <span className="catcard__flood" aria-hidden="true" />

              <Link href={c.href} className="catcard__head">
                <span className="catcard__ico" aria-hidden="true">
                  <Glyph name={ICONS[c.slug] ?? 'spark'} />
                </span>
                <b className="catcard__title">{c.title}</b>
              </Link>

              <p className="catcard__lead">{c.tagline}</p>

              {/* نامِ محصول‌ها — همان چیزی که کاربر واقعاً دنبالش است */}
              <span className="catcard__chips">
                {c.items.map((it) => (
                  it.slug ? (
                    <Link key={it.slug} href={`/product/${it.slug}`} className="catcard__chip">
                      {it.title}
                    </Link>
                  ) : (
                    <Link key={it.title} href={c.href} className="catcard__chip">
                      {it.title}
                    </Link>
                  )
                ))}
              </span>

              <span className="catcard__foot">
                <span className="catcard__meta">
                  {c.count > 0 && <span className="num">{fmt(c.count)} محصول</span>}
                  {c.from > 0 && (
                    <span className="catcard__from num">از {fmt(c.from)} تومان</span>
                  )}
                  {c.count === 0 && <span>بیش از سی کشور</span>}
                </span>

                <Link href={c.href} className="catcard__go">
                  موارد بیشتر
                  <ArrowLeft aria-hidden="true" />
                </Link>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
