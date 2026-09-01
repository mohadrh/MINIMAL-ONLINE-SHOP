'use client';

import React, { useState } from 'react';
import { ChevronDown, CircleAlert, Clock, KeyRound, ShieldCheck } from 'lucide-react';
import type { Product } from '../../data/catalog';

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

  const needs = p.requiredInputs ?? [];
  /* «روی حساب خودت» یعنی ما چیزی را ارتقا می‌دهیم یا شارژ می‌کنیم،
     نه اینکه حسابی از انبار تحویل بدهیم. برچسب تاکسونومی هم
     نگاه می‌شود چون بعضی محصولات آن را دارند و fulfillment
     دقیق‌ترش را می‌گوید. */
  const onOwnAccount = p.fulfillment === 'upgrade_on_user'
    || p.fulfillment === 'api_topup'
    || (p.tags ?? []).includes('upgrade-on-account');

  return (
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

          {needs.length > 0 && (
            <p>
              برای انجام سفارش، {needs.map((i) => i.label).join(' و ')} را لازم
              داریم. این را در همین صفحه پیش از پرداخت وارد می‌کنی و بعد از ثبت
              سفارش قابل تغییر نیست — پس پیش از پرداخت یک بار درستی‌اش را چک کن.
            </p>
          )}

          <h3>نکات مهم</h3>
          <ul>
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
  );
}
