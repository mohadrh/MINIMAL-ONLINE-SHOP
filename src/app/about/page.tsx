import type { Metadata } from 'next';
import Link from 'next/link';
import { LifeBuoy, MessageCircle, Send, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'درباره‌ی ما و تماس | فونیکس شاپ',
  description:
    'فونیکس شاپ چه می‌کند، چطور کار می‌کند، و از کجا می‌شود با پشتیبانی تماس گرفت.',
};

/**
 * درباره‌ی ما و تماس.
 *
 * یک صفحه برای هر دو، عمداً. جدا کردنشان یعنی دو صفحه‌ی کوتاه که
 * هیچ‌کدام کامل نیست؛ کسی که «درباره‌ی ما» را باز می‌کند معمولاً
 * دنبال همان چیزی است که در «تماس با ما» هم هست — اینکه پشت این
 * سایت کسی هست یا نه.
 *
 * ⚠ اطلاعات حقوقی — شماره‌ی ثبت، نشانی، نماد اعتماد الکترونیکی —
 * هنوز از کارفرما گرفته نشده. جای هرکدام مشخص است و همین که
 * رسیدند جایگزین می‌شوند. تا آن‌وقت چیزی که نداریم را ادعا
 * نمی‌کنیم.
 */
export default function AboutPage() {
  return (
    <>
      <header className="section club-head">
        <div className="wrap">
          <span className="sec-head__kicker">درباره‌ی ما</span>
          <h1>فونیکس شاپ چه می‌کند؟</h1>
          <p className="club-head__lead">
            بیشتر سرویس‌های بین‌المللی کارت بانکی ایران را قبول نمی‌کنند. کاری که ما
            می‌کنیم ساده است: تو با کارت خودت به ما پرداخت می‌کنی، ما همان اشتراک را
            از طرف تو روی حساب خودت فعال می‌کنیم.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="wrap abt">
          <article className="abt__block">
            <h2>روی حساب خودت، نه حساب ما</h2>
            <p>
              اشتراک روی همان ایمیلی فعال می‌شود که خودت می‌دهی. یعنی حساب مال خودت
              می‌ماند، تاریخچه و تنظیماتت سر جایش است، و اگر روزی خواستی خودت تمدید
              کنی هیچ چیزی مانعت نیست. رمز عبورت را هیچ‌وقت نمی‌خواهیم — برای فعال‌سازی
              لازم نیست.
            </p>
          </article>

          <article className="abt__block">
            <h2>گارانتی تا آخرین روز</h2>
            <p>
              اگر وسط دوره‌ی اشتراک مشکلی پیش بیاید، تا آخرین روزِ همان دوره پشتش
              هستیم. شرایط دقیق در{' '}
              <Link href="/rules">صفحه‌ی قوانین و گارانتی</Link> نوشته شده — پیش از
              خرید بخوانش، چند خط بیشتر نیست.
            </p>
          </article>

          <article className="abt__block">
            <h2>قیمت‌ها چطور مشخص می‌شوند</h2>
            <p>
              قیمت هر محصول پیش از پرداخت کامل معلوم است و هزینه‌ی پنهانی وجود ندارد.
              نرخ ارز که جابه‌جا شود قیمت‌ها به‌روز می‌شوند، ولی سفارشی که ثبت شده با
              همان قیمتِ لحظه‌ی ثبت انجام می‌شود.
            </p>
          </article>
        </div>
      </section>

      {/* ---------- تماس ---------- */}
      <section className="section section--tint" id="contact">
        <div className="wrap">
          <div className="sec-head sec-head--mid">
            <span className="sec-head__kicker">تماس</span>
            <h2>از کجا به ما برسی</h2>
            <p className="sec-head__lead">
              همه‌ی روزهای هفته پاسخگوییم. برای پیگیری سفارش، تیکت سریع‌ترین راه است
              چون شماره‌ی سفارش همان‌جا جلوی چشم ماست.
            </p>
          </div>

          <div className="abt__ways">
            <Link href="/account" className="abt__way">
              <span className="abt__way-ico" aria-hidden="true"><LifeBuoy /></span>
              <b>تیکت پشتیبانی</b>
              <span>برای هر چیزی که به سفارش مشخصی مربوط است.</span>
            </Link>

            <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="abt__way">
              <span className="abt__way-ico" aria-hidden="true"><Send /></span>
              <b>تلگرام</b>
              <span>برای سوال‌های سریع پیش از خرید.</span>
            </a>

            <Link href="/faq" className="abt__way">
              <span className="abt__way-ico" aria-hidden="true"><MessageCircle /></span>
              <b>سوالات متداول</b>
              <span>جواب بیشتر سوال‌ها همین‌جا هست.</span>
            </Link>

            <Link href="/rules" className="abt__way">
              <span className="abt__way-ico" aria-hidden="true"><ShieldCheck /></span>
              <b>قوانین و گارانتی</b>
              <span>شرایط مرجوعی، تعویض و پشتیبانی.</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
