'use client';

import React, { useMemo, useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import {
  NUMBER_SERVICES, SERVICE_GROUPS,
  cheapestFor, offersFor, getCountry, offerToProduct,
  type NumberKind, type ServiceGroup,
} from '../../data/numbers';
import { useCart } from '../../app/providers';
import { ServiceMark } from './ServiceMark';

const fmt = (n: number) => n.toLocaleString('fa-IR');

/**
 * شماره‌ی مجازی.
 *
 * سه انتخاب پشت سر هم: نوع شماره، سرویس، کشور. هر انتخاب فهرست
 * بعدی را باریک می‌کند و قیمت بلافاصله به‌روز می‌شود.
 *
 * ترتیبش عمدی است — نوع اول می‌آید چون قیمت را بیشتر از همه عوض
 * می‌کند: یک‌بارمصرف با دائمی ده برابر فرق دارد. اگر آخر می‌آمد،
 * کاربر بعد از انتخاب سرویس و کشور می‌فهمید بودجه‌اش نمی‌خورد.
 */
export function NumbersBrowser() {
  /* ⚠ فقط یک نوع شماره می‌فروشیم: دائمی.

     پیش از این سه نوع در قدمِ اول انتخاب می‌شد — یک‌بارمصرف،
     اجاره‌ای و دائمی — ولی کارفرما گفت فروشگاه فقط همین یکی را
     دارد. قدمِ اولی که فقط یک جوابِ درست دارد، قدم نیست؛ فقط یک
     کلیک اضافه پیش از کاری که کاربر آمده انجام دهد.

     ثابت است نه حالت، چون چیزی برای عوض کردن نیست. اگر روزی نوع
     دیگری اضافه شد، همین‌جا برمی‌گردد به حالت. */
  const kind: NumberKind = 'permanent';
  const [group, setGroup] = useState<ServiceGroup | 'all'>('all');
  const [serviceId, setServiceId] = useState(NUMBER_SERVICES[0].id);
  const [q, setQ] = useState('');
  const { add } = useCart();

  /* جست‌وجو روی نام انگلیسی کار می‌کند چون کاربر «telegram» تایپ
     می‌کند نه «تلگرام» — نام سرویس‌ها در این بازار انگلیسی است. */
  const services = useMemo(() => {
    const t = q.trim().toLowerCase();
    return NUMBER_SERVICES.filter(
      (s) => (group === 'all' || s.group === group)
        && (!t || s.name.toLowerCase().includes(t) || s.id.includes(t)),
    );
  }, [group, q]);

  const offers = useMemo(
    () => offersFor(kind, serviceId).slice(0, 12),
    [kind, serviceId],
  );


  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>شماره‌ی مجازی</h1>
          <p className="sec-head__lead">
            شماره‌ی واقعی از بیش از سی کشور، برای ساخت حساب و تأیید هویت در
            سرویس‌هایی که ایران را قبول نمی‌کنند. شماره‌ی خودت را جایی وارد نکن.
          </p>
        </div>
      </header>

      <div className="wrap nums">
        {/* ---------- ۱ سرویس ---------- */}
        <section className="nums__step">
          <h2 className="nums__h">
            <span className="nums__n num">۱</span>
            سرویس مقصد
          </h2>

          <div className="shop__rail nums__groups">
            {SERVICE_GROUPS.map((g) => (
              <button
                key={g.id}
                className={`shop__chip ${group === g.id ? 'is-on' : ''}`}
                onClick={() => setGroup(g.id)}
              >
                {g.title}
              </button>
            ))}
          </div>

          <label className="nums__search">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="نام سرویس را بنویس — telegram، chatgpt، paypal…"
              aria-label="جست‌وجوی سرویس"
            />
          </label>

          {services.length === 0 && (
            <p className="shop__empty">سرویسی با این نام نداریم.</p>
          )}

          <div className="nums__services">
            {services.map((s) => (
              <button
                key={s.id}
                className={`nums__svc ${serviceId === s.id ? 'is-on' : ''}`}
                style={{ ['--accent' as string]: s.accent }}
                onClick={() => setServiceId(s.id)}
                aria-pressed={serviceId === s.id}
              >
                <span className="nums__mark" aria-hidden="true">
                  <ServiceMark id={s.id} mark={s.mark} />
                </span>
                <b>{s.name}</b>
                {(() => {
                  const c = cheapestFor(kind, s.id);
                  return c === null ? (
                    <span className="nums__out">ناموجود</span>
                  ) : (
                    <span className="nums__from num">از {fmt(c)}</span>
                  );
                })()}
              </button>
            ))}
          </div>
        </section>

        {/* ---------- ۳ کشور ---------- */}
        <section className="nums__step">
          <h2 className="nums__h">
            <span className="nums__n num">۲</span>
            کشور
          </h2>

          {offers.length === 0 ? (
            <p className="shop__empty">
              برای این سرویس فعلاً شماره‌ای نداریم. سرویس دیگری را امتحان کن.
            </p>
          ) : (
            <div className="nums__offers">
              {offers.map((o) => {
                const c = getCountry(o.countryCode);
                return (
                  <div key={`${o.serviceId}-${o.countryCode}`} className="nums__offer">
                    {/* پرچم اول می‌آید: کشور را از شکلش می‌شناسی،
                        پیش از اینکه نامش را بخوانی. */}
                    <span className="nums__flag" aria-hidden="true">{c?.flag}</span>
                    <b className="nums__country">{c?.name}</b>
                    <span className="nums__op">{c?.operator}</span>
                    <span className="nums__stock num">
                      {o.stock === 0 ? 'ناموجود' : `${fmt(o.stock)} شماره`}
                    </span>
                    <span className="nums__price num">{fmt(o.price)} تومان</span>
                    {/* تا حالا این دکمه هیچ onClick نداشت — یعنی کل
                        صفحه‌ی شماره‌ی مجازی چیزی نمی‌فروخت. هر
                        پیشنهاد در لحظه‌ی افزودن به یک محصول تبدیل
                        می‌شود تا سبد و پرداخت بدون تغییر کار کنند. */}
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={o.stock === 0}
                      onClick={() => {
                        const { product, variant } = offerToProduct(o);
                        add(product, variant);
                      }}
                    >
                      <ShoppingBag aria-hidden="true" />
                      {o.stock === 0 ? 'ناموجود' : 'خرید'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
