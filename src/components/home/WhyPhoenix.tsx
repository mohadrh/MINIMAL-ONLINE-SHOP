'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CreditCard, MousePointerClick, RotateCcw, Sparkles, Zap,
} from 'lucide-react';

/**
 * چرا فونیکس شاپ — سه سکشن در یکی، با مسیر خریدِ مرحله‌به‌مرحله.
 *
 * قبلاً «خرید چطور است»، «چرا امن است» و «آمار» سه سکشن جدا بودند
 * و پشت سر هم می‌آمدند: ۲٬۳۷۳ پیکسل توضیحِ پیوسته بدون یک محصول.
 * حالا یکی‌اند و جای آزادشده به ردیف‌های محصول رسید.
 *
 * مسیر خرید مثل نقشه‌ی مرحله‌های یک بازی کشیده شده: سه گره روی یک
 * خط، و خط با اسکرول کاربر پر می‌شود. دلیلش سرگرمی نیست —
 * پیشرفتِ دیداری به آدم می‌گوید «سه تاست و تمام»، و همان چیزی است
 * که ترسِ «نمی‌دانم چقدر طول می‌کشد» را برمی‌دارد.
 *
 * گره‌ها یکی‌یکی روشن می‌شوند نه با هم: ترتیب اینجا واقعاً معنی
 * دارد و باید حس شود، نه فقط شماره‌گذاری.
 */

const STEPS = [
  {
    n: '۱',
    icon: <MousePointerClick />,
    t: 'سرویس و پلن را انتخاب کن',
    d: 'مدت اشتراک و نوع تحویل را خودت مشخص می‌کنی. قیمت پیش از پرداخت کامل معلوم است.',
  },
  {
    n: '۲',
    icon: <CreditCard />,
    t: 'با کارت بانکی خودت پرداخت کن',
    d: 'درگاه ریالی داخلی. نه ارز لازم داری، نه حساب خارجی.',
  },
  {
    n: '۳',
    icon: <Sparkles />,
    t: 'روی حساب خودت فعال می‌شود',
    d: 'ایمیلت را می‌گیریم و اشتراک روی همان حساب فعال می‌شود. رمزت را هیچ‌وقت نمی‌خواهیم.',
  },
];

/* سه وعده، نه سه شعار.

   نسخه‌ی اول «روی حساب خودت»، «رمزت را نمی‌خواهیم» و «گارانتی
   داریم» بود — حرف‌هایی که هر فروشگاهی می‌زند و هیچ‌کدام چیزی را
   ثابت نمی‌کند.

   این سه، هرکدام یک مانعِ واقعیِ خریدِ ایرانی را برمی‌دارند و
   هرکدام قابل سنجش‌اند: یا کارت ایرانی کار می‌کند یا نه، یا سیستم
   خودکار تحویل می‌دهد یا آدم، یا پول برمی‌گردد یا نه. */
const SAFE = [
  {
    icon: <CreditCard />,
    t: 'نه کارت خارجی، نه ارز',
    d: 'با همان کارت بانکی ایرانی خودت پرداخت می‌کنی. پیدا کردن ویزاکارت و خریدن دلار، مشکلِ ما می‌شود نه تو.',
  },
  {
    icon: <Zap />,
    t: 'سیستم تحویل می‌دهد، نه اپراتور',
    d: 'سفارش که ثبت شد، خودکار می‌رود جلو. منتظر نمی‌مانی کسی پیامت را ببیند و شیفتش شروع شود.',
  },
  {
    icon: <RotateCcw />,
    t: 'نشد؟ پولت برمی‌گردد',
    d: 'اگر اشتراک فعال نشد یا وسط دوره خوابید، جایگزینش می‌کنیم. نشد، کل مبلغ برمی‌گردد.',
  },
];

const STATS = [
  { num: '۲۴٬۸۰۰', label: 'سفارش تحویل‌شده' },
  { num: '۶٬۱۰۰',  label: 'نظر ثبت‌شده' },
  { num: '۲۷',     label: 'سرویس فعال' },
  { num: '۲۴/۷',   label: 'پشتیبانی' },
];

export function WhyPhoenix() {
  /* تا کدام گره روشن شده. با IntersectionObserver پیش می‌رود، نه با
     تایمر: اگر با تایمر بود، کسی که سریع اسکرول می‌کند انیمیشن را
     از دست می‌داد و کسی که کند می‌آید، نصفه‌کاره می‌دیدش. */
  const [lit, setLit] = useState(0);
  const nodes = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setLit(STEPS.length); return; }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = nodes.current.indexOf(e.target as HTMLLIElement);
          if (i >= 0) setLit((v) => Math.max(v, i + 1));
        });
      },
      { threshold: 0.6, rootMargin: '0px 0px -12% 0px' },
    );

    nodes.current.forEach((n) => n && io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <section className="section section--tint reveal" id="why">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-head__kicker">سه قدم، سه تضمین</span>
          <h2>خرید از فونیکس شاپ چطور است؟</h2>
          <p className="sec-head__lead">
            بیشتر سرویس‌های بین‌المللی کارت ایرانی را قبول نمی‌کنند. کاری که ما
            می‌کنیم این است که آن پرداخت را از طرف تو انجام می‌دهیم.
          </p>
        </div>

        {/* ---------- مسیر خرید ---------- */}
        <ol
          className="track"
          style={{ ['--lit' as string]: lit }}
          aria-label="سه مرحله‌ی خرید"
        >
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              ref={(el) => { nodes.current[i] = el; }}
              className={`track__step ${i < lit ? 'is-lit' : ''}`}
              style={{ ['--i' as string]: i }}
            >
              <span className="track__node" aria-hidden="true">
                <span className="track__icon">{s.icon}</span>
                <span className="track__n num">{s.n}</span>
              </span>

              <div className="track__body">
                <b>{s.t}</b>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* ---------- سه تضمین ---------- */}
        <ul className="whyx__safe">
          {SAFE.map((s) => (
            <li key={s.t}>
              <span className="whyx__icon" aria-hidden="true">{s.icon}</span>
              <div>
                <b>{s.t}</b>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* ---------- آمار ---------- */}
        <dl className="whyx__stats">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt className="num">{s.num}</dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
