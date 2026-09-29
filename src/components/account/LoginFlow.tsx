'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Eye, EyeOff, KeyRound, MessageSquare } from 'lucide-react';
import {
  getAccount, otpOk, phoneOk, requestOtp, verifyOtp, type OtpResult,
} from '../../lib/account';

/**
 * ورود.
 *
 * دو راه، و هر دو با شماره‌ی موبایل شروع می‌شوند — چون موبایل
 * شناسه‌ی حساب است و یوزرنیمِ جدایی وجود ندارد:
 *
 *   رمز عبور        — برای کسی که یادش هست
 *   کد یک‌بارمصرف   — برای کسی که یادش نیست، یا اصلاً نمی‌خواهد
 *                      رمز بزند
 *
 * «فراموشی رمز» صفحه‌ی جدا ندارد و عمداً: در این بازار، بازیابیِ
 * رمز *همان* کد پیامکی است. یک صفحه‌ی جدا ساختن برای چیزی که
 * دکمه‌ی کناری‌اش همان کار را می‌کند، فقط یک قدم اضافه است — پس
 * «رمزم را فراموش کرده‌ام» مستقیم می‌رود به همان کد یک‌بارمصرف.
 *
 * ⚠ این احراز هویت نیست. سرویس پیامکی وصل نیست و کد در همین
 * مرورگر ساخته می‌شود، پس روی صفحه نشانش می‌دهیم تا فلو قابل
 * امتحان باشد. همین که سرویس واقعی آمد، آن جعبه‌ی زرد حذف می‌شود.
 */

type Mode = 'password' | 'otp';
type Stage = 'phone' | 'code' | 'done';

const ERRORS: Record<Exclude<OtpResult, 'ok'>, string> = {
  wrong: 'کد واردشده درست نیست. لطفاً دوباره تلاش کنید.',
  expired: 'کد منقضی شده است. لطفاً کد جدید دریافت کنید.',
  'too-many': 'تعداد تلاش‌ها بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید.',
  none: 'لطفاً ابتدا کد تأیید را درخواست کنید.',
};

export function LoginFlow() {
  const [mode, setMode] = useState<Mode>('password');
  const [stage, setStage] = useState<Stage>('phone');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  /* کدِ شبیه‌سازی‌شده و ثانیه‌های باقی‌مانده */
  const [sent, setSent] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [left]);

  useEffect(() => { if (stage === 'code') codeRef.current?.focus(); }, [stage]);

  const okPhone = phoneOk(phone);
  const acc = getAccount();

  /* ⚠ حالا ناهمگام است چون ممکن است به سرور برود.

     وقتی بک‌اند وصل باشد، کد از سرور می‌آید و به مرورگر
     برنمی‌گردد؛ setSent خالی می‌ماند و صفحه هم چیزی نشان
     نمی‌دهد. تا آن روز، شبیه‌سازی همان کد را برمی‌گرداند. */
  const [busy, setBusy] = useState(false);

  const askCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const { code: c, expiresAt } = await requestOtp(phone);
      setSent(c);
      setLeft(Math.round((expiresAt - Date.now()) / 1000));
      setCode('');
      setStage('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ارسال کد انجام نشد.');
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'done') {
    return (
      <div className="wrap login">
        <div className="login__box login__box--ok">
          <span className="login__tick" aria-hidden="true"><Check /></span>
          <h1>خوش آمدید</h1>
          <p>با موفقیت وارد حساب خود شدید. سفارش‌ها، تحویل‌ها و تیکت‌های شما در پنل کاربری است.</p>
          <div className="club-cta">
            <Link href="/account" className="btn btn--primary">ورود به پنل کاربری</Link>
            <Link href="/shop" className="btn btn--ghost">ادامه‌ی خرید</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap login">
      <div className="login__box">
        <h1>ورود به حساب کاربری</h1>
        <p className="login__lead">
          لطفاً با شماره‌ی موبایل خود وارد شوید؛ نام کاربری جداگانه لازم نیست.
        </p>

        {/* ---------- انتخاب راه ---------- */}
        <div className="login__modes" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'password'}
            className={`login__mode ${mode === 'password' ? 'is-on' : ''}`}
            onClick={() => { setMode('password'); setStage('phone'); setError(null); }}
          >
            <KeyRound aria-hidden="true" />
            رمز عبور
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'otp'}
            className={`login__mode ${mode === 'otp' ? 'is-on' : ''}`}
            onClick={() => { setMode('otp'); setStage('phone'); setError(null); }}
          >
            <MessageSquare aria-hidden="true" />
            کد پیامکی
          </button>
        </div>

        <label className="pdp-input">
          <span>شماره‌ی موبایل</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            dir="ltr"
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setStage('phone'); }}
            aria-invalid={phone.length > 0 && !okPhone}
          />
          {phone && !okPhone && <em className="co__err">شماره‌ی موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.</em>}
        </label>

        {/* ---------- راه یک: رمز ---------- */}
        {mode === 'password' && (
          <>
            <label className="pdp-input co__pass">
              <span>رمز عبور</span>
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="co__eye"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPass ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </label>

            {/* بازیابیِ رمز صفحه‌ی جدا ندارد — همان کد پیامکی است */}
            <button
              type="button"
              className="login__forgot"
              onClick={() => { setMode('otp'); setError(null); if (okPhone) askCode(); }}
            >
              رمز عبور خود را فراموش کرده‌اید؟
            </button>

            {error && <p className="co__err login__err">{error}</p>}

            <button
              type="button"
              className="btn btn--primary login__go"
              disabled={!okPhone || password.length === 0}
              onClick={() => {
                /* بدون بک‌اند، رمز با چیزی سنجیده نمی‌شود. تنها
                   چیزی که می‌دانیم این است که این مرورگر حسابی با
                   همین شماره ساخته یا نه. */
                if (!acc || acc.phone !== phone.trim()) {
                  setError('حسابی با این شماره روی این دستگاه پیدا نشد. لطفاً با کد پیامکی وارد شوید.');
                  return;
                }
                setStage('done');
              }}
            >
              ورود
              <ArrowRight aria-hidden="true" />
            </button>
          </>
        )}

        {/* ---------- راه دو: کد یک‌بارمصرف ---------- */}
        {mode === 'otp' && (
          <>
            {stage === 'phone' ? (
              <button
                type="button"
                className="btn btn--primary login__go"
                disabled={!okPhone || busy}
                onClick={askCode}
              >
                ارسال کد تأیید
                <ArrowRight aria-hidden="true" />
              </button>
            ) : (
              <>
                <label className="pdp-input">
                  <span>کد تأیید شش‌رقمی</span>
                  <input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    maxLength={6}
                    placeholder="------"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(null); }}
                  />
                </label>

                {/* ⚠ فقط تا وقتی سرویس پیامک وصل نیست */}
                {sent && (
                  <p className="login__sim">
                    <b>حالت آزمایشی:</b> سامانه‌ی پیامک هنوز متصل نیست؛ به همین دلیل کد در
                    این‌جا نمایش داده می‌شود: <span className="num" dir="ltr">{sent}</span>
                  </p>
                )}

                <div className="login__resend">
                  {left > 0 ? (
                    <span className="num">ارسال دوباره تا {left.toLocaleString('fa-IR')} ثانیه‌ی دیگر</span>
                  ) : (
                    <button type="button" onClick={askCode} disabled={busy}>ارسال دوباره‌ی کد</button>
                  )}
                </div>

                {error && <p className="co__err login__err">{error}</p>}

                <button
                  type="button"
                  className="btn btn--primary login__go"
                  disabled={!otpOk(code) || busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await verifyOtp(phone, code);
                      if (r === 'ok') { setStage('done'); return; }
                      setError(ERRORS[r]);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  ورود
                  <ArrowRight aria-hidden="true" />
                </button>
              </>
            )}
          </>
        )}

        <p className="login__new">
          حساب کاربری ندارید؟ نیازی به ثبت‌نام جداگانه نیست؛ هنگام{' '}
          <Link href="/shop">اولین خرید</Link> حساب شما به‌طور خودکار ساخته می‌شود.
        </p>
      </div>
    </div>
  );
}
