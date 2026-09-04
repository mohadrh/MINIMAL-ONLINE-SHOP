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

  /* دو محصولِ بعدی، برای نوارِ نصفه‌ی پایین */
  const more = useMemo(
    () => all.filter((p) => !shown.some((x) => x.slug === p.slug)).slice(0, 2),
    [all, shown],
  );

  const pickCat = (slug: CategorySlug) => setActive(slug);

  return (
    <div className="mega" role="menu" aria-label="محصولات">
      {/* ---------- ردیف بالا: دسته‌ها ----------

          از ستونِ کناری به نوارِ بالا آمدند. ستونِ عمودی یک‌سومِ
          عرضِ پنل را می‌گرفت تا شش ردیفِ کوتاه را نشان بدهد؛ در
          نوارِ افقی همان شش‌تا یک ردیف می‌شوند و کلِ عرض برای
          محصولات آزاد می‌ماند. */}
      <div className="mega__cats" role="tablist" aria-orientation="horizontal">
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

        <Link href="/numbers" className="mega__cat mega__cat--sep" onClick={onNavigate}>
          <span className="mega__cat-ico" aria-hidden="true"><Glyph name="number" /></span>
          <span className="mega__cat-txt">
            <b>شماره مجازی</b>
            <small>بیش از سی کشور</small>
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

        {/* شش باکس در دو ستون.

            ردیفِ متنی جای کمی می‌گرفت ولی چیزی برای دیدن نداشت؛
            باکس تصویرِ محصول را هم می‌آورد و همان است که در یک
            منوی فروشگاه، انتخاب را ممکن می‌کند. */}
        <div className="mega__grid">
          {shown.map((p) => (
            <Link
              key={p.slug}
              href={`/product/${p.slug}`}
              className="mega__box"
              style={{ ['--accent' as string]: p.media.accent }}
              onClick={onNavigate}
            >
              <ProductArt
                className="mega__box-art"
                src={p.media.thumbnail}
                title={p.englishTitle}
                brand={p.brand}
              />
              <span className="mega__box-txt">
                <b>{p.title}</b>
                <span className="mega__box-price num">از {fmt(getLowestPrice(p))}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* نوار پایینی، عمداً نصفه.

            محصولات بعدیِ همین دسته‌اند و از پایین بریده می‌شوند.
            بریدگی خودش پیام است: «این‌جا تمام نشده». فهرستی که
            صاف تمام شود، هیچ نشانه‌ای نمی‌دهد که ادامه‌ای هست و
            کاربر فرض می‌کند همین شش‌تاست.

            aria-hidden است چون تکرارِ دیداریِ چیزی است که لینکِ
            زیرش («دیدن همه») به آن می‌رسد؛ صفحه‌خوان نباید نصفه‌ی
            یک کارت را بخواند. */}
        {more.length > 0 && (
          <div className="mega__tease" aria-hidden="true">
            <div className="mega__grid mega__grid--tease">
              {more.map((p) => (
                <span key={p.slug} className="mega__box">
                  <ProductArt
                    className="mega__box-art"
                    src={p.media.thumbnail}
                    title={p.englishTitle}
                    brand={p.brand}
                  />
                  <span className="mega__box-txt">
                    <b>{p.title}</b>
                    <span className="mega__box-price num">از {fmt(getLowestPrice(p))}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* متن در یک <span> است تا فلش هیچ‌وقت از آن جدا نشود.

            قبلاً متن و عدد و فلش سه فرزندِ مستقلِ فلکس بودند و
            وقتی نام دسته بلند می‌شد — «شبکه‌های اجتماعی» — فلش
            تنها به خط بعد می‌افتاد. حالا شکستنِ خط فقط داخل خودِ
            متن اتفاق می‌افتد و فلش به آخرین کلمه چسبیده می‌ماند. */}
        <Link href={`/${cat.slug}`} className="mega__all" onClick={onNavigate}>
          <span>
            دیدن همه‌ی {cat.title}
            {all.length > SHOWN && <span className="num"> ({fmt(all.length)})</span>}
          </span>
          <ChevronLeft aria-hidden="true" />
        </Link>
      </div>

    </div>
  );
}
