'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Sparkles } from 'lucide-react';
import {
  CATEGORIES, PRODUCTS, getLowestPrice, type CategorySlug, type Product,
} from '../../data/catalog';
import { groupsWithItems } from '../../data/groups';
import { Glyph, type GlyphName } from '../ui/Glyph';
import { ProductArt } from '../ui/ProductArt';

/**
 * مگامنوی محصولات.
 *
 * سه ستون، از راست به چپ:
 *
 *   دسته‌ها   →   زیرگروه‌ها و محصولات   →   یک محصول شاخص
 *
 * ستون سوم عمدی است. مگامنوی دوستونی فقط یک فهرست است؛ کارتِ
 * محصولِ شاخص باعث می‌شود منو چیزی برای *دیدن* هم داشته باشد، نه
 * فقط چیزی برای خواندن. همان کاری که ویترین مغازه می‌کند.
 *
 * زیرگروه‌ها از data/groups می‌آیند و ساختارشان همان چیزی است که
 * در سایت مرجع کار می‌کند: هر دسته چند زیرگروهِ نام‌دار دارد و
 * محصولات زیر آن‌ها می‌نشینند، نه در یک فهرستِ تخت.
 */

const ICONS: Record<CategorySlug, GlyphName> = {
  ai: 'ai',
  creative: 'creative',
  social: 'social',
  education: 'education',
  gaming: 'gaming',
};

const fmt = (n: number) => n.toLocaleString('fa-IR');

/** محصولِ شاخصِ هر دسته: پرفروش‌ترین، وگرنه اولین */
function star(items: Product[]): Product | undefined {
  return items.find((p) => p.badges.includes('bestseller'))
    ?? items.find((p) => p.badges.includes('hot'))
    ?? items[0];
}

export function MegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [active, setActive] = useState<CategorySlug>(CATEGORIES[0].slug as CategorySlug);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onNavigate?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onNavigate]);

  const cat = CATEGORIES.find((c) => c.slug === active)!;
  const items = PRODUCTS.filter((p) => p.category === active);
  const hero = star(items);

  /* محصولات زیر زیرگروهِ خودشان. زیرگروهی که محصولی نداشته باشد
     اصلاً رندر نمی‌شود — سرتیترِ خالی، فقط فضا می‌گیرد. */
  const groups = groupsWithItems(active, PRODUCTS);

  return (
    <div className="mega" role="menu" aria-label="محصولات">
      {/* ---------- ستون یک: دسته‌ها ---------- */}
      <div className="mega__cats" role="tablist" aria-orientation="vertical">
        <span className="mega__label">دسته‌بندی</span>

        {CATEGORIES.map((c) => {
          const n = PRODUCTS.filter((p) => p.category === c.slug).length;
          const on = active === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              role="tab"
              aria-selected={on}
              className={`mega__cat ${on ? 'is-on' : ''}`}
              onMouseEnter={() => setActive(c.slug as CategorySlug)}
              onFocus={() => setActive(c.slug as CategorySlug)}
              onClick={() => setActive(c.slug as CategorySlug)}
            >
              <span className="mega__cat-ico" aria-hidden="true">
                <Glyph name={ICONS[c.slug as CategorySlug]} />
              </span>
              <span className="mega__cat-txt">
                <b>{c.title}</b>
                <small>{fmt(n)} محصول</small>
              </span>
              <ChevronLeft aria-hidden="true" />
            </button>
          );
        })}

        <span className="mega__label mega__label--gap">جای دیگر</span>

        <Link href="/numbers" className="mega__cat" onClick={onNavigate}>
          <span className="mega__cat-ico" aria-hidden="true"><Glyph name="number" /></span>
          <span className="mega__cat-txt">
            <b>شماره مجازی</b>
            <small>بیش از سی کشور</small>
          </span>
          <ChevronLeft aria-hidden="true" />
        </Link>

        <Link href="/shop" className="mega__cat" onClick={onNavigate}>
          <span className="mega__cat-ico" aria-hidden="true"><Glyph name="spark" /></span>
          <span className="mega__cat-txt">
            <b>همه‌ی محصولات</b>
            <small>{fmt(PRODUCTS.length)} مورد</small>
          </span>
          <ChevronLeft aria-hidden="true" />
        </Link>
      </div>

      {/* ---------- ستون دو: زیرگروه‌ها ---------- */}
      <div className="mega__body">
        <header className="mega__head">
          <div>
            <b>{cat.title}</b>
            <p>{cat.tagline}</p>
          </div>
          <Link href={`/${cat.slug}`} className="mega__all" onClick={onNavigate}>
            دیدن همه
            <ChevronLeft aria-hidden="true" />
          </Link>
        </header>

        <div className="mega__groups">
          {groups.map((g) => (
            <section key={g.id} className="mega__group">
              {g.title && <h3>{g.title}</h3>}
              {/* همه‌ی محصولات، بدون سقف.

                  قبلاً پنج‌تا بیشتر نشان نمی‌داد و بقیه پشت «مورد
                  دیگر» می‌ماندند — یعنی منویی که ادعا می‌کرد
                  فهرست محصولات است، نصفشان را نداشت. حالا ستون
                  خودش اسکرول می‌شود و چیزی پنهان نمی‌ماند. */}
              <ul>
                {g.items.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/product/${p.slug}`} onClick={onNavigate}>
                      <span className="mega__name">{p.title}</span>
                      <span className="mega__price num">
                        از {fmt(getLowestPrice(p))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* ---------- ستون سه: محصول شاخص ---------- */}
      {hero && (
        <Link
          href={`/product/${hero.slug}`}
          className="mega__star"
          onClick={onNavigate}
          style={{ ['--accent' as string]: hero.media.accent }}
        >
          <span className="mega__star-tag">
            <Sparkles aria-hidden="true" />
            پیشنهاد این دسته
          </span>

          <ProductArt
            className="mega__star-art"
            src={hero.media.thumbnail}
            title={hero.englishTitle}
            brand={hero.brand}
          />

          <b>{hero.title}</b>
          <p>{hero.shortDescription}</p>

          <span className="mega__star-price num">
            از {fmt(getLowestPrice(hero))}
            <small> تومان</small>
          </span>
        </Link>
      )}
    </div>
  );
}
