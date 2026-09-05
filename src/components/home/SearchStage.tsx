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
 * جایش داخلِ هیرو است، درست زیرِ اسلایدها.
 *
 * ⚠ یک بار اشتباهی جای سکشنِ دسته‌بندی گذاشته شد و کارفرما فوری
 * برش گرداند. آن سکشن باید سرِ جایش بماند؛ این جعبه جایگزینش
 * نیست، کنارش است — کاربری که اسمِ چیزی را می‌داند نباید تا وسطِ
 * صفحه اسکرول کند تا جایی برای نوشتنش پیدا کند.
 *
 * خودش نمونه تایپ می‌کند، نتیجه‌ها زیرش می‌آیند، پاک می‌شود و
 * سراغ عبارت بعدی می‌رود. هر چرخه یک محصول واقعی با قیمت واقعی
 * نشان می‌دهد و در همان حال یاد می‌دهد که این جعبه هست و کار
 * می‌کند.
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

/* بهترین تخفیفِ محصول، از میانِ همه‌ی پلن‌ها.

   فقط پلنِ پیش‌فرض را نگاه نمی‌کنیم: تخفیف معمولاً روی پلنِ
   یک‌ساله است و اگر آن را نبینیم، محصولِ تخفیف‌دار بی‌نشان
   می‌ماند. */
function bestOff(p: { variants: { price: number; compareAt?: number }[] }) {
  const offs = p.variants
    .filter((v) => v.compareAt && v.compareAt > v.price)
    .map((v) => Math.round((1 - v.price / v.compareAt!) * 100));
  return offs.length ? Math.max(...offs) : 0;
}

export function SearchStage({ variant = 'section' }: { variant?: 'section' | 'hero' }) {
  const inHero = variant === 'hero';
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

  /* درونِ هیرو کمتر نتیجه نشان می‌دهیم.

     دراپ‌داون شناور است و روی سکشنِ بعدی می‌افتد؛ هر نتیجه‌ی
     اضافه یعنی یک ردیف بیشتر از آن سکشن پوشیده می‌ماند. سه
     نتیجه برای نشان دادنِ اینکه جست‌وجو کار می‌کند کافی است؛
     فهرستِ کامل جایِ خودش در فروشگاه است. */
  const hits = useMemo(
    () => (inHero ? searchAll(q, 3, 1) : searchAll(q, 4, 3)),
    [q, inHero],
  );
  const has = hits.products.length > 0 || hits.numbers.length > 0;
  const short = q.trim().length < MIN_QUERY;

  const takeOver = () => {
    if (!live) {
      setLive(true);
      setQ('');
    }
  };

  return (
    <section className={`srst ${inHero ? 'srst--hero' : 'reveal'}`}>
      <div className="wrap srst__inner">
        {/* داخلِ هیرو تیترِ بزرگ لازم نیست — بالایش همین حالا یک
            تیترِ نئونی هست و دو تیتر پشت سر هم رقابت می‌کنند. */}
        {inHero ? (
          <p className="srst__lead">دنبال چه می‌گردی؟ اسمش را بنویس</p>
        ) : (
          <div className="sec-head sec-head--mid">
            <span className="sec-head__kicker">دنبال چه می‌گردی</span>
            <h2>اسمش را بنویس، پیدایش می‌کنیم</h2>
            <p className="sec-head__lead">
              بیشتر از پنجاه سرویس داریم. لازم نیست دسته‌ها را بگردی — همین‌جا بنویس.
            </p>
          </div>
        )}

        {/* جعبه و نتیجه‌ها در یک ظرفِ مکان‌دار، تا درونِ هیرو
            نتیجه‌ها شناور باشند و ارتفاعِ سکشن را تکان ندهند. */}
        <div className="srst__field">
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
                    {/* توضیحِ خودِ محصول، نه فقط نامِ انگلیسی‌اش.

                        نامِ انگلیسی چیزی نمی‌گفت که از عنوان
                        فارسی معلوم نباشد؛ این یک جمله می‌گوید
                        محصول به چه درد می‌خورد. */}
                    <small>{p.shortDescription}</small>
                  </span>
                  <span className="srst__meta">
                    {bestOff(p) > 0 && (
                      <em className="srst__off num">٪{fmt(bestOff(p))}‑</em>
                    )}
                    <span className="srst__price num">
                      از {fmt(getLowestPrice(p))}
                    </span>
                    <i className="srst__plans num">
                      {fmt(p.variants.length)} پلن
                    </i>
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
                    <small>
                      برای ساخت حساب {s.name} — کد تأیید را همان‌جا می‌گیری،
                      بدون سیم‌کارت.
                    </small>
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
      </div>
    </section>
  );
}
