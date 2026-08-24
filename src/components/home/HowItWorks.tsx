import React from 'react';
import { asset } from '../../lib/asset';

/**
 * چطور کار می‌کند — تصویر و متن کنار هم.
 *
 * سه مرحله، شماره‌دار. شماره اینجا تزئین نیست: ترتیبش واقعاً مهم
 * است و کاربر باید بداند اول چه می‌شود و بعد چه.
 */
const STEPS = [
  { n: '۱', t: 'سرویس و پلن را انتخاب کن', d: 'مدت اشتراک و نوع تحویل را خودت مشخص می‌کنی. قیمت پیش از پرداخت کامل معلوم است.' },
  { n: '۲', t: 'با کارت بانکی خودت پرداخت کن', d: 'درگاه ریالی داخلی. نه ارز لازم داری، نه حساب خارجی.' },
  { n: '۳', t: 'روی حساب خودت فعال می‌شود', d: 'ایمیلت را می‌گیریم و اشتراک روی همان حساب فعال می‌شود. رمزت را هیچ‌وقت نمی‌خواهیم.' },
];

export function HowItWorks() {
  return (
    <section className="section reveal">
      <div className="container mediatext">
        <div className="mediatext__body">
          <span className="sec-head__kicker">سه قدم</span>
          <h2>خرید از فونیکس شاپ چطور است؟</h2>
          <p className="sec-head__lead">
            بیشتر سرویس‌های بین‌المللی کارت ایرانی را قبول نمی‌کنند. کاری که ما
            می‌کنیم این است که آن پرداخت را از طرف تو انجام می‌دهیم.
          </p>

          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="steps__n num">{s.n}</span>
                <div>
                  <b>{s.t}</b>
                  <p className="small muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mediatext__art">
          <img src={asset('/hero/banner/banner-a.webp')} alt="" aria-hidden="true" loading="lazy" />
        </div>
      </div>
    </section>
  );
}
