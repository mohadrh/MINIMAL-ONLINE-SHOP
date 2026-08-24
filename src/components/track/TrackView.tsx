'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, PackageSearch, Search } from 'lucide-react';
import { getOrder, type Order, type OrderStatus } from '../../lib/orders';
import { Su57Showcase } from '../three/Su57Showcase';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/* مسیر عادی سفارش. حالت‌های خطا (needs_input، failed) در این خط
   نیستند چون انحراف‌اند نه مرحله — و اگر داخل خط بیایند، کاربر فکر
   می‌کند خطا هم بخشی از روند طبیعی است. */
const FLOW: { id: OrderStatus; label: string; note: string }[] = [
  { id: 'awaiting_payment', label: 'ثبت شد',   note: 'سفارش ساخته شد و منتظر پرداخت است.' },
  { id: 'paid',             label: 'پرداخت شد', note: 'بانک تراکنش را تأیید کرد.' },
  { id: 'fulfilling',       label: 'در صف تحویل', note: 'داریم اکانت را آماده می‌کنیم.' },
  { id: 'delivered',        label: 'تحویل شد',  note: 'اطلاعات برایت ارسال شد.' },
];

const LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  fulfilling: 'در صف تحویل',
  delivered: 'تحویل‌شده',
  needs_input: 'نیازمند اصلاح اطلاعات',
  failed: 'ناموفق',
};

/**
 * پیگیری سفارش.
 *
 * تنها صفحه‌ای که مدل سه‌بعدی سوخو را نگه داشته. جایش اینجاست نه
 * صفحه‌ی اول: کاربر عمداً به این صفحه می‌آید و چند ثانیه منتظر
 * می‌ماند، پس چیزی که نگاه کردن دارد مزاحم کارش نمی‌شود.
 */
export function TrackView() {
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  /* اگر از صفحه‌ی موفقیتِ پرداخت آمده، کد در آدرس است و باید
     خودش جست‌وجو شود. کپی‌کردن دستیِ کد یک گام اضافه است که
     هیچ‌کس دوستش ندارد.

     خواندن از window انجام می‌شود نه useSearchParams، چون این
     صفحه استاتیک اکسپورت می‌شود و آن هوک، مرز Suspense می‌خواهد. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('code');
    if (!q) return;
    const c = q.trim().toUpperCase();
    setCode(c);
    const found = getOrder(c);
    setOrder(found ?? null);
    setNotFound(!found);
  }, []);

  const search = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const found = getOrder(c);
    setOrder(found ?? null);
    setNotFound(!found);
  };

  const stepIndex = order ? FLOW.findIndex((f) => f.id === order.status) : -1;

  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>پیگیری سفارش</h1>
          <p className="sec-head__lead">
            کد پیگیری را وارد کن تا وضعیت دقیق و اطلاعات تحویل را ببینی.
          </p>
        </div>
      </header>

      <div className="wrap track">
        <Su57Showcase
          height={300}
          caption="سفارش‌ها همین‌طور سریع تحویل می‌شوند"
        />

        <div className="track__search">
          <div className="shop__search">
            <Search aria-hidden="true" />
            <input
              type="text"
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="PHX-XXXXXX"
              aria-label="کد پیگیری"
            />
          </div>
          <button type="button" className="btn btn--primary" onClick={search}>
            پیگیری
          </button>
        </div>

        {notFound && (
          <div className="track__empty">
            <span className="cart__empty-icon"><PackageSearch aria-hidden="true" /></span>
            <h2>سفارشی با این کد پیدا نشد</h2>
            <p>
              کد را از پیامک تأیید بردار. اگر باز پیدا نشد، از پشتیبانی بپرس.
            </p>
          </div>
        )}

        {order && (
          <div className="track__result">
            <div className="track__head">
              <div>
                <span className="track__label">کد پیگیری</span>
                <b className="track__code num">{order.code}</b>
              </div>
              <span className={`pill track__status track__status--${order.status}`}>
                {LABELS[order.status]}
              </span>
            </div>

            {/* خط زمانی — همان الگوی مسیر گام‌های پرداخت */}
            <ol className="track__flow">
              {FLOW.map((f, i) => (
                <li
                  key={f.id}
                  className={
                    i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : ''
                  }
                >
                  <span className="track__dot" aria-hidden="true">
                    {i < stepIndex ? <Check /> : <Clock />}
                  </span>
                  <div>
                    <b>{f.label}</b>
                    <span>{f.note}</span>
                  </div>
                </li>
              ))}
            </ol>

            <div className="track__items">
              {order.items.map((it, i) => (
                <div key={i} className="co__line">
                  <div>
                    <b>{it.title}</b>
                    <span>{it.variantLabel}</span>
                    {it.secret && (
                      <span className="track__secret" dir="ltr">{it.secret}</span>
                    )}
                  </div>
                  <span className="num">{fmt(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="cart__row cart__row--total">
              <span>پرداخت‌شده</span>
              <b className="num">{fmt(order.payable)} تومان</b>
            </div>
          </div>
        )}

        {!order && !notFound && (
          <p className="track__hint">
            کد پیگیری بعد از پرداخت پیامک می‌شود و با <b>PHX-</b> شروع می‌شود.
            هنوز خریدی نکرده‌ای؟ <Link href="/shop">از فروشگاه شروع کن</Link>.
          </p>
        )}
      </div>
    </>
  );
}
