'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, Layers, ShoppingBag } from 'lucide-react';
import {
  CATEGORIES, PRODUCTS, getLowestPrice, type CategorySlug, type Product,
} from '../../data/catalog';
import { groupsWithItems } from '../../data/groups';
import { NUMBER_COUNTRIES, NUMBER_SERVICES, cheapestFor } from '../../data/numbers';
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
  giftcard: 'gift',
};

const SHOWN = 6;
const fmt = (n: number) => n.toLocaleString('fa-IR');

/* ⚠ شماره مجازی دسته‌ی کاتالوگ نیست ولی مثل دسته رفتار می‌کند.

   قبلاً یک لینکِ ساده بود کنارِ دسته‌ها، با شش پرچم و یک «+۲»
   چپانده در همان جای تنگ. هم شلوغ بود هم با بقیه فرق داشت:
   روی هر دسته‌ای هاور می‌کردی چیزی پایین باز می‌شد، روی این یکی
   نه. حالا خودش هم یک زبانه است و شش سرویسِ پرتقاضا را نشان
   می‌دهد؛ پرچم‌ها رفتند داخلِ پنل که جا دارند. */
const NUMBERS = 'numbers' as const;
type Tab = CategorySlug | typeof NUMBERS;

export function MegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [active, setActive] = useState<Tab>(CATEGORIES[0].slug as CategorySlug);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onNavigate?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onNavigate]);

  const onNumbers = active === NUMBERS;
  const cat = CATEGORIES.find((c) => c.slug === active);
  const all = useMemo(() => PRODUCTS.filter((p) => p.category === active), [active]);

  /* شش سرویسِ پرتقاضا، با ارزان‌ترین قیمتِ موجودشان */
  const numberPicks = useMemo(
    () =>
      NUMBER_SERVICES.filter((s) => s.popular)
        .concat(NUMBER_SERVICES.filter((s) => !s.popular))
        .slice(0, SHOWN)
        .map((s) => ({ service: s, from: cheapestFor('once', s.id) })),
    [],
  );

  /* شش‌تای اول، ولی از میان زیرگروه‌ها چیده می‌شوند نه از سرِ
     فهرست: یکی از هر زیرگروه، بعد دور دوم. اینطور کاربر در همان
     شش‌تا تنوعِ دسته را می‌بیند، نه شش بازیِ هم‌ژانر. */
  const shown = useMemo(() => {
    if (active === NUMBERS) return [];
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

  const pickCat = (slug: Tab) => setActive(slug);

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

        {/* ⚠ زبانه است، نه لینک — مثل بقیه‌ی دسته‌ها.

            پرچم‌ها از این‌جا رفتند داخلِ پنل. شش پرچم و یک «+۲»
            کنارِ نامِ دسته، در نوارِ باریکِ بالا، فقط شلوغی بود؛
            پایین جا هست و همان‌جا هم معنی‌دارترند، چون کنارشان
            نامِ کشور و اپراتور هم می‌آید. */}
        <button
          type="button"
          role="tab"
          aria-selected={onNumbers}
          className={`mega__cat mega__cat--sep ${onNumbers ? 'is-on' : ''}`}
          onMouseEnter={() => pickCat(NUMBERS)}
          onFocus={() => pickCat(NUMBERS)}
          onClick={() => pickCat(NUMBERS)}
        >
          <span className="mega__cat-ico" aria-hidden="true"><Glyph name="number" /></span>
          <span className="mega__cat-txt"><b>شماره مجازی</b></span>
          <ChevronLeft aria-hidden="true" />
        </button>
      </div>

      {/* ---------- ستون دو: شش محصول ---------- */}
      <div className="mega__body">
        {onNumbers ? (
          <>
            <header className="mega__head">
              <b>شماره مجازی</b>
              <p>شماره‌ی کشوری دیگر، برای فعال‌سازی حساب — همان‌جا می‌بینی و حساب ساخته می‌شود.</p>
            </header>

            <div className="mega__grid">
              {numberPicks.map(({ service, from }) => (
                <Link
                  key={service.id}
                  href={`/numbers?service=${service.id}`}
                  className="mega__box"
                  style={{ ['--accent' as string]: service.accent }}
                  onClick={onNavigate}
                >
                  {/* نشانِ برندها را نمی‌گذاریم؛ حرفِ اول روی
                      زمینه‌ی رنگِ خودِ سرویس. */}
                  <span className="mega__box-art mega__box-mark" aria-hidden="true">
                    {service.mark}
                  </span>
                  <span className="mega__box-txt">
                    <b>{service.name}</b>
                    <span className="mega__box-price num">
                      {from !== null ? `از ${fmt(from)}` : 'به‌زودی'}
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            {/* پرچم‌ها این‌جا، نه در نوارِ بالا. این‌جا جا هست و
                نامِ کشور هم کنارشان می‌نشیند. */}
            <div className="mega__countries">
              <span className="mega__countries-lbl">کشورها</span>
              <span className="mega__countries-list">
                {NUMBER_COUNTRIES.map((c) => (
                  <span key={c.code} className="mega__country" title={c.operator}>
                    <em aria-hidden="true">{c.flag}</em>
                    {c.name}
                  </span>
                ))}
              </span>
            </div>

            <Link href="/numbers" className="mega__all" onClick={onNavigate}>
              <span>دیدن همه‌ی شماره‌ها</span>
              <ChevronLeft aria-hidden="true" />
            </Link>
          </>
        ) : (
        <>
        <header className="mega__head">
          <b>{cat!.title}</b>
          <p>{cat!.tagline}</p>
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
              {/* ⚠ در قابِ چهل‌پیکسلی، نشان بهتر از تصویرِ کارت است.

                  تصویرِ کارت برای قابِ بزرگ ساخته شده؛ این‌جا
                  کوچک که می‌شود، لکه‌ای می‌ماند که هیچ نمی‌گوید.
                  نشان در همین اندازه هم شناخته می‌شود — همان
                  چیزی که کاربر با آن سرویس را می‌شناسد. */}
              <ProductArt
                className={`mega__box-art ${p.media.logo ? 'is-logo' : ''}`}
                src={p.media.logo ?? p.media.thumbnail}
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

        {/* ⚠ نوارِ نصفه‌ی پایین برداشته شد.

            دو محصولِ بعدی از پایین بریده می‌شدند تا بگویند «این‌جا
            تمام نشده». ولی چیزی که ساخت، پیام نبود — به نظر
            می‌رسید پنل خراب است و ردیفِ آخرش جا نشده. عددِ کنارِ
            «دیدن همه» همان حرف را بی‌ابهام می‌زند. */}

        {/* متن در یک <span> است تا فلش هیچ‌وقت از آن جدا نشود.

            قبلاً متن و عدد و فلش سه فرزندِ مستقلِ فلکس بودند و
            وقتی نام دسته بلند می‌شد — «شبکه‌های اجتماعی» — فلش
            تنها به خط بعد می‌افتاد. حالا شکستنِ خط فقط داخل خودِ
            متن اتفاق می‌افتد و فلش به آخرین کلمه چسبیده می‌ماند. */}
        <Link href={`/${cat!.slug}`} className="mega__all" onClick={onNavigate}>
          <span>
            دیدن همه‌ی {cat!.title}
            {all.length > SHOWN && <span className="num"> ({fmt(all.length)})</span>}
          </span>
          <ChevronLeft aria-hidden="true" />
        </Link>
        </>
        )}
      </div>

    </div>
  );
}
