'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Check, Lock, ShoppingBag } from 'lucide-react';
import { useCart } from '../../app/providers';
import { Loader } from '../ui/Loader';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* مسیر واقعی پرداخت آنلاین یک کلیک و تمام نیست: کاربر از سایت
   بیرون می‌رود، برمی‌گردد، و تازه آن‌جا تراکنش تأیید می‌شود. هر دو
   مرحله اینجا مدل شده‌اند، وگرنه رابط چیزی را وعده می‌دهد که در
   واقعیت نیست. */
type Step = 'identify' | 'review' | 'pay' | 'gateway' | 'verify' | 'done' | 'failed';

const STEPS: { id: Step; label: string }[] = [
  { id: 'identify', label: 'تأیید هویت' },
  { id: 'review',   label: 'بازبینی' },
  { id: 'pay',      label: 'پرداخت' },
];

const GATEWAYS = [
  { id: 'saman', name: 'بانک سامان' },
  { id: 'mellat', name: 'بانک ملت' },
  { id: 'zarin', name: 'زرین‌پال' },
];

export function CheckoutFlow() {
  const { lines, count, subtotal, clear } = useCart();

  const [step, setStep] = useState<Step>('identify');
  const [phone, setPhone] = useState('');
  const [gateway, setGateway] = useState(GATEWAYS[0].id);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = useMemo(
    () => Math.max(0, STEPS.findIndex((s) => s.id === step)),
    [step],
  );

  /* شماره‌ی موبایل ایرانی. الگو عمداً سخت‌گیر است — شماره‌ی غلط
     یعنی سفارشی که نمی‌شود پیگیری‌اش کرد. */
  const phoneOk = /^09\d{9}$/.test(phone.trim());

  if (count === 0 && step !== 'done') {
    return (
      <div className="wrap cart__empty">
        <span className="cart__empty-icon"><ShoppingBag aria-hidden="true" /></span>
        <h1>سبد خرید خالی است</h1>
        <p>برای ادامه، اول چیزی به سبد اضافه کن.</p>
        <Link href="/shop" className="btn btn--primary">رفتن به فروشگاه</Link>
      </div>
    );
  }

  /* ---------- در درگاه ---------- */
  if (step === 'gateway' || step === 'verify') {
    const atGateway = step === 'gateway';
    return (
      <div className="wrap co__wait">
        <Loader shape={atGateway ? 'circle' : 'square'} />
        <h1>{atGateway ? 'در حال انتقال به درگاه' : 'در حال تأیید تراکنش'}</h1>
        <p>
          {atGateway
            ? 'صفحه‌ی بانک باز می‌شود. تا وقتی پرداخت تمام نشده این صفحه را نبند.'
            : 'بانک پرداخت را تأیید کرده و داریم سفارش را ثبت می‌کنیم.'}
        </p>

        {/* شبیه‌سازی برگشت از درگاه. وقتی بک‌اند وصل شد، جایش را
            کال‌بکِ واقعی می‌گیرد. */}
        <div className="co__wait-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => (atGateway ? setStep('verify') : (clear(), setStep('done')))}
          >
            {atGateway ? 'پرداخت کردم' : 'ادامه'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => { setError('پرداخت ناموفق بود یا لغو شد.'); setStep('failed'); }}
          >
            انصراف
          </button>
        </div>
      </div>
    );
  }

  /* ---------- ناموفق ---------- */
  if (step === 'failed') {
    return (
      <div className="wrap co__wait">
        <span className="co__icon co__icon--bad"><AlertCircle aria-hidden="true" /></span>
        <h1>پرداخت انجام نشد</h1>
        <p>{error ?? 'تراکنش کامل نشد.'} سبد خریدت دست‌نخورده مانده.</p>
        <div className="co__wait-actions">
          <button type="button" className="btn btn--primary" onClick={() => setStep('pay')}>
            تلاش دوباره
          </button>
          <Link href="/cart" className="btn btn--ghost">بازگشت به سبد</Link>
        </div>
      </div>
    );
  }

  /* ---------- موفق ---------- */
  if (step === 'done') {
    return (
      <div className="wrap co__wait">
        <span className="co__icon co__icon--ok"><Check aria-hidden="true" /></span>
        <h1>سفارش ثبت شد</h1>
        <p>
          کد پیگیری به شماره‌ی <b className="num">{phone}</b> پیامک شد.
          تحویل اغلب زیر پانزده دقیقه انجام می‌شود.
        </p>
        <div className="co__wait-actions">
          <Link href="/track" className="btn btn--primary">پیگیری سفارش</Link>
          <Link href="/shop" className="btn btn--ghost">ادامه‌ی خرید</Link>
        </div>
      </div>
    );
  }

  /* ---------- سه گام اصلی ---------- */
  return (
    <div className="co">
      <header className="wrap co__head">
        <Link href="/" className="co__brand">فونیکس شاپ</Link>
        <span className="co__secure"><Lock aria-hidden="true" />اتصال امن</span>
      </header>

      {/* مسیر گام‌ها — همه‌ی حالت‌ها از stepIndex مشتق می‌شوند */}
      <div className="wrap">
        <div
          className="cop"
          style={{
            ['--cop-p' as string]: `${(stepIndex / (STEPS.length - 1)) * 100}%`,
            ['--cop-count' as string]: STEPS.length,
          }}
        >
          <span className="cop__rail" aria-hidden="true"><span className="cop__fill" /></span>
          <ol className="cop__list" aria-label={`مرحله ${stepIndex + 1} از ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={`cop__node ${i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : ''}`}
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                <span className="cop__dot" aria-hidden="true">
                  <span className="cop__num num">{(i + 1).toLocaleString('fa-IR')}</span>
                  <svg viewBox="0 0 24 24" className="cop__tick" focusable="false">
                    <path d="m5.5 12.6 4.3 4.3L18.5 7.6" />
                  </svg>
                </span>
                <span className="cop__name">{s.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="wrap co__grid">
        <div className="co__main">
          {step === 'identify' && (
            <section className="co__card">
              <h2>شماره‌ی موبایل</h2>
              <p className="co__lead">
                کد پیگیری و اطلاعات تحویل به همین شماره می‌رسد. حساب کاربری
                لازم نیست.
              </p>

              <label className="pdp-input">
                <span>شماره‌ی موبایل</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>

              {phone && !phoneOk && (
                <p className="co__err">شماره باید با ۰۹ شروع شود و یازده رقم باشد.</p>
              )}

              <button
                type="button"
                className="btn btn--primary"
                disabled={!phoneOk}
                onClick={() => setStep('review')}
              >
                ادامه
                <ArrowLeft aria-hidden="true" />
              </button>
            </section>
          )}

          {step === 'review' && (
            <section className="co__card">
              <h2>بازبینی سفارش</h2>
              <p className="co__lead">
                قبل از پرداخت یک بار نگاه کن. بعد از تحویل، تغییر مشخصات
                ممکن نیست.
              </p>

              <div className="co__lines">
                {lines.map((l) => (
                  <div key={l.key} className="co__line">
                    <div>
                      <b>{l.product.title}</b>
                      <span>{l.variant.label}</span>
                      {Object.entries(l.inputs).map(([k, v]) => (
                        <span key={k} className="co__line-input">{v}</span>
                      ))}
                    </div>
                    <span className="num">
                      {fmt(l.variant.price * l.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="co__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setStep('identify')}>
                  بازگشت
                </button>
                <button type="button" className="btn btn--primary" onClick={() => setStep('pay')}>
                  تأیید و پرداخت
                  <ArrowLeft aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {step === 'pay' && (
            <section className="co__card">
              <h2>انتخاب درگاه</h2>
              <p className="co__lead">
                هر سه درگاه ریالی و داخلی‌اند و کارمزدی اضافه نمی‌کنند.
              </p>

              <div className="co__gates" role="radiogroup" aria-label="درگاه پرداخت">
                {GATEWAYS.map((g) => (
                  <button
                    key={g.id}
                    role="radio"
                    aria-checked={gateway === g.id}
                    className={`co__gate ${gateway === g.id ? 'is-on' : ''}`}
                    onClick={() => setGateway(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              <div className="co__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setStep('review')}>
                  بازگشت
                </button>
                <button type="button" className="btn btn--primary" onClick={() => setStep('gateway')}>
                  پرداخت <span className="num">{fmt(subtotal)}</span> تومان
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="co__side">
          <h3>خلاصه</h3>
          <div className="cart__row">
            <span>تعداد اقلام</span>
            <b className="num">{fmt(count)}</b>
          </div>
          <div className="cart__row">
            <span>جمع کالاها</span>
            <b className="num">{fmt(subtotal)}</b>
          </div>
          <div className="cart__row cart__row--total">
            <span>قابل پرداخت</span>
            <b className="num">{fmt(subtotal)} تومان</b>
          </div>
          <ul className="co__promises">
            <li><Check aria-hidden="true" />تحویل اغلب زیر ۱۵ دقیقه</li>
            <li><Check aria-hidden="true" />گارانتی تمام دوره</li>
            <li><Check aria-hidden="true" />رمزت را نمی‌خواهیم</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
