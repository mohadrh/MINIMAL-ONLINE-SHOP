import React from 'react';
import Link from 'next/link';
import { MessageCircle, Send } from 'lucide-react';
import { CATEGORIES } from '../../data/catalog';
import { asset } from '../../lib/asset';

/* ⚠ هر مسیری که اینجا اضافه می‌شود باید صفحه‌ی واقعی داشته باشد.

   چهار لینک این فوتر مدت‌ها به ۴۰۴ می‌رفتند — /about، /contact،
   /careers و /complaint هیچ‌کدام ساخته نشده بودند. چون فوتر روی
   *هر* صفحه‌ی سایت است، یعنی هر بازدیدکننده چهار لینک شکسته جلوی
   چشمش داشت. /about ساخته شد و بقیه به مقصدهای واقعی رفتند. */
const HELP = [
  { t: 'راهنمای خرید', h: '/guide' },
  { t: 'سوالات متداول', h: '/faq' },
  { t: 'پیگیری سفارش', h: '/track' },
  { t: 'قوانین و گارانتی', h: '/rules' },
  { t: 'تماس با ما', h: '/contact' },
  { t: 'ثبت شکایت', h: '/complaint' },
];

const ABOUT = [
  { t: 'درباره‌ی ما', h: '/about' },
  { t: 'باشگاه مشتریان', h: '/club' },
  { t: 'مقالات و آموزش', h: '/blog' },
  { t: 'نمایندگی فروش', h: '/reseller' },
  { t: 'فرصت‌های شغلی', h: '/careers' },
];

export function Footer() {
  return (
    <footer className="ft">
      <div className="wrap ft__grid">
        <div className="ft__brand">
          <Link href="/" className="ft__logo">
            <img src={asset('/brand/phoenix-logo.png')} alt="" width={36} height={36} />
            <b>PHOENIX SHOP</b>
          </Link>
          <p className="small">
            اشتراک‌هایی که از ایران نمی‌شود خرید، با کارت بانکی خودت. روی حساب
            شخصی خودت فعال می‌شوند و رمزت را هیچ‌وقت نمی‌خواهیم.
          </p>
          {/* ⚠ فقط نشانی‌هایی که واقعاً وجود دارند.

             هر چهارتا href="#" بودند — یعنی کاربر روی نشانِ تلگرام
             می‌زد و هیچ اتفاقی نمی‌افتاد. لینکِ مرده بدتر از نبودنِ
             لینک است: اولی اعتماد را خرج می‌کند، دومی فقط چیزی را
             نشان نمی‌دهد.

             اینستاگرام هنوز صفحه‌ای ندارد. روزی که ساخته شد، همین‌جا
             یک <a> با نشانِ Instagram اضافه می‌شود و تمام. */}
          <div className="ft__social">
            <a
              href="https://t.me/Ph0enix_Shop"
              aria-label="تلگرام"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Send />
            </a>
            <Link href="/contact" aria-label="پشتیبانی"><MessageCircle /></Link>
          </div>
        </div>

        <nav className="ft__col" aria-label="دسته‌بندی‌ها">
          <h2>دسته‌بندی‌ها</h2>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`}>{c.title}</Link>
          ))}
          <Link href="/numbers">شماره مجازی</Link>
        </nav>

        <nav className="ft__col" aria-label="راهنما">
          <h2>راهنما</h2>
          {HELP.map((l) => <Link key={l.h} href={l.h}>{l.t}</Link>)}
        </nav>

        <nav className="ft__col" aria-label="فونیکس شاپ">
          <h2>فونیکس شاپ</h2>
          {ABOUT.map((l) => <Link key={l.h} href={l.h}>{l.t}</Link>)}
        </nav>
      </div>

      <div className="wrap ft__bottom">
        <span className="xsmall">همه‌ی حقوق متعلق به فونیکس شاپ است.</span>
        <span className="xsmall num">۱۴۰۴</span>
      </div>
    </footer>
  );
}
