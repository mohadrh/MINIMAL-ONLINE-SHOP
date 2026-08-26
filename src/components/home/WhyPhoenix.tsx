'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check, ChevronDown, CreditCard, MousePointerClick, Sparkles,
} from 'lucide-react';
import { HELP_ARTICLES } from '../../data/helpArticles';

/**
 * چرا فونیکس شاپ — مسیر خرید اسکرول‌محور.
 *
 * قبلاً «خرید چطور است»، «چرا امن است» و «آمار» سه سکشن جدا بودند
 * و پشت سر هم می‌آمدند: ۲٬۳۷۳ پیکسل توضیحِ پیوسته بدون یک محصول.
 * حالا یکی‌اند و جای آزادشده به ردیف‌های محصول رسید.
 *
 * مسیر می‌چسبد و با اسکرول جلو می‌رود: هر گام که کامل شد تیک
 * می‌خورد و بعد نوبت بعدی. کاربر خودش مسیر را طی می‌کند نه اینکه
 * فقط تماشا کند.
 *
 * ارتفاع چسبندگی عمداً کوتاه است — کمی بیش از دو صفحه برای سه گام.
 * سکشنی که کاربر را زیاد نگه دارد، از توضیح به مانع تبدیل می‌شود.
 */

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
      if (frame) return;
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
            <div className="sec-head">
              <span className="sec-head__kicker">سه قدم</span>
              <h2>خرید از فونیکس شاپ چطور است؟</h2>
              <p className="sec-head__lead">
                بیشتر سرویس‌های بین‌المللی کارت ایرانی را قبول نمی‌کنند. کاری که ما
                می‌کنیم این است که آن پرداخت را از طرف تو انجام می‌دهیم.
              </p>
            </div>

            <ol
              className="track"
              style={{ ['--done' as string]: done }}
              aria-label="سه مرحله‌ی خرید"
            >
              {STEPS.map((s, i) => {
                const state = i < done ? 'is-done' : i === done ? 'is-now' : '';
                return (
                  <li key={s.t} className={`track__step ${state}`} style={{ ['--i' as string]: i }}>
                    <span className="track__node" aria-hidden="true">
                      <span className="track__icon">{i < done ? <Check /> : s.icon}</span>
                      <span className="track__n num">{(i + 1).toLocaleString('fa-IR')}</span>
                    </span>

                    <div className="track__body">
                      <b>{s.t}</b>
                      <p>{s.d}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="track__hint" aria-hidden="true">
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
