'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, Check, Clock, Columns2, ShieldCheck, Sparkles } from 'lucide-react';
import {
  CATEGORIES, PRODUCTS, getProductsByCategory, type Product, type Variant,
} from '../../data/catalog';
import { asset } from '../../lib/asset';
import { ProductSpecs } from './ProductSpecs';
import { getArticlesForCategory } from '../../data/articles';
import { ProductArt } from '../ui/ProductArt';
import { useCart, useFlight } from '../../app/providers';
import { ProductCard } from './ProductCard';
import { ShareBubble } from './ShareBubble';
import { useCompare } from '../shop/Compare';
import { Faq } from '../ui/Faq';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* توضیح هر پلن، ساخته‌شده از خود داده.

   نوشتن یک جمله برای هر پلنِ هر محصول یعنی بیش از پنجاه متن که
   باید دستی نگه داشته شوند و اولین باری که قیمتی عوض شود، کهنه
   می‌شوند. این تابع از همان چیزی می‌سازد که در داده هست: مدت،
   صرفه‌جویی نسبت به کوتاه‌ترین پلن، و موجودی. */
function planNote(p: Product, v: Variant): string {
  const bits: string[] = [];

  const cheapest = p.variants.reduce((a, b) => (a.price <= b.price ? a : b));
  if (v.id !== cheapest.id) {
    const months = (label: string) => {
      if (/سال/.test(label)) return 12;
      if (/شش|۶/.test(label)) return 6;
      if (/سه|۳/.test(label)) return 3;
      return 1;
    };
    const m = months(v.label), mc = months(cheapest.label);
    if (m > mc) {
      const perMonth = v.price / m;
      const basePerMonth = cheapest.price / mc;
      const save = Math.round((1 - perMonth / basePerMonth) * 100);
      if (save > 2) bits.push(`ماهی ${fmt(Math.round(perMonth))} تومان — ${fmt(save)}٪ ارزان‌تر از پلن ماهانه`);
    }
  } else if (p.variants.length > 1) {
    bits.push('کوتاه‌ترین دوره — برای امتحان کردن');
  }

  if (v.compareAt && v.compareAt > v.price) {
    bits.push(`${fmt(Math.round((1 - v.price / v.compareAt) * 100))}٪ تخفیف نسبت به قیمت قبلی`);
  }

  if (v.stock !== null) {
    bits.push(v.stock === 0 ? 'فعلاً ناموجود' : `${fmt(v.stock)} عدد موجود`);
  }

  bits.push(p.warrantyLabel);
  return bits.join(' · ');
}

/**
 * صفحه‌ی محصول.
 *
 * ترتیب هشت بخش، دقیقاً همان چیزی که در صفحه‌ی محصول نمونه اندازه
 * گرفتم:
 *
 *   مسیر راهنما ← هیرو با جعبه‌ی سفارش ← تصویر و متن ← نوار آبی
 *   مزایا ← محصول‌های مرتبط ← فهرست مطالب ← سوالات متداول ← امتیاز
 *
 * چرا این ترتیب: اول خرید را ممکن می‌کند (کسی که تصمیمش را گرفته
 * معطل نمی‌شود)، بعد توضیح می‌دهد، بعد اعتماد می‌سازد، و آخر به
 * محصول دیگری می‌رساند. کسی که تا پایین آمده یا قانع شده یا دنبال
 * چیز دیگری است.
 */
export function ProductView({ product: p }: { product: Product }) {
  const { add } = useCart();
  const { launch } = useFlight();
  const compare = useCompare();

  const [variantId, setVariantId] = useState(
    p.variants.find((v) => v.isDefault)?.id ?? p.variants[0].id,
  );

  /* اگر از فهرست پلنِ روی کارت آمده، همان پلن از قبل انتخاب باشد.

     خواندن از window انجام می‌شود نه useSearchParams، چون این
     صفحه استاتیک اکسپورت می‌شود و آن هوک مرز Suspense می‌خواهد. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('plan');
    if (q && p.variants.some((v) => v.id === q)) setVariantId(q);
  }, [p]);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const variant = p.variants.find((v) => v.id === variantId) ?? p.variants[0];
  const category = CATEGORIES.find((c) => c.slug === p.category);

  const related = getProductsByCategory(p.category)
    .filter((x) => x.slug !== p.slug)
    .slice(0, 4);

  /* مقاله‌های هم‌موضوع با دسته‌ی این محصول */
  const helpful = getArticlesForCategory(p.category, 3);

  const missing = p.requiredInputs.filter((i) => !inputs[i.key]?.trim());
  const canAdd = missing.length === 0;

  const onAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canAdd) return;
    const r = e.currentTarget.getBoundingClientRect();
    launch({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    /* ورودی‌ها باید همراه خط سبد بروند.

       بدون این، کاربر ایمیلش را وارد می‌کند و همان‌جا گم می‌شود؛
       سر تسویه معلوم نیست اشتراک را روی کدام حساب فعال کنیم. */
    add(p, variant, inputs);
  };

  return (
    <>
      {/* ---------- ۱ مسیر راهنما ---------- */}
      <nav className="crumb" aria-label="مسیر">
        <div className="wrap crumb__row">
          <Link href="/">خانه</Link>
          <ChevronLeft aria-hidden="true" />
          {category && <Link href={`/${category.slug}`}>{category.title}</Link>}
          <ChevronLeft aria-hidden="true" />
          <span aria-current="page">{p.title}</span>
        </div>
      </nav>

      {/* ---------- ۲ هیرو + جعبه‌ی سفارش ---------- */}
      <section className="pdp-hero" style={{ ['--accent' as string]: p.media.accent }}>
        <div className="wrap pdp-hero__grid">
          <ProductArt
            className="pdp-hero__art"
            src={p.media.cover ?? p.media.thumbnail}
            title={p.englishTitle}
            brand={p.brand}
          />

          <div className="pdp-hero__buy" id="buy">
            <h1>{p.title}</h1>
            <p className="pdp-hero__en">{p.englishTitle}</p>
            <p className="pdp-hero__lead">{p.shortDescription}</p>

            <div className="pdp-hero__badges">
              <span className="pill pill--ok"><Clock aria-hidden="true" />{p.deliveryEstimate}</span>
              <span className="pill"><ShieldCheck aria-hidden="true" />{p.warrantyLabel}</span>
            </div>

            {/* مقایسه و اشتراک‌گذاری، بالای انتخاب پلن.

                این‌جا در دیدِ کاربر است ولی قبل از تصمیم — کسی که
                هنوز شک دارد همین‌جا محصول را به مقایسه اضافه
                می‌کند یا لینکش را برای کسی می‌فرستد که نظر بدهد. */}
            <div className="pdp-hero__acts">
              <button
                type="button"
                className={`bub bub--wide ${compare.has(p.slug) ? 'is-on' : ''}`}
                aria-pressed={compare.has(p.slug)}
                disabled={!compare.has(p.slug) && compare.full}
                onClick={() => compare.toggle(p)}
              >
                <Columns2 aria-hidden="true" />
                <span>{compare.has(p.slug) ? 'در مقایسه' : 'مقایسه'}</span>
              </button>
              <ShareBubble title={p.title} path={`/product/${p.slug}`} variant="wide" />
            </div>

            {/* انتخاب پلن */}
            <div className="pdp-plans" role="radiogroup" aria-label="انتخاب پلن">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  role="radio"
                  aria-checked={v.id === variantId}
                  className={`pdp-plan ${v.id === variantId ? 'is-on' : ''}`}
                  onClick={() => setVariantId(v.id)}
                >
                  <span className="pdp-plan__label">{v.label}</span>
                  <span className="pdp-plan__price num">{fmt(v.price)}</span>
                  {v.compareAt && <s className="pdp-plan__was num">{fmt(v.compareAt)}</s>}
                </button>
              ))}
            </div>

            {/* توضیح پلنِ انتخاب‌شده.

                فهرستِ پلن‌ها فقط اسم و قیمت می‌دهد؛ اینکه هر کدام
                چه فرقی دارند، جای دیگری نوشته نشده بود. حالا هر
                انتخابی که بشود، توضیحش همان‌جا زیرش می‌آید. */}
            <div className="pdp-plan-note">
              <span className="pdp-plan-note__k">{variant.label}</span>
              <p>{planNote(p, variant)}</p>
            </div>

            {/* ورودی‌های لازم — ایمیل، آیدی بازی و مانند این‌ها */}
            {p.requiredInputs.length > 0 && (
              <div className="pdp-inputs">
                {p.requiredInputs.map((i) => (
                  <label key={i.key} className="pdp-input">
                    <span>{i.label}</span>
                    <input
                      type={i.type === 'email' ? 'email' : i.type === 'number' ? 'number' : 'text'}
                      placeholder={i.example}
                      value={inputs[i.key] ?? ''}
                      onChange={(e) =>
                        setInputs((s) => ({ ...s, [i.key]: e.target.value }))
                      }
                    />
                    {i.hint && <small>{i.hint}</small>}
                  </label>
                ))}
              </div>
            )}

            <div className="pdp-buy">
              <span className="pdp-buy__price">
                <b className="num">{fmt(variant.price)}</b>
                <span>تومان</span>
              </span>
              <button
                type="button"
                className="btn btn--primary"
                onClick={onAdd}
                disabled={!canAdd}
              >
                افزودن به سبد
              </button>
            </div>

            {!canAdd && (
              <p className="pdp-buy__hint">
                برای ادامه، {missing.map((m) => m.label).join(' و ')} را وارد کن.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ---------- ۳ تصویر و متن ---------- */}
      <section className="section reveal" id="about">
        <div className="wrap mediatext">
          <div className="mediatext__body">
            <h2>{p.title} به چه کارت می‌آید؟</h2>
            {/* شرح چندپاراگرافی است و با خط خالی جدا می‌شود.
                یک پاراگرافِ بلند در فارسی، با این ارتفاع سطر، دیوارِ
                متن می‌شود و کسی تا آخرش نمی‌رود. */}
            <div className="pdp-desc">
              {p.description.split('\n\n').map((para, i) => (
                <p key={i} className={i === 0 ? 'sec-head__lead' : undefined}>
                  {para.trim()}
                </p>
              ))}
            </div>

            <ul className="points pdp-features">
              {p.features.map((f) => (
                <li key={f}>
                  <span className="points__icon"><Check aria-hidden="true" /></span>
                  <div><b>{f}</b></div>
                </li>
              ))}
            </ul>
          </div>

          <ProductArt
            className="mediatext__art"
            src={p.media.cover ?? p.media.thumbnail}
            title={p.englishTitle}
            brand={p.brand}
          />
        </div>
      </section>

      {/* ---------- مشخصات و آموزش فعال‌سازی ---------- */}
      <ProductSpecs p={p} />

      {/* ---------- ۴ نوار مزایا ---------- */}
      <section className="section section--blue reveal" id="why">
        <div className="wrap">
          <div className="sec-head sec-head--center">
            <span className="sec-head__kicker">چرا از ما</span>
            <h2>مزیت خرید {p.title} از فونیکس شاپ</h2>
          </div>

          <div className="pdp-why">
            {[
              { icon: ShieldCheck, t: p.warrantyLabel, d: 'اگر وسط دوره مشکلی پیش بیاید، جایگزین می‌کنیم یا پول را برمی‌گردانیم.' },
              { icon: Clock, t: p.deliveryEstimate, d: 'بیشتر سفارش‌ها بلافاصله بعد از پرداخت تحویل می‌شوند.' },
              { icon: Sparkles, t: 'پرداخت ریالی', d: 'با کارت بانکی خودت. نه ارز لازم داری، نه حساب خارجی.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="pdp-why__item">
                <span className="pdp-why__icon"><Icon aria-hidden="true" /></span>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ۵ مرتبط‌ها ---------- */}
      {related.length > 0 && (
        <section className="section reveal" id="related">
          <div className="wrap">
            <div className="sec-head">
              <h2>سرویس‌های مشابه</h2>
            </div>
            <div className="rail grid--4">
              {related.map((r, i) => (
                /* --i پله‌ی تأخیرِ ورود را می‌سازد؛ CSS خودش
                   ضربدر شصت میلی‌ثانیه می‌کند */
                <ProductCard key={r.slug} product={r} style={{ ['--i' as string]: i }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- ۶ و ۷ فهرست مطالب و سوالات ---------- */}
      {p.faq && p.faq.length > 0 && (
        <section className="section section--tint reveal" id="faq">
          <div className="wrap pdp-faq">
            <aside className="pdp-toc" aria-label="فهرست مطالب">
              <h3>فهرست مطالب</h3>
              <ul>
                <li><a href="#about">درباره‌ی این سرویس</a></li>
                <li><a href="#specs">مشخصات</a></li>
                <li><a href="#howto">بعد از خرید چه کار کنم؟</a></li>
                <li><a href="#why">چرا از فونیکس شاپ</a></li>
                {related.length > 0 && <li><a href="#related">سرویس‌های مشابه</a></li>}
                <li><a href="#faq">سوالات متداول</a></li>
              </ul>
            </aside>

            <div>
              <div className="sec-head">
                <h2>سوالات متداول</h2>
              </div>
              <Faq items={p.faq} />
            </div>
          </div>
        </section>
      )}

      {/* ---------- ۸ امتیاز ---------- */}
      <section className="section pdp-rate reveal">
        <div className="wrap pdp-rate__row">
          <span className="pdp-rate__num num">{p.rating.toLocaleString('fa-IR')}</span>
          <span className="pdp-rate__text">
            میانگین امتیاز از{' '}
            <b className="num">{fmt(p.reviewsCount)}</b> نظر ثبت‌شده
          </span>
          <Link href="/shop" className="btn btn--ghost btn--sm">دیدن همه‌ی محصولات</Link>
        </div>
      </section>

      {/* ---------- مطالب مرتبط ----------

           کسی که تا اینجا خوانده هنوز مردد است، وگرنه بالا سفارش
           داده بود. مقاله‌ی هم‌موضوع دقیقاً همان چیزی است که تصمیم
           را می‌بندد — و اگر امروز نخرد، بهانه‌ای برای برگشتن
           می‌سازد. */}
      {helpful.length > 0 && (
        <section className="section section--tint reveal" id="reads">
          <div className="wrap">
            <div className="sec-head">
              <h2>مطالبی که کمک می‌کند</h2>
              <p className="sec-head__lead">
                قبل از خرید بخوان، یا بعدش برای اینکه بیشتر ازش دربیاوری.
              </p>
            </div>

            <div className="rail grid--3">
              {helpful.map((a) => (
                <Link key={a.slug} href={`/blog/${a.slug}`} className="art">
                  <span className="art__topic" style={{ ['--accent' as string]: a.accent }}>
                    {a.topicLabel}
                  </span>
                  <b>{a.title}</b>
                  <p>{a.excerpt}</p>
                  <span className="art__meta num">{a.readMinutes} دقیقه خواندن</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- ۹ بستنِ صفحه ----------

           کسی که تا اینجا خوانده، تصمیمش را گرفته. اگر آخر صفحه
           راهی به بالا نگذاریم، باید خودش اسکرول کند تا جعبه‌ی
           سفارش را پیدا کند — و بعضی‌ها نمی‌کنند. */}
      <section className="section pdp-close reveal">
        <div className="wrap pdp-close__box">
          <h2>همین حالا {p.title} را بگیر</h2>
          <p>
            {p.deliveryEstimate} بعد از پرداخت تحویل می‌گیری، با {p.warrantyLabel}.
            اگر سوالی داری، قبل از خرید بپرس.
          </p>
          <div className="pdp-close__cta">
            <a href="#buy" className="btn btn--primary">
              رفتن به جعبه‌ی سفارش
              <ArrowLeft aria-hidden="true" />
            </a>
            <Link href="/faq" className="btn btn--ghost">سوال دارم</Link>
          </div>
        </div>
      </section>
    </>
  );
}
