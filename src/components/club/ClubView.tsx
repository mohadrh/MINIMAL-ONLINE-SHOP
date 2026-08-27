'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Coins, Crown, Wallet } from 'lucide-react';
import { CLUB_FAQ, EARN, TIERS, tierOf, nextTier } from '../../data/club';
import { ClubTracks } from './ClubTracks';

/**
 * باشگاه مشتریان — صفحه‌ی عمومی.
 *
 * تبِ باشگاه در پنل کاربری وضعیتِ خودِ کاربر را نشان می‌دهد، ولی
 * پشت ورود است. کسی که هنوز خرید نکرده اصلاً نمی‌داند چنین چیزی
 * وجود دارد — و همان کسی است که باید بداند.
 *
 * پس این صفحه دو کار می‌کند: توضیح می‌دهد باشگاه چیست، و یک
 * ماشین‌حساب دارد که با مبلغ خریدِ سالانه بازی می‌کنی و می‌بینی
 * کجای نردبان می‌ایستی. عدد، از هر جمله‌ای قانع‌کننده‌تر است.
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* هر ده هزار تومان یک امتیاز — همان قاعده‌ای که در EARN نوشته شده */
const POINTS_PER_TOMAN = 1 / 10_000;

export function ClubView() {
  /* مجموعِ خرید، نه خریدِ سالانه.

     نسخه‌ی اول «خرید سالانه» می‌پرسید و جوابش گمراه‌کننده بود:
     امتیاز منقضی نمی‌شود، پس آستانه‌های پله‌ها مادام‌العمرند. با
     دو میلیون در سال کاربر می‌دید «برنزی» و نتیجه می‌گرفت باشگاه
     عملاً به او نمی‌رسد — در حالی که همان مبلغ در سه سال، نقره‌ای
     می‌شود.

     پیش‌فرض شش میلیون است چون تقریباً همان جایی است که کاربرِ
     نمونه‌ی پنل ایستاده؛ عددی که واقعاً پیش می‌آید. */
  const [spend, setSpend] = useState(6_000_000);
  const [openQ, setOpenQ] = useState<string | null>(null);

  const points = Math.floor(spend * POINTS_PER_TOMAN);
  const tier = tierOf(points);
  const next = nextTier(points);
  /* کش‌بک روی خریدِ *بعدی* است نه روی گذشته: پله را که گرفتی، از
     آن به بعد درصد می‌گیری. حساب کردنش روی مجموعِ خریدِ قبلی، عددِ
     بزرگی نشان می‌داد که هیچ‌وقت به کسی پرداخت نمی‌شود.

     مبنا یک میلیون تومان است — یک خریدِ متوسط. */
  const NEXT_ORDER = 1_000_000;
  const cashback = Math.round((NEXT_ORDER * tier.cashback) / 100);

  return (
    <div className="clubpage">
      {/* شبکه‌ی لوله‌ها پشت کلِ صفحه، نه پشت یک سکشن: قرار است حس
          «یک سیستمی این پشت کار می‌کند» بدهد، و سیستمی که وسط
          صفحه تمام شود، سیستم نیست. */}
      <ClubTracks />

      <header className="section club-head">
        <div className="wrap">
          <span className="sec-head__kicker">رایگان، از اولین خرید</span>
          <h1>باشگاه مشتریان</h1>
          <p className="club-head__lead">
            هر خریدی که می‌کنی امتیاز دارد. امتیاز که جمع شد، پله بالا می‌روی و
            درصدی از هر خرید به کیف پولت برمی‌گردد. نه حق عضویتی هست، نه لازم است
            جایی ثبت‌نام کنی — با اولین سفارش خودبه‌خود شروع می‌شود.
          </p>
        </div>
      </header>

      {/* ---------- نردبان ---------- */}
      <section className="section">
        <div className="wrap">
          <div className="sec-head sec-head--mid">
            <span className="sec-head__kicker">چهار پله</span>
            <h2>هرچه بیشتر بخری، بیشتر برمی‌گردد</h2>
          </div>

          <div className="tiers">
            {TIERS.map((t) => (
              <article
                key={t.id}
                className={`tier ${t.id === tier.id ? 'is-you' : ''}`}
                style={{ ['--tube' as string]: t.tube }}
              >
                <header>
                  <span className="tier__ico" aria-hidden="true"><Crown /></span>
                  <b>{t.label}</b>
                  {t.id === tier.id && <span className="tier__you">اینجایی</span>}
                </header>

                <p className="tier__from num">
                  {t.from === 0 ? 'از همان اول' : `از ${fmt(t.from)} امتیاز`}
                </p>

                <p className="tier__cash num">
                  {t.cashback === 0 ? '—' : `٪${fmt(t.cashback)}`}
                  <span>کش‌بک</span>
                </p>

                <ul>
                  {t.perks.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ماشین‌حساب ---------- */}
      <section className="section section--tint">
        <div className="wrap">
          <div className="sec-head sec-head--mid">
            <span className="sec-head__kicker">حساب کن</span>
            <h2>سالی چقدر برمی‌گردد؟</h2>
            <p className="sec-head__lead">
              مجموع خریدت را بکش تا ببینی کجای نردبان می‌ایستی. امتیاز منقضی
              نمی‌شود، پس این عدد در طول زمان جمع می‌شود — نه سالی یک بار صفر.
            </p>
          </div>

          <div className="clubcalc">
            <label className="clubcalc__field">
              <span>مجموع خرید تا امروز</span>
              <input
                type="range"
                min={500_000}
                /* ۶۰ میلیون: پله‌ی ققنوس روی ۵۰۰۰ امتیاز است یعنی
                   ۵۰ میلیون خرید. اگر سقفِ اسکرول‌بار کمتر از آن
                   باشد، بالاترین پله تزئینی دیده می‌شود. */
                max={60_000_000}
                step={500_000}
                value={spend}
                onChange={(e) => setSpend(Number(e.target.value))}
                aria-label="مجموع مبلغ خرید به تومان"
              />
              <b className="num">{fmt(spend)} تومان</b>
            </label>

            <div className="clubcalc__out">
              <div className="clubcalc__cell">
                <span className="clubcalc__ico" aria-hidden="true"><Coins /></span>
                <b className="num">{fmt(points)}</b>
                <span>امتیاز</span>
              </div>

              <div className="clubcalc__cell" style={{ ['--tube' as string]: tier.tube }}>
                <span className="clubcalc__ico clubcalc__ico--tier" aria-hidden="true"><Crown /></span>
                <b>{tier.label}</b>
                <span>پله‌ی تو</span>
              </div>

              <div className="clubcalc__cell">
                <span className="clubcalc__ico" aria-hidden="true"><Wallet /></span>
                <b className="num">{fmt(cashback)}</b>
                <span>تومان برگشتی از هر یک میلیون خرید</span>
              </div>
            </div>

            <p className="clubcalc__note">
              {next
                ? `${fmt(next.from - points)} امتیاز دیگر تا پله‌ی ${next.label}.`
                : 'بالاترین پله. بالاتر از این نداریم.'}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- چطور امتیاز بگیرم ---------- */}
      <section className="section">
        <div className="wrap">
          <div className="sec-head sec-head--mid">
            <span className="sec-head__kicker">چهار راه</span>
            <h2>امتیاز از کجا می‌آید؟</h2>
          </div>

          <ul className="earn">
            {EARN.map((e) => (
              <li key={e.title} className="earn__item">
                <b className="earn__pts num">{e.points}</b>
                <div>
                  <b>{e.title}</b>
                  <p>{e.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- سوال‌ها ---------- */}
      <section className="section section--tint">
        <div className="wrap askd">
          <div className="sec-head sec-head--mid">
            <h2>سوال‌های باشگاه</h2>
          </div>

          {CLUB_FAQ.map((f) => (
            <div key={f.q} className="askd__item">
              <button
                type="button"
                className="askd__q"
                aria-expanded={openQ === f.q}
                onClick={() => setOpenQ(openQ === f.q ? null : f.q)}
              >
                <b>{f.q}</b>
                <ChevronDown aria-hidden="true" />
              </button>
              {openQ === f.q && <p className="askd__a">{f.a}</p>}
            </div>
          ))}

          <div className="club-cta">
            <Link href="/shop" className="btn btn--primary">شروع از فروشگاه</Link>
            <Link href="/account" className="btn btn--ghost">دیدن امتیازهای من</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
