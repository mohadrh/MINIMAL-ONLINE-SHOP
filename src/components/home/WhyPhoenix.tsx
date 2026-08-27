'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, CreditCard, MousePointerClick, Sparkles,
} from 'lucide-react';
import { HELP_ARTICLES } from '../../data/helpArticles';

/**
 * چرا فونیکس شاپ — مسیر خرید اسکرول‌محور.
 *
 * قبلاً «خرید چطور است»، «چرا امن است» و «آمار» سه سکشن جدا بودند
 * و پشت سر هم می‌آمدند: ۲٬۳۷۳ پیکسل توضیحِ پیوسته بدون یک محصول.
 * حالا یکی‌اند و جای آزادشده به ردیف‌های محصول رسید.
 *
 * مسیر می‌چسبد و با اسکرول جلو می‌رود: هر گام که کامل شد، تیوبِ
 * رنگیِ خودش روشن می‌شود و بعد نوبت بعدی. کاربر خودش مسیر را طی
 * می‌کند نه اینکه فقط تماشا کند.
 *
 * ارتفاع چسبندگی عمداً کوتاه است — کمی بیش از دو صفحه برای سه گام.
 * سکشنی که کاربر را زیاد نگه دارد، از توضیح به مانع تبدیل می‌شود.
 */

/* ارتفاعِ گام‌ها — متقارن.

   نسخه‌ی قبل موج‌دار بود (بالا، پایین، وسط) و بی‌نظم دیده می‌شد:
   سه ارتفاعِ متفاوت هیچ قاعده‌ای نداشت که چشم بتواند بگیرد.

   حالا دو طرف قرینه‌اند و وسط در اوج. نظم از تقارن می‌آید، نه از
   صاف بودن — و مسیر همچنان یک کمانِ پرش است نه یک خطِ افقی.

   عدد، فاصله‌ی هر گام از سقفِ ناحیه است: وسط صفر یعنی بالاترین. */
const LIFTS = ['56px', '0px', '56px'];

/* کمانِ پرش. مختصات با جای واقعیِ گره‌ها اندازه‌گیری شده، نه حدس:
   سه ستونِ مساوی با فاصله، مرکزشان روی ۰٫۱۵۷، ۰٫۵ و ۰٫۸۴۳ از عرض
   می‌افتد. ارتفاع هم lift به‌علاوه‌ی نصفِ قطرِ گره (۲۸). */
const WIRE = 'M 758 84 Q 604 28 450 28 Q 296 28 142 84';

const STEPS = [
  {
    icon: <MousePointerClick />,
    t: 'سرویس و پلن را انتخاب کن',
    d: 'مدت اشتراک و نوع تحویل را خودت مشخص می‌کنی. قیمت پیش از پرداخت کامل معلوم است.',
  },
  {
    icon: <CreditCard />,
    t: 'با کارت بانکی خودت پرداخت کن',
    d: 'درگاه ریالی داخلی. نه ارز لازم داری، نه حساب خارجی.',
  },
  {
    icon: <Sparkles />,
    t: 'روی حساب خودت فعال می‌شود',
    d: 'ایمیلت را می‌گیریم و اشتراک روی همان حساب فعال می‌شود. رمزت را هیچ‌وقت نمی‌خواهیم.',
  },
];

/* سه سوالی که واقعاً پرسیده می‌شوند، با جوابشان.
   جای سه شعارِ اعتمادسازیِ قبلی را گرفتند: «روی حساب خودت» و
   «رمزت را نمی‌خواهیم» چیزهایی بودند که هر فروشگاهی می‌گوید و
   هیچ‌کدام تردیدی را برطرف نمی‌کرد. سوال و جواب، تردید را
   مستقیم هدف می‌گیرد. */
const ASKED = HELP_ARTICLES.slice(0, 3);

export function WhyPhoenix() {
  const [done, setDone] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [openQ, setOpenQ] = useState<string | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setDone(STEPS.length); return; }

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
        if (scrollable <= 0) { setDone(STEPS.length); return; }
        const p = Math.min(1, Math.max(0, -r.top / scrollable));
        setDone(Math.min(STEPS.length, Math.floor(p * STEPS.length + 0.34)));
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
              <span className="sec-head__kicker">سه قدم</span>
              <h2>خرید از فونیکس شاپ چطور است؟</h2>
              <p className="sec-head__lead">
                بیشتر سرویس‌های بین‌المللی کارت ایرانی را قبول نمی‌کنند. کاری که ما
                می‌کنیم این است که آن پرداخت را از طرف تو انجام می‌دهیم.
              </p>
            </div>

            <ol
              className="buypath"
              style={{ ['--done' as string]: done }}
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
                className="buypath__wire"
                viewBox="0 0 900 112"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <linearGradient id="trackGrad" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f59440" />
                    <stop offset="50%" stopColor="#ff4d9f" />
                    <stop offset="100%" stopColor="#3ddcff" />
                  </linearGradient>
                </defs>
                <path className="buypath__wire-bed" d={WIRE} pathLength={1} vectorEffect="non-scaling-stroke" />
                <path
                  className="buypath__wire-lit"
                  d={WIRE}
                  pathLength={1}
                  vectorEffect="non-scaling-stroke"
                  stroke="url(#trackGrad)"
                />
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
                      <p>{s.d}</p>
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

      {/* ---------- سه سوالی که واقعاً پرسیده می‌شود ---------- */}
      <div className="wrap askd">
        <div className="sec-head">
          <h2>سه سوالی که بیشتر از همه می‌پرسند</h2>
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
