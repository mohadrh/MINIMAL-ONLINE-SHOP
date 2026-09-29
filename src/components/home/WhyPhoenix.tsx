'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, CreditCard, Search, Sparkles,
} from 'lucide-react';
import { HELP_ARTICLES } from '../../data/helpArticles';

/**
 * چرا فونیکس شاپ — مسیر خرید اسکرول‌محور.
 *
 * قبلاً «خرید چطور است»، «چرا امن است» و «آمار» سه سکشن جدا بودند
 * و پشت سر هم می‌آمدند: ۲٬۳۷۳ پیکسل توضیحِ پیوسته بدون یک محصول.
 * حالا یکی‌اند و جای آزادشده به ردیف‌های محصول رسید.
 *
 * مسیر می‌چسبد و با اسکرول روشن می‌شود: خطِ رنگی پیوسته با اسکرول
 * جلو می‌رود و هر گام همان لحظه‌ای که خط به آن می‌رسد روشن می‌شود.
 * کاربر خودش مسیر را طی می‌کند نه اینکه فقط تماشا کند.
 *
 * ⚠ جنگنده‌ای که روی مسیر پرواز می‌کرد، به خواسته‌ی کارفرما رفت —
 * «فقط همان مسیر با اسکرول روشن شود». نسخه‌ی با جنگنده در تاریخچه‌ی
 * گیت هست (کامیتِ ‎9916c6c‎) اگر روزی لازم شد.
 *
 * ارتفاع چسبندگی عمداً کوتاه است — کمی بیش از دو صفحه برای سه گام.
 * سکشنی که کاربر را زیاد نگه دارد، از توضیح به مانع تبدیل می‌شود.
 */

/* ارتفاعِ گام‌ها — متقارن.

   نسخه‌ی قبل موج‌دار بود (بالا، پایین، وسط) و بی‌نظم دیده می‌شد:
   سه ارتفاعِ متفاوت هیچ قاعده‌ای نداشت که چشم بتواند بگیرد.

   حالا دو طرف قرینه‌اند و وسط در اوج. نظم از تقارن می‌آید، نه
   از صاف بودن — و مسیر همچنان یک کمانِ پرش است نه یک خطِ افقی.

   عدد، فاصله‌ی هر گام از سقفِ ناحیه است: صفر یعنی بالاترین. */
const LIFTS = ['56px', '0px', '56px'];

/* کمانِ پرش. مختصات با جای واقعیِ گره‌ها اندازه‌گیری شده، نه حدس:
   سه ستونِ مساوی با فاصله، مرکزشان روی ۰٫۱۵۸، ۰٫۵ و ۰٫۸۴۲ از عرض
   می‌افتد. ارتفاع هم lift به‌علاوه‌ی نصفِ قطرِ گره (۲۸).

   ⚠ کمان از روی عرضِ واقعی ساخته می‌شود، نه از عددِ ثابت.

   تا امروز مسیر روی قابِ ۹۰۰تایی نوشته بود و SVG با
   ‎preserveAspectRatio="none"‎ کشیده می‌شد تا کمان تمامِ عرض را
   بگیرد. کارِ خودش را می‌کرد ولی دستگاهِ مختصات را افقی می‌کشید:
   روی عرضِ ۱۱۰۰ ضریبِ کشش ۱٫۲۲ بود و با هر تغییرِ عرضِ پنجره
   عوض می‌شد. برای خطِ دوپیکسلی مهم نبود (‎non-scaling-stroke‎
   جبرانش می‌کرد) ولی هر شکلِ توپُری روی این مسیر پهن می‌شد — و
   چون ‎rotate="auto"‎ آن را می‌چرخاند، جهتِ پهن‌شدن هم مدام عوض
   می‌شد.

   حالا viewBox خودش به عرضِ رندرشده تغییر می‌کند و نسبت دقیقاً
   یک‌به‌یک می‌ماند. هیچ چیزی روی مسیر دیگر کج نمی‌شود. */
/** مرکزِ هر گام، به‌صورتِ کسری از عرض — از راست به چپ.
 *
 *  سه ستونِ مساوی با فاصله‌ی بینشان. عددها با جای واقعیِ گره‌ها
 *  اندازه‌گیری شده‌اند، نه حدس. */
const AT = [0.8422, 0.5, 0.1578];

const wireFor = (w: number) => {
  const x = AT.map((f) => (f * w).toFixed(1));
  /* دو قوسِ قرینه که در گره‌ی وسط به هم می‌رسند */
  return `M ${x[0]} 84 Q ${(0.6711 * w).toFixed(1)} 28 ${x[1]} 28`
    + ` Q ${(0.3289 * w).toFixed(1)} 28 ${x[2]} 84`;
};

/** عرضِ مبنا تا وقتی اندازه‌گیریِ واقعی برسد — همان عددِ قبلی */
const WIRE_W0 = 900;

/* ⚠ ایستگاه‌های روی مسیر (جای هر گره) اندازه‌گیری می‌شوند، حساب نمی‌شوند.

   کسرِ مسیر برای هر گره، کسری از *طولِ کمان* است نه از عرضِ
   صفحه. یک‌بار ‎done/۳‎ گذاشته بودم و ۱۳۱ پیکسل خطا داشت.

   می‌شد با تقارنِ همین مسیر حلش کرد (دو قوسِ قرینه، پس گره‌ی
   وسط دقیقاً روی ۰٫۵) ولی آن جواب به شکلِ مسیر بند است: تا
   تعدادِ گام‌ها یا هندسه‌ی کمان عوض شود، از کار می‌افتد — و
   یک‌بار که چهار گام شد، همین اتفاق افتاد.

   پس جای استدلال، اندازه‌گیری: هر بار که مسیر عوض می‌شود جای
   هر گره با جست‌وجوی دودویی روی ‎getPointAtLength‎ پیدا
   می‌شود. به هیچ فرضی درباره‌ی شکلِ مسیر یا تعدادِ گام‌ها تکیه
   نمی‌کند. */
const FALLBACK_STOPS = AT.map((_, i) => i / (AT.length - 1));

/* ⚠ سه گامِ بی‌توضیح، و توضیح‌ها عمداً رفتند.

   یک دور جمله‌ی توضیح و یک جمله‌ی اعتماد زیرِ هر گام بود —
   سه گام در سه ستون، هر کدام سه سطر. کارفرما گفت متن‌های
   اضافه را بردار و فقط خودِ مراحل بماند، و حق داشت: مسیرِ
   خرید باید در یک نگاه خوانده شود، نه اینکه خودش یک مقاله
   باشد. جوابِ تردیدها در «سوالات متداول» همین پایین هست.

   یک دور چهارتا شد — ورود و پرداخت جدا — ولی کارفرما گفت سه
   مرحله. و درست است: ورود و پرداخت در عملِ کاربر یک نشستِ
   پیوسته‌اند، پس شکستنشان به دو گام، مسیر را طولانی‌تر نشان
   می‌داد بی‌آنکه چیزی روشن کند. */
const STEPS = [
  { icon: <Search />,     t: 'محصول را بگرد، مقایسه کن، انتخاب کن' },
  { icon: <CreditCard />, t: 'وارد شو و پرداخت کن' },
  { icon: <Sparkles />,   t: 'کمتر از دو ساعت فعال می‌شود' },
];

/* سه سوالی که واقعاً پرسیده می‌شوند، با جوابشان.
   جای سه شعارِ اعتمادسازیِ قبلی را گرفتند: «روی حساب خودت» و
   «رمزت را نمی‌خواهیم» چیزهایی بودند که هر فروشگاهی می‌گوید و
   هیچ‌کدام تردیدی را برطرف نمی‌کرد. سوال و جواب، تردید را
   مستقیم هدف می‌گیرد. */
const ASKED = HELP_ARTICLES.slice(0, 3);

export function WhyPhoenix() {
  /** پیشرفتِ پیوسته از صفر تا تعدادِ گام‌ها — از اسکرول */
  const [pos, setPos] = useState(0);
  const done = Math.min(STEPS.length, Math.floor(pos));
  const wrapRef = useRef<HTMLDivElement>(null);
  const [openQ, setOpenQ] = useState<string | null>(null);

  /* عرضِ واقعیِ قابِ مسیر — کمان و viewBox از همین ساخته می‌شوند */
  const wireRef = useRef<SVGSVGElement>(null);
  const [wireW, setWireW] = useState(WIRE_W0);

  useEffect(() => {
    const el = wireRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w > 0) setWireW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wire = wireFor(wireW);

  /* کسرِ طولِ مسیر برای هر گره — از خودِ مسیرِ رندرشده خوانده
     می‌شود. دلیلش بالای ‎FALLBACK_STOPS‎ نوشته شده. */
  const litRef = useRef<SVGPathElement>(null);
  const [stops, setStops] = useState<number[]>(FALLBACK_STOPS);

  useEffect(() => {
    const path = litRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    if (!total) return;

    const found = AT.map((f) => {
      const targetX = f * wireW;
      /* مسیر از راست به چپ می‌رود، پس x با افزایشِ طول نزولی
         است — شرطِ دودویی روی همین تکیه می‌کند. */
      let lo = 0;
      let hi = total;
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).x > targetX) lo = mid;
        else hi = mid;
      }
      return ((lo + hi) / 2) / total;
    });

    setStops(found);
  }, [wire, wireW]);

  /** ایستگاهی که با این تعداد گامِ تمام‌شده خط به آن رسیده */
  const stopAt = (n: number) => stops[Math.min(stops.length - 1, Math.max(0, n))];

  /* طولِ روشنِ خط، پیوسته: بینِ دو ایستگاه به نسبتِ پیشرفت. پس خط
     دقیقاً همان لحظه به گره‌ی بعدی می‌رسد که آن گام روشن می‌شود. */
  const k = Math.floor(pos);
  const lit = stopAt(k) + (stopAt(k + 1) - stopAt(k)) * (pos - k);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setPos(STEPS.length); return; }

    let frame = 0;
    const onScroll = () => {
      /* فریمِ در انتظار را لغو کن و تازه‌اش را بگذار.

         نسخه‌ی اول اگر فریمی در انتظار بود، رویداد را دور می‌ریخت.
         نتیجه‌اش این بود که آخرین موقعیتِ اسکرول هیچ‌وقت حساب
         نمی‌شد: رویدادِ آخر دور ریخته می‌شد و دیگر رویدادی نمی‌آمد
         که جایش را بگیرد، پس مسیر روی گام دوم گیر می‌کرد.

         با لغو و زمان‌بندی دوباره، همیشه تازه‌ترین موقعیت برنده
         است و بار محاسبه هم همان یکی در هر فریم می‌ماند. */
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const el = wrapRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        /* چقدر از ناحیه‌ی چسبنده رد شده‌ایم، بین صفر و یک.
           ارتفاع قابل اسکرول = کل ارتفاع منهای یک صفحه، چون آخرین
           صفحه همان جایی است که مسیر هنوز چسبیده. */
        const scrollable = el.offsetHeight - window.innerHeight;
        if (scrollable <= 0) { setPos(STEPS.length); return; }
        const p = Math.min(1, Math.max(0, -r.top / scrollable));
        /* همان آستانه‌ی قبلی (+۰٫۳۴): گامِ اول کمی پیش از رسیدن به
           ناحیه روشن است و آخری پیش از رها شدنِ چسبندگی کامل می‌شود */
        setPos(Math.min(STEPS.length, p * STEPS.length + 0.34));
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="section section--tint" id="why">
      {/* ظرف بلند — چسبندگی از ارتفاع همین می‌آید */}
      <div className="tracked" ref={wrapRef}>
        <div className="tracked__stick">
          <div className="wrap">
            <div className="sec-head sec-head--mid">
              <span className="sec-head__kicker">چطور کار می‌کند</span>
              <h2>خرید از فونیکس شاپ چطور است؟</h2>
              <p className="sec-head__lead">
                بیشتر سرویس‌های بین‌المللی کارت ایرانی را قبول نمی‌کنند. کاری که ما
                می‌کنیم این است که آن پرداخت را از طرف تو انجام می‌دهیم.
              </p>
            </div>

            <ol
              className="buypath"
              /* ‎--done‎ شمارشِ گام‌های روشن است؛ ‎--lit‎ طولِ پیوسته‌ی
                 خطِ روشن (کسری از کمان). هر دو از یک پیشرفت می‌آیند. */
              style={{ ['--done' as string]: done, ['--lit' as string]: lit }}
              aria-label="سه مرحله‌ی خرید"
            >
              {/* کمانِ پرش.

                  یک نکته‌ی ساخت که بار اول از قلم افتاد و گره‌ها را
                  سی‌ودو پیکسل زیرِ خط انداخت: inset-block-start روی
                  فرزندِ absolute از لبه‌ی *padding-box* حساب می‌شود،
                  ولی گام‌ها از لبه‌ی content شروع می‌شوند. پس این
                  عدد باید دقیقاً برابرِ padding-block-start خودِ
                  .buypath باشد — هر دو در CSS روی ۸۰ پیکسل ثابت‌اند و
                  با هم عوض می‌شوند. */}
              <svg
                ref={wireRef}
                className="buypath__wire"
                viewBox={`0 0 ${wireW} 112`}
                aria-hidden="true"
                focusable="false"
              >
                <path className="buypath__wire-bed" d={wire} pathLength={1} />
                <path ref={litRef} className="buypath__wire-lit" d={wire} pathLength={1} />

              </svg>

              {STEPS.map((s, i) => {
                const state = i < done ? 'is-done' : i === done ? 'is-now' : '';
                return (
                  <li
                    key={s.t}
                    className={`buypath__step ${state}`}
                    /* موج، نه شیب: بالا، پایین، وسط. مرحله‌ای که
                       فقط بالا برود، همان خطِ صاف است با زاویه. */
                    style={{ ['--i' as string]: i, ['--lift' as string]: LIFTS[i] }}
                  >
                    {/* آیکون خودِ گام می‌ماند و تیک نمی‌خورد.

                        وقتی گام تمام شد، آیکون رنگ خودش را می‌گیرد و
                        نور می‌دهد — مثل تیوبی که روشن شده. تیک،
                        آیکون را با یک علامتِ عمومی عوض می‌کرد و
                        شخصیتِ هر گام از بین می‌رفت. */}
                    <span className="buypath__node" aria-hidden="true">
                      <span className="buypath__icon">{s.icon}</span>
                      <span className="buypath__n num">{(i + 1).toLocaleString('fa-IR')}</span>
                    </span>

                    <div className="buypath__body">
                      <b>{s.t}</b>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="buypath__hint" aria-hidden="true">
              {done < STEPS.length ? 'اسکرول کن' : 'همین سه قدم، تمام.'}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- سوالاتی که واقعاً پرسیده می‌شوند ---------- */}
      <div className="wrap askd">
        <div className="sec-head">
          <h2>سوالات متداول</h2>
        </div>

        {ASKED.map((a) => (
          <div key={a.id} className="askd__item">
            <button
              type="button"
              className="askd__q"
              aria-expanded={openQ === a.id}
              onClick={() => setOpenQ(openQ === a.id ? null : a.id)}
            >
              <b>{a.title}</b>
              <ChevronDown aria-hidden="true" />
            </button>
            {openQ === a.id && <p className="askd__a">{a.answer}</p>}
          </div>
        ))}

        <Link href="/faq" className="btn btn--ghost btn--sm askd__more">
          دیدن همه‌ی سوال‌ها
        </Link>
      </div>
    </section>
  );
}
