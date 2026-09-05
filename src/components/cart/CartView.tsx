'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../../app/providers';
import { ProductArt } from '../ui/ProductArt';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/**
 * سبد خرید.
 *
 * خلاصه‌ی سفارش روی دسکتاپ چسبان است تا هنگام مرور خطوط، مبلغ کل
 * همیشه دیده شود. روی موبایل چسبان نیست — آنجا فقط جای صفحه را
 * می‌گیرد و کاربر با یک اسکرول به آن می‌رسد.
 */
export function CartView() {
  const { lines, count, subtotal, setQuantity, remove } = useCart();

  if (count === 0) {
    return (
      <div className="wrap cart__empty">
        <span className="cart__empty-icon"><ShoppingBag aria-hidden="true" /></span>
        <h1>سبد خرید خالی است</h1>
        <p>هنوز چیزی اضافه نکرده‌ای. از فروشگاه شروع کن.</p>
        <Link href="/shop" className="btn btn--primary">
          رفتن به فروشگاه
          <ArrowLeft aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>سبد خرید</h1>
          <p className="sec-head__lead">
            <span className="num">{fmt(count)}</span> قلم آماده‌ی پرداخت.
          </p>
        </div>
      </header>

      <div className="wrap cart">
        <div className="cart__lines">
          {lines.map((l) => (
            <div key={l.key} className="cline">
              {/* از ProductArt می‌آید نه img مستقیم.

                  گیفت کارت‌ها هنوز تصویر ندارند و با src خالی،
                  مرورگر آدرسِ خودِ صفحه را می‌گرفت و کلِ صفحه را
                  دوباره دانلود می‌کرد. ProductArt این حالت را
                  می‌شناسد و جایگزینِ تایپوگرافیک می‌گذارد. */}
              <ProductArt
                className="cline__art"
                src={l.product.media.thumbnail}
                title={l.product.englishTitle}
                brand={l.product.brand}
              />

              <div className="cline__body">
                <b className="cline__name">{l.product.title}</b>
                <span className="cline__variant">{l.variant.label}</span>

                {/* ورودی‌هایی که کاربر داده — اینجا نشان داده می‌شوند
                    تا قبل از پرداخت بتواند غلط بودنشان را ببیند. */}
                {Object.entries(l.inputs).length > 0 && (
                  <span className="cline__inputs">
                    {Object.entries(l.inputs).map(([k, v]) => (
                      <span key={k}>{v}</span>
                    ))}
                  </span>
                )}
              </div>

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
                <button type="button" onClick={() => setQuantity(l.key, 1)} aria-label="زیاد کردن">
                  <Plus aria-hidden="true" />
                </button>
              </div>

              <span className="cline__price num">
                {fmt(l.variant.price * l.quantity)}
              </span>

              <button
                type="button"
                className="cline__del"
                onClick={() => remove(l.key)}
                aria-label={`حذف ${l.product.title}`}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <aside className="cart__sum">
          <h2>خلاصه‌ی سفارش</h2>

          <div className="cart__row">
            <span>جمع کالاها</span>
            <b className="num">{fmt(subtotal)}</b>
          </div>
          <div className="cart__row">
            <span>کارمزد</span>
            <b>ندارد</b>
          </div>

          <div className="cart__row cart__row--total">
            <span>قابل پرداخت</span>
            <b className="num">{fmt(subtotal)} تومان</b>
          </div>

          <Link href="/checkout" className="btn btn--primary btn--block">
            ادامه‌ی خرید
            <ArrowLeft aria-hidden="true" />
          </Link>

          <p className="cart__note">
            پرداخت با کارت بانکی ایرانی. رمزت را هیچ‌وقت نمی‌خواهیم.
          </p>
        </aside>
      </div>
    </>
  );
}
