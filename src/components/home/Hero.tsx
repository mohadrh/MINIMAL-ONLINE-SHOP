'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { HERO_SLIDES } from '../../data/heroSlides';
import { asset } from '../../lib/asset';
import { SlideArt } from './SlideArt';
import { SearchStage } from './SearchStage';

/**
 * هیرو — اسلایدر، و بلافاصله زیرش جست‌وجو.
 *
 * جعبه‌ی محاسبه‌ای که این‌جا بود برداشته شد. کارِ آن — انتخاب دسته،
 * بعد سرویس، بعد پلن، از سه کشویی پشت سر هم — همان کاری است که
 * جعبه‌ی جست‌وجو با یک بار تایپ انجام می‌دهد، و کاربری که اسمِ
 * چیزی را می‌داند سه انتخاب کمتر می‌کند.
 *
 * چرا این چیدمان کار می‌کند: بنر تمام‌صفحه کاربر را مجبور می‌کند یک
 * بار اسکرول کند تا به اولین چیز مفید برسد. این‌جا اولین چیز مفید
 * پیش از خط تا دیده می‌شود.
 */
export function Hero() {
  const [i, setI] = useState(0);
  const n = HERO_SLIDES.length;

  /* ---------- چرخش خودکار ----------

     هفت اسلاید داریم و بدون چرخش، شش‌تایشان را فقط کسی می‌بیند که
     خودش بولت بزند — یعنی تقریباً هیچ‌کس. با چرخش، همه‌شان به
     نوبت دیده می‌شوند.

     سه قید:

     ۱ با اولین تعاملِ کاربر برای همیشه می‌ایستد. اسلایدری که زیر
       دستِ کاربر ادامه بدهد، وقتی دارد چیزی را می‌خواند آن را از
       جلوی چشمش برمی‌دارد.

     ۲ وقتی تب پنهان است نمی‌چرخد. مرورگر تایمرهای تبِ پس‌زمینه را
       کند می‌کند ولی متوقف نمی‌کند؛ بدون این، کاربر که برمی‌گردد
       چند اسلاید جلوتر است بی‌آنکه چیزی دیده باشد.

     ۳ با prefers-reduced-motion اصلاً شروع نمی‌شود. */
  const [paused, setPaused] = useState(false);
  const stop = useRef(() => setPaused(true)).current;

  useEffect(() => {
    if (paused || n < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      setI((v) => (v + 1) % n);
    };
    const id = window.setInterval(tick, 6000);
    return () => window.clearInterval(id);
  }, [paused, n]);





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
      <div className="hero__slider" onPointerDown={stop} onMouseEnter={stop}>
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
                {/* تیتر کلمه‌به‌کلمه، برای نور نئونی حالت شب.

                    هر کلمه باید عنصر خودش را داشته باشد تا بتواند
                    جدا روشن شود — تابلوی نئون واقعی هم چند تیوب
                    جداست، نه یکی.

                    فاصله‌ی بین کلمه‌ها از margin می‌آید نه از فضای
                    متنی: با map ساخته می‌شوند و فاصله‌ی متنی به
                    آخرین کلمه هم می‌چسبید. */}
                <h2 className="hero__neon">
                  {`${s.titleLead} ${s.titleAccent}`.split(' ').filter(Boolean).map((w, wi) => (
                    <span
                      key={wi}
                      className="hero__neon-word"
                      /* رنگِ تیوب از ترکیب اسلاید و کلمه می‌آید، نه از
                         nth-child.

                         با nth-child، شمارش داخل هر تیتر از صفر شروع
                         می‌شد و چون تیترها دو کلمه‌اند، همیشه فقط دو
                         رنگ اول می‌آمد. اینجا ایندکس اسلاید هم در
                         شمارش هست، پس هر اسلاید از رنگ دیگری شروع
                         می‌کند و هر پنج تیوب دیده می‌شوند. */
                      style={{
                        ['--i' as string]: wi,
                        ['--c' as string]: (idx * 2 + wi) % 5,
                      }}
                      data-tube={(idx * 2 + wi) % 5}
                    >
                      {w}
                    </span>
                  ))}
                </h2>
                <p>{s.description}</p>
                <Link href={s.href} className="btn btn--primary">
                  {s.ctaLabel}
                  <ArrowLeft aria-hidden="true" />
                </Link>
              </div>

              <div className="hero__img">
                {/* ⚙ دو حالت: تصویرِ برداری یا عکس.

                    اسلایدهای اشتراک و گیفت کارت طرحِ کارت و کاشی
                    دارند که حالا برداری کشیده می‌شود — پس نشانِ
                    هر سرویس واقعی است و نه حرفِ اولِ نامش.

                    اسلایدهای گیم عکسِ خودِ بازی را دارند؛ آن‌ها را
                    نمی‌شود با شکل جایگزین کرد. */}
                {s.art ? (
                  <SlideArt spec={s.art} />
                ) : (
                  <img
                    src={asset(s.backdrop)}
                    alt=""
                    aria-hidden="true"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                )}
              </div>
            </div>
          </div>
        ))}

        {/* پیکان‌های کناری — دقیقاً جایی که نمونه گذاشته */}
        <button
          type="button"
          className="hero__arrow hero__arrow--prev"
          onClick={() => { stop(); setI((v) => (v - 1 + n) % n); }}
          aria-label="اسلاید قبلی"
        >
          <ChevronRight />
        </button>
        <button
          type="button"
          className="hero__arrow hero__arrow--next"
          onClick={() => { stop(); setI((v) => (v + 1) % n); }}
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
              onClick={() => { stop(); setI(idx); }}
            />
          ))}
        </div>
      </div>

      {/* جست‌وجو، درست زیرِ اسلایدها.

          جایش این‌جاست نه یک سکشنِ جدا: کاربری که تازه رسیده و
          اسمِ چیزی را می‌داند، نباید تا وسطِ صفحه اسکرول کند تا
          جایی برای نوشتنش پیدا کند. */}
      <SearchStage variant="hero" />

    </section>
  );
}
