'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award, Bookmark, Copy, Eye, EyeOff, Gift, KeyRound, LifeBuoy, Package,
  Repeat, ShieldCheck, Smartphone, User, Wallet,
} from 'lucide-react';
import {
  ORDERS, ORDER_STATUS_META, PROFILE, SUBSCRIPTIONS,
  SUBSCRIPTION_DAYS_LEFT, SUBSCRIPTION_PROGRESS,
  VAULT, WALLET_TX, WALLET_TX_META,
} from '../../data/account';
import { listOrders } from '../../lib/orders';
import { listTickets, type Ticket } from '../../lib/tickets';

const fmt = (n: number) => n.toLocaleString('fa-IR');

type Tab =
  | 'orders' | 'vault' | 'subs' | 'wallet'
  | 'tickets' | 'saved' | 'club' | 'refer' | 'security' | 'profile';

/** شکل مشترکی که هر دو منبع سفارش به آن ترجمه می‌شوند */
interface Row {
  key: string;
  code: string;
  status: string;
  createdAt: string;
  total: number;
  lines: { title: string; variantLabel: string; quantity: number; price: number }[];
}

/* بخش‌ها در سه گروه.

   الگو از پنل نمونه: منوی کناری‌شان گروه‌بندی‌شده است، نه یک فهرست
   بلندِ تخت. ترتیب گروه‌ها هم بی‌دلیل نیست — «خریدهای من» اول است
   چون بیشترین دلیلِ باز کردن پنل همان است. */
const GROUPS: { title: string; items: { id: Tab; label: string; icon: React.ReactNode; badge?: string }[] }[] = [
  {
    title: 'خریدهای من',
    items: [
      { id: 'orders', label: 'سفارش‌ها',        icon: <Package /> },
      { id: 'vault',  label: 'تحویل‌ها',        icon: <KeyRound /> },
      { id: 'subs',   label: 'اشتراک‌های فعال', icon: <Repeat /> },
      { id: 'saved',  label: 'نشان‌شده‌ها',      icon: <Bookmark /> },
    ],
  },
  {
    title: 'مالی',
    items: [
      { id: 'wallet', label: 'کیف پول',        icon: <Wallet /> },
      { id: 'club',   label: 'باشگاه مشتریان', icon: <Award /> },
      { id: 'refer',  label: 'معرفی دوستان',   icon: <Gift /> },
    ],
  },
  {
    title: 'حساب',
    items: [
      { id: 'tickets',  label: 'پشتیبانی و تیکت', icon: <LifeBuoy /> },
      { id: 'security', label: 'امنیت حساب',      icon: <ShieldCheck /> },
      { id: 'profile',  label: 'اطلاعات من',      icon: <User /> },
    ],
  },
];

const ALL_TABS = GROUPS.flatMap((g) => g.items);

/* پله‌های باشگاه — از کم به زیاد، تا نردبان خوانده شود */
const TIERS: { id: string; label: string; from: number; perk: string }[] = [
  { id: 'bronze',  label: 'برنزی',  from: 0,    perk: 'پشتیبانی استاندارد' },
  { id: 'silver',  label: 'نقره‌ای', from: 500,  perk: '۳٪ کش‌بک روی هر خرید' },
  { id: 'gold',    label: 'طلایی',  from: 2000, perk: '۵٪ کش‌بک و تحویل اولویت‌دار' },
  { id: 'phoenix', label: 'ققنوس',  from: 5000, perk: '۸٪ کش‌بک و پشتیبانی اختصاصی' },
];

const REFER_CODE = 'PHX-MOHA-2405';

const SECURITY: { title: string; note: string; ok: boolean }[] = [
  { title: 'تأیید شماره‌ی موبایل', note: 'با پیامک تأیید شده', ok: true },
  { title: 'ورود دومرحله‌ای',      note: 'هنوز فعال نشده — توصیه می‌کنیم فعالش کنی', ok: false },
  { title: 'ایمیل بازیابی',        note: 'برای بازگرداندن حساب اگر شماره را از دست دادی', ok: false },
];

/**
 * پنل کاربری.
 *
 * پنج بخش، به ترتیبی که کاربر واقعاً سراغشان می‌آید. «سفارش‌ها»
 * اول است چون بیشترین دلیلِ باز کردن پنل، دیدن وضعیت یک سفارش
 * است؛ «حساب من» آخر است چون کسی روزی یک بار پروفایلش را نگاه
 * نمی‌کند.
 *
 * سفارش‌های واقعیِ همین مرورگر بالای سفارش‌های نمونه می‌آیند. تا
 * وقتی بک‌اند نیست، کسی که همین حالا خرید کرده باید خریدش را
 * اینجا ببیند، وگرنه پنل دروغ می‌گوید.
 */
export function AccountView() {
  const [tab, setTab] = useState<Tab>('orders');
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  /* تیکت‌ها هم مثل سفارش‌ها فقط در مرورگر وجود دارند، پس بعد از
     سوار شدن خوانده می‌شوند نه در رندر. */
  useEffect(() => { setTickets(listTickets()); }, []);

  /* دو منبع سفارش داریم و شکلشان یکی نیست: سفارش‌های نمونه در
     data/account با `id/total/productTitle` و سفارش‌های واقعیِ
     همین مرورگر در lib/orders با `code/payable/title`.

     به‌جای اینکه رابط هر دو را بشناسد، هر دو به یک شکل مشترک
     ترجمه می‌شوند. اگر روزی بک‌اند آمد، فقط همین یک تابع عوض
     می‌شود نه کل صفحه. */
  /* سفارش‌های مرورگر بعد از سوار شدن خوانده می‌شوند، نه در رندر.

     نسخه‌ی اول localStorage را داخل useMemo می‌خواند و چون useMemo
     سمت سرور هم اجرا می‌شود، سرور صفر سفارش می‌ساخت و مرورگر چند
     تا — خطای hydration. هر چیزی که فقط در مرورگر وجود دارد باید
     بعد از اولین رندر بیاید. */
  const [mine, setMine] = useState<Row[]>([]);

  useEffect(() => {
    setMine(listOrders().map((o) => ({
      key: o.code,
      code: o.code,
      status: o.status,
      createdAt: new Date(o.createdAt).toLocaleDateString('fa-IR'),
      total: o.payable,
      lines: o.items.map((i) => ({
        title: i.title,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
        price: i.price,
      })),
    })));
  }, []);

  const orders = useMemo<Row[]>(() => {
    const sample: Row[] = ORDERS.map((o) => ({
      key: o.id,
      code: o.id,
      status: o.status,
      createdAt: o.createdAt,
      total: o.total,
      lines: o.lines.map((l) => ({
        title: l.productTitle,
        variantLabel: l.variantLabel,
        quantity: l.quantity,
        price: l.price,
      })),
    }));

    const seen = new Set(mine.map((m) => m.code));
    return [...mine, ...sample.filter((s) => !seen.has(s.code))];
  }, [mine]);

  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>پنل کاربری</h1>
          <p className="sec-head__lead">
            سفارش‌ها، تحویل‌ها و اشتراک‌های فعالت، یک‌جا.
          </p>
        </div>
      </header>

      <div className="wrap acc">
        {/* مِشِ محیطی — شیشه چیزی برای شکستن لازم دارد.

            روی زمینه‌ی تخت، هرچقدر هم blur بدهی، شیشه دیده نمی‌شود.
            این چهار لکه‌ی خیلی کم‌رنگ فقط برای همین‌اند و هیچ‌کدام
            به تنهایی قابل تشخیص نیستند. */}
        <div className="acc__mesh" aria-hidden="true" />

        {/* ---------- کارت خلاصه ---------- */}
        <div className="acc__hero">
          <div className="acc__who">
            <span className="acc__avatar" aria-hidden="true">
              {PROFILE.name.trim().charAt(0)}
            </span>
            <div>
              <b>{PROFILE.name}</b>
              <span className="num">{PROFILE.phone}</span>
            </div>
          </div>

          <dl className="acc__stats">
            <div>
              <dt>سطح</dt>
              <dd>{PROFILE.tierLabel}</dd>
            </div>
            <div>
              <dt>موجودی کیف پول</dt>
              <dd className="num">{fmt(PROFILE.walletBalance)} تومان</dd>
            </div>
            <div>
              <dt>مجموع خرید</dt>
              <dd className="num">{fmt(PROFILE.totalSpent)} تومان</dd>
            </div>
            <div>
              <dt>امتیاز</dt>
              <dd className="num">{fmt(PROFILE.points)}</dd>
            </div>
          </dl>
        </div>

        <div className="acc__body">
          {/* نوار کناری — الگو از پنل نمونه.

              روی موبایل به ریل افقیِ اسکرول‌شونده تبدیل می‌شود؛
              ستون عمودی روی عرض کم، نصف صفحه را می‌خورد. */}
          <nav className="acc__side" role="tablist" aria-label="بخش‌های پنل">
            {GROUPS.map((g) => (
              <div key={g.title} className="acc__side-group">
                <span className="acc__side-title">{g.title}</span>
                {g.items.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    className={`acc__side-item ${tab === t.id ? 'is-on' : ''}`}
                    onClick={() => setTab(t.id)}
                  >
                    <span className="acc__side-icon" aria-hidden="true">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="acc__main">

        {/* ---------- سفارش‌ها ---------- */}
        {tab === 'orders' && (
          <div className="acc__list">
            {orders.length === 0 && (
              <p className="shop__empty">
                هنوز سفارشی نداری. <Link href="/shop">از فروشگاه شروع کن</Link>.
              </p>
            )}
            {orders.map((o) => {
              const meta = ORDER_STATUS_META[o.status as keyof typeof ORDER_STATUS_META];
              return (
                <article key={o.key} className="acc__order">
                  <header>
                    <div>
                      <span className="acc__label">کد پیگیری</span>
                      <b className="num" dir="ltr">{o.code}</b>
                    </div>
                    <span className={`pill acc__status acc__status--${meta?.tone ?? 'muted'}`}>
                      {meta?.label ?? o.status}
                    </span>
                  </header>

                  <ul className="acc__lines">
                    {o.lines.map((l, i) => (
                      <li key={i}>
                        <span>{l.title} — {l.variantLabel}</span>
                        <span className="num">{fmt(l.price * l.quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  <footer>
                    <span className="acc__date">{o.createdAt}</span>
                    <b className="num">{fmt(o.total)} تومان</b>
                    <Link href={`/track?code=${encodeURIComponent(o.code)}`} className="btn btn--ghost btn--sm">
                      پیگیری
                    </Link>
                  </footer>
                </article>
              );
            })}
          </div>
        )}

        {/* ---------- تحویل‌ها ---------- */}
        {tab === 'vault' && (
          <div className="acc__list">
            {VAULT.map((v) => (
              <article key={v.id} className="acc__order" style={{ ['--accent' as string]: v.accent }}>
                <header>
                  <div>
                    <b>{v.productTitle}</b>
                    <span className="acc__label">{v.variantLabel}</span>
                  </div>
                  <span className="acc__date">تحویل {v.deliveredAt}</span>
                </header>

                {/* اطلاعات حساس پیش‌فرض پنهان است.

                    کسی ممکن است این صفحه را در جمع باز کند یا صفحه‌اش
                    را به اشتراک بگذارد؛ رمزِ همیشه‌روشن یعنی لو رفتن
                    بدون اینکه کسی تصمیمی گرفته باشد. */}
                <ul className="acc__secrets">
                  {v.secrets.map((sc, i) => {
                    const k = `${v.id}-${i}`;
                    const open = shown[k] || !sc.masked;
                    return (
                      <li key={i}>
                        <span className="acc__label">{sc.label}</span>
                        <code dir="ltr">{open ? sc.value : '•'.repeat(Math.min(sc.value.length, 16))}</code>
                        {sc.masked && (
                          <button
                            type="button"
                            className="acc__eye"
                            aria-label={open ? `پنهان کردن ${sc.label}` : `نمایش ${sc.label}`}
                            onClick={() => setShown((s) => ({ ...s, [k]: !s[k] }))}
                          >
                            {open ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <footer>
                  <span className="acc__date">گارانتی تا {v.warrantyEndsAt}</span>
                </footer>
              </article>
            ))}
          </div>
        )}

        {/* ---------- اشتراک‌های فعال ---------- */}
        {tab === 'subs' && (
          <div className="acc__grid">
            {SUBSCRIPTIONS.map((s) => {
              const left = SUBSCRIPTION_DAYS_LEFT[s.id] ?? 0;

              /* درصدِ باقی‌مانده از خود داده می‌آید، نه از تقسیم روزها
                 بر عددی ثابت.

                 نسخه‌ی اول روزها را بر ۳۰ تقسیم می‌کرد و برای اشتراک
                 یک‌ساله با ۳۳۶ روز مانده، نوار همیشه پر بود — یعنی
                 اشتراکِ تازه و اشتراکِ رو به پایان یک شکل داشتند. */
              const used = SUBSCRIPTION_PROGRESS[s.id] ?? 0;
              const pct = Math.max(0, Math.min(100, 100 - used));
              return (
                <article key={s.id} className="acc__sub" style={{ ['--accent' as string]: s.accent }}>
                  <b>{s.productTitle}</b>
                  <span className="acc__label">{s.variantLabel}</span>

                  <div className="acc__bar" role="img" aria-label={`${left} روز مانده`}>
                    <span style={{ width: `${pct}%` }} />
                  </div>

                  <span className={`acc__left ${left <= 5 ? 'is-soon' : ''}`}>
                    <b className="num">{fmt(left)}</b> روز مانده
                  </span>

                  <footer>
                    <span className="acc__date">تا {s.endsAt}</span>
                    <Link href={`/product/${s.productSlug}`} className="btn btn--primary btn--sm">
                      تمدید
                    </Link>
                  </footer>
                </article>
              );
            })}
          </div>
        )}

        {/* ---------- کیف پول ---------- */}
        {tab === 'wallet' && (
          <>
            <div className="acc__balance">
              <span className="acc__label">موجودی</span>
              <b className="num">{fmt(PROFILE.walletBalance)} تومان</b>
            </div>
            <div className="acc__list">
              {WALLET_TX.map((t) => {
                const meta = WALLET_TX_META[t.kind];
                return (
                  <div key={t.id} className="acc__tx">
                    <div>
                      <b>{meta.label}</b>
                      <span className="acc__label">{t.description}</span>
                    </div>
                    <span className="acc__date">{t.createdAt}</span>
                    <b className={`num acc__amt ${t.amount > 0 ? 'is-plus' : 'is-minus'}`}>
                      {t.amount > 0 ? '+' : '−'}{fmt(Math.abs(t.amount))}
                    </b>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ---------- حساب من ---------- */}
        {/* ---------- نشان‌شده‌ها ---------- */}
        {tab === 'saved' && (
          <div className="acc__empty">
            <Bookmark aria-hidden="true" />
            <h2>هنوز چیزی نشان نکرده‌ای</h2>
            <p>
              روی هر محصولی که بعداً می‌خواهی سراغش برگردی، نشان بزن تا
              همین‌جا جمع شود.
            </p>
            <Link href="/shop" className="btn btn--primary btn--sm">رفتن به فروشگاه</Link>
          </div>
        )}

        {/* ---------- باشگاه مشتریان ---------- */}
        {tab === 'club' && (
          <>
            <div className="acc__balance">
              <span className="acc__label">امتیاز شما</span>
              <b className="num">{fmt(PROFILE.points)}</b>
            </div>

            {/* پله‌های باشگاه. جای کاربر روی نردبان مشخص است، و
                پله‌ی بعدی هم — وگرنه «نقره‌ای» فقط یک برچسب است. */}
            <div className="acc__tiers">
              {TIERS.map((t) => (
                <div
                  key={t.id}
                  className={`acc__tier ${PROFILE.tier === t.id ? 'is-on' : ''}`}
                >
                  <b>{t.label}</b>
                  <span className="num">از {fmt(t.from)} امتیاز</span>
                  <small>{t.perk}</small>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ---------- معرفی دوستان ---------- */}
        {tab === 'refer' && (
          <div className="acc__refer">
            <h2>هر دوستی که بیاوری، هر دو سود می‌کنید</h2>
            <p>
              کد زیر را بده به دوستت. اولین خریدش که انجام شد، ۱۰٪ مبلغ
              به کیف پول تو برمی‌گردد و خودش هم ۵٪ تخفیف می‌گیرد.
            </p>

            <div className="acc__code">
              <code dir="ltr">{REFER_CODE}</code>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  navigator.clipboard?.writeText(REFER_CODE);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy aria-hidden="true" />
                {copied ? 'کپی شد' : 'کپی کد'}
              </button>
            </div>

            <dl className="spec__table">
              <div className="spec__row"><dt>دعوت‌های موفق</dt><dd className="num">۰</dd></div>
              <div className="spec__row"><dt>مجموع پاداش</dt><dd className="num">۰ تومان</dd></div>
            </dl>
          </div>
        )}

        {/* ---------- پشتیبانی و تیکت ---------- */}
        {tab === 'tickets' && (
          <>
            {tickets.length === 0 ? (
              <div className="acc__empty">
                <LifeBuoy aria-hidden="true" />
                <h2>تیکتی باز نکرده‌ای</h2>
                <p>
                  اگر سفارشی مشکل دارد یا سوالی مانده، از اینجا بپرس.
                  معمولاً زیر یک ساعت جواب می‌گیری.
                </p>
                <Link href="/faq" className="btn btn--primary btn--sm">دیدن سوالات متداول</Link>
              </div>
            ) : (
              <div className="acc__list">
                {tickets.map((t) => (
                  <article key={t.id} className="acc__order">
                    <header>
                      <div>
                        <b>{t.subject}</b>
                        <span className="acc__label">{t.category}</span>
                      </div>
                      <span className={`pill acc__status acc__status--${t.status === 'closed' ? 'muted' : t.status === 'answered' ? 'ok' : 'warn'}`}>
                        {t.status === 'closed' ? 'بسته' : t.status === 'answered' ? 'پاسخ داده شد' : 'باز'}
                      </span>
                    </header>
                    <p className="acc__last">{t.messages[t.messages.length - 1]?.text.slice(0, 120)}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- امنیت حساب ---------- */}
        {tab === 'security' && (
          <div className="acc__list">
            {SECURITY.map((row) => (
              <div key={row.title} className="acc__tx acc__sec">
                <div>
                  <b>{row.title}</b>
                  <span className="acc__label">{row.note}</span>
                </div>
                <span className={`pill acc__status acc__status--${row.ok ? 'ok' : 'warn'}`}>
                  {row.ok ? 'فعال' : 'انجام نشده'}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'profile' && (
          <dl className="spec__table">
            <div className="spec__row"><dt>نام</dt><dd>{PROFILE.name}</dd></div>
            <div className="spec__row"><dt>موبایل</dt><dd className="num">{PROFILE.phone}</dd></div>
            <div className="spec__row"><dt>ایمیل</dt><dd dir="ltr">{PROFILE.email}</dd></div>
            <div className="spec__row"><dt>سطح باشگاه</dt><dd>{PROFILE.tierLabel}</dd></div>
            <div className="spec__row"><dt>عضو از</dt><dd>{PROFILE.joinedAt}</dd></div>
          </dl>
        )}
          </div>
        </div>
      </div>
    </>
  );
}
