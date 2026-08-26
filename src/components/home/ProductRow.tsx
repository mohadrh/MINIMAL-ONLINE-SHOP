import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PRODUCTS, type CategorySlug, type Product } from '../../data/catalog';
import { ProductCard } from '../product/ProductCard';

/**
 * یک ردیف محصول برای صفحه‌ی اصلی.
 *
 * سه بار با داده‌ی متفاوت به کار می‌رود: پرفروش‌های هوش مصنوعی،
 * پرفروش‌های گیم، و تازه‌رسیده‌ها.
 *
 * دلیل وجودش عدد است، نه سلیقه: صفحه‌ی اصلی ۱۶ صفحه اسکرول داشت و
 * در تمام آن مسیر فقط چهار محصول قابل خرید بود. نُه سکشن از دوازده
 * فقط توضیح می‌دادند. این ردیف‌ها بین سکشن‌های توضیحی می‌نشینند تا
 * کاربر هر چند صفحه یک بار دوباره چیزی برای خریدن ببیند.
 *
 * چهارتا، نه بیشتر. ردیفِ بلند همان شلوغی‌ای است که کارفرما نسخه‌ی
 * یک را به‌خاطرش رد کرد.
 */
export function ProductRow({
  title,
  lead,
  href,
  hrefLabel,
  pick,
  tone = 'plain',
}: {
  title: string;
  lead: string;
  href: string;
  hrefLabel: string;
  pick: (all: Product[]) => Product[];
  tone?: 'plain' | 'tint';
}) {
  const items = pick(PRODUCTS).slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section className={`section reveal ${tone === 'tint' ? 'section--tint' : ''}`}>
      <div className="wrap">
        <div className="sec-head sec-head--row">
          <div>
            <h2>{title}</h2>
            <p className="sec-head__lead">{lead}</p>
          </div>
          <Link href={href} className="btn btn--ghost btn--sm">
            {hrefLabel}
            <ArrowLeft aria-hidden="true" />
          </Link>
        </div>

        <div className="rail grid--4">
          {items.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- انتخاب‌کننده‌ها ---------- */

/** پرفروش‌ترین‌های یک دسته */
export const bestOf = (cats: CategorySlug[]) => (all: Product[]) =>
  all
    .filter((p) => cats.includes(p.category))
    .sort((a, b) => b.salesCount - a.salesCount);

/** تازه‌رسیده‌ها — نشان «new» دارند، و اگر کم بودند با بالاترین
    امتیازها پر می‌شود تا ردیف نصفه نماند. */
export const newest = () => (all: Product[]) => {
  const flagged = all.filter((p) => p.badges.includes('new'));
  const rest = all
    .filter((p) => !p.badges.includes('new'))
    .sort((a, b) => b.rating - a.rating);
  return [...flagged, ...rest];
};
