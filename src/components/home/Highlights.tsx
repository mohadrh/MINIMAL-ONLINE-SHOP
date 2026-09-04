import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Flame, Sparkles } from 'lucide-react';
import { PRODUCTS, getLowestPrice } from '../../data/catalog';
import { ProductArt } from '../ui/ProductArt';

/**
 * دو بنر، نصف‌به‌نصف.
 *
 * جای ردیف‌های «پرفروش‌های هوش مصنوعی» و «پرفروش‌های گیم» را
 * گرفتند. آن ردیف‌ها هر کدام چهار کارتِ کامل بودند و صفحه‌ی اصلی
 * را به فهرستِ محصول تبدیل می‌کردند — کاری که صفحه‌ی فروشگاه
 * بهتر انجام می‌دهد و ابزار فیلترش را هم دارد.
 *
 * این دو بنر همان کار را با یک‌پنجمِ ارتفاع می‌کنند: می‌گویند
 * «پرفروش‌ها این‌جاست» و «تازه‌ها این‌جاست»، سه تصویر نمونه نشان
 * می‌دهند، و مستقیم به همان فیلتر در فروشگاه می‌روند.
 *
 * چرا نمونه‌ها تصویرند و نه اسم: کسی که دنبال بازی است، جلدش را
 * می‌شناسد نه عنوانش را. سه تصویرِ کوچک، در یک نگاه می‌گویند این
 * بنر درباره‌ی چیست.
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');

function pick(kind: 'hot' | 'new') {
  const flagged = PRODUCTS.filter((p) =>
    kind === 'hot'
      ? p.badges.includes('bestseller') || p.badges.includes('hot')
      : p.badges.includes('new'));

  /* اگر نشان‌ها کم بودند، با پرفروش‌ترین‌ها یا تازه‌ترین‌ها پر
     می‌شود — بنری که دو تصویر داشته باشد و جای سومی خالی، شکسته
     دیده می‌شود. */
  const rest = PRODUCTS
    .filter((p) => !flagged.includes(p))
    .sort((a, b) => (kind === 'hot' ? b.salesCount - a.salesCount : b.rating - a.rating));

  return [...flagged, ...rest].slice(0, 3);
}

const BANNERS = [
  {
    id: 'hot',
    icon: Flame,
    kicker: 'انتخاب مشتری‌ها',
    title: 'پرفروش‌ترین‌ها',
    lead: 'آنچه بیشتر از همه در سبد خرید مشتری‌های ما می‌رود.',
    href: '/shop?sort=hot',
    cta: 'دیدن پرفروش‌ها',
    tube: '#ffa63d',
  },
  {
    id: 'new',
    icon: Sparkles,
    kicker: 'تازه رسیده',
    title: 'جدیدترین محصولات',
    lead: 'آخرین چیزهایی که به فروشگاه اضافه شده‌اند.',
    href: '/shop?sort=new',
    cta: 'دیدن تازه‌ها',
    tube: '#7a6bff',
  },
] as const;

export function Highlights() {
  return (
    <section className="section reveal">
      <div className="wrap hlg">
        {BANNERS.map((b) => {
          const items = pick(b.id as 'hot' | 'new');
          const from = Math.min(...items.map(getLowestPrice));
          return (
            <Link
              key={b.id}
              href={b.href}
              className="hlg__card"
              style={{ ['--tube' as string]: b.tube }}
            >
              <span className="hlg__glow" aria-hidden="true" />

              <span className="hlg__kicker">
                <b.icon aria-hidden="true" />
                {b.kicker}
              </span>

              <h2>{b.title}</h2>
              <p>{b.lead}</p>

              <span className="hlg__arts" aria-hidden="true">
                {items.map((p) => (
                  <ProductArt
                    key={p.slug}
                    className="hlg__art"
                    src={p.media.thumbnail}
                    title={p.englishTitle}
                    brand={p.brand}
                  />
                ))}
              </span>

              <span className="hlg__foot">
                <span className="hlg__from num">از {fmt(from)} تومان</span>
                <span className="hlg__go">
                  {b.cta}
                  <ArrowLeft aria-hidden="true" />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
