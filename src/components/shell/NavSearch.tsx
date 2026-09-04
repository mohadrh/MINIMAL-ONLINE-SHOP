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
 * ⚠ این کامپوننت فیلد ندارد — فقط نتیجه.
 *
 * خودِ بیضیِ نوبار با باز شدن به ورودی تبدیل می‌شود و متن آن‌جا
 * تایپ می‌شود. دو نسخه‌ی قبلی هر کدام یک فیلدِ دوم می‌ساختند:
 * یکی در سکشنِ تمام‌عرض، یکی در کشویی. هر بار کاربر که روی بیضی
 * هاور کرده بود، ناگهان جعبه‌ی دیگری جلویش سبز می‌شد و نمی‌دانست
 * در کدام بنویسد.
 *
 * حالا یک ورودی هست و یک فهرستِ نتیجه زیرش. همین.
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');
const MAX = 6;

export function NavSearch(
  { open, q, onClose }: { open: boolean; q: string; onClose: () => void },
) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

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
      {q.trim().length < 2 ? (
        <p className="navsearch__tip">دست‌کم دو حرف بنویس</p>
      ) : (
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
  );
}
