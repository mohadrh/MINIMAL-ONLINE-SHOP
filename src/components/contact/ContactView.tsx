'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, Clock,
  KeyRound, LifeBuoy, MessageCircle, PackageSearch, Send, ShieldCheck,
} from 'lucide-react';
import { HELP_ARTICLES } from '../../data/helpArticles';
import { getOrder } from '../../lib/orders';
import { ORDERS, ORDER_STATUS_META } from '../../data/account';
import { SUPPORT_TELEGRAM, supportLink } from '../../lib/chatAnswers';

/**
 * تماس با ما — مسیریاب، نه فهرستِ راه‌ها.
 *
 * ⚠ نسخه‌ی قبلی سه راه را کنارِ هم می‌چید و می‌گفت «تفاوتشان در
 * سرعت جواب است». درست بود ولی کارِ اصلی را به کاربر می‌سپرد:
 * خودش باید می‌فهمید مشکلش از کدام جنس است و کدام راه برایش
 * می‌ارزد.
 *
 * ولی کسی که این صفحه را باز می‌کند یک مشکلِ *مشخص* دارد، نه
 * کنجکاویِ عمومی. و بیشترِ آن مشکل‌ها اصلاً تماس لازم ندارند:
 * «سفارشم نرسیده» جوابش وضعیتِ همان سفارش است، «چطور فعال کنم»
 * جوابش یک مقاله است.
 *
 * پس ترتیب برعکس شد: **اول جواب، بعد تماس.**
 *
 *   ۱ کاربر می‌گوید مشکلش چیست
 *   ۲ همان‌جا جوابِ آماده یا ابزارِ لازم را می‌گیرد
 *   ۳ اگر کافی نبود، راهِ تماسِ *مناسبِ همان مشکل* پیشنهاد می‌شود
 *
 * ⚠ و یک قید که این را از «مسیریابِ تزئینی» جدا می‌کند: هر گام
 * واقعاً کار می‌کند. پیگیریِ سفارش همین‌جا سفارش را پیدا می‌کند،
 * نه اینکه به صفحه‌ی دیگری بفرستد.
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* ---------------------------------------------------------------
   مسیرها

   ⚠ ترتیب از روی فراوانیِ واقعیِ پشتیبانی است، نه الفبا.

   «سفارشم نرسیده» و «چطور فعال کنم» بیشترِ تیکت‌ها را می‌سازند،
   پس اول می‌آیند. «شکایت» آخر است — نه چون کم‌اهمیت است، بلکه
   چون کسی که شکایت دارد معمولاً اول یکی از بالایی‌ها را امتحان
   کرده.
--------------------------------------------------------------- */

type RouteId = 'order' | 'activate' | 'before' | 'refund' | 'complaint';

const ROUTES: { id: RouteId; icon: typeof PackageSearch; label: string; hint: string }[] = [
  { id: 'order',     icon: PackageSearch, label: 'سفارشم نرسیده',        hint: 'یا وضعیتش را نمی‌دانم' },
  { id: 'activate',  icon: KeyRound,      label: 'چطور فعالش کنم',       hint: 'اکانت یا کد را گرفته‌ام' },
  { id: 'before',    icon: MessageCircle, label: 'سوال پیش از خرید',     hint: 'کدام پلن، موجود هست؟' },
  { id: 'refund',    icon: ShieldCheck,   label: 'گارانتی و بازگشت وجه', hint: 'مشکلی پیش آمده' },
  { id: 'complaint', icon: AlertCircle,   label: 'شکایت',                hint: 'جوابی که گرفتم قانعم نکرد' },
];

/** پیگیریِ سفارش، همین‌جا — نه با فرستادن به صفحه‌ی دیگر */
function OrderLookup() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<
    { ok: true; label: string; when: string; total: number; lines: string[] } | { ok: false } | null
  >(null);

  const lookup = (e: React.FormEvent) => {
    e.preventDefault();
    const key = code.trim().toUpperCase();
    if (!/^PHX-?\d{6}$/.test(key)) { setResult({ ok: false }); return; }
    const norm = key.replace(/^PHX-?/, 'PHX-');

    /* سفارشِ واقعیِ همین مرورگر، وگرنه نمونه‌ها — همان ترتیبی که
       چت هم دارد، تا دو جا دو جوابِ متفاوت ندهند. */
    const real = getOrder(norm);
    if (real) {
      setResult({
        ok: true,
        label: ORDER_STATUS_META[real.status]?.label ?? real.status,
        when: new Date(real.createdAt).toLocaleDateString('fa-IR'),
        total: real.payable,
        lines: real.items.map((i) => `${i.title} — ${i.variantLabel}`),
      });
      return;
    }
    const demo = ORDERS.find((o) => o.id.toUpperCase() === norm);
    setResult(demo
      ? {
        ok: true,
        label: ORDER_STATUS_META[demo.status]?.label ?? demo.status,
        when: demo.createdAt,
        total: demo.total,
        lines: demo.lines.map((l) => `${l.productTitle} — ${l.variantLabel}`),
      }
      : { ok: false });
  };

  return (
    <form className="ctc__lookup" onSubmit={lookup}>
      <label htmlFor="ctc-code">کد پیگیری سفارش</label>
      <div className="ctc__lookup-row">
        <input
          id="ctc-code"
          value={code}
          onChange={(e) => { setCode(e.target.value); setResult(null); }}
          placeholder="PHX-123456"
          inputMode="text"
          autoComplete="off"
          aria-describedby="ctc-code-hint"
        />
        <button type="submit" className="btn btn--primary btn--sm">پیدا کن</button>
      </div>
      <small id="ctc-code-hint">در ایمیل تأیید سفارش و در پنل کاربری هست.</small>

      {/* ⚠ ‎aria-live‎ لازم است: نتیجه بدونِ تغییرِ صفحه ظاهر
          می‌شود و صفحه‌خوان خودش متوجهش نمی‌شود. */}
      <div className="ctc__lookup-out" aria-live="polite">
        {result?.ok === true && (
          <div className="ctc__found">
            <CheckCircle2 aria-hidden="true" />
            <div>
              <b>{result.label}</b>
              <p>
                {result.when} · {fmt(result.total)} تومان
                <br />
                {result.lines.join(' · ')}
              </p>
              <Link href="/account" className="btn btn--ghost btn--sm">دیدن در پنل کاربری</Link>
            </div>
          </div>
        )}
        {result?.ok === false && (
          <div className="ctc__missing" role="alert">
            <AlertCircle aria-hidden="true" />
            <div>
              <b>با این کد سفارشی پیدا نشد</b>
              <p>
                قالبش ‎PHX-‎ است و شش رقم. اگر تازه پرداخت کرده‌ای چند لحظه بعد
                دوباره امتحان کن، یا همین کد را برای پشتیبانی بفرست.
              </p>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

/* محتوای هر مسیر: جوابِ آماده + کاری که همان‌جا می‌شود کرد */
function RoutePanel({ id }: { id: RouteId }) {
  const article = useMemo(
    () => HELP_ARTICLES.find((a) => a.keywords?.some((k) => ['فعال', 'تحویل', 'گارانتی'].includes(k))),
    [],
  );

  if (id === 'order') {
    return (
      <>
        <p className="ctc__panel-lead">
          سریع‌ترین جواب، خودِ وضعیتِ سفارش است. کدت را بزن تا همین‌جا ببینیش —
          اگر «در صف تحویل» بود یعنی همه‌چیز عادی است و کاری لازم نیست.
        </p>
        <OrderLookup />
      </>
    );
  }

  if (id === 'activate') {
    return (
      <>
        <p className="ctc__panel-lead">
          روش فعال‌سازی برای هر محصول در صفحه‌ی خودش نوشته شده، و کدها و
          مشخصات اکانت‌هایت در «محفظه»ی پنل کاربری می‌مانند.
        </p>
        <div className="ctc__panel-acts">
          <Link href="/account" className="btn btn--primary btn--sm">رفتن به محفظه</Link>
          <Link href="/guide" className="btn btn--ghost btn--sm">راهنمای خرید و فعال‌سازی</Link>
          {article && <Link href="/faq" className="btn btn--ghost btn--sm">سوالات متداول</Link>}
        </div>
      </>
    );
  }

  if (id === 'before') {
    return (
      <>
        <p className="ctc__panel-lead">
          برای «کدام پلن به کارم می‌آید» و «موجود هست؟» چت آنلاین از همه سریع‌تر
          است — همان‌جا و بدون ثبت تیکت.
        </p>
        <div className="ctc__panel-acts">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => window.dispatchEvent(new Event('phoenix:chat-open'))}
          >
            باز کردن چت آنلاین
          </button>
          <Link href="/shop" className="btn btn--ghost btn--sm">دیدن محصولات</Link>
        </div>
      </>
    );
  }

  if (id === 'refund') {
    return (
      <>
        <p className="ctc__panel-lead">
          گارانتی تمام دوره است: اگر وسط دوره مشکلی پیش بیاید جایگزین می‌کنیم یا
          مبلغ برمی‌گردد. برای این کار شماره‌ی سفارش لازم است، پس تیکت بهترین راه
          است — آن‌جا سفارشت جلوی چشممان است.
        </p>
        <div className="ctc__panel-acts">
          <Link href="/account" className="btn btn--primary btn--sm">ثبت تیکت</Link>
          <Link href="/rules" className="btn btn--ghost btn--sm">شرایط کامل گارانتی</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="ctc__panel-lead">
        اگر جوابی که گرفته‌ای قانعت نکرده، مسیر شکایت جداست و هزینه‌ای ندارد.
        همان‌جا خارج از نوبتِ عادی بررسی می‌شود.
      </p>
      <div className="ctc__panel-acts">
        <Link href="/complaint" className="btn btn--primary btn--sm">ثبت شکایت</Link>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------
   راه‌های تماس

   ⚠ زمانِ جواب نوشته شده، و این عمدی است.

   «به‌زودی جواب می‌دهیم» هیچ چیزی نمی‌گوید و انتظار را بی‌مرز
   می‌کند. عددِ صادقانه — حتی اگر کُند باشد — بهتر از وعده‌ی مبهم
   است، چون کاربر می‌داند کِی باید پیگیری کند.
--------------------------------------------------------------- */

const CHANNELS = [
  {
    icon: MessageCircle,
    t: 'چت آنلاین',
    when: 'همین حالا',
    d: 'برای سوال‌های کوتاهِ پیش از خرید. اگر جوابش را نداشته باشد، خودش به کارشناس وصل می‌کند.',
    action: 'chat' as const,
  },
  {
    icon: LifeBuoy,
    t: 'تیکت پشتیبانی',
    when: 'همان روز',
    d: 'برای هر چیزی که به سفارشِ مشخصی مربوط است — شماره‌ی سفارش همان‌جا جلوی چشم ماست.',
    href: '/account',
  },
  {
    icon: Send,
    t: 'تلگرام',
    when: 'ساعات کاری',
    d: 'اگر ترجیح می‌دهی بیرون از سایت بپرسی. سوالت را از همین‌جا با خودت ببر.',
    href: supportLink('سلام، سوالی دارم.'),
    external: true,
  },
];

export function ContactView() {
  const [open, setOpen] = useState<RouteId | null>(null);
  const [faq, setFaq] = useState<string | null>(null);

  return (
    <>
      <header className="section ctc__head">
        <div className="wrap">
          <span className="sec-head__kicker">پشتیبانی فونیکس شاپ</span>
          <h1>چه کمکی از دستمان برمی‌آید؟</h1>
          <p className="ctc__lead">
            بیشترِ سوال‌ها جوابِ آماده دارند و همین‌جا حل می‌شوند. اگر نشد،
            راهِ رسیدن به یک آدم را نشانت می‌دهیم.
          </p>
        </div>
      </header>

      {/* ---------- مسیریاب ---------- */}
      <section className="section section--tint" aria-labelledby="ctc-router">
        <div className="wrap">
          <div className="sec-head sec-head--mid">
            <h2 id="ctc-router">مشکلت از کدام جنس است؟</h2>
          </div>

          <div className="ctc__routes">
            {ROUTES.map(({ id, icon: Icon, label, hint }) => {
              const on = open === id;
              return (
                <div key={id} className={`ctc__route ${on ? 'is-on' : ''}`}>
                  <button
                    type="button"
                    className="ctc__route-btn"
                    aria-expanded={on}
                    aria-controls={`ctc-panel-${id}`}
                    onClick={() => setOpen(on ? null : id)}
                  >
                    <span className="ctc__route-ico" aria-hidden="true"><Icon /></span>
                    <span className="ctc__route-txt">
                      <b>{label}</b>
                      <small>{hint}</small>
                    </span>
                    <ChevronDown className="ctc__route-chev" aria-hidden="true" />
                  </button>

                  {on && (
                    <div className="ctc__panel" id={`ctc-panel-${id}`}>
                      <RoutePanel id={id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- راه‌های تماس ---------- */}
      <section className="section" aria-labelledby="ctc-ch">
        <div className="wrap">
          <div className="sec-head sec-head--mid">
            <h2 id="ctc-ch">اگر جوابت را نگرفتی</h2>
            <p className="sec-head__lead">
              هر سه به یک تیم می‌رسد. تفاوتشان در سرعت است، نه در اینکه چه کسی
              جواب می‌دهد.
            </p>
          </div>

          <div className="ctc__channels">
            {CHANNELS.map((c) => (
              <div key={c.t} className="ctc__ch">
                <span className="ctc__ch-ico" aria-hidden="true"><c.icon /></span>
                <b>{c.t}</b>
                <span className="ctc__ch-when">
                  <Clock aria-hidden="true" />
                  {c.when}
                </span>
                <p>{c.d}</p>
                {c.action === 'chat' ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => window.dispatchEvent(new Event('phoenix:chat-open'))}
                  >
                    باز کردن چت
                  </button>
                ) : c.external ? (
                  <a href={c.href} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                    @{SUPPORT_TELEGRAM}
                  </a>
                ) : (
                  <Link href={c.href!} className="btn btn--ghost btn--sm">ثبت تیکت</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- سوال‌های پرتکرار ---------- */}
      <section className="section section--tint" aria-labelledby="ctc-faq">
        <div className="wrap ctc__faq">
          <div className="sec-head sec-head--mid">
            <h2 id="ctc-faq">پیش از تماس، این‌ها را ببین</h2>
          </div>

          {HELP_ARTICLES.slice(0, 5).map((a) => (
            <div key={a.id} className="ctc__q">
              <button
                type="button"
                aria-expanded={faq === a.id}
                onClick={() => setFaq(faq === a.id ? null : a.id)}
              >
                <b>{a.title}</b>
                <ChevronDown aria-hidden="true" />
              </button>
              {faq === a.id && <p>{a.answer}</p>}
            </div>
          ))}

          <Link href="/faq" className="btn btn--ghost btn--sm ctc__faq-all">
            دیدن همه‌ی سوال‌ها
            <ArrowLeft aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ---------- اطلاعات ثبتی ---------- */}
      <section className="section">
        <div className="wrap ctc__notes">
          {/* ⚠ هشدارِ «رمز عبورت را نمی‌پرسیم» این‌جا بود و برداشته شد.

              کارفرما گفت: «خب معلومه که نمی‌پرسیم، لازم نیست بگی» — و
              حق دارد. هشداری که کسی نپرسیده، شکی را مطرح می‌کند که
              خواننده نداشت. جوابِ این سوال هنوز هست، ولی فقط جایی که
              خودِ مشتری بپرسد: در چت (کلیدواژه‌ی «رمز/امن») و در
              پرسش‌های پرتکرارِ محصول.

          ⚠ چیزی که نداریم را ادعا نمی‌کنیم.

              نشانی، تلفن ثابت و نماد اعتماد هنوز از کارفرما نرسیده‌اند.
              گذاشتنِ جای خالی صادقانه‌تر از ساختنِ شماره‌ی الکی است، و
              همین که رسیدند جایشان معلوم است. */}
          <article className="ctc__note">
            <div>
              <h2>اطلاعات ثبتی</h2>
              <p>
                نشانی، شماره‌ی تماس ثابت و نماد اعتماد الکترونیکی به‌محض نهایی شدن
                در همین بخش قرار می‌گیرند.
              </p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
