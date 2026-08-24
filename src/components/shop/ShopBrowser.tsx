'use client';

import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  CATEGORIES, PRODUCTS, getLowestPrice, type CategorySlug,
} from '../../data/catalog';
import { ProductCard } from '../product/ProductCard';

type Sort = 'hot' | 'new' | 'price_asc' | 'price_desc' | 'rating';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'hot',        label: 'محبوب‌ترین' },
  { id: 'new',        label: 'جدیدترین' },
  { id: 'price_asc',  label: 'ارزان‌ترین' },
  { id: 'price_desc', label: 'گران‌ترین' },
  { id: 'rating',     label: 'بالاترین امتیاز' },
];

/* نرمال‌سازی فارسی — «ي» عربی و «ك» عربی و نیم‌فاصله در جست‌وجو
   نباید نتیجه را خالی کنند. */
const norm = (s: string) =>
  s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').toLowerCase().trim();

/**
 * فروشگاه.
 *
 * فیلترها روی موبایل جمع‌شونده‌اند و بالای نتایج یک ریل دسته هست.
 * درسی که در نسخه‌ی یک گرفتیم: پانزده گزینه‌ی چیده‌شده روی هم،
 * محصولات را دو صفحه پایین‌تر می‌فرستد. فیلتر غالب «دسته» است و
 * باید یک‌ضربه‌ای باشد؛ بقیه پشت یک ضربه‌ی اضافه.
 */
export function ShopBrowser() {
  const [cat, setCat] = useState<CategorySlug | 'all'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('hot');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const nq = norm(q);
    const list = PRODUCTS.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (!nq) return true;
      return (
        norm(p.title).includes(nq) ||
        norm(p.englishTitle).includes(nq) ||
        norm(p.brand).includes(nq) ||
        norm(p.shortDescription).includes(nq)
      );
    });

    const sorted = [...list];
    if (sort === 'price_asc') sorted.sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
    if (sort === 'price_desc') sorted.sort((a, b) => getLowestPrice(b) - getLowestPrice(a));
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    if (sort === 'hot') sorted.sort((a, b) => b.salesCount - a.salesCount);
    if (sort === 'new') {
      sorted.sort(
        (a, b) => Number(b.badges.includes('new')) - Number(a.badges.includes('new')),
      );
    }
    return sorted;
  }, [cat, q, sort]);

  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>{cat === 'all' ? 'همه‌ی محصولات' : CATEGORIES.find((c) => c.slug === cat)?.title}</h1>
          <p className="sec-head__lead">
            اشتراک‌های بین‌المللی و اکانت‌های گیم، با پرداخت ریالی و گارانتی تمام دوره.
          </p>
        </div>
      </header>

      <div className="wrap shop">
        {/* ---------- ریل دسته — میان‌بر یک‌ضربه‌ای ---------- */}
        <div className="shop__rail" role="group" aria-label="دسته‌بندی">
          <button
            className={`shop__chip ${cat === 'all' ? 'is-on' : ''}`}
            onClick={() => setCat('all')}
          >
            همه
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              className={`shop__chip ${cat === c.slug ? 'is-on' : ''}`}
              style={{ ['--accent' as string]: c.accent }}
              onClick={() => setCat(c.slug)}
            >
              <span className="shop__chip-dot" aria-hidden="true" />
              {c.title}
            </button>
          ))}
        </div>

        {/* ---------- نوار جست‌وجو و ترتیب ---------- */}
        <div className="shop__bar">
          <div className="shop__search">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جست‌وجو در محصولات…"
              aria-label="جست‌وجو"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="پاک کردن">
                <X aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="shop__bar-end">
            <span className="shop__count num" aria-live="polite">
              {results.length.toLocaleString('fa-IR')} محصول
            </span>

            <button
              type="button"
              className="shop__filter-btn"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <SlidersHorizontal aria-hidden="true" />
              ترتیب
            </button>
          </div>
        </div>

        {open && (
          <div className="shop__sorts">
            {SORTS.map((s) => (
              <button
                key={s.id}
                className={`shop__chip ${sort === s.id ? 'is-on' : ''}`}
                onClick={() => { setSort(s.id); setOpen(false); }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* ---------- نتایج ---------- */}
        {results.length === 0 ? (
          <p className="shop__empty">
            چیزی با این جست‌وجو پیدا نشد. املای دیگری امتحان کن یا دسته را عوض کن.
          </p>
        ) : (
          <div className="shop__grid">
            {results.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
