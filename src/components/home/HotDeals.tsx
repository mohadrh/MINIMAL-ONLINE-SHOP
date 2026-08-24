'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Flame, Plus } from 'lucide-react';
import { PRODUCTS, getDefaultVariant, getLowestPrice, needsCustomerInput } from '../../data/catalog';
import { asset } from '../../lib/asset';
import { useCart, useFlight } from '../../app/providers';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/**
 * تخفیف‌های امروز.
 *
 * جای همان سکشنِ زیر هیرو در نسخه‌ی قبل، ولی بدون چرخ‌فلک: کارت‌ها
 * در یک شبکه می‌نشینند و روی موبایل کشویی می‌شوند.
 *
 * چرا چرخ‌فلک برنگشت: آنجا کارت‌ها می‌چرخیدند و کاربر برای دیدن
 * چیزی که رد شده بود باید صبر می‌کرد یا می‌کشید. شبکه همه را
 * هم‌زمان نشان می‌دهد و مقایسه را ممکن می‌کند — که کارِ یک سکشن
 * تخفیف است.
 *
 * فقط محصولاتی می‌آیند که واقعاً قیمت خط‌خورده دارند. اگر هیچ
 * تخفیفی فعال نباشد، سکشن اصلاً رندر نمی‌شود؛ سکشن تخفیفِ خالی
 * بدتر از نبودنش است.
 */
export function HotDeals() {
  const { add } = useCart();
  const { launch } = useFlight();
  const router = useRouter();

  const deals = PRODUCTS
    .map((p) => {
      const v = getDefaultVariant(p);
      if (!v.compareAt || v.compareAt <= v.price) return null;
      const off = Math.round((1 - v.price / v.compareAt) * 100);
      return { p, v, off };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.off - a.off)
    .slice(0, 4);

  if (deals.length === 0) return null;

  return (
    <section className="section deals reveal">
      <div className="wrap">
        <div className="sec-head deals__head">
          <div>
            <span className="sec-head__kicker">
              <Flame aria-hidden="true" className="deals__kicker-icon" />
              تا وقتی هست
            </span>
            <h2>تخفیف‌های امروز</h2>
          </div>
          <Link href="/shop" className="btn btn--ghost btn--sm">
            همه‌ی محصولات
            <ArrowLeft aria-hidden="true" />
          </Link>
        </div>

        <div className="rail deals__grid">
          {deals.map(({ p, v, off }, idx) => (
            <div
              key={p.slug}
              className="deal"
              style={{ ['--i' as string]: idx, ['--accent' as string]: p.media.accent }}
              onClick={() => router.push(`/product/${p.slug}`)}
            >
              <span className="deal__off num">٪{fmt(off)}−</span>

              <span className="deal__art">
                <img
                  src={asset(p.media.thumbnail)}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                />
              </span>

              <span className="deal__body">
                <b className="deal__name">{p.title}</b>
                <span className="deal__note">{p.shortDescription}</span>

                <span className="deal__meta">
                  <Clock aria-hidden="true" />
                  {p.deliveryEstimate}
                </span>

                <span className="deal__prices">
                  {/* دکمه‌ی افزودن.

                      stopPropagation لازم است، وگرنه کلیک به کارت
                      می‌رسد و به‌جای افزودن، صفحه‌ی محصول باز می‌شود.

                      محصولی که چند پلن یا ورودی لازم دارد نباید
                      کورکورانه اضافه شود — آنجا به صفحه‌ی محصول
                      می‌رود تا کاربر خودش انتخاب کند. */}
                  <button
                    type="button"
                    className="deal__add"
                    aria-label={`افزودن ${p.title} به سبد`}
                    onClick={(e) => {
                      e.stopPropagation();
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

                  <s className="deal__was num">{fmt(v.compareAt!)}</s>
                  <b className="deal__now num">{fmt(getLowestPrice(p))}</b>
                  <span className="deal__unit">تومان</span>
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
