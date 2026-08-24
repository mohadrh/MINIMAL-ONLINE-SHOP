import React from 'react';
import { KeyRound, ShieldCheck, UserCheck } from 'lucide-react';
import { asset } from '../../lib/asset';

/**
 * چرا امن است — همان الگوی تصویر و متن، ولی معکوس.
 *
 * معکوس بودنش عمدی است: دو سکشن پشت‌سرهم با چیدمان یکسان، چشم را
 * خسته می‌کند. نمونه هم همین کار را می‌کند.
 */
const POINTS = [
  { icon: UserCheck,   t: 'روی حساب شخصی خودت', d: 'اکانت مشترک و ظرفیتی نیست مگر خودت انتخاب کنی. اشتراک روی ایمیل خودت می‌نشیند.' },
  { icon: KeyRound,    t: 'رمزت را نمی‌خواهیم', d: 'برای فعال‌سازی فقط ایمیل لازم است. هیچ‌وقت رمز عبور نمی‌گیریم.' },
  { icon: ShieldCheck, t: 'گارانتی تا آخرین روز', d: 'اگر وسط دوره مشکلی پیش بیاید، جایگزین می‌کنیم یا پول را برمی‌گردانیم.' },
];

export function WhySafe() {
  return (
    <section className="section section--tint reveal">
      <div className="container mediatext mediatext--rev">
        <div className="mediatext__body">
          <span className="sec-head__kicker">امنیت</span>
          <h2>چرا خرید از ما امن است</h2>
          <p className="sec-head__lead">
            بیشترین نگرانی خریدار این است که حسابش را از دست بدهد. سه چیز
            هست که این را ممکن نمی‌کند.
          </p>

          <ul className="points">
            {POINTS.map(({ icon: Icon, t, d }) => (
              <li key={t}>
                <span className="points__icon"><Icon aria-hidden="true" /></span>
                <div>
                  <b>{t}</b>
                  <p className="small muted">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mediatext__art">
          <img src={asset('/hero/banner/banner-c.webp')} alt="" aria-hidden="true" loading="lazy" />
        </div>
      </div>
    </section>
  );
}
