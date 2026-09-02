'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Eye, EyeOff, Lock, ShoppingBag } from 'lucide-react';
import { useCart } from '../../app/providers';
import {
  emailOk, passwordOk, phoneOk, saveAccount,
} from '../../lib/account';
import { newOrderCode, saveOrder, scheduleFulfilment, type Order } from '../../lib/orders';
import { Loader } from '../ui/Loader';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* مسیر واقعی پرداخت آنلاین یک کلیک و تمام نیست: کاربر از سایت
   بیرون می‌رود، برمی‌گردد، و تازه آن‌جا تراکنش تأیید می‌شود. هر دو
   مرحله اینجا مدل شده‌اند، وگرنه رابط چیزی را وعده می‌دهد که در
   واقعیت نیست. */
/* یک قدم پیش از پرداخت، نه سه تا.

   نسخه‌ی قبل «تأیید هویت»، «بازبینی» و «پرداخت» را سه صفحه‌ی جدا
   کرده بود. هر سه روی یک صفحه جا می‌شوند و هیچ‌کدام آن‌قدر
   طولانی نیست که صفحه‌ی خودش را لازم داشته باشد — شماره‌ی موبایل
   و ایمیل دو فیلد است، و بازبینی چند سطرِ سبد که همان کنارش در
   خلاصه هم هست.

   قدمِ اضافه در پرداخت، فقط جا برای رها کردنِ سبد می‌سازد. */
type Step = 'form' | 'gateway' | 'verify' | 'done' | 'failed';

const STEPS: { id: Step; label: string }[] = [
  { id: 'form',    label: 'اطلاعات و بازبینی' },
  { id: 'gateway', label: 'پرداخت' },
  { id: 'done',    label: 'تحویل' },
];

const GATEWAYS = [
  { id: 'saman', name: 'بانک سامان' },
  { id: 'mellat', name: 'بانک ملت' },
  { id: 'zarin', name: 'زرین‌پال' },
];

export function CheckoutFlow() {
  const { lines, count, subtotal, clear } = useCart();

  /* کد پیگیریِ همین سفارش. تا وقتی پرداخت تأیید نشده null است. */
  const [code, setCode] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('form');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [makeAccount, setMakeAccount] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [gateway, setGateway] = useState(GATEWAYS[0].id);
  const [error, setError] = useState<string | null>(null);

  /* ثبت نهاییِ سفارش — یک تعریف، دو مصرف‌کننده: تایمرِ تأیید و
     دکمه‌ی پشتیبانِ همان صفحه.

     در ref نگه داشته می‌شود تا useEffect لازم نباشد به آرایه‌ی
     وابستگی‌اش اضافه‌اش کند و با هر رندر تایمر از نو شروع نشود. */
  const finishRef = useRef<(() => void) | null>(null);
  finishRef.current = () => {
    const order: Order = {
      code: newOrderCode(),
      createdAt: Date.now(),
      status: 'paid',
      phone,
      gateway,
      subtotal,
      discount: 0,
      walletUsed: 0,
      payable: subtotal,
      items: lines.map((l) => ({
        productId: l.product.id,
        title: l.product.title,
        variantLabel: l.variant.label,
        quantity: l.quantity,
        price: l.variant.price,
        inputs: l.inputs,
        deliveryEstimate: l.product.deliveryEstimate,
      })),
    };
    saveOrder(order);
    scheduleFulfilment(order.code);
    setCode(order.code);
    clear();
    setStep('done');
  };

  /* تأییدِ تراکنش خودکار تمام می‌شود، نه با کلیک.

     نسخه‌ی قبل بعد از «پرداخت کردم» یک صفحه‌ی «در حال تأیید» نشان
     می‌داد با دکمه‌ی «ادامه». در واقعیت کسی روی صفحه‌ی تأییدِ
     بانک دکمه نمی‌زند — بانک خودش برمی‌گرداند. آن کلیک فقط یک قدمِ
     ساختگی بود.

     دکمه هنوز هست، برای وقتی که چیزی گیر کند؛ ولی لازم نیست.

     ⚠ وقتی درگاه واقعی وصل شد، جای این تایمر را کال‌بکِ بانک
     می‌گیرد و همین finish() صدا زده می‌شود. */
  useEffect(() => {
    if (step !== 'verify') return;
    const t = window.setTimeout(() => finishRef.current?.(), 1800);
    return () => window.clearTimeout(t);
  }, [step]);

  const stepIndex = useMemo(
    () => Math.max(0, STEPS.findIndex((s) => s.id === step)),
    [step],
  );

  /* اعتبارسنجی از lib/account می‌آید تا الگوها در دو جا تکرار
     نشوند و از هم نیفتند. */
  const okPhone = phoneOk(phone);
  const okEmail = emailOk(email);
  const okPass = !makeAccount || passwordOk(password);
  const canPay = okPhone && okEmail && okPass;

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
            onClick={() => {
              if (atGateway) { setStep('verify'); return; }
              finishRef.current?.();
            }}
          >
            {atGateway ? 'پرداخت کردم' : 'ثبت سفارش'}
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
          <button type="button" className="btn btn--primary" onClick={() => setStep('form')}>
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

        {/* کد را همین‌جا هم نشان می‌دهیم. اتکا به پیامکِ تنها یعنی
            هرکس پیامک دیر برسد یا نرسد، راهی به سفارشش ندارد. */}
        {code && (
          <div className="co__code">
            <span>کد پیگیری</span>
            <b className="num" dir="ltr">{code}</b>
          </div>
        )}

        <div className="co__wait-actions">
          <Link
            href={code ? `/track?code=${encodeURIComponent(code)}` : '/track'}
            className="btn btn--primary"
          >
            پیگیری سفارش
          </Link>
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
          {step === 'form' && (
            <section className="co__card">
              <h2>اطلاعات تحویل</h2>
              <p className="co__lead">
                دو فیلد، و تمام. کد پیگیری به موبایلت پیامک می‌شود و اشتراک روی
                همان ایمیلی فعال می‌شود که این‌جا می‌دهی.
              </p>

              <div className="co__fields">
                <label className="pdp-input">
                  <span>شماره‌ی موبایل</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={phone.length > 0 && !okPhone}
                  />
                  {phone && !okPhone && (
                    <em className="co__err">با ۰۹ شروع شود و یازده رقم باشد.</em>
                  )}
                </label>

                <label className="pdp-input">
                  <span>ایمیل</span>
                  <input
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={email.length > 0 && !okEmail}
                  />
                  {email && !okEmail && <em className="co__err">ایمیل کامل نیست.</em>}
                </label>
              </div>

              {/* ---------- حساب، اختیاری ----------

                  تیکش از اول خورده چون تقریباً همه بعداً سفارششان را
                  پیگیری می‌کنند و بدون حساب باید هر بار کد پیگیری را
                  پیدا کنند. ولی اجباری نیست: کسی که فقط می‌خواهد
                  بخرد و برود، تیک را برمی‌دارد و یک فیلد کمتر
                  می‌بیند.

                  رمز ذخیره نمی‌شود — lib/account فقط نشانه‌اش را
                  نگه می‌دارد. */}
              <label className="co__opt">
                <input
                  type="checkbox"
                  checked={makeAccount}
                  onChange={(e) => setMakeAccount(e.target.checked)}
                />
                <span>
                  <b>یک حساب برایم بساز</b>
                  <em>تا سفارش‌ها و تحویل‌هایت یک‌جا باشد. با همین ایمیل وارد می‌شوی.</em>
                </span>
              </label>

              {makeAccount && (
                <label className="pdp-input co__pass">
                  <span>رمز عبور</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    dir="ltr"
                    placeholder="حداقل شش نویسه"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={password.length > 0 && !passwordOk(password)}
                  />
                  <button
                    type="button"
                    className="co__eye"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'پنهان کردن رمز' : 'نمایش رمز'}
                  >
                    {showPass ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                  {password && !passwordOk(password) && (
                    <em className="co__err">حداقل شش نویسه.</em>
                  )}
                </label>
              )}

              {/* ---------- بازبینی، همین‌جا ----------

                  صفحه‌ی جدا نداشت که لازم باشد؛ سه چهار سطر است. */}
              <div className="co__review">
                <span className="co__review-h">این‌ها را می‌خری</span>
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
                      <span className="num">{fmt(l.variant.price * l.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---------- درگاه ----------

                  چیپ‌های کوچک، نه صفحه‌ی جدا. انتخاب درگاه تصمیمِ
                  بزرگی نیست و هر سه یک کار می‌کنند. */}
              <div className="co__gatewrap">
                <span className="co__review-h">درگاه پرداخت</span>
                <div className="co__gates" role="radiogroup" aria-label="درگاه پرداخت">
                  {GATEWAYS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      role="radio"
                      aria-checked={gateway === g.id}
                      className={`co__gate ${gateway === g.id ? 'is-on' : ''}`}
                      onClick={() => setGateway(g.id)}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn btn--primary co__pay"
                disabled={!canPay}
                onClick={() => {
                  if (makeAccount) saveAccount({ email, phone, password });
                  else saveAccount({ email, phone });
                  setStep('gateway');
                }}
              >
                <Lock aria-hidden="true" />
                پرداخت <span className="num">{fmt(subtotal)}</span> تومان
              </button>

              {!canPay && (phone || email) && (
                <p className="co__hint">برای ادامه، موبایل و ایمیل را کامل کن.</p>
              )}
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
            {/* «زیر ۱۵ دقیقه» با بقیه‌ی سایت نمی‌خواند — همه‌جای
                دیگر «در اسرع وقت، توسط سیستم» است و همان درست است. */}
            <li><Check aria-hidden="true" />تحویل در اسرع وقت، توسط سیستم</li>
            <li><Check aria-hidden="true" />گارانتی تمام دوره</li>
            <li><Check aria-hidden="true" />رمزِ حسابت را نمی‌خواهیم</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
