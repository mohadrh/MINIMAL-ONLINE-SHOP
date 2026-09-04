'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Flame } from 'lucide-react';
import { CATEGORIES, PRODUCTS, type CategorySlug } from '../../data/catalog';
import { ProductCard } from '../product/ProductCard';

/**
 * تخفیف‌های امروز.
 *
 * سه چیز اینجا با بقیه‌ی ردیف‌های سایت فرق دارد:
 *
 *   ۱ ریلِ دسته بالای سکشن است، پس تخفیف هر دنیا جدا دیده می‌شود.
 *     خریدارِ گیم و خریدارِ اشتراک، تخفیفِ هم را لازم ندارند.
 *
 *   ۲ خودش می‌چرخد و با دست هم می‌شود چرخاند. چرخش با هر تعاملِ
 *     کاربر — کشیدن، کلیک روی دکمه، یا حتی هاور — متوقف می‌شود و
 *     دیگر برنمی‌گردد. چرخشی که روی دستِ کاربر ادامه پیدا کند،
 *     آزاردهنده است نه کمک.
 *
 *   ۳ حالت ویژه دارد: قابِ گرم، درصد تخفیفِ درشت، و یک نوارِ
 *     دورانِ رنگی. باید از ردیف‌های عادیِ محصول جدا دیده شود،
 *     وگرنه «تخفیف» فقط یک تیتر است.
 *
 * فقط محصولاتی می‌آیند که واقعاً قیمت خط‌خورده دارند. اگر هیچ
 * تخفیفی نباشد، سکشن اصلاً رندر نمی‌شود؛ سکشن تخفیفِ خالی بدتر از
 * نبودنش است.
 */

/* تبِ «همه» برگشت و اول است.

   یک بار برداشته شد تا دسته‌ها قاطی نشوند، ولی جای درستِ آن قاعده
   ردیف‌های محصول بود نه این‌جا: کسی که به «تخفیف‌های امروز» نگاه
   می‌کند دنبال دسته نیست، دنبال تخفیف است. تفکیک هنوز هست — همان
   تب‌ها — ولی پیش‌فرض همه‌شان را نشان می‌دهد. */
const LANES: { id: string; title: string; cats: CategorySlug[] }[] = [
  /* ⚠ فهرستِ دستی نه — از خودِ دسته‌بندی‌ها.

     این‌جا پنج دسته دستی نوشته شده بود، و روزی که گیفت کارت
     اضافه شد ششمین دسته از قلم افتاد. امروز ضرری ندارد چون
     هیچ گیفت کارتی تخفیف ندارد؛ ولی اولین تخفیفی که رویشان
     بیاید، در تبِ «همه» دیده نمی‌شد و هیچ‌کس متوجه نمی‌شد.
     حالا دسته‌ی تازه خودش داخل می‌شود. */
  { id: 'all',    title: 'همه',              cats: CATEGORIES.map((c) => c.slug) },
  { id: 'gaming', title: 'گیم',              cats: ['gaming'] },
  { id: 'ai',     title: 'هوش مصنوعی',       cats: ['ai'] },
  { id: 'apps',   title: 'اکانت‌های دیگر',   cats: ['creative', 'social', 'education'] },
];

const AUTO_MS = 4200;

export function HotDeals() {
  const [lane, setLane] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  /* همه‌ی تخفیف‌ها، یک بار حساب می‌شوند.

     بهترین تخفیفِ *هر پلن* حساب می‌شود، نه فقط پلن پیش‌فرض.
     نسخه‌ی اول فقط پیش‌فرض را می‌سنجید و نتیجه‌اش این بود که
     اشتراک‌هایی که تخفیفشان روی پلن یک‌ساله بود اصلاً دیده
     نمی‌شدند — هر ۱۷ تخفیفِ سکشن مالِ گیم می‌شد و ریلِ دسته
     بی‌فایده. */
  const all = useMemo(() => {
    return PRODUCTS
      .map((p) => {
        const offs = p.variants
          .filter((v) => v.compareAt && v.compareAt > v.price)
          .map((v) => Math.round((1 - v.price / v.compareAt!) * 100));
        if (offs.length === 0) return null;
        return { p, off: Math.max(...offs) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.off - a.off);
  }, []);

  /* پرتخفیف‌ترین دسته پیش‌فرض باز می‌شود — نه اولین تبِ فهرست.
     اگر امروز فقط گیم تخفیف داشته باشد، تبِ خالیِ هوش مصنوعی
     نباید اولین چیزی باشد که کاربر می‌بیند. */
  /* هر سه تب همیشه هستند، حتی خالی.

     قبلاً تبِ خالی حذف می‌شد و نتیجه‌اش این بود که بعضی روزها فقط
     دو تب دیده می‌شد و کاربر نمی‌فهمید دسته‌ی سومی هم وجود دارد.
     تبِ «هوش مصنوعی ۰» خودش یک خبر است: امروز روی اشتراک‌ها تخفیفی
     نیست. تبِ نبوده، هیچ خبری نمی‌دهد. */
  const lanes = useMemo(
    () => LANES.map((l) => ({ ...l, n: all.filter((d) => l.cats.includes(d.p.category)).length })),
    [all],
  );
  /* پیش‌فرض «همه» است */
  const active = lane && lanes.some((l) => l.id === lane) ? lane : 'all';

  const deals = useMemo(() => {
    const l = LANES.find((x) => x.id === active);
    if (!l) return [];
    /* حداکثر دوازده — بیشترش دیگر مرور نیست، خستگی است. بقیه در
       فروشگاه‌اند و لینکش همین بالاست. */
    return all.filter((d) => l.cats.includes(d.p.category)).slice(0, 12);
  }, [all, active]);

  /* ---------- چرخش خودکار ----------

     با scrollBy جلو می‌رود نه با ایندکس: ریل خودش اسکرول‌شونده
     است و کاربر ممکن است وسطش دست برده باشد. حرکت نسبی، هرجا که
     هست را محترم می‌شمارد. */
  useEffect(() => {
    if (paused || deals.length < 2) return;
    const el = railRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => {
      const card = el.querySelector('.pcard') as HTMLElement | null;
      const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
      /* به آخر که رسید، برمی‌گردد سر خط */
      const atEnd = Math.abs(el.scrollLeft) + el.clientWidth >= el.scrollWidth - 8;
      el.scrollBy({ left: atEnd ? -el.scrollWidth : -step, behavior: 'smooth' });
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [paused, deals.length, active]);

  /* هر تعاملی چرخش را برای همیشه می‌خواباند */
  const stop = () => setPaused(true);

  /* ---------- شمردن صفحه‌ها ----------

     بولت‌ها باید «صفحه» را نشان بدهند نه «کارت». روی دسکتاپ چهار
     کارت با هم دیده می‌شوند و چهار بولتِ جدا برایشان یعنی سه‌تای
     اولش هیچ کاری نمی‌کند.

     تعداد کارتِ هر صفحه از عرضِ واقعیِ ریل حساب می‌شود، پس روی
     موبایل خودبه‌خود می‌شود یکی و بولت‌ها هم همان‌قدر می‌شوند.

     در RTL کروم scrollLeft منفی است — قدر مطلق می‌گیریم، وگرنه
     همیشه صفحه‌ی صفر فعال می‌ماند. */
  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector('.pcard') as HTMLElement | null;
    if (!card) return;
    const step = card.offsetWidth + 16;
    const per = Math.max(1, Math.round(el.clientWidth / step));
    const total = Math.max(1, Math.ceil(deals.length / per));
    setPages(total);
    setPage(Math.min(total - 1, Math.round(Math.abs(el.scrollLeft) / (per * step))));
  }, [deals.length]);

  useEffect(() => {
    measure();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const nudge = (dir: 1 | -1) => {
    stop();
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector('.pcard') as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  /* پریدن به یک صفحه با کلیک روی بولت */
  const goto = (i: number) => {
    stop();
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector('.pcard') as HTMLElement | null;
    if (!card) return;
    const step = card.offsetWidth + 16;
    const per = Math.max(1, Math.round(el.clientWidth / step));
    /* در RTL جهتِ اسکرول منفی است */
    const dir = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollTo({ left: dir * i * per * step, behavior: 'smooth' });
  };

  if (all.length === 0) return null;

  return (
    <section className="section deals reveal">
      <div className="wrap">
        <div className="sec-head deals__head">
          <div>
            <span className="sec-head__kicker deals__kicker">
              <Flame aria-hidden="true" />
              تا وقتی هست
            </span>
            <h2>تخفیف‌های امروز</h2>
          </div>

          <div className="deals__nav">
            <button type="button" onClick={() => nudge(1)} aria-label="قبلی">
              <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" onClick={() => nudge(-1)} aria-label="بعدی">
              <ArrowLeft aria-hidden="true" />
            </button>
            <Link href="/shop" className="btn btn--ghost btn--sm">همه‌ی محصولات</Link>
          </div>
        </div>

        {/* ---------- ریل دسته ---------- */}
        <div className="shop__rail deals__lanes" role="group" aria-label="دسته‌ی تخفیف">
          {lanes.map((l) => (
            <button
              key={l.id}
              className={`shop__chip ${active === l.id ? 'is-on' : ''} ${l.n === 0 ? 'is-empty' : ''}`}
              aria-pressed={active === l.id}
              onClick={() => { setLane(l.id); stop(); }}
            >
              {l.title}
              <span className="deals__count num">{l.n.toLocaleString('fa-IR')}</span>
            </button>
          ))}
        </div>

        {/* ---------- کارت‌ها ---------- */}
        {deals.length === 0 ? (
          <p className="shop__empty">در این دسته الان تخفیفی فعال نیست.</p>
        ) : (
          <div
            ref={railRef}
            className="deals__rail"
            onPointerDown={stop}
            onMouseEnter={stop}
            onWheel={stop}
          >
            {deals.map((d, i) => (
              <ProductCard key={d.p.slug} product={d.p} style={{ ['--i' as string]: i }} />
            ))}
          </div>
        )}

        {/* بولت‌ها — فقط وقتی بیش از یک صفحه هست.
            یک بولتِ تنها هیچ اطلاعاتی نمی‌دهد. */}
        {pages > 1 && (
          <div className="deals__dots" role="tablist" aria-label="صفحه‌های تخفیف">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                className={`deals__dot ${i === page ? 'is-on' : ''}`}
                aria-selected={i === page}
                aria-label={`صفحه‌ی ${(i + 1).toLocaleString('fa-IR')}`}
                onClick={() => goto(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
