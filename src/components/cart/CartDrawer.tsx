'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../../app/providers';
import { ProductArt } from '../ui/ProductArt';

/**
 * سبد خرید کشویی.
 *
 * تا حالا زدنِ «افزودن» کاربر را می‌فرستاد به صفحه‌ی سبد و از هرجا
 * که بود بیرونش می‌کشید. حالا سبد از کنار باز می‌شود، تأیید
 * می‌کند که محصول اضافه شد، و دو راه جلویش می‌گذارد: برگردد و
 * بیشتر ببیند، یا برود پرداخت کند.
 *
 * چهار نکته‌ی ساخت:
 *
 * ۱. از سمت چپ می‌آید. سایت راست‌به‌چپ است و آیکون سبد در سمت چپِ
 *    نوبار می‌نشیند؛ کشویی باید از همان‌جایی بیاید که کاربر زده،
 *    وگرنه ارتباطِ علت و معلول گم می‌شود.
 *
 * ۲. اسکرول صفحه پشتش قفل می‌شود. بدون آن، چرخِ ماوس روی پرده،
 *    صفحه‌ی زیرین را می‌لغزاند و کشویی روی محتوایی می‌ماند که
 *    دیگر همان نیست.
 *
 * ۳. فوکوس به داخل می‌رود و با Escape برمی‌گردد. کشویی‌ای که
 *    فوکوس را رها کند، برای کاربر کیبورد نامرئی است.
 *
 * ۴. پیام «اضافه شد» فقط وقتی می‌آید که چیزی تازه اضافه شده باشد،
 *    نه هر بار که سبد باز می‌شود. کاربری که سبد را از روی آیکون
 *    باز می‌کند، چیزی اضافه نکرده.
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');

export function CartDrawer() {
  const { lines, count, subtotal, isOpen, closeCart, setQuantity, remove, justAdded } = useCart();
  const boxRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    lastFocus.current = document.activeElement as HTMLElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    /* اولین چیزِ قابل فوکوس داخل کشویی */
    const focusable = boxRef.current?.querySelector<HTMLElement>(
      'button, a[href], input, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      lastFocus.current?.focus();
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <div className="cdrawer" role="dialog" aria-modal="true" aria-label="سبد خرید">
      <button type="button" className="cdrawer__scrim" onClick={closeCart} aria-label="بستن سبد" />

      <div className="cdrawer__box" ref={boxRef}>
        <header className="cdrawer__head">
          <b>
            <ShoppingBag aria-hidden="true" />
            سبد خرید
            {count > 0 && <span className="cdrawer__n num">{fmt(count)}</span>}
          </b>
          <button type="button" onClick={closeCart} aria-label="بستن">
            <X aria-hidden="true" />
          </button>
        </header>

        {/* تأیید افزودن — فقط وقتی چیزی تازه اضافه شده */}
        {justAdded && (
          <p className="cdrawer__ok" role="status">
            <Check aria-hidden="true" />
            «{justAdded}» به سبد خرید اضافه شد
          </p>
        )}

        {lines.length === 0 ? (
          <div className="cdrawer__empty">
            <ShoppingBag aria-hidden="true" />
            <b>سبد خالی است</b>
            <p>هنوز چیزی انتخاب نکرده‌ای.</p>
            <Link href="/shop" className="btn btn--primary btn--sm" onClick={closeCart}>
              دیدن محصولات
            </Link>
          </div>
        ) : (
          <>
            <ul className="cdrawer__list">
              {lines.map((l) => (
                <li key={l.key} className="cline">
                  <ProductArt
                    className="cline__art"
                    src={l.product.media.thumbnail}
                    title={l.product.englishTitle}
                    brand={l.product.brand}
                  />

                  <div className="cline__body">
                    <Link href={`/product/${l.product.slug}`} onClick={closeCart}>
                      {l.product.title}
                    </Link>
                    <span className="cline__plan">{l.variant.label}</span>

                    <div className="cline__row">
                      <div className="cline__qty">
                        <button
                          type="button"
                          onClick={() => setQuantity(l.key, -1)}
                          aria-label="کم کردن"
                          disabled={l.quantity <= 1}
                        >
                          <Minus aria-hidden="true" />
                        </button>
                        <span className="num">{fmt(l.quantity)}</span>
                        <button type="button" onClick={() => setQuantity(l.key, 1)} aria-label="بیشتر">
                          <Plus aria-hidden="true" />
                        </button>
                      </div>

                      <span className="cline__price num">
                        {fmt(l.variant.price * l.quantity)}
                        <small> تومان</small>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="cline__del"
                    onClick={() => remove(l.key)}
                    aria-label={`حذف ${l.product.title}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="cdrawer__foot">
              <div className="cdrawer__sum">
                <span>جمع سبد</span>
                <b className="num">{fmt(subtotal)} <small>تومان</small></b>
              </div>

              {/* پرداخت اول است چون کارِ اصلی همان است؛ «ادامه‌ی
                  خرید» ثانویه و بی‌سروصدا. */}
              <Link href="/checkout" className="btn btn--primary cdrawer__pay" onClick={closeCart}>
                رفتن به پرداخت
                <ArrowLeft aria-hidden="true" />
              </Link>

              <button type="button" className="btn btn--ghost cdrawer__more" onClick={closeCart}>
                ادامه‌ی خرید
              </button>

              <Link href="/cart" className="cdrawer__full" onClick={closeCart}>
                دیدن سبد کامل
              </Link>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
