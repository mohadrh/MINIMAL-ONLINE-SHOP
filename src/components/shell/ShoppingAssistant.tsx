'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, X } from 'lucide-react';
import { CATEGORIES, PRODUCTS, getLowestPrice, type CategorySlug } from '../../data/catalog';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* بودجه‌ها به تومان. پله‌ها از قیمت واقعی محصولات درآمده‌اند، نه
   اعداد گرد و دلخواه — وگرنه یک پله خالی می‌ماند و کاربر فکر می‌کند
   چیزی نداریم. */
const BUDGETS = [
  { id: 'low',  label: 'تا ۵۰۰ هزار',        max: 500_000 },
  { id: 'mid',  label: '۵۰۰ هزار تا ۲ میلیون', max: 2_000_000 },
  { id: 'high', label: 'بیشتر از ۲ میلیون',   max: Infinity },
] as const;

type Budget = (typeof BUDGETS)[number]['id'];

/**
 * دستیار خرید.
 *
 * دو سوال می‌پرسد و نتیجه را نشان می‌دهد: دنبال چه دسته‌ای هستی و
 * چقدر می‌خواهی خرج کنی. عمداً بیشتر از دو سوال نیست — هر سوال
 * اضافه، تعداد کسانی که تا آخر می‌روند را کم می‌کند.
 *
 * جواب هم فوری است، نه بعد از زدن دکمه: هر بار که انتخابی عوض شود
 * فهرست به‌روز می‌شود، پس کاربر می‌بیند هر انتخابش چه اثری دارد.
 */
export function ShoppingAssistant({ onClose }: { onClose: () => void }) {
  const [cat, setCat] = useState<CategorySlug | 'all'>('all');
  const [budget, setBudget] = useState<Budget>('mid');

  const results = useMemo(() => {
    const max = BUDGETS.find((b) => b.id === budget)!.max;
    return PRODUCTS
      .filter((p) => (cat === 'all' ? true : p.category === cat))
      .filter((p) => getLowestPrice(p) <= max)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
  }, [cat, budget]);

  return (
    <>
      <button className="assist__scrim" onClick={onClose} aria-label="بستن دستیار" />

      <div
        className="assist"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assist-title"
      >
        <button className="assist__close" onClick={onClose} aria-label="بستن">
          <X aria-hidden="true" />
        </button>

        <span className="assist__kicker">دستیار خرید</span>
        <h2 id="assist-title" className="assist__title">دنبال چه چیزی هستی؟</h2>

        <div className="assist__q">
          <span className="assist__label">دسته</span>
          <div className="assist__chips">
            <button
              className={`assist__chip ${cat === 'all' ? 'is-on' : ''}`}
              onClick={() => setCat('all')}
            >
              فرقی ندارد
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.slug}
                className={`assist__chip ${cat === c.slug ? 'is-on' : ''}`}
                onClick={() => setCat(c.slug)}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div className="assist__q">
          <span className="assist__label">بودجه</span>
          <div className="assist__chips">
            {BUDGETS.map((b) => (
              <button
                key={b.id}
                className={`assist__chip ${budget === b.id ? 'is-on' : ''}`}
                onClick={() => setBudget(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="assist__results">
          {results.length === 0 ? (
            <p className="assist__empty">
              با این بودجه در این دسته چیزی نداریم. بودجه را بالاتر بگیر یا
              دسته را عوض کن.
            </p>
          ) : (
            results.map((p) => (
              <Link
                key={p.slug}
                href={`/product/${p.slug}`}
                className="assist__item"
                onClick={onClose}
              >
                <span className="assist__item-name">{p.title}</span>
                <span className="assist__item-price num">
                  {fmt(getLowestPrice(p))} تومان
                </span>
                <ArrowLeft aria-hidden="true" className="assist__item-go" />
              </Link>
            ))
          )}
        </div>

        <Link href="/shop" className="assist__all" onClick={onClose}>
          دیدن همه‌ی محصولات
        </Link>
      </div>
    </>
  );
}
