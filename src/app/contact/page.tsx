import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, LifeBuoy, MessageCircle, Send, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'تماس با ما | فونیکس شاپ',
  description: 'راه‌های تماس با پشتیبانی فونیکس شاپ و اینکه هر کدام به چه دردی می‌خورد.',
};

/**
 * تماس با ما.
 *
 * از «درباره‌ی ما» جدا شد. قبلاً یک صفحه بودند و منطقِ آن‌وقتش این
 * بود که «کسی که درباره‌ی ما را باز می‌کند دنبال همان چیزی است که
 * در تماس هم هست». ولی این دو، دو قصدِ متفاوت‌اند: یکی می‌خواهد
 * بداند ما کی هستیم، دیگری همین حالا مشکلی دارد و دنبال راهِ
 * رسیدن به آدم است. کسی که مشکل دارد نباید اول سه پاراگرافِ معرفی
 * را رد کند.
 *
 * ترتیب راه‌ها بر اساس سرعتِ واقعیِ جواب است، نه بر اساس اینکه
 * کدام برای ما راحت‌تر است.
 *
 * ⚠ شماره‌ی تماس، نشانی و نماد اعتماد الکترونیکی هنوز از کارفرما
 * گرفته نشده. جایشان پایین همین صفحه مشخص است و همین که رسیدند
 * جایگزین می‌شوند. تا آن‌وقت چیزی را که نداریم ادعا نمی‌کنیم.
 */
const WAYS = [
  {
    icon: LifeBuoy,
    t: 'تیکت پشتیبانی',
    d: 'سریع‌ترین راه برای هر چیزی که به سفارش مشخصی مربوط است — چون شماره‌ی سفارش همان‌جا جلوی چشم ماست و لازم نیست دنبالش بگردیم.',
    cta: 'ثبت تیکت',
    href: '/account',
    external: false,
  },
  {
    icon: Send,
    t: 'تلگرام',
    d: 'برای سوال‌های کوتاهِ پیش از خرید: «این پلن به کارم می‌آید؟»، «موجود هست؟».',
    cta: 'باز کردن تلگرام',
    href: 'https://t.me/',
    external: true,
  },
  {
    icon: MessageCircle,
    t: 'سوالات متداول',
    d: 'جوابِ بیشترِ سوال‌ها همین‌جاست و از هر دو راهِ بالا سریع‌تر است، چون منتظر کسی نمی‌مانی.',
    cta: 'دیدن سوال‌ها',
    href: '/faq',
    external: false,
  },
];

export default function ContactPage() {
  return (
    <>
      <header className="section club-head">
        <div className="wrap">
          <span className="sec-head__kicker">همه‌ی روزهای هفته</span>
          <h1>تماس با ما</h1>
          <p className="club-head__lead">
            هر سه راه به یک تیم می‌رسد. تفاوتشان در سرعت جواب است، نه در اینکه
            چه کسی جواب می‌دهد.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <ol className="gsteps">
            {WAYS.map(({ icon: Icon, t, d, cta, href, external }) => (
              <li key={t} className="gstep">
                <span className="gstep__ico" aria-hidden="true"><Icon /></span>
                <div>
                  <b>{t}</b>
                  <p>{d}</p>
                  <div className="club-cta contact__cta">
                    {external ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--ghost btn--sm"
                      >
                        {cta}
                      </a>
                    ) : (
                      <Link href={href} className="btn btn--ghost btn--sm">{cta}</Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--tint">
        <div className="wrap abt">
          <article className="abt__block">
            <h2>
              <span className="gstep__ico" aria-hidden="true" style={{ marginInlineEnd: '10px' }}>
                <Clock />
              </span>
              چقدر طول می‌کشد
            </h2>
            <p>
              تیکت‌ها معمولاً همان روز جواب می‌گیرند. اگر سفارشی بیش از زمان معمول
              طول کشیده، در همان تیکت بنویس؛ آن‌ها زودتر از بقیه بررسی می‌شوند.
              اگر جوابی که گرفتی قانعت نکرد،{' '}
              <Link href="/complaint">مسیر ثبت شکایت</Link> جداست و هزینه‌ای ندارد.
            </p>
          </article>

          <article className="abt__block">
            <h2>
              <span className="gstep__ico" aria-hidden="true" style={{ marginInlineEnd: '10px' }}>
                <ShieldCheck />
              </span>
              چه چیزی هیچ‌وقت از تو نمی‌پرسیم
            </h2>
            <p>
              رمز عبور حساب‌هایت، رمز دوم کارت بانکی، و کد پیامکیِ بانک. هیچ‌کدامِ
              این‌ها برای هیچ سفارشی لازم نیست. اگر کسی به اسم فونیکس شاپ این‌ها را
              خواست، از طرف ما نیست — همان‌جا قطع کن و به ما خبر بده.
            </p>
          </article>

          <article className="abt__block">
            <h2>اطلاعات ثبتی</h2>
            <p>
              نشانی، شماره‌ی تماس ثابت و نماد اعتماد الکترونیکی به‌محض نهایی شدن
              در همین بخش قرار می‌گیرند.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
