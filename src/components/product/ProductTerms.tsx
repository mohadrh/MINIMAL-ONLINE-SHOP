'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, CircleAlert, Clock, KeyRound, ShieldCheck, X, Zap } from 'lucide-react';
import type { Product } from '../../data/catalog';
import { termsFor, type ProductGuide } from '../../data/productTerms';

/**
 * شرایط و توضیحات سفارش.
 *
 * الگو از سایت مرجع: کنار انتخاب پلن، یک بلوکِ بازشونده که دقیقاً
 * می‌گوید بعد از پرداخت چه اتفاقی می‌افتد — چه چیزی از کاربر لازم
 * است، چقدر طول می‌کشد، و چه چیزی *لازم نیست*.
 *
 * این مهم‌ترین متنِ صفحه‌ی محصول در این بازار است. خریدارِ ایرانیِ
 * اشتراک خارجی، پیش از قیمت، این را می‌خواهد بداند: «رمزم را
 * می‌خواهند؟ روی حساب خودم فعال می‌شود؟ چقدر طول می‌کشد؟» اگر
 * جوابش در صفحه نباشد، یا تیکت می‌زند یا می‌رود.
 *
 * متن از خودِ داده‌ی محصول ساخته می‌شود — requiredInputs،
 * fulfillment، deliveryEstimate — نه از یک متنِ ثابت که برای هر
 * محصول تکرار شود و برای بعضی‌شان دروغ باشد.
 *
 * بسته شروع می‌شود چون بلند است و همه لازمش ندارند، ولی خلاصه‌اش
 * همیشه پیداست: سه نکته‌ی حیاتی بیرونِ آکاردئون‌اند.
 */

export function ProductTerms({ p }: { p: Product }) {
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);

  /* متنِ اختصاصیِ همین محصول، اگر کارفرما داده باشد.
     شرطِ کلاد درباره‌ی Organization ID است و شرطِ تلگرام
     درباره‌ی درست وارد کردنِ آیدی — این‌ها از داده در
     نمی‌آیند و حدسِ غلط روی صفحه‌ی پرداخت گران تمام
     می‌شود. */
  const own = termsFor(p.slug);

  const needs = p.requiredInputs ?? [];
  /* «روی حساب خودت» یعنی ما چیزی را ارتقا می‌دهیم یا شارژ می‌کنیم،
     نه اینکه حسابی از انبار تحویل بدهیم. برچسب تاکسونومی هم
     نگاه می‌شود چون بعضی محصولات آن را دارند و fulfillment
     دقیق‌ترش را می‌گوید. */
  const onOwnAccount = p.fulfillment === 'upgrade_on_user'
    || p.fulfillment === 'api_topup'
    || (p.tags ?? []).includes('upgrade-on-account');

  return (
    /* کارتِ شرایط و ردیف‌های راهنما خواهر و برادرند، نه تودرتو.
       در نمونه‌ای که کارفرما داد هم راهنماها کارت‌های جدا زیر
       کارتِ شرایط‌اند — داخلِ آن بودنشان مرزها را قاطی می‌کرد. */
    <div className="ptermsx">
    <section className="pterms">
      <div className="pterms__head">
        <h2>
          <CircleAlert aria-hidden="true" />
          شرایط و توضیحات
        </h2>
      </div>

      {/* ---------- سه نکته‌ی همیشه‌پیدا ---------- */}
      <ul className="pterms__quick">
        <li>
          <span className="pterms__ico" aria-hidden="true"><Clock /></span>
          <div>
            <b>زمان انجام سفارش</b>
            <p>{p.deliveryEstimate}</p>
          </div>
        </li>

        <li>
          <span className="pterms__ico" aria-hidden="true"><KeyRound /></span>
          <div>
            <b>چه چیزی از تو لازم است</b>
            <p>
              {needs.length
                ? needs.map((i) => i.label).join('، ')
                : 'هیچ اطلاعاتی لازم نیست؛ بعد از پرداخت تحویل می‌گیری.'}
            </p>
          </div>
        </li>

        <li>
          <span className="pterms__ico" aria-hidden="true"><ShieldCheck /></span>
          <div>
            <b>رمز عبورت</b>
            <p>هیچ‌وقت لازم نمی‌شود. اگر کسی خواست، ما نیستیم.</p>
          </div>
        </li>
      </ul>

      {/* ---------- متن کامل ---------- */}
      <button
        type="button"
        className="pterms__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'بستن توضیحات کامل' : 'خواندن توضیحات کامل'}
        <ChevronDown aria-hidden="true" />
      </button>

      {open && (
        <div className="pterms__full">
          {own ? (
            own.body.map((t, i) => <p key={i}>{t}</p>)
          ) : (
          <p>
            {onOwnAccount ? (
              <>
                در این سرویس، اشتراک <b>{p.title}</b> روی حساب کاربری خودت فعال
                می‌شود. یعنی حساب مال خودت می‌ماند، تاریخچه و تنظیماتت سر جایش
                است، و اگر روزی خواستی خودت تمدید کنی چیزی مانعت نیست.
              </>
            ) : (
              <>
                در این سرویس، حسابی آماده تحویل داده می‌شود و اطلاعات ورودش را
                بعد از پرداخت در پنل کاربری‌ات می‌بینی.
              </>
            )}
          </p>
          )}

          {!own && needs.length > 0 && (
            <p>
              برای انجام سفارش، {needs.map((i) => i.label).join(' و ')} را لازم
              داریم. این را در همین صفحه پیش از پرداخت وارد می‌کنی و بعد از ثبت
              سفارش قابل تغییر نیست — پس پیش از پرداخت یک بار درستی‌اش را چک کن.
            </p>
          )}

          <h3>نکات مهم</h3>
          <ul>
            {own?.notes?.length
              ? own.notes.map((n) => <li key={n}>{n}</li>)
              : <>
            <li>مسئولیت درستی اطلاعاتی که وارد می‌کنی با خودت است.</li>
            <li>
              {p.warrantyLabel} — اگر وسط دوره مشکلی پیش آمد، جایگزین می‌کنیم یا
              مبلغ را برمی‌گردانیم.
            </li>
            <li>
              رمز عبور حسابت را هیچ‌وقت نمی‌خواهیم. اگر جایی چنین چیزی از تو
              خواسته شد، از طرف ما نیست.
            </li>
            <li>
              اگر سفارشت بیش از زمان معمول طول کشید، از پنل کاربری تیکت بزن؛
              شماره‌ی سفارش همان‌جا جلوی چشم ماست و سریع‌تر پیگیری می‌شود.
            </li>
                </>}
          </ul>

          {p.notes?.length ? (
            <>
              <h3>درباره‌ی همین محصول</h3>
              <ul>
                {p.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </>
          ) : null}
        </div>
      )}

    </section>

      {/* راهنماها جدا از متنِ شرایط‌اند.

          کسی که دنبالِ «Organization ID را از کجا بیاورم» است، دارد
          یک کارِ مشخص را انجام می‌دهد و نباید مجبور شود کلِ شرایط
          را باز کند تا پیدایش کند. */}
      {own?.guides?.map((g) => (
        <button
          key={g.id}
          type="button"
          className="pterms__guide"
          onClick={() => setGuide(g.id)}
        >
          <Zap aria-hidden="true" />
          <span>{g.title}</span>
          <ChevronLeft aria-hidden="true" />
        </button>
      ))}

      {guide && own?.guides && (
        <GuideModal
          guides={own.guides}
          activeId={guide}
          onSelect={setGuide}
          onClose={() => setGuide(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   پنجره‌ی راهنما
--------------------------------------------------------------- */

function GuideModal({
  guides, activeId, onSelect, onClose,
}: {
  guides: ProductGuide[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const g = guides.find((x) => x.id === activeId) ?? guides[0];

  /* Escape می‌بندد و فوکوس می‌رود داخلِ پنجره. بدونِ این، کاربرِ
     صفحه‌کلید پنجره را باز می‌کند و فوکوس پشتِ آن در صفحه می‌ماند
     — یعنی عملاً نمی‌تواند ببنددش. */
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="gmod" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        className="gmod__panel"
        role="dialog"
        aria-modal="true"
        aria-label={g.title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gmod__head">
          <b>آموزش و راهنما</b>
          <button type="button" className="gmod__x" onClick={onClose} aria-label="بستن">
            <X aria-hidden="true" />
          </button>
        </div>

        {guides.length > 1 && (
          <div className="gmod__tabs" role="tablist">
            {guides.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={x.id === activeId}
                className={`gmod__tab ${x.id === activeId ? 'is-on' : ''}`}
                onClick={() => onSelect(x.id)}
              >
                {x.title}
              </button>
            ))}
          </div>
        )}

        <div className="gmod__body">
          <h3>{g.title}</h3>
          {g.body.map((t, i) => <p key={i}>{t}</p>)}
          {g.bullets && <ul>{g.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
          {g.footer && <p className="gmod__foot">{g.footer}</p>}
        </div>

        <button type="button" className="btn btn--primary gmod__ok" onClick={onClose}>
          تایید و ادامه
        </button>
      </div>
    </div>
  );
}

