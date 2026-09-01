import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, Clock, MessageSquare, Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ثبت شکایت | فونیکس شاپ',
  description: 'اگر از سفارش یا برخوردی ناراضی بودی، مسیر پیگیری‌اش اینجاست.',
};

/**
 * ثبت شکایت.
 *
 * فروشگاه‌های ایرانی این صفحه را لازم دارند و سایت‌های مرجع هم
 * دارندش. ولی مهم‌تر از وجودش، صادق بودنش است: باید بگوید چقدر
 * طول می‌کشد و اگر جوابِ ما قانعت نکرد کجا می‌توانی بروی. صفحه‌ای
 * که فقط بگوید «به ما بگویید» و راهِ بیرون نداشته باشد، شکایت را
 * ثبت نمی‌کند؛ خفه می‌کند.
 *
 * ⚠ نشانی و شماره‌ی تماسِ رسمی و نماد اعتماد الکترونیکی هنوز از
 * کارفرما گرفته نشده و همین که رسیدند اینجا اضافه می‌شوند. تا آن
 * وقت چیزی را که نداریم ادعا نمی‌کنیم.
 */
const STEPS = [
  {
    icon: MessageSquare,
    t: 'اول تیکت بزن',
    d: 'بیشتر مشکل‌ها همان‌جا حل می‌شوند و سریع‌ترین راه است، چون شماره‌ی سفارش جلوی چشم ماست.',
  },
  {
    icon: AlertCircle,
    t: 'اگر جواب نگرفتی',
    d: 'در همان تیکت بنویس «شکایت». آن تیکت از صف عادی خارج می‌شود و مستقیم بررسی می‌شود.',
  },
  {
    icon: Clock,
    t: 'زمان بررسی',
    d: 'حداکثر سه روز کاری. اگر بررسی طول بکشد، در همان تیکت خبر می‌دهیم که کجای کار است — سکوت، خودش جواب نیست.',
  },
  {
    icon: Scale,
    t: 'اگر باز هم قانع نشدی',
    d: 'می‌توانی از طریق سامانه‌ی ملی رسیدگی به شکایات پیگیری کنی. اطلاعات ثبتی فروشگاه به‌محض نهایی شدن در همین صفحه قرار می‌گیرد.',
  },
];

export default function ComplaintPage() {
  return (
    <>
      <header className="section club-head">
        <div className="wrap">
          <span className="sec-head__kicker">پیگیری نارضایتی</span>
          <h1>ثبت شکایت</h1>
          <p className="club-head__lead">
            اگر سفارشی درست انجام نشد یا از برخوردی ناراضی بودی، مسیرش اینجا نوشته
            شده. هیچ‌کدام از این قدم‌ها هزینه‌ای ندارد.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <ol className="gsteps">
            {STEPS.map((s, i) => (
              <li key={s.t} className="gstep">
                <span className="gstep__n num">{(i + 1).toLocaleString('fa-IR')}</span>
                <span className="gstep__ico" aria-hidden="true"><s.icon /></span>
                <div>
                  <b>{s.t}</b>
                  <p>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="club-cta">
            <Link href="/account" className="btn btn--primary">ثبت تیکت</Link>
            <Link href="/rules" className="btn btn--ghost">قوانین و گارانتی</Link>
          </div>
        </div>
      </section>
    </>
  );
}
