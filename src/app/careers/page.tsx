import type { Metadata } from 'next';
import Link from 'next/link';
import { Code2, Headphones, PenTool } from 'lucide-react';

export const metadata: Metadata = {
  title: 'فرصت‌های شغلی | فونیکس شاپ',
  description: 'موقعیت‌های باز فونیکس شاپ و اینکه کار کردن اینجا چطور است.',
};

/**
 * فرصت‌های شغلی.
 *
 * ⚠ موقعیت‌های اینجا نمونه‌اند و باید با کارفرما تأیید شوند. چیزی
 * که واقعاً باز نیست را «باز» نشان دادن، هم وقتِ متقاضی را می‌گیرد
 * هم اعتبار برند را.
 */
const ROLES = [
  {
    icon: Headphones,
    t: 'کارشناس پشتیبانی',
    d: 'پاسخ به تیکت و تلگرام، پیگیری سفارش‌ها. تمام‌وقت یا پاره‌وقت، دورکار.',
  },
  {
    icon: Code2,
    t: 'برنامه‌نویس فرانت‌اند',
    d: 'کار روی همین سایت — Next.js و TypeScript. آشنایی با چیدمان راست‌به‌چپ لازم است.',
  },
  {
    icon: PenTool,
    t: 'تولید محتوا',
    d: 'نوشتن راهنما و مقاله درباره‌ی سرویس‌هایی که می‌فروشیم. پاره‌وقت.',
  },
];

export default function CareersPage() {
  return (
    <>
      <header className="section club-head">
        <div className="wrap">
          <span className="sec-head__kicker">همکاری با ما</span>
          <h1>فرصت‌های شغلی</h1>
          <p className="club-head__lead">
            تیم کوچکی هستیم و بیشترِ کار دورکار انجام می‌شود. اگر یکی از این
            موقعیت‌ها به تو می‌خورد، رزومه‌ات را از طریق تیکت بفرست.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <ol className="gsteps">
            {ROLES.map(({ icon: Icon, t, d }) => (
              <li key={t} className="gstep">
                <span className="gstep__ico" aria-hidden="true"><Icon /></span>
                <div>
                  <b>{t}</b>
                  <p>{d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="club-cta">
            <Link href="/account" className="btn btn--primary">فرستادن رزومه</Link>
            <Link href="/about" className="btn btn--ghost">درباره‌ی ما</Link>
          </div>
        </div>
      </section>
    </>
  );
}
