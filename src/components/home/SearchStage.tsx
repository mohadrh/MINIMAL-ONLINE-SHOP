'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { getLowestPrice } from '../../data/catalog';
import { searchAll, MIN_QUERY } from '../../lib/search';
import { ProductArt } from '../ui/ProductArt';
import { ServiceMark } from '../numbers/ServiceMark';

/**
 * جعبه‌ی جستجویی که خودش خودش را نشان می‌دهد.
 *
 * جای ویترینِ دسته‌بندی را گرفت. آن سکشن کارِ مگامنو را دوباره
 * می‌کرد — کارفرما گفت اگر منوی بالا دسته‌بندی کامل دارد، این
 * پایین اضافی به نظر می‌رسد — و به‌جایش این را خواست: جعبه‌ای که
 * خودش نمونه تایپ می‌کند، نتیجه‌ها زیرش می‌آیند، پاک می‌شود و
 * سراغ عبارت بعدی می‌رود.
 *
 * چرا این بهتر از فهرستِ دسته‌هاست: فهرست می‌گوید «چه دسته‌هایی
 * داریم»، این می‌گوید «چه چیزهایی داریم و چطور پیدایشان کنی». هر
 * چرخه یک محصول واقعی را با قیمت واقعی نشان می‌دهد، و در همان حال
 * یاد می‌دهد که این جعبه هست و کار می‌کند.
 *
 * ⚠ نمایش تا لحظه‌ای است که کاربر دست بزند.
 *
 * جعبه‌ای که فقط ادای جستجو دربیاورد و با کلیک کاری نکند، از
 * نبودنش بدتر است. اینجا با اولین فوکوس یا تایپ، نمایش می‌ایستد و
 * دیگر برنمی‌گردد؛ از آن به بعد جستجوی واقعی است و همان تابعی را
 * صدا می‌زند که جستجوی نوار بالا صدا می‌زند.
 */

/* عبارت‌هایی که خودش می‌نویسد.

   عمداً چیزهایی‌اند که کاربر واقعاً می‌نویسد و هر کدام گوشه‌ای از
   فروشگاه را نشان می‌دهد: یک هوش مصنوعی، یک گیفت کارت، یک بازی و
   یک شماره. */
const DEMO = ['کلاد', 'گیفت کارت', 'اسپاتیفای', 'تلگرام'];

const TYPE_MS = 95;
const ERASE_MS = 45;
const HOLD_MS = 2100;

const fmt = (n: number) => n.toLocaleString('fa-IR');

export function SearchStage() {
  const [q, setQ] = useState('');
  /** وقتی کاربر دست زد، نمایش برای همیشه تمام است */
  const [live, setLive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---------- تایپِ خودکار ---------- */
  useEffect(() => {
    if (live) return;

    /* کسی که حرکت را کم کرده، نباید متنِ در حال تایپ ببیند.
       یک عبارتِ ثابت می‌گذاریم تا سکشن خالی نماند. */
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setQ(DEMO[0]);
      return;
    }

    let cancelled = false;
    let timer: number;

    const run = async () => {
      let i = 0;
      const wait = (ms: number) => new Promise<void>((r) => {
        timer = window.setTimeout(r, ms);
      });

      while (!cancelled) {
        const word = DEMO[i % DEMO.length];

        for (let n = 1; n <= word.length; n += 1) {
          if (cancelled) return;
          setQ(word.slice(0, n));
          await wait(TYPE_MS);
        }
        if (cancelled) return;
        await wait(HOLD_MS);

        for (let n = word.length; n >= 0; n -= 1) {
          if (cancelled) return;
          setQ(word.slice(0, n));
          await wait(ERASE_MS);
        }
        if (cancelled) return;
        await wait(320);
        i += 1;
      }
    };

    run();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [live]);

  const hits = useMemo(() => searchAll(q, 4, 3), [q]);
  const has = hits.products.length > 0 || hits.numbers.length > 0;
  const short = q.trim().length < MIN_QUERY;

  const takeOver = () => {
    if (!live) {
      setLive(true);
      setQ('');
    }
  };

  return (
    <section className="srst reveal">
      <div className="wrap srst__inner">
        <div className="sec-head sec-head--mid">
          <span className="sec-head__kicker">دنبال چه می‌گردی</span>
          <h2>اسمش را بنویس، پیدایش می‌کنیم</h2>
          <p className="sec-head__lead">
            بیشتر از پنجاه سرویس داریم. لازم نیست دسته‌ها را بگردی — همین‌جا بنویس.
          </p>
        </div>

        <div className={`srst__box ${live ? 'is-live' : ''}`}>
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onFocus={takeOver}
            onChange={(e) => { takeOver(); setQ(e.target.value); }}
            placeholder="مثلاً چت‌جی‌پی‌تی، گیفت کارت استیم، شماره تلگرام"
            aria-label="جستجوی محصولات"
            /* در حالت نمایش، صفحه‌خوان نباید متنِ در حال تایپ را
               حرف‌به‌حرف بخواند */
            aria-live="off"
          />
          {/* مکان‌نمای چشمک‌زن فقط وقتی خودش تایپ می‌کند */}
          {!live && <span className="srst__caret" aria-hidden="true" />}
        </div>

        {/* نتیجه‌ها — با کلید q عوض می‌شوند تا انیمیشنِ ورود
            هر بار از نو اجرا شود */}
        <div className="srst__out" key={q}>
          {has ? (
            <>
              {hits.products.map((p, i) => (
                <Link
                  key={p.slug}
                  href={`/product/${p.slug}`}
                  className="srst__hit"
                  style={{ ['--i' as string]: i }}
                >
                  <ProductArt
                    className="srst__art"
                    src={p.media.thumbnail}
                    title={p.englishTitle}
                    brand={p.brand}
                  />
                  <span className="srst__txt">
                    <b>{p.title}</b>
                    <small>{p.englishTitle}</small>
                  </span>
                  <span className="srst__price num">
                    از {fmt(getLowestPrice(p))}
                  </span>
                </Link>
              ))}

              {hits.numbers.map((s, i) => (
                <Link
                  key={s.id}
                  href="/numbers"
                  className="srst__hit srst__hit--num"
                  style={{ ['--i' as string]: hits.products.length + i }}
                >
                  <span className="srst__mark" style={{ color: s.accent }}>
                    <ServiceMark id={s.id} mark={s.mark} />
                  </span>
                  <span className="srst__txt">
                    <b>شماره مجازی {s.name}</b>
                    <small>برای ساخت حساب</small>
                  </span>
                  <span className="srst__go">
                    دیدن
                    <ArrowLeft aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </>
          ) : (
            /* جای خالی همیشه پر است تا سکشن با هر چرخه بالا و
               پایین نپرد */
            <p className="srst__hint">
              {short
                ? 'دست‌کم دو حرف بنویس'
                : `چیزی با «${q.trim()}» پیدا نشد. شاید املای انگلیسی‌اش را امتحان کنی.`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
