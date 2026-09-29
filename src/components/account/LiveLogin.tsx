'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Eye, EyeOff, KeyRound, MessageSquare, RotateCcw } from 'lucide-react';
import { otpOk, phoneOk } from '../../lib/account';
import { BridgeError, requestOtp, verifyOtp } from '../../lib/api/bridge';
import {
  PASSWORD_RULE, fieldErrors, getSession, loginWithOtpToken, loginWithPassword,
  passwordProblem, resetPassword, setPassword,
} from '../../lib/api/account';

/**
 * ورود — نسخه‌ی وصل به پنل (Phoenix Account).
 *
 * سه راه، هر سه با شماره‌ی موبایل:
 *
 *   رمز عبور          شماره + رمز
 *   کدِ پیامکی         شماره → کد → ورود
 *   فراموشیِ رمز       شماره → کد → رمزِ جدید → ورود، و بقیه‌ی
 *                     دستگاه‌ها بیرون می‌افتند
 *
 * ⚠ پیامِ «شماره یا رمز درست نیست» عمداً یکی است؛ نمی‌گوییم این
 * شماره حساب دارد یا نه. و بعد از چند اشتباه، سرور قفل می‌کند.
 *
 * ⚠ لحنِ این صفحه رسمی و محترمانه است («لطفاً … کنید») — به خواسته‌ی
 * کارفرما، برای هر متنی که مشتری می‌خواند.
 */

type Mode = 'password' | 'otp' | 'forgot';
type Stage = 'phone' | 'code' | 'newpass' | 'done';

const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

/** فقط مسیرِ داخلی — ‎?next=‎ نشانیِ بیرونی را به تغییرِ مسیر تبدیل نمی‌کند */
function nextPath(): string {
  if (typeof window === 'undefined') return '';
  const n = new URLSearchParams(window.location.search).get('next') || '';
  return /^\/(?!\/)[\w\-/]*$/.test(n) ? n : '';
}

export function LiveLogin() {
  const [mode, setMode] = useState<Mode>('password');
  const [stage, setStage] = useState<Stage>('phone');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(true);
  const codeRef = useRef<HTMLInputElement>(null);

  const p = toLatin(phone.trim());
  const okPhone = phoneOk(p);
  const problem = pass ? passwordProblem(pass, p) : '';

  /* از قبل وارد است؟ مستقیم به پنل */
  useEffect(() => {
    if (getSession()) window.location.replace(nextPath() || '/account');
  }, []);

  useEffect(() => {
    if (left <= 0) return;
    const t = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [left]);

  useEffect(() => { if (stage === 'code') codeRef.current?.focus(); }, [stage]);

  const switchTo = (m: Mode) => { setMode(m); setStage('phone'); setError(null); setCode(''); setPass(''); setPass2(''); };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) {
      const f = fieldErrors(e);
      setError(f.password || (e instanceof Error ? e.message : 'انجام نشد؛ لطفاً دوباره تلاش کنید.'));
    } finally { setBusy(false); }
  };

  const finish = (withPassword: boolean) => {
    setHasPassword(withPassword);
    const n = nextPath();
    if (n && withPassword) { window.location.replace(n); return; }
    setStage('done');
  };

  const askCode = () => run(async () => {
    const r = await requestOtp(p);
    setLeft(r.ttl || 120);
    setCode('');
    setStage('code');
  });

  const checkCode = () => run(async () => {
    try {
      await verifyOtp(p, toLatin(code.trim()));
    } catch (e) {
      const st = e instanceof BridgeError ? e.status : 0;
      throw new Error(
        st === 410 ? 'کد منقضی شده است. لطفاً کد جدید دریافت کنید.'
          : st === 429 ? 'تعداد تلاش‌ها بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید.'
            : st === 401 ? 'کد واردشده درست نیست.'
              : (e as Error).message,
      );
    }
    if (mode === 'forgot') { setStage('newpass'); return; }
    const r = await loginWithOtpToken();
    finish(r.has_password);
  });

  /* ---------- وارد شد ---------- */
  if (stage === 'done') {
    return (
      <div className="wrap login">
        <div className="login__box login__box--ok">
          <span className="login__tick" aria-hidden="true"><Check /></span>
          <h1>خوش آمدید</h1>
          <p>با موفقیت وارد حساب خود شدید. سفارش‌ها، تحویل‌ها، اشتراک‌ها و تیکت‌های شما در پنل کاربری است.</p>
          {/* بعد از ذخیره هم می‌ماند تا پیامِ «ذخیره شد» دیده شود */}
          {!hasPassword && <SetFirstPassword phone={p} />}
          <div className="club-cta">
            <Link href={nextPath() || '/account'} className="btn btn--primary">{nextPath() ? 'ادامه' : 'ورود به پنل کاربری'}</Link>
            <Link href="/shop" className="btn btn--ghost">ادامه‌ی خرید</Link>
          </div>
        </div>
      </div>
    );
  }

  const passField = (label: string, value: string, set: (v: string) => void, auto: string, invalid?: boolean) => (
    <label className="pdp-input co__pass">
      <span>{label}</span>
      <input
        type={show ? 'text' : 'password'}
        autoComplete={auto}
        dir="ltr"
        value={value}
        maxLength={64}
        onChange={(e) => set(e.target.value)}
        aria-invalid={invalid}
      />
      <button type="button" className="co__eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}>
        {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </label>
  );

  return (
    <div className="wrap login">
      <div className="login__box">
        <h1>{mode === 'forgot' ? 'بازیابی رمز عبور' : 'ورود به حساب کاربری'}</h1>
        <p className="login__lead">
          {mode === 'forgot'
            ? 'یک کد تأیید به شماره‌ی موبایل شما ارسال می‌شود؛ سپس رمز عبور جدید را تعیین می‌کنید و از سایر دستگاه‌ها خارج می‌شوید.'
            : 'لطفاً با شماره‌ی موبایل خود وارد شوید؛ نام کاربری جداگانه لازم نیست.'}
        </p>

        {mode !== 'forgot' ? (
          <div className="login__modes" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'password'} className={`login__mode ${mode === 'password' ? 'is-on' : ''}`} onClick={() => switchTo('password')}>
              <KeyRound aria-hidden="true" />
              رمز عبور
            </button>
            <button type="button" role="tab" aria-selected={mode === 'otp'} className={`login__mode ${mode === 'otp' ? 'is-on' : ''}`} onClick={() => switchTo('otp')}>
              <MessageSquare aria-hidden="true" />
              کد پیامکی
            </button>
          </div>
        ) : (
          <button type="button" className="login__forgot" onClick={() => switchTo('password')}>
            <RotateCcw aria-hidden="true" /> بازگشت به ورود با رمز عبور
          </button>
        )}

        <label className="pdp-input">
          <span>شماره‌ی موبایل</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            dir="ltr"
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            value={phone}
            disabled={stage !== 'phone' && mode !== 'password'}
            onChange={(e) => { setPhone(e.target.value); setStage('phone'); }}
            aria-invalid={phone.length > 0 && !okPhone}
          />
          {phone && !okPhone && <em className="co__err">شماره‌ی موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.</em>}
        </label>

        {/* ---------- رمز ---------- */}
        {mode === 'password' && (
          <form onSubmit={(e) => { e.preventDefault(); if (okPhone && pass) run(async () => { await loginWithPassword(p, pass); finish(true); }); }}>
            {passField('رمز عبور', pass, setPass, 'current-password')}
            <button type="button" className="login__forgot" onClick={() => switchTo('forgot')}>
              رمز عبور خود را فراموش کرده‌اید؟
            </button>
            {error && <p className="co__err login__err" role="alert">{error}</p>}
            <button type="submit" className="btn btn--primary login__go" disabled={!okPhone || !pass || busy}>
              ورود
              <ArrowRight aria-hidden="true" />
            </button>
          </form>
        )}

        {/* ---------- کد (ورود یا فراموشی) ---------- */}
        {mode !== 'password' && stage === 'phone' && (
          <>
            {error && <p className="co__err login__err" role="alert">{error}</p>}
            <button type="button" className="btn btn--primary login__go" disabled={!okPhone || busy} onClick={askCode}>
              ارسال کد تأیید
              <ArrowRight aria-hidden="true" />
            </button>
          </>
        )}

        {mode !== 'password' && stage === 'code' && (
          <form onSubmit={(e) => { e.preventDefault(); if (otpOk(toLatin(code))) checkCode(); }}>
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
              <small>کد به شماره‌ی {p ? <span className="num" dir="ltr">{p.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}</span> : 'شما'} ارسال شد.</small>
            </label>
            <div className="login__resend">
              {left > 0
                ? <span className="num">ارسال دوباره تا {left.toLocaleString('fa-IR')} ثانیه‌ی دیگر</span>
                : <button type="button" onClick={askCode} disabled={busy}>ارسال دوباره‌ی کد</button>}
            </div>
            {error && <p className="co__err login__err" role="alert">{error}</p>}
            <button type="submit" className="btn btn--primary login__go" disabled={!otpOk(toLatin(code)) || busy}>
              {mode === 'forgot' ? 'ادامه' : 'ورود'}
              <ArrowRight aria-hidden="true" />
            </button>
          </form>
        )}

        {/* ---------- رمزِ جدید ---------- */}
        {mode === 'forgot' && stage === 'newpass' && (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (problem || pass !== pass2) return;
            run(async () => { await resetPassword(pass); finish(true); });
          }}>
            <p className="co__note">لطفاً رمز عبور جدید خود را وارد کنید.</p>
            {passField('رمز عبور جدید', pass, setPass, 'new-password', !!problem)}
            {problem ? <em className="co__err">{problem}</em> : <p className="co__note">{PASSWORD_RULE}</p>}
            {passField('تکرار رمز عبور جدید', pass2, setPass2, 'new-password', pass2.length > 0 && pass2 !== pass)}
            {pass2.length > 0 && pass2 !== pass && <em className="co__err">تکرار رمز عبور با رمز بالا یکسان نیست.</em>}
            {error && <p className="co__err login__err" role="alert">{error}</p>}
            <button type="submit" className="btn btn--primary login__go" disabled={!pass || !!problem || pass !== pass2 || busy}>
              ذخیره و ورود
              <ArrowRight aria-hidden="true" />
            </button>
          </form>
        )}

        <p className="login__new">
          حساب کاربری ندارید؟ نیازی به ثبت‌نام جداگانه نیست؛ با <b>کد پیامکی</b> وارد شوید یا هنگام{' '}
          <Link href="/shop">اولین خرید</Link> حساب شما به‌طور خودکار ساخته می‌شود.
        </p>
      </div>
    </div>
  );
}

/**
 * بعد از اولین ورود با کد: تعیینِ رمز عبور — اختیاری.
 * سرور فقط تا پانزده دقیقه بعد از ورود با کد، بی‌رمزِ قبلی قبولش می‌کند.
 */
function SetFirstPassword({ phone }: { phone: string }) {
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const problem = pass ? passwordProblem(pass, phone) : '';

  if (ok) return <p className="co__note">رمز عبور شما ذخیره شد. از این پس می‌توانید با شماره‌ی موبایل و رمز عبور نیز وارد شوید.</p>;

  return (
    <form
      className="login__setpass"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!pass || problem) return;
        setBusy(true);
        setError(null);
        try { await setPassword({ password: pass }); setOk(true); } catch (err) {
          setError(fieldErrors(err).password || (err instanceof Error ? err.message : 'انجام نشد؛ لطفاً دوباره تلاش کنید.'));
        } finally { setBusy(false); }
      }}
    >
      <b>تعیین رمز عبور</b>
      <span className="co__note">لطفاً رمز عبور خود را وارد کنید تا دفعه‌ی بعد بدون کد پیامکی وارد شوید. این مرحله اختیاری است.</span>
      <label className="pdp-input co__pass">
        <span>رمز عبور</span>
        <input type={show ? 'text' : 'password'} autoComplete="new-password" dir="ltr" maxLength={64} value={pass} onChange={(e) => setPass(e.target.value)} aria-invalid={!!problem} />
        <button type="button" className="co__eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}>
          {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </label>
      {problem ? <em className="co__err">{problem}</em> : <small className="co__note">{PASSWORD_RULE}</small>}
      {error && <p className="co__err" role="alert">{error}</p>}
      <button type="submit" className="btn btn--ghost btn--sm" disabled={!pass || !!problem || busy}>ذخیره‌ی رمز عبور</button>
    </form>
  );
}
