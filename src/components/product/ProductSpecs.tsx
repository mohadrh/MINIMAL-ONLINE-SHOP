import React from 'react';
import {
  BadgeCheck, CircleSlash, Clock, KeyRound, Layers, Monitor, ShieldCheck, Star, UserCheck, Wallet,
} from 'lucide-react';
import type { FulfillmentMode, Product } from '../../data/catalog';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* هر نحوه‌ی تحویل، یک جمله‌ی ساده و یک مسیر فعال‌سازی دارد.
   کاربر نباید «api_topup» ببیند؛ باید بداند چه اتفاقی می‌افتد. */
const FULFILLMENT: Record<
  FulfillmentMode,
  { what: string; steps: string[] }
> = {
  stock_code: {
    what: 'کد اشتراک از انبار برایت فرستاده می‌شود',
    steps: [
      'سفارش را ثبت و پرداخت می‌کنی.',
      'کد اشتراک در پنل پیگیری و پیامک برایت می‌آید.',
      'کد را در بخش Redeem سرویس وارد می‌کنی.',
      'اشتراک روی همان حسابی که کد را واردش کردی فعال می‌شود.',
    ],
  },
  stock_account: {
    what: 'یک حساب آماده با نام‌کاربری و رمز تحویل می‌گیری',
    steps: [
      'سفارش را ثبت و پرداخت می‌کنی.',
      'نام‌کاربری و رمز در پنل پیگیری برایت می‌آید.',
      'وارد حساب می‌شوی و رمز را عوض می‌کنی.',
      'اگر جایی گیر کردی، پشتیبانی تا آخر همراهت است.',
    ],
  },
  upgrade_on_user: {
    what: 'اشتراک روی حساب خودت فعال می‌شود — حساب جدیدی در کار نیست',
    steps: [
      'ایمیل حسابت را موقع سفارش وارد می‌کنی.',
      'سفارش را پرداخت می‌کنی.',
      'ما اشتراک را روی همان حساب فعال می‌کنیم.',
      'کافی است یک بار خارج و دوباره وارد شوی تا اشتراک را ببینی.',
    ],
  },
  api_topup: {
    what: 'حسابت مستقیم و خودکار شارژ می‌شود',
    steps: [
      'نام‌کاربری یا شماره‌ات را موقع سفارش وارد می‌کنی.',
      'سفارش را پرداخت می‌کنی.',
      'شارژ به‌صورت خودکار روی همان حساب می‌نشیند.',
      'تأییدش را هم در خود سرویس می‌بینی هم در پنل پیگیری.',
    ],
  },
  manual: {
    what: 'کارشناس ما سفارش را دستی برایت انجام می‌دهد',
    steps: [
      'سفارش را ثبت و پرداخت می‌کنی.',
      'کارشناس سفارشت را بررسی می‌کند.',
      'اگر اطلاعات بیشتری لازم باشد، در پنل پیگیری از تو می‌پرسیم.',
      'بعد از انجام، نتیجه برایت فرستاده می‌شود.',
    ],
  },
};

const totalStock = (p: Product): number | null => {
  const nums = p.variants.map((v) => v.stock).filter((s): s is number => s !== null);
  if (nums.length !== p.variants.length) return null;
  return nums.reduce((a, b) => a + b, 0);
};

const priceRange = (p: Product) => {
  const prices = p.variants.map((v) => v.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? fmt(lo) : `${fmt(lo)} تا ${fmt(hi)}`;
};

/**
 * جدول مشخصات و آموزش فعال‌سازی.
 *
 * الگویش از صفحه‌ی محصول نمونه آمده: یک جعبه‌ی کوچک که وضعیت،
 * دامنه‌ی قیمت و نحوه‌ی تحویل را در یک نگاه می‌دهد، بدون اینکه
 * کاربر مجبور باشد سه پاراگراف بخواند.
 *
 * چیزی که خودمان اضافه کردیم آموزش فعال‌سازی است. در این بازار،
 * بیشترین تیکت پشتیبانی بعد از خرید ساخته می‌شود نه قبلش — و
 * سوالش همیشه یکی است: «حالا با این چه کار کنم؟». جوابش باید در
 * همان صفحه‌ای باشد که خرید کرده، نه در بخش راهنما.
 */
export function ProductSpecs({ p }: { p: Product }) {
  const stock = totalStock(p);
  const inStock = stock === null || stock > 0;
  const f = FULFILLMENT[p.fulfillment];

  const rows: { icon: React.ReactNode; k: string; v: string }[] = [
    {
      icon: inStock ? <BadgeCheck /> : <CircleSlash />,
      k: 'وضعیت',
      v: inStock
        ? stock === null ? 'موجود' : `موجود — ${fmt(stock)} عدد`
        : 'فعلاً ناموجود',
    },
    { icon: <Clock />,       k: 'زمان تحویل',   v: p.deliveryEstimate },
    { icon: <KeyRound />,    k: 'نحوه‌ی تحویل',  v: f.what },
    { icon: <ShieldCheck />, k: 'گارانتی',      v: p.warrantyLabel },
    {
      icon: <UserCheck />,
      k: 'چه چیزی از تو لازم است',
      v: p.requiredInputs.length
        ? p.requiredInputs.map((i) => i.label).join('، ')
        : 'چیزی لازم نیست',
    },
    { icon: <Star />, k: 'امتیاز خریداران', v: `${p.rating.toLocaleString('fa-IR')} از ۵ — ${fmt(p.reviewsCount)} نظر` },
  ];

  /* ردیفی که همیشه یک جواب دارد، ردیف نیست — فقط ارتفاع است.
     «۱ پلن» چیزی به کسی نمی‌گوید، پس فقط وقتی می‌آید که انتخابی
     در کار باشد. */
  if (p.variants.length > 1) {
    rows.splice(1, 0, {
      icon: <Layers />, k: 'پلن‌های موجود', v: `${fmt(p.variants.length)} پلن`,
    });
  }

  if (p.platforms?.length) {
    rows.splice(p.variants.length > 1 ? 2 : 1, 0, {
      icon: <Monitor />, k: 'پلتفرم', v: p.platforms.join('، '),
    });
  }

  return (
    <>
      <section className="section" id="specs">
        <div className="wrap spec">
          <div className="sec-head">
            <h2>مشخصات {p.title}</h2>
            <p className="sec-head__lead">
              هر چیزی که قبل از خرید باید بدانی، در یک نگاه.
            </p>
          </div>

          <dl className="spec__table">
            {rows.map((r, i) => (
              /* ردیف اول «وضعیت» است و ته‌رنگ آبی می‌گیرد.

                 تنها مشخصه‌ای که ممکن است جواب «نه» بدهد و کل تصمیم
                 را عوض کند؛ بقیه جزئیات‌اند. */
              <div key={r.k} className={`spec__row ${i === 0 ? 'spec__row--head' : ''}`}>
                <dt>
                  <span className="spec__icon" aria-hidden="true">{r.icon}</span>
                  {r.k}
                </dt>
                <dd>{r.v}</dd>
              </div>
            ))}
            <div className="spec__row">
              <dt>
                <span className="spec__icon" aria-hidden="true"><Wallet /></span>
                {p.variants.length > 1 ? 'دامنه‌ی قیمت' : 'قیمت'}
              </dt>
              <dd className="num">{priceRange(p)} تومان</dd>
            </div>
          </dl>

          {p.notes && p.notes.length > 0 && (
            <ul className="spec__notes">
              {p.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </div>
      </section>

      {/* ---------- آموزش فعال‌سازی ---------- */}
      <section className="section section--tint" id="howto">
        <div className="wrap spec">
          <div className="sec-head">
            <h2>بعد از خرید چه کار کنم؟</h2>
            <p className="sec-head__lead">
              چهار گام، از پرداخت تا لحظه‌ای که اشتراک روی حسابت فعال است.
            </p>
          </div>

          <ol className="spec__steps">
            {f.steps.map((step, i) => (
              <li key={i}>
                <span className="spec__num num">{fmt(i + 1)}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
