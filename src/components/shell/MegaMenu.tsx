'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, Layers, ShoppingBag } from 'lucide-react';
import {
  CATEGORIES, PRODUCTS, getLowestPrice, type CategorySlug, type Product,
} from '../../data/catalog';
import { groupsWithItems } from '../../data/groups';
import { Glyph, type GlyphName } from '../ui/Glyph';
import { ProductArt } from '../ui/ProductArt';

/**
 * مگامنوی محصولات.
 *
 * سه ستون از راست به چپ، و هر کدام ورودیِ ستون بعدی را می‌سازد:
 *
 *   دسته‌ها  →  شش محصولِ آن دسته  →  جزئیاتِ محصولی که زیر نشانگر است
 *
 * نسخه‌ی قبل ستون سوم را روی یک محصولِ ثابت («شاخصِ دسته») نگه
 * می‌داشت. نتیجه این بود که ستون سوم به هیچ‌چیزی جواب نمی‌داد:
 * کاربر روی محصولات بالا و پایین می‌رفت و پنل کنارش تکان
 * نمی‌خورد. حالا هر محصولی که زیر نشانگر بیاید همان‌جا باز
 * می‌شود — با تصویر، پلن‌ها و قیمتشان، و دو دکمه.
 *
 * سقف شش محصول عمدی است. مگامنویی که هفده ردیف داشته باشد دیگر
 * منو نیست؛ صفحه‌ی دسته است. زیرش لینکِ «دیدن همه» می‌گوید بقیه
 * کجاست.
 */

const ICONS: Record<CategorySlug, GlyphName> = {
  ai: 'ai',
  creative: 'creative',
  social: 'social',
  education: 'education',
  gaming: 'gaming',
};

const SHOWN = 6;
const fmt = (n: number) => n.toLocaleString('fa-IR');

export function MegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [active, setActive] = useState<CategorySlug>(CATEGORIES[0].slug as CategorySlug);
  const [peek, setPeek] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onNavigate?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onNavigate]);

  const cat = CATEGORIES.find((c) => c.slug === active)!;
  const all = useMemo(() => PRODUCTS.filter((p) => p.category === active), [active]);

  /* شش‌تای اول، ولی از میان زیرگروه‌ها چیده می‌شوند نه از سرِ
     فهرست: یکی از هر زیرگروه، بعد دور دوم. اینطور کاربر در همان
     شش‌تا تنوعِ دسته را می‌بیند، نه شش بازیِ هم‌ژانر. */
  const shown = useMemo(() => {
    const groups = groupsWithItems(active, PRODUCTS);
    const out: Product[] = [];
    for (let round = 0; out.length < SHOWN; round++) {
      let added = false;
      for (const g of groups) {
        if (g.items[round]) { out.push(g.items[round]); added = true; }
        if (out.length >= SHOWN) break;
      }
      if (!added) break;
    }
    return out;
  }, [active]);

  /* محصولی که ستون سوم نشان می‌دهد: آن‌که زیر نشانگر است، وگرنه
     اولی — تا ستون سوم هیچ‌وقت خالی نماند. */
  const detail = shown.find((p) => p.slug === peek) ?? shown[0];

  const pickCat = (slug: CategorySlug) => { setActive(slug); setPeek(null); };

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
              onMouseEnter={() => pickCat(c.slug as CategorySlug)}
              onFocus={() => pickCat(c.slug as CategorySlug)}
              onClick={() => pickCat(c.slug as CategorySlug)}
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

      {/* ---------- ستون دو: شش محصول ---------- */}
      <div className="mega__body">
        <header className="mega__head">
          <b>{cat.title}</b>
          <p>{cat.tagline}</p>
        </header>

        <ul className="mega__list">
          {shown.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/product/${p.slug}`}
                className={`mega__item ${detail?.slug === p.slug ? 'is-on' : ''}`}
                onMouseEnter={() => setPeek(p.slug)}
                onFocus={() => setPeek(p.slug)}
                onClick={onNavigate}
              >
                <span className="mega__item-name">{p.title}</span>
                <span className="mega__item-price num">از {fmt(getLowestPrice(p))}</span>
              </Link>
            </li>
          ))}
        </ul>

        <Link href={`/${cat.slug}`} className="mega__all" onClick={onNavigate}>
          دیدن همه‌ی محصولات {cat.title}
          {all.length > SHOWN && <span className="num">({fmt(all.length)})</span>}
          <ChevronLeft aria-hidden="true" />
        </Link>
      </div>

      {/* ---------- ستون سه: جزئیات ---------- */}
      {detail && (
        <div className="mega__peek" style={{ ['--accent' as string]: detail.media.accent }}>
          <ProductArt
            className="mega__peek-art"
            src={detail.media.thumbnail}
            title={detail.englishTitle}
            brand={detail.brand}
          />

          <b className="mega__peek-name">{detail.title}</b>
          <p className="mega__peek-note">{detail.shortDescription}</p>

          {/* پلن‌ها با قیمتشان — همان چیزی که کاربر برای مقایسه لازم
              دارد و تا حالا باید صفحه را باز می‌کرد تا ببیند. */}
          <div className="mega__peek-plans">
            <span className="mega__peek-plans-head">
              <Layers aria-hidden="true" />
              {fmt(detail.variants.length)} پلن
            </span>
            <ul>
              {detail.variants.slice(0, 3).map((v) => (
                <li key={v.id}>
                  <span>{v.label}</span>
                  <b className="num">{fmt(v.price)}</b>
                </li>
              ))}
              {detail.variants.length > 3 && (
                <li className="mega__peek-rest">
                  و {fmt(detail.variants.length - 3)} پلن دیگر
                </li>
              )}
            </ul>
          </div>

          <div className="mega__peek-cta">
            <Link
              href={`/product/${detail.slug}`}
              className="btn btn--primary btn--sm"
              onClick={onNavigate}
            >
              <ShoppingBag aria-hidden="true" />
              خرید
            </Link>
            <Link
              href={`/product/${detail.slug}#about`}
              className="btn btn--ghost btn--sm"
              onClick={onNavigate}
            >
              <Info aria-hidden="true" />
              اطلاعات بیشتر
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
