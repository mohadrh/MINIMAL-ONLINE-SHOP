import React from 'react';
import Link from 'next/link';
import { Glyph, type GlyphName } from '../ui/Glyph';

/**
 * شبکه‌ی خدمات.
 *
 * آیکون‌ها از Glyph می‌آیند نه از کتابخانه — دولایه‌اند و برای همین
 * سایت کشیده شده‌اند.
 */
const SERVICES: { g: GlyphName; title: string; note: string; href: string }[] = [
  { g: 'ai',        title: 'اشتراک هوش مصنوعی', note: 'ChatGPT، کلاد، جمنای', href: '/ai' },
  { g: 'creative',  title: 'ابزار خلاقیت',       note: 'کانوا، کپ‌کات، فیگما',  href: '/creative' },
  { g: 'gaming',    title: 'اکانت قانونی بازی',  note: 'پلی‌استیشن، استیم',      href: '/gaming' },
  { g: 'social',    title: 'شبکه و سرگرمی',      note: 'تلگرام، اسپاتیفای',      href: '/social' },
  { g: 'education', title: 'آموزش',              note: 'دولینگو سوپر',           href: '/education' },
  { g: 'number',    title: 'شماره مجازی',        note: 'بیش از سی کشور',         href: '/numbers' },
  { g: 'card',      title: 'پرداخت ریالی',       note: 'کارت بانکی خودت',        href: '/faq' },
  { g: 'shield',    title: 'گارانتی تمام دوره',  note: 'تا آخرین روز اشتراک',    href: '/rules' },
  { g: 'clock',     title: 'تحویل آنی',          note: 'اغلب زیر ۱۵ دقیقه',      href: '/faq' },
  { g: 'support',   title: 'پشتیبانی',           note: 'هر روز، تلگرام و تیکت',  href: '/track' },
];

export function ServiceGrid() {
  return (
    <section className="section section--tint reveal">
      <div className="container">
        <div className="sec-head sec-head--center">
          <span className="sec-head__kicker">خدمات</span>
          <h2>فونیکس شاپ چه ارائه می‌دهد؟</h2>
        </div>

        <div className="svc">
          {SERVICES.map((s, idx) => (
            <Link key={s.title} href={s.href} className="svc__item" style={{ ['--i' as string]: idx }}>
              <span className="svc__icon"><Glyph name={s.g} /></span>
              <b>{s.title}</b>
              <span className="svc__note">{s.note}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
