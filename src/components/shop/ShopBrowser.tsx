'use client';

import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  CATEGORIES, PRODUCTS, TAGS, TAG_GROUP_LABELS, getLowestPrice,
  type CategorySlug, type TagGroup,
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
 * فروشگاه — جست‌وجو و ترتیب بالا، فیلترها کنار.
 *
 * پیش از این همه‌ی فیلترها پشت یک دکمه‌ی «فیلتر و ترتیب» بودند و
 * وقتی باز می‌شدند، پنلشان محصولات را یک صفحه پایین‌تر می‌فرستاد.
 * یعنی برای باریک کردنِ فهرست باید فهرست را از دست می‌دادی.
 *
 * حالا چیدمانِ متعارفِ فروشگاه است: ستونِ فیلتر کنارِ شبکه‌ی
 * محصولات می‌ماند، پس با هر تیک، نتیجه همان‌جا جلوی چشم عوض
 * می‌شود. ترتیب و جست‌وجو بالای هر دو، چون به کلِ نتیجه مربوط‌اند
 * نه به یک ستون.
 *
 * ⚠ روی موبایل ستون کنار نمی‌گنجد و پشت دکمه‌ی «فیلترها» می‌رود —
 * همان درسِ نسخه‌ی یک، که پانزده گزینه‌ی چیده‌شده روی هم محصولات
 * را از صفحه بیرون می‌کرد.
 *
 * دسته‌ها چندتایی‌اند: کسی که دنبال گیفت کارت و گیم است، هر دو را
 * می‌زند. ولی تگ‌ها با «و» ترکیب می‌شوند نه «یا» — کسی که «تحویل
 * آنی» و «کامپیوتر» را زده دنبال چیزی است که هر دو را داشته باشد.
 */
export function ShopBrowser() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('hot');
  const [cats, setCats] = useState<CategorySlug[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [onlyDeals, setOnlyDeals] = useState(false);
  /** فقط روی موبایل معنی دارد؛ روی دسکتاپ ستون همیشه هست */
  const [openFilters, setOpenFilters] = useState(false);

  const toggle = <T,>(list: T[], v: T) =>
    (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const activeCount = cats.length + tags.length + (onlyDeals ? 1 : 0);

  const clearAll = () => {
    setCats([]);
    setTags([]);
    setOnlyDeals(false);
  };

  const results = useMemo(() => {
    const nq = norm(q);

    const list = PRODUCTS.filter((p) => {
      if (cats.length && !cats.includes(p.category)) return false;
      if (tags.length && !tags.every((t) => p.tags?.includes(t))) return false;
      if (onlyDeals && !p.variants.some((v) => v.compareAt && v.compareAt > v.price)) {
        return false;
      }
      if (!nq) return true;
      return (
        norm(p.title).includes(nq)
        || norm(p.englishTitle).includes(nq)
        || norm(p.brand).includes(nq)
        || norm(p.shortDescription).includes(nq)
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
  }, [q, sort, cats, tags, onlyDeals]);

  /* چند محصول زیر هر دسته می‌ماند — عدد کنارِ نام، پیش از کلیک
     می‌گوید آن تیک چه‌قدر فهرست را باریک می‌کند. */
  const countFor = (slug: CategorySlug) =>
    PRODUCTS.filter((p) => p.category === slug).length;

  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>محصولات فونیکس شاپ</h1>
          <p className="sec-head__lead">
            اشتراک‌های بین‌المللی و اکانت‌های گیم، با پرداخت ریالی و گارانتی تمام دوره.
          </p>
        </div>
      </header>

      <div className="wrap shopx">
        {/* ---------- بالا: جست‌وجو، ترتیب، شمارش ---------- */}
        <div className="shopx__top">
          <div className="shopx__search">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جست‌وجو در محصولات…"
              aria-label="جست‌وجو در محصولات"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="پاک کردن جست‌وجو">
                <X aria-hidden="true" />
              </button>
            )}
          </div>

          <label className="shopx__sort">
            <span>ترتیب بر اساس</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>

          <span className="shopx__count num" aria-live="polite">
            {results.length.toLocaleString('fa-IR')} محصول
          </span>

          {/* فقط موبایل */}
          <button
            type="button"
            className="shopx__toggle"
            onClick={() => setOpenFilters((v) => !v)}
            aria-expanded={openFilters}
          >
            <SlidersHorizontal aria-hidden="true" />
            فیلترها
            {activeCount > 0 && (
              <b className="shopx__badge num">{activeCount.toLocaleString('fa-IR')}</b>
            )}
          </button>
        </div>

        <div className="shopx__body">
          {/* ---------- ستون فیلتر ---------- */}
          <aside
            className={`shopx__side ${openFilters ? 'is-open' : ''}`}
            aria-label="فیلترها"
          >
            <div className="shopx__side-head">
              <b>فیلترها</b>
              {activeCount > 0 && (
                <button type="button" className="shopx__clear" onClick={clearAll}>
                  <X aria-hidden="true" />
                  پاک کردن
                </button>
              )}
            </div>

            <div className="shopx__group">
              <span className="shopx__group-title">دسته‌بندی</span>
              <div className="shopx__opts">
                {CATEGORIES.map((c) => (
                  <label key={c.slug} className="shopx__opt">
                    <input
                      type="checkbox"
                      checked={cats.includes(c.slug as CategorySlug)}
                      onChange={() => setCats((v) => toggle(v, c.slug as CategorySlug))}
                    />
                    <span>{c.title}</span>
                    <i className="num">{countFor(c.slug as CategorySlug).toLocaleString('fa-IR')}</i>
                  </label>
                ))}
              </div>
            </div>

            <div className="shopx__group">
              <span className="shopx__group-title">پیشنهادها</span>
              <div className="shopx__opts">
                <label className="shopx__opt">
                  <input
                    type="checkbox"
                    checked={onlyDeals}
                    onChange={() => setOnlyDeals((v) => !v)}
                  />
                  <span>فقط تخفیف‌دارها</span>
                </label>
              </div>
            </div>

            {/* تگ‌ها گروه‌به‌گروه، نه یک فهرست بلندِ بی‌سر و ته */}
            {(Object.keys(TAG_GROUP_LABELS) as TagGroup[]).map((g) => {
              const items = TAGS.filter((t) => t.group === g);
              if (!items.length) return null;
              return (
                <div key={g} className="shopx__group">
                  <span className="shopx__group-title">{TAG_GROUP_LABELS[g]}</span>
                  <div className="shopx__opts">
                    {items.map((t) => (
                      <label key={t.slug} className="shopx__opt" title={t.hint}>
                        <input
                          type="checkbox"
                          checked={tags.includes(t.slug)}
                          onChange={() => setTags((v) => toggle(v, t.slug))}
                        />
                        <span>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </aside>

          {/* ---------- نتایج ---------- */}
          <div className="shopx__main">
            {results.length === 0 ? (
              <p className="shop__empty">
                چیزی با این فیلترها پیدا نشد. یکی از تیک‌ها را بردار یا املای دیگری امتحان کن.
              </p>
            ) : (
              <div className="shopx__grid">
                {results.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
