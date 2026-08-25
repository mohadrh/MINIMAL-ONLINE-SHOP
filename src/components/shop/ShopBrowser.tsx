'use client';

import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  PRODUCTS, TAGS, TAG_GROUP_LABELS, getLowestPrice,
  type CategorySlug, type TagGroup,
} from '../../data/catalog';
import { ProductCard } from '../product/ProductCard';

type Sort = 'hot' | 'new' | 'price_asc' | 'price_desc' | 'rating';

/* سه دنیای جدا.

   قبلاً هر ۲۷ محصول در یک شبکه‌ی واحد می‌آمدند و اکانت گیم دقیقاً
   کنار اشتراک چت‌جی‌پی‌تی می‌نشست. این دو، دو خریدارِ متفاوت با دو
   ذهنیت متفاوت‌اند؛ وقتی دسته‌ای انتخاب نشده، هر دنیا سرفصل خودش
   را می‌گیرد. */
const WORLDS: { id: string; title: string; lead: string; cats: CategorySlug[] }[] = [
  {
    id: 'ai',
    title: 'هوش مصنوعی',
    lead: 'اشتراک مدل‌های زبانی و ابزارهای کدنویسی، روی حساب خودت.',
    cats: ['ai'],
  },
  {
    id: 'apps',
    title: 'اکانت و اشتراک',
    lead: 'ابزار طراحی و ادیت، شبکه‌های اجتماعی و آموزش زبان.',
    cats: ['creative', 'social', 'education'],
  },
  {
    id: 'gaming',
    title: 'گیم',
    lead: 'اکانت قانونی بازی‌ها با گارانتی مادام‌العمر.',
    cats: ['gaming'],
  },
];

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
  const [world, setWorld] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('hot');
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const toggleTag = (slug: string) =>
    setTags((t) => (t.includes(slug) ? t.filter((x) => x !== slug) : [...t, slug]));

  const results = useMemo(() => {
    const nq = norm(q);
    const list = PRODUCTS.filter((p) => {
      if (world) {
        const w = WORLDS.find((x) => x.id === world);
        if (w && !w.cats.includes(p.category)) return false;
      }
      /* چند تگ با «و» ترکیب می‌شوند نه «یا».

         کسی که هم «تحویل آنی» و هم «کامپیوتر» را زده، دنبال چیزی
         است که هر دو را داشته باشد؛ اگر «یا» بگیریم، فیلتر به‌جای
         باریک کردن، فهرست را پهن‌تر می‌کند. */
      if (tags.length && !tags.every((t) => p.tags?.includes(t))) return false;
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
  }, [world, q, sort, tags]);

  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>{world ? WORLDS.find((w) => w.id === world)?.title : 'محصولات فونیکس شاپ'}</h1>
          <p className="sec-head__lead">
            اشتراک‌های بین‌المللی و اکانت‌های گیم، با پرداخت ریالی و گارانتی تمام دوره.
          </p>
        </div>
      </header>

      <div className="wrap shop">
        {/* ---------- ریل دسته — میان‌بر یک‌ضربه‌ای ---------- */}
        {/* ریل دنیاها.

            دکمه‌ی «همه» برداشته شد: محصولات همیشه تفکیک‌شده می‌آیند،
            چون خریدارِ اکانت گیم و خریدارِ اشتراک هوش مصنوعی دو آدم
            متفاوت‌اند و یک شبکه‌ی درهم، هر دو را کند می‌کند.

            زدنِ دوباره‌ی همان دنیا، انتخاب را برمی‌دارد و دوباره هر
            سه سرفصل می‌آیند — جای همان دکمه‌ی «همه» را می‌گیرد بدون
            اینکه گزینه‌ی اضافه‌ای در ریل باشد. */}
        <div className="shop__rail" role="group" aria-label="دنیای محصول">
          {WORLDS.map((w) => (
            <button
              key={w.id}
              className={`shop__chip ${world === w.id ? 'is-on' : ''}`}
              aria-pressed={world === w.id}
              onClick={() => setWorld(world === w.id ? null : w.id)}
            >
              <span className="shop__chip-dot" aria-hidden="true" />
              {w.title}
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
              فیلتر و ترتیب
            </button>
          </div>
        </div>

        {open && (
          <div className="shop__panel">
            <div className="shop__panel-group">
              <span className="shop__panel-title">ترتیب</span>
              <div className="shop__sorts">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    className={`shop__chip ${sort === s.id ? 'is-on' : ''}`}
                    onClick={() => setSort(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* تگ‌ها گروه‌به‌گروه می‌آیند، نه یک فهرست بلندِ بی‌سر و ته */}
            {(Object.keys(TAG_GROUP_LABELS) as TagGroup[]).map((g) => {
              const items = TAGS.filter((t) => t.group === g);
              if (!items.length) return null;
              return (
                <div key={g} className="shop__panel-group">
                  <span className="shop__panel-title">{TAG_GROUP_LABELS[g]}</span>
                  <div className="shop__sorts">
                    {items.map((t) => (
                      <button
                        key={t.slug}
                        className={`shop__chip ${tags.includes(t.slug) ? 'is-on' : ''}`}
                        onClick={() => toggleTag(t.slug)}
                        title={t.hint}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {tags.length > 0 && (
              <button type="button" className="shop__clear" onClick={() => setTags([])}>
                <X aria-hidden="true" />
                پاک کردن {tags.length.toLocaleString('fa-IR')} فیلتر
              </button>
            )}
          </div>
        )}

        {/* ---------- نتایج ---------- */}
        {results.length === 0 ? (
          <p className="shop__empty">
            چیزی با این جست‌وجو پیدا نشد. املای دیگری امتحان کن یا دسته را عوض کن.
          </p>
        ) : !q && tags.length === 0 ? (
          /* بدون فیلتر، سه دنیا جدا نشان داده می‌شوند */
          WORLDS.filter((w) => !world || w.id === world).map((w) => {
            const items = results.filter((p) => w.cats.includes(p.category));
            if (!items.length) return null;
            return (
              <section key={w.id} className="shop__world">
                <div className="sec-head">
                  <h2>{w.title}</h2>
                  <p className="sec-head__lead">{w.lead}</p>
                </div>
                <div className="shop__grid">
                  {items.map((p) => (
                    <ProductCard key={p.slug} product={p} />
                  ))}
                </div>
              </section>
            );
          })
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
