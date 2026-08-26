'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { Columns2, X } from 'lucide-react';
import { getLowestPrice, type Product } from '../../data/catalog';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* ---------------------------------------------------------------
   مقایسه‌ی محصول.

   سقفش سه‌تاست و عمدی: با چهار ستون روی موبایل هر ستون به عرض یک
   کلمه می‌رسد و جدول از خواندن می‌افتد. سه‌تا هم همان کاری را
   می‌کند که آدم واقعاً لازم دارد — کسی شش اشتراک را با هم مقایسه
   نمی‌کند، دو سه‌تای آخر را می‌سنجد.

   حالت در Context است نه در صفحه، چون از دو جا پر می‌شود: کارت
   محصول در فروشگاه، و صفحه‌ی خود محصول.
--------------------------------------------------------------- */

const MAX = 3;

interface CompareValue {
  items: Product[];
  toggle: (p: Product) => void;
  clear: () => void;
  has: (slug: string) => boolean;
  full: boolean;
}

const Ctx = createContext<CompareValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);

  const value = useMemo<CompareValue>(() => ({
    items,
    toggle: (p) =>
      setItems((list) => {
        const found = list.some((x) => x.slug === p.slug);
        if (found) return list.filter((x) => x.slug !== p.slug);
        if (list.length >= MAX) return list;
        return [...list, p];
      }),
    clear: () => setItems([]),
    has: (slug) => items.some((x) => x.slug === slug),
    full: items.length >= MAX,
  }), [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCompare باید داخل CompareProvider باشد');
  return c;
}

/* ---------- نوار پایین صفحه ---------- */

export function CompareBar() {
  const { items, toggle, clear } = useCompare();
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  const rows: { k: string; get: (p: Product) => string }[] = [
    { k: 'قیمت از',        get: (p) => `${fmt(getLowestPrice(p))} تومان` },
    { k: 'پلن‌ها',          get: (p) => `${fmt(p.variants.length)} پلن` },
    { k: 'زمان تحویل',     get: (p) => p.deliveryEstimate },
    { k: 'گارانتی',        get: (p) => p.warrantyLabel },
    { k: 'لازم است بدهی',  get: (p) => p.requiredInputs.map((i) => i.label).join('، ') || 'چیزی لازم نیست' },
    { k: 'پلتفرم',         get: (p) => p.platforms?.join('، ') || '—' },
    { k: 'امتیاز',         get: (p) => `${p.rating.toLocaleString('fa-IR')} از ۵` },
  ];

  return (
    <>
      <div className="cmp-bar" role="region" aria-label="مقایسه">
        <span className="cmp-bar__icon" aria-hidden="true"><Columns2 /></span>

        <div className="cmp-bar__items">
          {items.map((p) => (
            <span key={p.slug} className="cmp-bar__chip">
              {p.title}
              <button type="button" onClick={() => toggle(p)} aria-label={`حذف ${p.title}`}>
                <X aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={items.length < 2}
          onClick={() => setOpen(true)}
        >
          {items.length < 2 ? 'یکی دیگر انتخاب کن' : 'مقایسه کن'}
        </button>
        <button type="button" className="cmp-bar__clear" onClick={clear}>پاک کردن</button>
      </div>

      {open && (
        <div className="cmp-modal" role="dialog" aria-label="جدول مقایسه">
          <button className="cmp-modal__scrim" onClick={() => setOpen(false)} aria-label="بستن" />

          <div className="cmp-modal__box">
            <header>
              <h2>مقایسه</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="بستن">
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="cmp-table-wrap">
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th />
                    {items.map((p) => (
                      <th key={p.slug}>
                        <Link href={`/product/${p.slug}`}>{p.title}</Link>
                        <span>{p.englishTitle}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.k}>
                      <th scope="row">{r.k}</th>
                      {items.map((p) => <td key={p.slug}>{r.get(p)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
