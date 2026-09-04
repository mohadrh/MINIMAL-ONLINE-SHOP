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
 * جای «دسترسی سریع» را گرفت و استایلش را نگه داشت — پس‌زمینه‌ی
 * روز/شب و همان حسِ باز شدن — ولی کارِ متفاوتی می‌کند.
 *
 * چرا این شکل، و نه ستون‌های لینکِ متنیِ سایت مرجع:
 *
 *   آن الگو برای فروشگاهی درست است که هفتاد خط خدمات دارد و باید
 *   همه را در یک پرده جا کند. ما شش دسته داریم. شش لینکِ متنیِ
 *   ریز در ستون، نه دیده می‌شود نه چیزی درباره‌ی دسته می‌گوید.
 *
 *   پس هر دسته یک کارت است که سه چیز را همان‌جا جواب می‌دهد:
 *   «چند تا محصول دارد؟»، «از چند شروع می‌شود؟»، «مثلاً چه
 *   چیزهایی؟» — سه سوالی که کاربر پیش از کلیک می‌پرسد.
 *
 * روی هاور، رنگِ خودِ دسته از پایین بالا می‌آید و نمونه‌ها جایشان
 * را به «دیدن دسته» می‌دهند. حرکت روی یک چیز است نه چند چیز، پس
 * شش کارت کنار هم شلوغ نمی‌شوند.
 */

const ICONS: Record<string, GlyphName> = {
  ai: 'ai', creative: 'creative', social: 'social',
  education: 'education', gaming: 'gaming', numbers: 'number',
};

/* رنگ هر دسته از کمان ققنوس، نه از یک آبیِ مشترک */
const TUBES: Record<string, string> = {
  ai: '#ffa63d',
  creative: '#ff7a45',
  gaming: '#ff4d9f',
  social: '#c94ff5',
  education: '#7a6bff',
  numbers: '#3ddcff',
};

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
      samples: items.slice(0, 3).map((p) => p.title),
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
    samples: ['تلگرام', 'واتساپ', 'چت‌جی‌پی‌تی'],
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
            شش دنیای جدا. هر کدام را باز کنی، فقط چیزهای همان دنیا را می‌بینی.
          </p>
        </div>

        <div className="catshow__grid">
          {cards.map((c) => (
            <Link
              key={c.slug}
              href={c.href}
              className="catcard"
              style={{ ['--tube' as string]: TUBES[c.slug] ?? '#ffa63d' }}
            >
              {/* رنگِ دسته که از پایین بالا می‌آید */}
              <span className="catcard__flood" aria-hidden="true" />

              <span className="catcard__ico" aria-hidden="true">
                <Glyph name={ICONS[c.slug] ?? 'spark'} />
              </span>

              <b className="catcard__title">{c.title}</b>
              <p className="catcard__lead">{c.tagline}</p>

              <span className="catcard__meta">
                {c.count > 0 && (
                  <span className="num">{fmt(c.count)} محصول</span>
                )}
                {c.from > 0 && (
                  <span className="catcard__from num">از {fmt(c.from)} تومان</span>
                )}
                {c.count === 0 && <span>بیش از سی کشور</span>}
              </span>

              {/* نمونه‌ها، که روی هاور جایشان را به دکمه می‌دهند */}
              <span className="catcard__swap">
                <span className="catcard__samples">
                  {c.samples.map((sName) => (
                    <em key={sName}>{sName}</em>
                  ))}
                </span>
                <span className="catcard__go">
                  دیدن دسته
                  <ArrowLeft aria-hidden="true" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
