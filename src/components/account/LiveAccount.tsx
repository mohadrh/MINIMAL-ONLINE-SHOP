'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award, Copy, CreditCard, Eye, EyeOff, Gift, KeyRound, LifeBuoy, LogIn, LogOut,
  Package, Repeat, Send, ShieldCheck, Smartphone, User, Wallet, X,
} from 'lucide-react';
import { otpOk } from '../../lib/account';
import { BridgeError, requestOtp, storedToken, verifyOtp } from '../../lib/api/bridge';
import { TelegramHint } from './LiveLogin';
import * as api from '../../lib/api/account';
import { PASSWORD_RULE } from '../../lib/api/account';
import type {
  Delivery, Me, OrderDetail, OrderItem, OrderState, OrderSummary, SessionRow,
  SubscriptionRow, TicketRow, VaultRow,
} from '../../lib/api/account';

/**
 * پنلِ مشتری — نسخه‌ی وصل به پنلِ فروشگاه (افزونه‌ی Phoenix Account).
 *
 * همان چیدمانِ ‎AccountView‎ (نسخه‌ی نمایشی)، ولی هر بخش از سرور:
 * سفارش‌ها با جزئیاتِ پرداخت و تحویل، تحویل‌ها (پوشیده تا «نمایش»)،
 * اشتراک‌ها، تیکت، امنیت (رمز و دستگاه‌ها) و اطلاعات.
 *
 * ⚠ کیف پول، باشگاه و معرفی هنوز سرور ندارند؛ عددِ ساختگی نشان
 * نمی‌دهیم — «به‌زودی».
 */

const fmt = (n: number) => n.toLocaleString('fa-IR');
const faDigits = (s: string) => s.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const date = (iso: string | null | number) => {
  if (!iso) return '—';
  const t = typeof iso === 'number' ? iso * 1000 : Date.parse(iso);
  return Number.isNaN(t) ? '—' : new Date(t).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' });
};
const dateTime = (iso: string | null | number) => {
  if (!iso) return '—';
  const t = typeof iso === 'number' ? iso * 1000 : Date.parse(iso);
  return Number.isNaN(t) ? '—' : new Date(t).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
};
const errText = (e: unknown) => (e instanceof Error ? e.message : 'انجام نشد؛ لطفاً دوباره تلاش کنید.');

type Tab = 'orders' | 'vault' | 'subs' | 'tickets' | 'security' | 'profile' | 'wallet' | 'club' | 'refer';

const GROUPS: { title: string; items: { id: Tab; label: string; icon: React.ReactNode }[] }[] = [
  {
    title: 'خریدهای من',
    items: [
      { id: 'orders', label: 'سفارش‌ها', icon: <Package /> },
      { id: 'vault', label: 'تحویل‌ها', icon: <KeyRound /> },
      { id: 'subs', label: 'اشتراک‌ها', icon: <Repeat /> },
    ],
  },
  {
    title: 'حساب',
    items: [
      { id: 'tickets', label: 'پشتیبانی و تیکت', icon: <LifeBuoy /> },
      { id: 'security', label: 'امنیت و ورود', icon: <ShieldCheck /> },
      { id: 'profile', label: 'اطلاعات من', icon: <User /> },
    ],
  },
  {
    title: 'به‌زودی',
    items: [
      { id: 'wallet', label: 'کیف پول', icon: <Wallet /> },
      { id: 'club', label: 'باشگاه مشتریان', icon: <Award /> },
      { id: 'refer', label: 'معرفی دوستان', icon: <Gift /> },
    ],
  },
];
const TAB_IDS = GROUPS.flatMap((g) => g.items.map((i) => i.id));

const STATE_TONE: Record<OrderState, string> = {
  awaiting_payment: 'muted', checking: 'warn', fulfilling: 'warn', needs_input: 'danger',
  delivered: 'ok', failed: 'danger', refunded: 'muted',
};
const ITEM_STATE: Record<OrderItem['state'], [string, string]> = {
  waiting: ['در حالِ آماده‌سازی', 'warn'], needs_input: ['نیازمندِ اصلاح', 'danger'],
  delivered: ['تحویل شد', 'ok'], cancelled: ['لغو شد', 'muted'],
};
const KIND: Record<Delivery['kind'], string> = { code: 'کد', account: 'اکانت', upgrade: 'ارتقا روی اکانت شما', link: 'لینک' };
const SECRET: Record<string, string> = { code: 'کد', username: 'یوزرنیم', password: 'پسورد', url: 'لینک' };

export function LiveAccount() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTabState] = useState<Tab>('orders');
  const [ticketFor, setTicketFor] = useState<number>(0);

  /* بخش در نشانی — «برگشت» و فرستادنِ پیوند کار کند */
  const setTab = (t: Tab) => {
    setTabState(t);
    try { history.replaceState(null, '', '#' + t); } catch { /* بی‌صدا */ }
  };

  const loadMe = useCallback(async () => {
    try { setMe(await api.me()); } catch (e) {
      if (e instanceof BridgeError && e.status === 401) setSignedIn(false);
    }
  }, []);

  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab;
    if (TAB_IDS.includes(h)) setTabState(h);
    const sync = () => setSignedIn(!!api.getSession());
    sync();
    setReady(true);
    window.addEventListener('phoenix:session', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('phoenix:session', sync); window.removeEventListener('storage', sync); };
  }, []);

  useEffect(() => { if (signedIn) loadMe(); }, [signedIn, loadMe]);

  if (!ready) return <div className="wrap acc"><div className="acc__empty" aria-busy="true" /></div>;

  if (!signedIn) {
    return (
      <>
        <header className="section shop__head">
          <div className="wrap"><h1>پنل کاربری</h1></div>
        </header>
        <div className="wrap acc">
          <div className="acc__mesh" aria-hidden="true" />
          <div className="acc__empty">
            <LogIn aria-hidden="true" />
            <h2>لطفاً وارد حساب کاربری خود شوید</h2>
            <p>با شماره‌ی موبایل و رمز عبور یا کد پیامکی وارد شوید. سفارش‌ها، تحویل‌ها و تیکت‌های شما در این‌جا نمایش داده می‌شود.</p>
            <Link href="/login?next=/account" className="btn btn--primary btn--sm">ورود به حساب</Link>
          </div>
        </div>
      </>
    );
  }

  const session = api.getSession();
  const name = me?.name || 'مشتری گرامی';

  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>پنل کاربری</h1>
          <p className="sec-head__lead">سفارش‌ها، تحویل‌ها و اشتراک‌های شما، یک‌جا.</p>
        </div>
      </header>

      <div className="wrap acc">
        <div className="acc__mesh" aria-hidden="true" />

        <div className="acc__hero">
          <div className="acc__who">
            <span className="acc__avatar" aria-hidden="true">{name.trim().charAt(0)}</span>
            <div>
              <b>{name}</b>
              <span className="num" dir="ltr">{faDigits(me?.phone || session?.phone || '')}</span>
            </div>
          </div>
          <dl className="acc__stats">
            <div><dt>سفارشِ پرداخت‌شده</dt><dd className="num">{me ? fmt(me.orders_count) : '…'}</dd></div>
            <div><dt>مجموعِ خرید</dt><dd className="num">{me ? fmt(me.paid_total) + ' تومان' : '…'}</dd></div>
            <div><dt>تیکتِ باز</dt><dd className="num">{me ? fmt(me.open_tickets) : '…'}</dd></div>
            <div><dt>عضو از</dt><dd>{me ? date(me.joined) : '…'}</dd></div>
          </dl>
        </div>

        <div className="acc__body">
          <nav className="acc__side" role="tablist" aria-label="بخش‌های پنل">
            {GROUPS.map((g) => (
              <div key={g.title} className="acc__side-group">
                <span className="acc__side-title">{g.title}</span>
                {g.items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    className={`acc__side-item ${tab === t.id ? 'is-on' : ''}`}
                    onClick={() => setTab(t.id)}
                  >
                    <span className="acc__side-icon" aria-hidden="true">{t.icon}</span>
                    {t.label}
                    {t.id === 'tickets' && me && me.unread > 0 && <span className="acc__badge num">{fmt(me.unread)}</span>}
                    {t.id === 'security' && me && !me.has_password && <span className="acc__badge">رمز عبور</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="acc__main">
            {tab === 'orders' && <OrdersTab onTicket={(id) => { setTicketFor(id); setTab('tickets'); }} />}
            {tab === 'vault' && <VaultTab />}
            {tab === 'subs' && <SubsTab />}
            {tab === 'tickets' && <TicketsTab orderId={ticketFor} onSeen={loadMe} />}
            {tab === 'security' && me && <SecurityTab me={me} onMe={setMe} />}
            {tab === 'profile' && me && <ProfileTab me={me} onMe={setMe} />}
            {(tab === 'wallet' || tab === 'club' || tab === 'refer') && (
              <div className="acc__empty">
                {tab === 'wallet' ? <Wallet aria-hidden="true" /> : tab === 'club' ? <Award aria-hidden="true" /> : <Gift aria-hidden="true" />}
                <h2>به‌زودی</h2>
                <p>این بخش به‌زودی راه‌اندازی می‌شود و در همین‌جا در دسترس شما خواهد بود.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================
   چیزهای کوچکِ مشترک
   ============================================================ */

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`pill acc__status acc__status--${tone}`}>{children}</span>;
}

function Loading() {
  return <p className="acc__label" aria-busy="true">در حال بارگذاری…</p>;
}

function Failed({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="acc__empty">
      <h2>بارگذاری انجام نشد</h2>
      <p>{text}</p>
      <button type="button" className="btn btn--ghost btn--sm" onClick={retry}>تلاش دوباره</button>
    </div>
  );
}

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="acc__eye"
      aria-label={done ? 'کپی شد' : `کپیِ ${label}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1600); }).catch(() => {});
      }}
    >
      <Copy aria-hidden="true" />
    </button>
  );
}

/** تحویل‌های یک قلم — راز پوشیده تا «نمایش» (سرور) */
function Deliveries({ list, codes }: { list: Delivery[]; codes: string[] }) {
  if (!list.length && !codes.length) return null;
  const masked = (v: string) => /^•+$/.test(v);
  return (
    <div className="acc__deliv">
      {list.map((d) => (
        <div key={d.id} className="acc__deliv-row">
          <div className="acc__deliv-h">
            <Pill tone="ok">{KIND[d.kind]}</Pill>
            <span className="acc__date">{dateTime(d.at)}</span>
            {d.until > 0 && <span className="acc__date">معتبر تا {date(d.until)}</span>}
          </div>
          {d.secret === null && <p className="acc__label">نمایش این مورد ممکن نیست؛ لطفاً با پشتیبانی تماس بگیرید.</p>}
          {d.secret && Object.keys(d.secret).length > 0 && (
            <ul className="acc__secrets">
              {Object.entries(d.secret).map(([k, v]) => (
                <li key={k}>
                  <span className="acc__label">{SECRET[k] || k}</span>
                  <code dir="ltr">{v}</code>
                  {!masked(v) && <CopyBtn value={v} label={SECRET[k] || k} />}
                </li>
              ))}
            </ul>
          )}
          {d.note && <p className="acc__note" dir="auto">{d.note}</p>}
        </div>
      ))}
      {codes.length > 0 && (
        <ul className="acc__secrets">
          {codes.map((c, i) => (
            <li key={i}>
              <span className="acc__label">کد</span>
              <code dir="ltr">{c}</code>
              {!masked(c) && <CopyBtn value={c} label="کد" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const hasSecret = (items: OrderItem[]) =>
  items.some((it) => it.stock_codes.length > 0 || it.deliveries.some((d) => d.secret && Object.keys(d.secret).length > 0));

/* ============================================================
   سفارش‌ها
   ============================================================ */

function OrdersTab({ onTicket }: { onTicket: (orderId: number) => void }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: OrderSummary[]; pages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number>(0);

  const load = useCallback(async () => {
    setError(null);
    try { setData(await api.orders(page)); } catch (e) { setError(errText(e)); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  if (error) return <Failed text={error} retry={load} />;
  if (!data) return <Loading />;
  if (!data.rows.length) {
    return (
      <div className="acc__empty">
        <Package aria-hidden="true" />
        <h2>هنوز سفارشی ثبت نکرده‌اید</h2>
        <p>هر خریدی که با همین شماره‌ی موبایل انجام دهید، در این‌جا نمایش داده می‌شود.</p>
        <Link href="/shop" className="btn btn--primary btn--sm">رفتن به فروشگاه</Link>
      </div>
    );
  }

  return (
    <div className="acc__list">
      {data.rows.map((o) => (
        <article key={o.id} className="acc__order">
          <header>
            <div>
              <span className="acc__label">سفارش</span>
              <b className="num" dir="ltr">#{faDigits(o.number)}</b>
            </div>
            <Pill tone={STATE_TONE[o.state]}>{o.label}</Pill>
          </header>
          <ul className="acc__lines">
            {o.items.map((l, i) => (
              <li key={i}><span>{l.name}{l.qty > 1 ? ` × ${fmt(l.qty)}` : ''}</span></li>
            ))}
          </ul>
          {open === o.id && <OrderMore id={o.id} onChanged={load} />}
          <footer>
            <span className="acc__date">{date(o.created)}</span>
            <b className="num">{fmt(o.total)} تومان</b>
            {o.pay_url && (
              <a href={o.pay_url} className="btn btn--primary btn--sm"><CreditCard aria-hidden="true" /> پرداخت</a>
            )}
            <button type="button" className="btn btn--ghost btn--sm" aria-expanded={open === o.id} onClick={() => setOpen(open === o.id ? 0 : o.id)}>
              {open === o.id ? 'بستن' : 'جزئیات'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onTicket(o.id)}>
              <LifeBuoy aria-hidden="true" /> تیکت
            </button>
          </footer>
        </article>
      ))}
      {data.pages > 1 && (
        <div className="acc__pager">
          <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>قبلی</button>
          <span className="num">{fmt(page)} از {fmt(data.pages)}</span>
          <button type="button" className="btn btn--ghost btn--sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>بعدی</button>
        </div>
      )}
    </div>
  );
}

function OrderMore({ id, onChanged }: { id: number; onChanged: () => void }) {
  const [d, setD] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try { setD(await api.order(id)); } catch (e) { setError(errText(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="co__err" role="alert">{error}</p>;
  if (!d) return <Loading />;

  const toggle = async () => {
    if (shown) { setShown(false); load(); return; }
    setBusy(true);
    try { setD(await api.revealOrder(id)); setShown(true); } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="acc__detail">
      <dl className="acc__kv">
        <dt>پرداخت</dt>
        <dd>{d.payment.is_paid ? `${d.payment.method || 'درگاه'} — ${dateTime(d.paid)}` : 'هنوز پرداخت نشده است'}</dd>
        {d.payment.transaction_id && (<><dt>شماره‌ی تراکنش</dt><dd><code dir="ltr">{d.payment.transaction_id}</code></dd></>)}
        {d.note && (<><dt>توضیحات شما</dt><dd dir="auto">{d.note}</dd></>)}
      </dl>

      {d.items.map((it) => (
        <section key={it.item_id} className="acc__item">
          <div className="acc__item-h">
            <b>{it.name}{it.qty > 1 ? ` × ${fmt(it.qty)}` : ''}</b>
            <Pill tone={ITEM_STATE[it.state][1]}>{ITEM_STATE[it.state][0]}</Pill>
          </div>
          {it.inputs.length > 0 && (
            <dl className="acc__kv">
              {it.inputs.map((i) => (<React.Fragment key={i.key}><dt>{i.key}</dt><dd dir="auto">{i.value}</dd></React.Fragment>))}
            </dl>
          )}
          {it.state === 'needs_input' && <FixInputs order={d} item={it} onDone={(nd) => { setD(nd); onChanged(); }} />}
          <Deliveries list={it.deliveries} codes={it.stock_codes} />
        </section>
      ))}

      {hasSecret(d.items) && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={toggle} disabled={busy}>
          {shown ? <><EyeOff aria-hidden="true" /> پنهان کردن</> : <><Eye aria-hidden="true" /> نمایش کد و رمز</>}
        </button>
      )}
    </div>
  );
}

/** مدیر گفته ورودی غلط است — مشتری همین‌جا اصلاح می‌کند تا کار به صف برگردد */
function FixInputs({ order, item, onDone }: { order: OrderDetail; item: OrderItem; onDone: (d: OrderDetail) => void }) {
  const fields = [
    ...item.inputs.map((i) => ({ key: i.key, label: i.key, value: i.value })),
    ...item.required.filter((r) => !r.given && !item.inputs.some((i) => i.key === r.label || i.key === r.key))
      .map((r) => ({ key: r.label, label: r.label, value: '' })),
  ];
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="acc__fix"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try { onDone(await api.fixInputs(order.id, item.item_id, vals)); } catch (err) {
          const f = api.fieldErrors(err);
          setErrors(Object.keys(f).length ? f : { inputs: errText(err) });
        } finally { setBusy(false); }
      }}
    >
      <p className="acc__note is-warn" dir="auto">{item.message || 'لطفاً اطلاعات واردشده را اصلاح کنید.'}</p>
      {fields.map((f) => (
        <label key={f.key} className="pdp-input">
          <span>{f.label}</span>
          <input dir="auto" maxLength={300} value={vals[f.key] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} aria-invalid={!!errors[f.key]} />
          {errors[f.key] && <em className="co__err">{errors[f.key]}</em>}
        </label>
      ))}
      {errors.inputs && <p className="co__err" role="alert">{errors.inputs}</p>}
      <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>ثبت اصلاحیه</button>
    </form>
  );
}

/* ============================================================
   تحویل‌ها و اشتراک‌ها
   ============================================================ */

function VaultTab() {
  const [rows, setRows] = useState<VaultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<number, OrderDetail>>({});

  const load = useCallback(async () => {
    setError(null);
    try { setRows(await api.vault()); } catch (e) { setError(errText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <Failed text={error} retry={load} />;
  if (!rows) return <Loading />;
  if (!rows.length) {
    return (
      <div className="acc__empty">
        <KeyRound aria-hidden="true" />
        <h2>هنوز موردی تحویل نگرفته‌اید</h2>
        <p>هر کد، اکانت یا لینکی که برای شما ارسال شود، همیشه در این‌جا در دسترس خواهد بود.</p>
      </div>
    );
  }

  return (
    <div className="acc__list">
      {rows.map((r) => {
        const revealed = open[r.order_id]?.items.find((i) => i.item_id === r.item_id);
        return (
          <article key={`${r.order_id}-${r.item_id}`} className="acc__order">
            <header>
              <div>
                <b>{r.name}</b>
                <span className="acc__label">سفارشِ #{faDigits(r.number)}</span>
              </div>
              <span className="acc__date">{date(r.at)}</span>
            </header>
            <Deliveries list={revealed ? revealed.deliveries : r.deliveries} codes={revealed ? revealed.stock_codes : r.stock_codes} />
            <footer>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={async () => {
                  if (revealed) { setOpen((o) => { const n = { ...o }; delete n[r.order_id]; return n; }); return; }
                  try { const d = await api.revealOrder(r.order_id); setOpen((o) => ({ ...o, [r.order_id]: d })); } catch (e) { setError(errText(e)); }
                }}
              >
                {revealed ? <><EyeOff aria-hidden="true" /> پنهان کردن</> : <><Eye aria-hidden="true" /> نمایش</>}
              </button>
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function SubsTab() {
  const [rows, setRows] = useState<SubscriptionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try { setRows(await api.subscriptions()); } catch (e) { setError(errText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <Failed text={error} retry={load} />;
  if (!rows) return <Loading />;
  if (!rows.length) {
    return (
      <div className="acc__empty">
        <Repeat aria-hidden="true" />
        <h2>اشتراک فعالی ندارید</h2>
        <p>اشتراک‌های مدت‌دار (مثلاً یک‌ماهه) از روز تحویل در این‌جا شمرده می‌شوند.</p>
      </div>
    );
  }
  return (
    <div className="acc__grid">
      {rows.map((s) => {
        const pct = Math.max(0, Math.min(100, (s.days_left / Math.max(1, s.total_days)) * 100));
        return (
          <article key={`${s.order_id}-${s.item_id}`} className="acc__sub">
            <b>{s.name}</b>
            <span className="acc__label">سفارشِ #{faDigits(s.number)}</span>
            <div className="acc__bar" role="img" aria-label={`${fmt(s.days_left)} روز مانده از ${fmt(s.total_days)}`}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className={`acc__left ${s.state !== 'active' ? 'is-soon' : ''}`}>
              {s.state === 'expired' ? 'تمام شد' : <><b className="num">{fmt(s.days_left)}</b> روز مانده</>}
            </span>
            <footer>
              <span className="acc__date">تا {date(s.end)}</span>
              {s.slug && <Link href={`/product/${s.slug}`} className="btn btn--primary btn--sm">تمدید</Link>}
            </footer>
          </article>
        );
      })}
    </div>
  );
}

/* ============================================================
   تیکت
   ============================================================ */

const T_STATE: Record<TicketRow['status'], [string, string]> = {
  open: ['در انتظار پاسخ پشتیبانی', 'warn'], answered: ['پاسخ داده شد', 'ok'], closed: ['بسته شده', 'muted'],
};

function TicketsTab({ orderId, onSeen }: { orderId: number; onSeen: () => void }) {
  const [rows, setRows] = useState<TicketRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<number | 'new' | 0>(orderId ? 'new' : 0);

  const load = useCallback(async () => {
    setError(null);
    try { setRows(await api.tickets()); } catch (e) { setError(errText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (view === 'new') return <NewTicket orderId={orderId} onCancel={() => setView(0)} onCreated={(t) => { load(); setView(t.id); }} />;
  if (view) return <TicketThread id={view} onBack={() => { setView(0); load(); onSeen(); }} />;
  if (error) return <Failed text={error} retry={load} />;
  if (!rows) return <Loading />;

  return (
    <div className="acc__list">
      <button type="button" className="btn btn--primary btn--sm acc__newticket" onClick={() => setView('new')}>ثبت تیکت جدید</button>
      {!rows.length && (
        <div className="acc__empty">
          <LifeBuoy aria-hidden="true" />
          <h2>تیکتی ثبت نکرده‌اید</h2>
          <p>اگر سفارشی مشکل دارد یا سؤالی دارید، لطفاً از همین‌جا با ما در میان بگذارید.</p>
        </div>
      )}
      {rows.map((t) => (
        <button key={t.id} type="button" className="acc__order acc__ticket" onClick={() => setView(t.id)}>
          <header>
            <div>
              <b>{t.unread && <span className="acc__dot" aria-label="پاسخ جدید" />}{t.subject}</b>
              <span className="acc__label">{t.order_id ? `سفارشِ #${faDigits(String(t.order_id))} · ` : ''}{date(t.updated)}</span>
            </div>
            <Pill tone={T_STATE[t.status][1]}>{T_STATE[t.status][0]}</Pill>
          </header>
        </button>
      ))}
    </div>
  );
}

function NewTicket({ orderId, onCancel, onCreated }: { orderId: number; onCancel: () => void; onCreated: (t: TicketRow) => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [order, setOrder] = useState(orderId);
  const [list, setList] = useState<OrderSummary[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.orders(1).then((r) => setList(r.rows)).catch(() => {}); }, []);

  return (
    <form
      className="acc__form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try { onCreated(await api.newTicket({ subject, body, order_id: order || undefined })); } catch (err) {
          const f = api.fieldErrors(err);
          setErrors(Object.keys(f).length ? f : { body: errText(err) });
        } finally { setBusy(false); }
      }}
    >
      <h2>ثبت تیکت جدید</h2>
      <label className="pdp-input">
        <span>موضوع</span>
        <input maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً: کد تحویلی کار نمی‌کند" aria-invalid={!!errors.subject} />
        {errors.subject && <em className="co__err">{errors.subject}</em>}
      </label>
      <label className="pdp-input">
        <span>مربوط به کدام سفارش است؟</span>
        <select value={order} onChange={(e) => setOrder(Number(e.target.value))}>
          <option value={0}>هیچ‌کدام / سؤال کلی</option>
          {list.map((o) => <option key={o.id} value={o.id}>#{faDigits(o.number)} — {o.items[0]?.name ?? ''}</option>)}
        </select>
      </label>
      <label className="pdp-input">
        <span>متن پیام</span>
        <textarea rows={6} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={!!errors.body} />
        {errors.body && <em className="co__err">{errors.body}</em>}
      </label>
      <div className="acc__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>انصراف</button>
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !subject.trim() || !body.trim()}><Send aria-hidden="true" /> ارسال</button>
      </div>
    </form>
  );
}

function TicketThread({ id, onBack }: { id: number; onBack: () => void }) {
  const [t, setT] = useState<TicketRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try { setT(await api.ticket(id)); } catch (e) { setError(errText(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error && !t) return <Failed text={error} retry={load} />;
  if (!t) return <Loading />;

  return (
    <div className="acc__form">
      <button type="button" className="login__forgot" onClick={onBack}>← بازگشت به تیکت‌ها</button>
      <div className="acc__item-h">
        <h2>{t.subject}</h2>
        <Pill tone={T_STATE[t.status][1]}>{T_STATE[t.status][0]}</Pill>
      </div>
      <div className="acc__thread">
        {(t.messages || []).map((m) => (
          <div key={m.id} className={`acc__msg is-${m.author}`}>
            <p dir="auto">{m.body}</p>
            <span className="acc__date">{m.author === 'staff' ? 'پشتیبانی فونیکس' : 'شما'} · {dateTime(m.at)}</span>
          </div>
        ))}
      </div>
      <form
        className="acc__reply"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim()) return;
          setBusy(true);
          setError(null);
          try { setT(await api.replyTicket(t.id, body)); setBody(''); } catch (err) { setError(api.fieldErrors(err).body || errText(err)); } finally { setBusy(false); }
        }}
      >
        <label className="pdp-input">
          <span>{t.status === 'closed' ? 'این تیکت بسته شده است؛ با ارسال پیام دوباره باز می‌شود' : 'پاسخ شما'}</span>
          <textarea rows={4} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        {error && <p className="co__err" role="alert">{error}</p>}
        <div className="acc__actions">
          {t.status !== 'closed' && (
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={async () => {
              setBusy(true);
              try { setT(await api.closeTicket(t.id)); } catch (err) { setError(errText(err)); } finally { setBusy(false); }
            }}><X aria-hidden="true" /> مشکل برطرف شد</button>
          )}
          <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !body.trim()}><Send aria-hidden="true" /> ارسال</button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   امنیت و ورود
   ============================================================ */

function SecurityTab({ me, onMe }: { me: Me; onMe: (m: Me) => void }) {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setRows(await api.sessions()); } catch (e) { setMsg(errText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="acc__list">
      <PasswordCard me={me} onMe={(m, revoked) => { onMe(m); load(); setMsg(revoked ? `رمز عبور ذخیره شد و ${fmt(revoked)} دستگاه دیگر از حساب شما خارج شد.` : 'رمز عبور ذخیره شد.'); }} />
      {msg && <p className="acc__note" role="status">{msg}</p>}

      <section className="acc__form">
        <h2>دستگاه‌های واردشده به حساب شما</h2>
        {!rows ? <Loading /> : (
          <ul className="acc__devices">
            {rows.map((s) => (
              <li key={s.id}>
                <Smartphone aria-hidden="true" />
                <div>
                  <b>{s.device}{s.current && ' — همین دستگاه'}</b>
                  <span className="acc__label">آخرین بار {dateTime(s.last_seen)} · از {date(s.created)}</span>
                </div>
                {!s.current && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={async () => {
                    try { await api.revokeSession(s.id); load(); } catch (e) { setMsg(errText(e)); }
                  }}>خروج این دستگاه</button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="acc__actions">
          {rows && rows.length > 1 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={async () => {
              try { const r = await api.revokeOthers(); setMsg(`${fmt(r.revoked)} دستگاه دیگر از حساب شما خارج شد.`); load(); } catch (e) { setMsg(errText(e)); }
            }}>خروج از سایر دستگاه‌ها</button>
          )}
          <button type="button" className="btn btn--ghost btn--sm acc__out" onClick={async () => {
            try { await api.logout(); } catch { /* نشست در هر حال این‌جا فراموش شد */ }
            window.location.href = '/';
          }}><LogOut aria-hidden="true" /> خروج از حساب</button>
        </div>
      </section>
    </div>
  );
}

/**
 * گذاشتن یا عوض کردنِ رمز.
 * ⚠ نشستِ باز کافی نیست: رمزِ فعلی، یا (اگر یادت نیست یا رمز نداری)
 * کدِ پیامکی.
 */
function PasswordCard({ me, onMe }: { me: Me; onMe: (m: Me, revoked: number) => void }) {
  const [cur, setCur] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [show, setShow] = useState(false);
  const [viaCode, setViaCode] = useState(!me.has_password);
  const [codeSent, setCodeSent] = useState(false);
  const [tgBot, setTgBot] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const problem = pass ? api.passwordProblem(pass, me.phone) : '';

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      let token: string | undefined;
      if (viaCode) {
        await verifyOtp(me.phone, toLatin(code.trim()));
        token = storedToken();
      }
      const r = await api.setPassword({ password: pass, current: viaCode ? undefined : cur, token });
      setCur(''); setPass(''); setPass2(''); setCode(''); setCodeSent(false);
      onMe(r.me, r.revoked);
    } catch (e) {
      const f = api.fieldErrors(e);
      if (!Object.keys(f).length && e instanceof BridgeError && viaCode && (e.status === 401 || e.status === 410 || e.status === 429)) {
        f.code = e.status === 401 ? 'کد واردشده درست نیست.' : 'کد منقضی شده است؛ لطفاً کد جدید دریافت کنید.';
      }
      setErrors(Object.keys(f).length ? f : { password: errText(e) });
    } finally { setBusy(false); }
  };

  const eye = (
    <button type="button" className="co__eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}>
      {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </button>
  );

  return (
    <form className="acc__form" onSubmit={(e) => { e.preventDefault(); if (!problem && pass === pass2) submit(); }}>
      <h2>{me.has_password ? 'تغییر رمز عبور' : 'تعیین رمز عبور'}</h2>
      <p className="acc__label">
        {me.has_password
          ? `رمز عبور شما از ${date(me.pass_set_at)} تعیین شده است. با تغییر آن، سایر دستگاه‌ها از حساب خارج می‌شوند.`
          : 'در حال حاضر فقط با کد پیامکی وارد می‌شوید. لطفاً رمز عبور خود را تعیین کنید تا بدون پیامک هم بتوانید وارد شوید.'}
      </p>

      {me.has_password && (
        <div className="login__modes" role="tablist">
          <button type="button" role="tab" aria-selected={!viaCode} className={`login__mode ${!viaCode ? 'is-on' : ''}`} onClick={() => setViaCode(false)}>با رمز عبور فعلی</button>
          <button type="button" role="tab" aria-selected={viaCode} className={`login__mode ${viaCode ? 'is-on' : ''}`} onClick={() => setViaCode(true)}>با کد پیامکی</button>
        </div>
      )}

      {!viaCode && (
        <label className="pdp-input co__pass">
          <span>رمز عبور فعلی</span>
          <input type={show ? 'text' : 'password'} autoComplete="current-password" dir="ltr" maxLength={64} value={cur} onChange={(e) => setCur(e.target.value)} aria-invalid={!!errors.current} />
          {eye}
          {errors.current && <em className="co__err">{errors.current}</em>}
        </label>
      )}

      {viaCode && (
        <div className="acc__code-row">
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={async () => {
            setErrors({});
            try {
              const r = await requestOtp(me.phone);
              setTgBot(r.channel === 'telegram' && r.bot ? r.bot : null);
              setCodeSent(true);
            } catch (e) { setErrors({ code: errText(e) }); }
          }}>{codeSent ? 'ارسال دوباره‌ی کد' : 'ارسال کد تأیید به ' + faDigits(me.phone)}</button>
          {codeSent && (
            <label className="pdp-input">
              <span>کد تأیید شش‌رقمی</span>
              <input inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!errors.code} />
            </label>
          )}
          {codeSent && tgBot && <TelegramHint bot={tgBot} />}
          {errors.code && <em className="co__err">{errors.code}</em>}
        </div>
      )}

      <label className="pdp-input co__pass">
        <span>رمز عبور جدید</span>
        <input type={show ? 'text' : 'password'} autoComplete="new-password" dir="ltr" maxLength={64} value={pass} onChange={(e) => setPass(e.target.value)} aria-invalid={!!problem || !!errors.password} />
        {eye}
        {(problem || errors.password)
          ? <em className="co__err">{problem || errors.password}</em>
          : <small>{PASSWORD_RULE}</small>}
      </label>
      <label className="pdp-input">
        <span>تکرار رمز عبور جدید</span>
        <input type={show ? 'text' : 'password'} autoComplete="new-password" dir="ltr" maxLength={64} value={pass2} onChange={(e) => setPass2(e.target.value)} aria-invalid={pass2.length > 0 && pass2 !== pass} />
        {pass2.length > 0 && pass2 !== pass && <em className="co__err">تکرار رمز عبور با رمز بالا یکسان نیست.</em>}
      </label>

      <div className="acc__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !pass || !!problem || pass !== pass2 || (viaCode ? !otpOk(toLatin(code)) : !cur)}>
          <KeyRound aria-hidden="true" /> ذخیره‌ی رمز عبور
        </button>
      </div>
    </form>
  );
}

/* ============================================================
   اطلاعات من
   ============================================================ */

function ProfileTab({ me, onMe }: { me: Me; onMe: (m: Me) => void }) {
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="acc__form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setSaved(false);
        try { onMe(await api.saveMe(name, email)); setSaved(true); } catch (err) {
          const f = api.fieldErrors(err);
          setErrors(Object.keys(f).length ? f : { name: errText(err) });
        } finally { setBusy(false); }
      }}
    >
      <h2>اطلاعات حساب</h2>
      <label className="pdp-input">
        <span>نام و نام خانوادگی</span>
        <input autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
        {errors.name && <em className="co__err">{errors.name}</em>}
      </label>
      <label className="pdp-input">
        <span>ایمیل (اختیاری)</span>
        <input type="email" autoComplete="email" dir="ltr" maxLength={190} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
        {errors.email ? <em className="co__err">{errors.email}</em> : <small>برای صدور فاکتور. اشتراک‌ها روی ایمیلی فعال می‌شوند که هنگام هر خرید وارد می‌کنید.</small>}
      </label>
      <dl className="acc__kv">
        <dt>موبایل</dt><dd className="num" dir="ltr">{faDigits(me.phone)}</dd>
        <dt>عضو از</dt><dd>{date(me.joined)}</dd>
      </dl>
      <div className="acc__actions">
        {saved && <span className="acc__label" role="status">تغییرات ذخیره شد.</span>}
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>ذخیره</button>
      </div>
    </form>
  );
}
