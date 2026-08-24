import React from 'react';
import { PRODUCTS } from '../../data/catalog';
import { asset } from '../../lib/asset';

/**
 * سرویس‌هایی که ارائه می‌دهیم.
 *
 * نواری که آرام می‌لغزد، نه شبکه‌ی ثابت.
 *
 * دو نکته که شکل این کامپوننت را تعیین کرده‌اند:
 *
 * ۱. فهرست دو بار رندر می‌شود. نوارِ بی‌درز به این شکل ساخته
 *    می‌شود: کل مجموعه را دو بار می‌گذاری و ۵۰٪ جابه‌جا می‌کنی؛
 *    وقتی نسخه‌ی اول تمام می‌شود، نسخه‌ی دوم دقیقاً همان‌جاست و
 *    پرش دیده نمی‌شود. نسخه‌ی دوم aria-hidden است تا صفحه‌خوان
 *    فهرست را دو بار نخواند.
 *
 * ۲. لوگوها خاکستری نیستند. نسخه‌ی قبل grayscale داشت و روی
 *    کاغذِ روشن تیره و مرده دیده می‌شد. حالا رنگ خودشان را دارند
 *    با شفافیت کم، و روی هاور کامل می‌شوند.
 */
export function BrandRow() {
  const brands = PRODUCTS.filter((p) => p.category !== 'gaming').slice(0, 8);
  const loop = [...brands, ...brands];

  return (
    <section className="section brands reveal">
      <div className="container">
        <div className="sec-head sec-head--center">
          <span className="sec-head__kicker">اورجینال</span>
          <h2>سرویس‌هایی که ارائه می‌دهیم</h2>
        </div>
      </div>

      {/* نوار از ظرف بیرون می‌زند تا لبه‌به‌لبه‌ی صفحه بلغزد */}
      <div className="brands__track">
        <div className="brands__row">
          {loop.map((p, i) => (
            <span
              key={`${p.slug}-${i}`}
              className="brands__item"
              title={p.brand}
              aria-hidden={i >= brands.length ? true : undefined}
            >
              <img src={asset(p.media.thumbnail)} alt={p.brand} loading="lazy" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
