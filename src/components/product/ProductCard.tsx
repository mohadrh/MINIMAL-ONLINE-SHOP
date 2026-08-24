'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Plus, Star } from 'lucide-react';
import {
  getDefaultVariant, getLowestPrice, needsCustomerInput, type Product,
} from '../../data/catalog';
import { asset } from '../../lib/asset';
import { useCart, useFlight } from '../../app/providers';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/**
 * کارت محصول — یک بار نوشته می‌شود و در فروشگاه، دسته و «مرتبط‌ها»
 * تکرار.
 *
 * کارت خودش <div> است نه <a>، چون داخلش دکمه‌ی افزودن هست و
 * لینکِ تودرتو HTML نامعتبر می‌سازد. مسیریابی با router انجام
 * می‌شود و دکمه با stopPropagation جلوی رسیدن کلیک به کارت را
 * می‌گیرد.
 */
export function ProductCard({ product: p }: { product: Product }) {
  const router = useRouter();
  const { add } = useCart();
  const { launch } = useFlight();

  const v = getDefaultVariant(p);
  const off =
    v.compareAt && v.compareAt > v.price
      ? Math.round((1 - v.price / v.compareAt) * 100)
      : null;

  return (
    <div
      className="pcard"
      style={{ ['--accent' as string]: p.media.accent }}
      onClick={() => router.push(`/product/${p.slug}`)}
    >
      {off !== null && <span className="pcard__off num">٪{fmt(off)}−</span>}

      <span className="pcard__art">
        <img src={asset(p.media.thumbnail)} alt="" aria-hidden="true" loading="lazy" />
      </span>

      <span className="pcard__body">
        <span className="pcard__top">
          <b className="pcard__name">{p.title}</b>
          <span className="pcard__rate">
            <Star aria-hidden="true" />
            <span className="num">{p.rating.toLocaleString('fa-IR')}</span>
          </span>
        </span>

        <span className="pcard__note">{p.shortDescription}</span>

        <span className="pcard__meta">
          <Clock aria-hidden="true" />
          {p.deliveryEstimate}
        </span>

        <span className="pcard__foot">
          <button
            type="button"
            className="pcard__add"
            aria-label={`افزودن ${p.title} به سبد`}
            onClick={(e) => {
              e.stopPropagation();
              /* محصولی که چند پلن یا ورودی لازم دارد نباید کورکورانه
                 اضافه شود — کاربر باید خودش انتخاب کند. */
              if (p.variants.length > 1 || needsCustomerInput(p)) {
                router.push(`/product/${p.slug}`);
                return;
              }
              const r = e.currentTarget.getBoundingClientRect();
              launch({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
              add(p, v);
            }}
          >
            <Plus aria-hidden="true" />
          </button>

          <span className="pcard__prices">
            {v.compareAt && <s className="pcard__was num">{fmt(v.compareAt)}</s>}
            <b className="pcard__now num">{fmt(getLowestPrice(p))}</b>
            <span className="pcard__unit">تومان</span>
          </span>
        </span>
      </span>
    </div>
  );
}
