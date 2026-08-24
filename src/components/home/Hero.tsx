'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { HERO_SLIDES } from '../../data/heroSlides';
import {
  CATEGORIES, PRODUCTS, getDefaultVariant, getLowestPrice,
  type CategorySlug,
} from '../../data/catalog';
import { asset } from '../../lib/asset';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* تب‌های ماشین‌حساب — پنج دسته‌ی کاتالوگ به‌علاوه‌ی شماره مجازی.
   نمونه هشت تب دارد چون هشت خط خدمات دارد؛ ما شش داریم. */
type Tab = CategorySlug | 'numbers';

const TABS: { id: Tab; label: string }[] = [
  ...CATEGORIES.map((c) => ({ id: c.slug as Tab, label: c.title })),
  { id: 'numbers', label: 'شماره مجازی' },
];

/**
 * هیرو — بنر باریک روی جعبه‌ی محاسبه.
 *
 * ساختارش عیناً از نمونه گرفته شده: یک اسلایدر کوتاه که ستون متنش
 * یک‌سومِ عرض است و تصویر دو‌سوم، و بلافاصله زیرش جعبه‌ای که نیمه‌اش
 * بیرون از بنر می‌افتد و کار واقعی کاربر را می‌کند.
 *
 * چرا این چیدمان کار می‌کند: بنر تمام‌صفحه کاربر را مجبور می‌کند یک
 * بار اسکرول کند تا به اولین چیز مفید برسد. اینجا اولین چیز مفید
 * قبل از خط تا دیده می‌شود.
 */
export function Hero() {
  const [i, setI] = useState(0);
  const [tab, setTab] = useState<Tab>(TABS[0].id);
  const n = HERO_SLIDES.length;

  const inTab = useMemo(
    () => (tab === 'numbers' ? [] : PRODUCTS.filter((p) => p.category === tab)),
    [tab],
  );

  const [pick, setPick] = useState(() => {
    const first = PRODUCTS.find((p) => p.category === TABS[0].id);
    return first?.slug ?? '';
  });

  const product = inTab.find((p) => p.slug === pick) ?? inTab[0];
  const variant = product ? getDefaultVariant(product) : null;

  const changeTab = (id: Tab) => {
    setTab(id);
    if (id === 'numbers') return;
    const first = PRODUCTS.find((p) => p.category === id);
    setPick(first?.slug ?? '');
  };

  return (
    <section className="hero">
      {/* تنها h1 صفحه‌ی اصلی.

          تیتر هر اسلاید h2 است و شش‌تایشان هم‌زمان در DOM هستند؛
          هیچ‌کدام نمی‌تواند h1 باشد چون با چرخش اسلایدر، عنوانِ
          اصلیِ صفحه هر پنج ثانیه عوض می‌شد. پس یک h1 ثابت که
          می‌گوید این صفحه چیست، و فقط صفحه‌خوان آن را می‌خواند. */}
      <h1 className="sr-only">
        فونیکس شاپ — خرید اشتراک هوش مصنوعی، اکانت گیم و شماره‌ی مجازی
      </h1>
      {/* ---------- بنر ---------- */}

      {/* همه‌ی اسلایدها رندر می‌شوند و روی هم می‌نشینند؛ فقط یکی
          مات است و بقیه شفاف. این همان کاری است که swiper-fade
          می‌کند و دو مزیت دارد: تصویرها از قبل بارگذاری شده‌اند پس
          موقع تعویض پرش ندارند، و ارتفاع بنر ثابت می‌ماند چون
          بلندترین اسلاید جای همه را باز کرده. */}
      <div className="hero__slider">
        {HERO_SLIDES.map((s, idx) => (
          <div
            key={s.id}
            className={`hero__slide ${idx === i ? 'is-on' : ''}`}
            aria-hidden={idx === i ? undefined : true}
            /* inert باید بولین باشد یا اصلاً نباشد. رشته‌ی خالی را
               React به‌عنوان false می‌خواند و هشدار می‌دهد — همان
               اشتباهی که در نسخه‌ی یک هم شد. */
            inert={idx === i ? undefined : true}
          >
            <div className="wrap hero__slide-inner">
              <div className="hero__txt">
                <h2>{s.titleLead} {s.titleAccent}</h2>
                <p>{s.description}</p>
                <Link href={s.href} className="btn btn--primary">
                  {s.ctaLabel}
                  <ArrowLeft aria-hidden="true" />
                </Link>
              </div>

              <div className="hero__img">
                <img
                  src={asset(s.backdrop)}
                  alt=""
                  aria-hidden="true"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </div>
            </div>
          </div>
        ))}

        {/* پیکان‌های کناری — دقیقاً جایی که نمونه گذاشته */}
        <button
          type="button"
          className="hero__arrow hero__arrow--prev"
          onClick={() => setI((v) => (v - 1 + n) % n)}
          aria-label="اسلاید قبلی"
        >
          <ChevronRight />
        </button>
        <button
          type="button"
          className="hero__arrow hero__arrow--next"
          onClick={() => setI((v) => (v + 1) % n)}
          aria-label="اسلاید بعدی"
        >
          <ChevronLeft />
        </button>

        <div className="hero__dots" role="tablist" aria-label="اسلایدها">
          {HERO_SLIDES.map((s, idx) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={idx === i}
              aria-label={`اسلاید ${idx + 1}`}
              className={idx === i ? 'is-on' : ''}
              onClick={() => setI(idx)}
            />
          ))}
        </div>
      </div>

      {/* ---------- جعبه‌ی محاسبه ---------- */}
      <div className="wrap">
        <div className="calc">
          <div className="calc__tabs" role="tablist" aria-label="نوع سرویس">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`calc__tab ${tab === t.id ? 'is-on' : ''}`}
                onClick={() => changeTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="calc__body">
            {tab === 'numbers' ? (
              <div className="calc__note">
                <p>
                  شماره‌ی مجازی بیش از سی کشور، برای ساخت حساب و تأیید هویت
                  در سرویس‌هایی که ایران را قبول نمی‌کنند.
                </p>
                <Link href="/numbers" className="btn btn--primary">
                  انتخاب کشور و سرویس
                </Link>
              </div>
            ) : (
              <>
                {/* هر انتخاب یک فلشِ رو به پایین دارد.

                    مرورگر برای <select> فلشِ خودش را می‌کشد و ظاهرش
                    در هر سیستم‌عامل فرق می‌کند. appearance: none
                    برش می‌دارد و ما فلشِ خودمان را می‌گذاریم — هم
                    یکدست می‌شود، هم می‌شود روی هاور حرکتش داد تا
                    معلوم باشد گزینه‌های دیگری هم هست. */}
                <div className="calc__field">
                  <label htmlFor="calc-service">سرویس</label>
                  <div className="calc__select">
                    <select
                      id="calc-service"
                      value={pick}
                      onChange={(e) => setPick(e.target.value)}
                    >
                      {inTab.map((p) => (
                        <option key={p.slug} value={p.slug}>{p.title}</option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden="true" className="calc__caret" />
                  </div>
                </div>

                <div className="calc__field">
                  <label htmlFor="calc-plan">پلن</label>
                  <div className="calc__select">
                    <select id="calc-plan" defaultValue={variant?.id}>
                      {product?.variants.map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden="true" className="calc__caret" />
                  </div>
                </div>

                <div className="calc__field calc__field--price">
                  <label>قیمت</label>
                  <div className="calc__price">
                    <b className="num">{product ? fmt(getLowestPrice(product)) : '—'}</b>
                    <span>تومان</span>
                  </div>
                </div>

                <Link
                  href={product ? `/product/${product.slug}` : '/shop'}
                  className="btn btn--primary calc__go"
                >
                  ثبت سفارش
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
