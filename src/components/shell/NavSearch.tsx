'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CornerDownLeft, Search, X } from 'lucide-react';
import { PRODUCTS, getLowestPrice } from '../../data/catalog';
import { NUMBER_SERVICES } from '../../data/numbers';
import { ProductArt } from '../ui/ProductArt';

/**
 * جست‌وجوی نوبار.
 *
 * دکمه‌ی ذره‌بین در نوبار از اول بود و هیچ کاری نمی‌کرد — نه پنلی
 * باز می‌کرد نه جایی می‌رفت. یعنی کاربری که می‌خواست چیزی را پیدا
 * کند، تنها ابزارِ پیدا کردن را می‌زد و هیچ اتفاقی نمی‌افتاد.
 *
 * حالا یک نوارِ شیشه‌ایِ کشیده زیر منو باز می‌شود و همان‌جا نتیجه
 * می‌دهد: محصولات، و سرویس‌های شماره‌ی مجازی. نتیجه زیر خودِ نوار
 * می‌آید، نه در صفحه‌ی دیگری — کسی که دنبال «کلاد» می‌گردد،
 * نمی‌خواهد اول به صفحه‌ی نتایج برود بعد به محصول.
 *
 * سه رفتار که یک جست‌وجوی واقعی باید داشته باشد:
 *   Escape می‌بندد، کلیک بیرون می‌بندد، و فوکوس با باز شدن می‌رود
 *   داخل فیلد. بدون این سه، فیلد فقط یک جعبه است.
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');
const MAX = 6;

export function NavSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    /* با تأخیر یک تیک، وگرنه همان کلیکی که پنل را باز کرد
       بلافاصله می‌بنددش */
    const t = window.setTimeout(() => document.addEventListener('pointerdown', onDown), 0);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  /* با بسته شدن، متن پاک می‌شود — باز کردنِ بعدی باید از صفر شروع
     شود، نه از جست‌وجوی دیروز. */
  useEffect(() => { if (!open) setQ(''); }, [open]);

  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return { products: [], numbers: [] };

    const products = PRODUCTS.filter(
      (p) => p.title.toLowerCase().includes(t)
        || p.englishTitle.toLowerCase().includes(t)
        || p.brand.toLowerCase().includes(t),
    ).slice(0, MAX);

    const numbers = NUMBER_SERVICES.filter(
      (s) => s.name.toLowerCase().includes(t) || s.id.includes(t),
    ).slice(0, 3);

    return { products, numbers };
  }, [q]);

  if (!open) return null;

  const empty = q.trim().length >= 2
    && hits.products.length === 0
    && hits.numbers.length === 0;

  return (
    <div className="navsearch" ref={boxRef}>
      <div className="wrap">
        <div className="navsearch__pill">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="دنبال چه می‌گردی؟ چت‌جی‌پی‌تی، کلاد، بتلفیلد، شماره‌ی تلگرام…"
            aria-label="جست‌وجو در فونیکس شاپ"
          />
          <button type="button" onClick={onClose} aria-label="بستن جست‌وجو">
            <X aria-hidden="true" />
          </button>
        </div>

        {q.trim().length >= 2 && (
          <div className="navsearch__out">
            {empty && (
              <p className="navsearch__none">
                چیزی با «{q.trim()}» پیدا نشد. شاید املای انگلیسی‌اش را امتحان کنی.
              </p>
            )}

            {hits.products.length > 0 && (
              <>
                <span className="navsearch__label">محصولات</span>
                {hits.products.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/product/${p.slug}`}
                    className="navsearch__hit"
                    onClick={onClose}
                    style={{ ['--accent' as string]: p.media.accent }}
                  >
                    <ProductArt
                      className="navsearch__art"
                      src={p.media.thumbnail}
                      title={p.englishTitle}
                      brand={p.brand}
                    />
                    <span className="navsearch__hit-txt">
                      <b>{p.title}</b>
                      <small dir="ltr">{p.englishTitle}</small>
                    </span>
                    <span className="navsearch__hit-price num">از {fmt(getLowestPrice(p))}</span>
                  </Link>
                ))}
              </>
            )}

            {hits.numbers.length > 0 && (
              <>
                <span className="navsearch__label">شماره‌ی مجازی</span>
                {hits.numbers.map((s) => (
                  <Link key={s.id} href="/numbers" className="navsearch__hit" onClick={onClose}>
                    <span className="navsearch__art navsearch__art--mark" style={{ color: s.accent }}>
                      {s.mark}
                    </span>
                    <span className="navsearch__hit-txt">
                      <b>شماره برای {s.name}</b>
                      <small>از بیش از سی کشور</small>
                    </span>
                    <CornerDownLeft aria-hidden="true" className="navsearch__go" />
                  </Link>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
